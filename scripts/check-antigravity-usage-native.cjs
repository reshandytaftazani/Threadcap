const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'threadcap-usage-')),settings=path.join(temp,'.gemini/antigravity-cli/settings.json');
 const original=path.join(temp,'original-status.js');fs.writeFileSync(original,"let raw='';process.stdin.on('data',d=>raw+=d);process.stdin.on('end',()=>process.stdout.write('\\u001b[32mOriginal '+JSON.parse(raw).conversation_id+'\\u001b[0m\\n'));");
 const originalCommand=`"${process.execPath}" "${original}"`;
 fs.mkdirSync(path.dirname(settings),{recursive:true});fs.writeFileSync(settings,JSON.stringify({unrelated:'preserved',statusLine:{type:'command',enabled:true,padding:2,command:originalCommand}}));
 const h=await startNative('agy-usage',{temp,usageEnabled:true});const checks=[];const check=(name,value)=>{checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
 try{
  const opencode=await h.evaluate("IslandDesktop.providerIntegration('opencode','connect')");
  check('Native OpenCode Connect accepts the installed verified version',opencode.supported && opencode.registered);
  check('OpenCode registration uses a global plugin without rewriting provider configuration',fs.existsSync(path.join(temp,'config/opencode/plugins/threadcap-monitor/index.js')) && !fs.existsSync(path.join(temp,'config/opencode/opencode.json')));
  const setup=await h.evaluate("IslandDesktop.providerIntegration('antigravity','connect')");check('Native Connect installs the status-line observer in the isolated profile',setup.registered);
  const configuration=JSON.parse(fs.readFileSync(settings,'utf8'));
  check('Existing settings, enabled state and padding survive Connect',configuration.unrelated==='preserved' && configuration.statusLine.enabled && configuration.statusLine.padding===2);
  const input={conversation_id:'fixture-ü',email:'private-fixture@example.test',quota:{weekly:{remaining_fraction:0.42,reset_time:'2026-12-01T00:00:00Z'},credits:{remaining_amount:12}}};
  spawnSync(process.env.ComSpec||'cmd.exe',['/C',configuration.statusLine.command],{env:h.env,windowsHide:true,input:JSON.stringify({conversation_id:'initializing',quota:{}}),encoding:'utf8',timeout:5000});
  const output=spawnSync(process.env.ComSpec||'cmd.exe',['/C',configuration.statusLine.command],{env:h.env,windowsHide:true,input:JSON.stringify(input),encoding:'utf8',timeout:5000});
  check('The wrapper preserves original ANSI output and UTF-8 stdin',output.status===0 && output.stdout==='\u001b[32mOriginal fixture-ü\u001b[0m\n');
  const quota=await h.evaluate("IslandDesktop.readUsage('antigravity')");
  check('Native IPC reads real normalized cache values in their original units',quota.status==='fresh' && quota.buckets.find(b=>b.id==='weekly').windows[0].remainingPercent===42 && quota.buckets.find(b=>b.id==='credits').windows[0].remainingAmount===12);
  check('IPC excludes email and does not claim a session-account mapping',!JSON.stringify(quota).includes(input.email) && quota.sessionMapped===false);
  check('The frontend accepts provider-specific native readings',await h.until("IslandUsage.snapshot('antigravity').status==='fresh'"));
  const detail=await h.evaluate("IslandUsage.detail('antigravity')");
  check('Quota rendering preserves unknown periods and source labels',detail.includes('42%') && detail.includes('12 units') && detail.includes('Window not reported') && detail.includes('Antigravity CLI status line'));
  await h.evaluate("document.getElementById('settings-button').click();document.querySelector('.integration-identity[data-provider=antigravity]').click()");
  await h.wait(500);
  check('Antigravity quota appears in its in-island Settings page',await h.evaluate("!document.getElementById('provider-detail').hidden && document.getElementById('provider-usage-detail').textContent.includes('42%')"));
  const bounds=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
  const screenshot=await h.send('Page.captureScreenshot',{format:'png',clip:bounds});fs.writeFileSync(path.join(h.root,'artifacts/antigravity-quota-settings.png'),Buffer.from(screenshot.data,'base64'));
  const cache=path.join(temp,'VibeIsland',`codex-hooks-${h.port}.sqlite3`);
  spawnSync('python',['-c',"import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(\"UPDATE antigravity_usage SET body=json_set(body,'$.observedAt',1)\"); c.commit()",cache],{windowsHide:true});
  check('An expired provider reading becomes stale through native IPC',(await h.evaluate("IslandDesktop.readUsage('antigravity')")).status==='stale');
  fs.writeFileSync(path.join(h.root,'artifacts/antigravity-usage-native.json'),JSON.stringify({checks,modelCalls:0,source:'Documented status-line fixture through real Windows forwarding, SQLite, Tauri IPC and WebView2.'},null,2));console.log(JSON.stringify({checks,modelCalls:0},null,2));
 } finally {await h.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
