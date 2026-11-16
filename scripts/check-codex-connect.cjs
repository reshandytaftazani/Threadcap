// Run the Settings action against an isolated native host and temporary Codex profile. No model calls.
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const root = path.resolve(__dirname, '..'), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'island-connect-'));
  const home = path.join(temporary, 'codex'), hooksFile = path.join(home, 'hooks.json');
  fs.mkdirSync(home);
  const original = JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type:'command', command:'echo unrelated-user-hook' }] }] } });
  fs.writeFileSync(hooksFile, original);
  for (const port of [37899, 9229]) {
    await new Promise((resolve,reject)=>{
      const probe=require('node:net').createServer();
      probe.once('error',()=>reject(Error('Isolated test port is in use: '+port)));
      probe.listen({host:'127.0.0.1',port,exclusive:true},()=>probe.close(resolve));
    });
  }
  const env = { ...process.env, LOCALAPPDATA:temporary, CODEX_HOME:home, VIBE_ISLAND_PORT:'37899', VIBE_ISLAND_STATE_FILE:':memory:', VIBE_ISLAND_USAGE_DISABLED:'1', WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9229 --remote-debugging-address=127.0.0.1', WEBVIEW2_USER_DATA_FOLDER:path.join(temporary,'webview') };
  const executable = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root,'src-tauri/target/release/vibe-island.exe');
  const app = spawn(executable, [], { env, windowsHide:true, stdio:['ignore','pipe','pipe'] });
  let log=''; app.stdout.on('data',data=>log+=data); app.stderr.on('data',data=>log+=data);
  let socket;
  try {
    let page;
    for (let i=0;i<150;i++) { try { page = (await (await fetch('http://127.0.0.1:9229/json')).json()).find(p=>p.title==='Vibe Island'); if (page) break; } catch {} await wait(50); }
    if (!page) throw Error('Isolated native host did not start. Close other island instances first. '+log);
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ socket.onopen=resolve; socket.onerror=reject; });
    let id=0; const pending=new Map();
    socket.onmessage=({data})=>{ const msg=JSON.parse(data),job=pending.get(msg.id); if(job) {pending.delete(msg.id);clearTimeout(job.timer);msg.error?job.reject(Error(msg.error.message)):job.resolve(msg.result);} };
    const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>reject(Error('CDP timeout')),20000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return true;await wait(50);}return false;};
    const checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
    await until('Boolean(window.IslandDesktop && window.IslandPreview)');
    await evaluate("document.getElementById('settings-button').click()");
    await until("document.getElementById('connect-codex') && !document.getElementById('connect-codex').disabled");
    check('Opening Settings checks status without modifying hooks',fs.readFileSync(hooksFile,'utf8')===original);
    check('Unregistered integration offers Connect',await evaluate("document.getElementById('connect-codex').textContent==='Connect'"));
    await evaluate("document.getElementById('connect-codex').focus();document.getElementById('connect-codex').click();document.getElementById('connect-codex').click()");
    check('Connect finishes through the real native command',await until("!document.getElementById('connect-codex').disabled && document.getElementById('codex-integration-status').textContent==='Registered'"));
    const configured=JSON.parse(fs.readFileSync(hooksFile,'utf8')), stable=path.join(temporary,'VibeIsland/bridge/vibe-island-codex.exe');
    check('The bundled helper stages a portable copy and ten handlers',fs.existsSync(stable) && Object.values(configured.hooks).flat().flatMap(g=>g.hooks).filter(h=>h.commandWindows?.includes(' --integration-id ') || h.commandWindows?.startsWith('powershell.exe')).length===10);
    check('Existing hooks and an exact backup are preserved',configured.hooks.SessionStart[0].hooks[0].command==='echo unrelated-user-hook' && fs.readdirSync(home).filter(f=>f.endsWith('.bak')).some(f=>fs.readFileSync(path.join(home,f),'utf8')===original));
    check('Registered status requires explicit Codex review and retains keyboard focus',await evaluate("document.getElementById('codex-setup-note').textContent.includes('/hooks') && document.activeElement===document.getElementById('connect-codex')"));
    const good=fs.readFileSync(hooksFile);
    fs.writeFileSync(hooksFile,'{ invalid json');
    await evaluate("document.getElementById('connect-codex').click()");
    check('Invalid user configuration is preserved and produces a retryable error',await until("!document.getElementById('connect-codex').disabled && document.getElementById('codex-setup-note').classList.contains('is-error')") && fs.readFileSync(hooksFile,'utf8')==='{ invalid json');
    fs.writeFileSync(hooksFile,good);
    await evaluate("document.getElementById('connect-codex').click()");
    check('Reconnect recovers from errors without duplicate hooks',await until("!document.getElementById('connect-codex').disabled && !document.getElementById('codex-setup-note').classList.contains('is-error')") && fs.readFileSync(hooksFile).equals(good));
    const hook = name => execFileSync(stable,['hook','--port','37899'],{env,windowsHide:true,input:JSON.stringify({hook_event_name:name,session_id:'connect-fixture',cwd:temporary,model:'fixture-model'}),timeout:5000});
    hook('SessionStart');
    check('A fresh real adapter report promotes the row to Monitor',await until("document.getElementById('codex-integration-status').textContent==='Monitor'"));
    hook('SessionEnd');
    check('Disconnection returns to Registered without forgetting setup',await until("document.getElementById('codex-integration-status').textContent==='Registered'"));
    const clip=await evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const shot=await send('Page.captureScreenshot',{format:'png',clip});
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/codex-connect-native.png'),Buffer.from(shot.data,'base64'));
    const result={passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks,modelCalls:0};
    fs.writeFileSync(path.join(root,'artifacts/codex-connect-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.failed.length)process.exitCode=1;
  } finally { socket?.close(); app.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
