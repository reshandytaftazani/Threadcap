// Exercises batch and individual registration with installed CLIs and isolated configuration.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {startNative}=require('./native-harness.cjs');

async function main() {
  const host=await startNative('provider-connect');
  const hooks=path.join(host.env.CODEX_HOME,'hooks.json');
  const original=JSON.stringify({hooks:{SessionStart:[{hooks:[{type:'command',command:'echo unrelated-user-hook'}]}]}});
  const state="document.getElementById('provider-connect-state').textContent";
  const note="document.getElementById('provider-connect-note').textContent";
  const checks=[];
  const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
  const button=id=>`document.querySelector('[data-connect-provider="${id}"]')`;
  const invokeProvider=id=>host.evaluate(`${button(id)}.click(); ${button(id)}.click()`);
  const expect=value=>host.until(`${state}===${JSON.stringify(value)}`);
  const back=()=>host.evaluate("document.getElementById('settings-back').click()");
  const connectAll="document.getElementById('connect-all')";
  const status=id=>`document.querySelector('[data-provider-status="${id}"]').textContent`;
  try {
    fs.mkdirSync(host.env.CODEX_HOME,{recursive:true});
    fs.writeFileSync(hooks,original);
    await host.evaluate("document.getElementById('settings-button').click()");
    check('Opening Settings preserves existing hooks',fs.readFileSync(hooks,'utf8')===original);
    const agyHooks=path.join(host.temp,'.gemini/config/hooks.json');
    const agySettings=path.join(host.temp,'.gemini/antigravity-cli/settings.json');
    fs.mkdirSync(path.dirname(agyHooks),{recursive:true});
    fs.mkdirSync(path.dirname(agySettings),{recursive:true});
    fs.writeFileSync(agyHooks,'{ invalid json');
    fs.writeFileSync(agySettings,JSON.stringify({statusLine:{enabled:false,command:'existing command'}}));
    await host.evaluate(`${connectAll}.focus(); ${connectAll}.click(); ${connectAll}.click()`);
    check('A single batch remains in Agents and continues past an Antigravity configuration error',
      await host.until(`${connectAll}.getAttribute('aria-busy')==='false' &&
        ${status('codex')}==='Waiting for activity' && ${status('opencode')}==='Waiting for activity' &&
        ${status('antigravity')}==='Setup issue' && !document.getElementById('agents-overview').hidden`));
    check('A failed registration preserves the malformed file and leaves Connect all available',
      fs.readFileSync(agyHooks,'utf8')==='{ invalid json' && await host.evaluate(`!${connectAll}.disabled`));
    const codexBeforeRetry=fs.statSync(hooks).mtimeMs;
    const opencodeTui=path.join(host.temp,'config/opencode/plugins/threadcap-monitor/tui.js');
    const opencodeBeforeRetry=fs.statSync(opencodeTui).mtimeMs;
    fs.writeFileSync(agyHooks,'{"existing":{"enabled":false}}');
    await host.evaluate(`${connectAll}.click()`);
    check('Connect all retries Antigravity without rewriting Codex or OpenCode',
      await host.until(`${connectAll}.disabled && ${connectAll}.getAttribute('aria-busy')==='false' &&
        ${status('antigravity')}==='Waiting for activity'`) &&
      fs.statSync(hooks).mtimeMs===codexBeforeRetry && fs.statSync(opencodeTui).mtimeMs===opencodeBeforeRetry);
    const agy=JSON.parse(fs.readFileSync(agyHooks,'utf8'));
    check('Antigravity registers all observers while preserving existing hooks and disabled status line',
      agy.existing.enabled===false && ['SessionStart','PreInvocation','PostToolUse','Stop'].every(key=>agy['threadcap-monitor'][key].length===1) &&
      JSON.parse(fs.readFileSync(agySettings,'utf8')).statusLine.command==='existing command');
    check('The overview directs new users to restart and review in Codex only if prompted',
      await host.evaluate("document.getElementById('settings-note').textContent.includes('If Codex asks for review, open /hooks')"));
    await host.wait(450);
    const overviewClip=await host.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const overview=await host.send('Page.captureScreenshot',{format:'png',clip:overviewClip});
    fs.writeFileSync(path.join(host.root,'artifacts/connect-all-native.png'),Buffer.from(overview.data,'base64'));
    await host.evaluate("document.querySelector('[data-provider=codex]').click()");
    check('Codex explains its own review and offers no confirmation gate',await host.evaluate(`${note}.includes('/hooks') && !document.getElementById('setup-copy').hidden && !document.querySelector('#setup-reviewed,#provider-reviewed')`));
    await host.wait(450);
    const clip=await host.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const screenshot=await host.send('Page.captureScreenshot',{format:'png',clip});
    fs.writeFileSync(path.join(host.root,'artifacts/codex-connect-native.png'),Buffer.from(screenshot.data,'base64'));
    const configured=JSON.parse(fs.readFileSync(hooks,'utf8'));
    const helper=path.join(host.temp,'VibeIsland/bridge/vibe-island-codex.exe');
    check('Registration preserves the user hook and stages ten owned handlers',fs.existsSync(helper) &&
      configured.hooks.SessionStart[0].hooks[0].command==='echo unrelated-user-hook' &&
      Object.values(configured.hooks).flat().flatMap(group=>group.hooks).filter(h=>h.commandWindows?.startsWith('powershell.exe')).length===10);
    const registered=fs.readFileSync(hooks);
    const retry=()=>host.evaluate("document.getElementById('provider-connect').click()");
    fs.writeFileSync(hooks,'{ invalid json');
    await retry();
    check('Malformed configuration produces a retryable issue and preserves the file',await expect('Setup issue') && fs.readFileSync(hooks,'utf8')==='{ invalid json');
    fs.writeFileSync(hooks,registered);
    await retry();
    check('Reconnect retains the same trusted hook definitions',await expect('Waiting for activity') && fs.readFileSync(hooks).equals(registered));
    execFileSync(helper,['hook','--port',String(host.port)],{env:host.env,windowsHide:true,input:JSON.stringify({
      hook_event_name:'SessionStart',session_id:'connect-fixture',cwd:host.temp,source:'startup'
    }),timeout:5000});
    check('A fresh adapter event reports Connected without another click',await expect('Connected'));
    await back();await invokeProvider('opencode');
    check('One OpenCode click registers and requests a CLI restart',await expect('Waiting for activity') && await host.evaluate(`${note}.includes('Restart OpenCode') && document.getElementById('setup-copy').hidden`));
    check('OpenCode setup writes its plugin into the isolated configuration',fs.existsSync(path.join(host.temp,'config/opencode/plugins/threadcap-monitor/tui.js')));
    const agyVersion=await host.evaluate("IslandDesktop.providerIntegration('antigravity','status')");
    check('Native detection confirms the actual installed Antigravity version and registration',agyVersion.supported && agyVersion.registered);
    console.log(JSON.stringify({checks,antigravityVersion:agyVersion.version},null,2));
  } finally {
    await host.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
