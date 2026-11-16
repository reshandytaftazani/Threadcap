// Uses a temporary bridge/profile/cache. Navigation targets only this agent's already-running Orca terminal.
const {spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'island-orca-nav-'));
  const expected=process.env.ORCA_TERMINAL_HANDLE;if(!expected)throw Error('Run this check from an Orca-managed terminal with its own terminal handle.');
  const current=JSON.parse(execFileSync(process.env.ORCA_CLI_COMMAND || 'orca.exe',['terminal','list','--worktree','current','--limit','25','--environment','local','--json'],{encoding:'utf8',windowsHide:true}));
  const owned=current.result.terminals.find(t=>t.handle===expected && `${t.tabId}:${t.leafId}`===process.env.ORCA_PANE_KEY && t.worktreeId===process.env.ORCA_WORKTREE_ID);
  if(!owned)throw Error('This agent terminal is no longer listed with the inherited pane and worktree.');
  const fixtureRuntime=current._meta.runtimeId;
  for(const port of [37898,9228])await new Promise((resolve,reject)=>{const p=require('node:net').createServer();p.once('error',reject);p.listen({host:'127.0.0.1',port,exclusive:true},()=>p.close(resolve));});
  const cache=path.join(temp,'codex.sqlite3'),env={...process.env,ORCA_RUNTIME_SOURCE_INCARNATION:fixtureRuntime,LOCALAPPDATA:temp,CODEX_HOME:path.join(temp,'codex'),VIBE_ISLAND_PORT:'37898',VIBE_ISLAND_STATE_FILE:':memory:',VIBE_ISLAND_CODEX_STATE_FILE:cache,VIBE_ISLAND_USAGE_DISABLED:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9228 --remote-debugging-address=127.0.0.1',WEBVIEW2_USER_DATA_FOLDER:path.join(temp,'webview')};
  let app,socket,evaluate,send;
  async function start(){
    app=spawn(path.join(root,'src-tauri/target/release/vibe-island.exe'),[],{env,windowsHide:true,stdio:'ignore'});
    let page;for(let i=0;i<150;i++){try{page=(await(await fetch('http://127.0.0.1:9228/json')).json()).find(p=>p.title==='Vibe Island');if(page)break;}catch{}await wait(50);}
    if(!page)throw Error('The isolated native host is unavailable. Use the smoke application identifier.');
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=({data})=>{const msg=JSON.parse(data),job=pending.get(msg.id);if(job){pending.delete(msg.id);clearTimeout(job.timer);msg.error?job.reject(Error(msg.error.message)):job.resolve(msg.result);}};
    send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>reject(Error('Native inspection timeout')),20000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
    evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    for(let i=0;i<100;i++){if(await evaluate('Boolean(window.IslandPreview && window.IslandDesktop)'))return;await wait(30);}throw Error('Native UI did not initialize');
  }
  async function stop(){socket?.close();if(app && app.exitCode===null)await new Promise(resolve=>{app.once('exit',resolve);app.kill();});await wait(200);}
  const checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
  const until=async expression=>{for(let i=0;i<160;i++){if(await evaluate(expression))return true;await wait(50);}return false;};
  const invoke=(sessionId,action,choice=null)=>evaluate(`IslandDesktop.orcaTerminal(${JSON.stringify(sessionId)},${JSON.stringify(action)},${JSON.stringify(choice)})`);
  const inject=async id=>{const response=await fetch('http://127.0.0.1:37898/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'codex',sessionId:id,sourceRevision:1,eventId:'fixture',status:'waiting_approval',requestId:'fixture-request',command:'npm test',taskTitle:'Isolated navigation fixture',workingDirectory:root,terminalTarget:'term_untrusted',capabilities:{canJump:true,canApprove:true}})});if(!response.ok)throw Error('Fixture injection failed');};
  try{
    await start();
    const helper=path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
    execFileSync(helper,['hook','--port','37898','--state-file',cache],{env,windowsHide:true,input:JSON.stringify({hook_event_name:'SessionStart',session_id:'automatic-fixture',cwd:root,source:'startup'}),timeout:5000});
    check('Hook arrives through production helper and native IPC',await until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:automatic-fixture')"));
    const automatic=await invoke('codex:automatic-fixture','open');
    check('Inherited Orca identity automatically opens the verified terminal',automatic.state==='opened' && automatic.acknowledged===true);
    const linkFile=path.join(temp,'VibeIsland/orca-terminal-links-37898.json');
    let links=JSON.parse(fs.readFileSync(linkFile,'utf8'));
    check('Automatic binding pins the runtime, pane, and PTY incarnation',links['codex:automatic-fixture'].binding.handle===expected && links['codex:automatic-fixture'].binding.runtime===fixtureRuntime && links['codex:automatic-fixture'].incarnation && !links['codex:automatic-fixture'].manual);
    const originalIncarnation=links['codex:automatic-fixture'].incarnation;
    links['codex:automatic-fixture'].incarnation='00000000-0000-4000-8000-000000000002';fs.writeFileSync(linkFile,JSON.stringify(links));
    execFileSync(helper,['hook','--port','37898','--state-file',cache],{env,windowsHide:true,input:JSON.stringify({hook_event_name:'SessionStart',session_id:'automatic-fixture',cwd:root,source:'compact'}),timeout:5000});
    check('A newer event cannot silently rebind a reused PTY incarnation',(await invoke('codex:automatic-fixture','open')).state==='choose');
    links['codex:automatic-fixture'].incarnation=originalIncarnation;fs.writeFileSync(linkFile,JSON.stringify(links));
    const outsideEnv={...env};for(const name of ['ORCA_TERMINAL_HANDLE','ORCA_PANE_KEY','ORCA_WORKSPACE_ID','ORCA_WORKTREE_ID','ORCA_RUNTIME_SOURCE_INCARNATION'])delete outsideEnv[name];
    execFileSync(helper,['hook','--port','37898','--state-file',cache],{env:outsideEnv,windowsHide:true,input:JSON.stringify({hook_event_name:'SessionStart',session_id:'automatic-fixture',cwd:root,source:'compact'}),timeout:5000});
    check('A fresh event without Orca launch identity clears automatic attribution',(await invoke('codex:automatic-fixture','open')).state==='choose');
    await inject('codex:legacy-fixture');await until("IslandPreview.snapshot().sessions.length===2");
    check('Producer input cannot grant approvals or terminal navigation',await evaluate("(()=>{const s=IslandPreview.snapshot().sessions.find(s=>s.sessionId==='codex:legacy-fixture');return !s.capabilities.canJump && !s.capabilities.canApprove;})()"));
    const unbound=await invoke('codex:legacy-fixture','open');
    check('An old unbound session requires selection even when only one candidate exists',unbound.state==='choose');
    const target=unbound.terminals.find(t=>t.choice.handle===expected && t.choice.runtime===fixtureRuntime);
    if(!target)throw Error('This agent terminal was not returned as a live local Codex terminal.');
    check('Terminal previews and hook secrets are excluded from chooser metadata',!Object.keys(target).some(k=>/preview|token/i.test(k)));
    await evaluate("IslandPreview.showOverview();document.querySelector('[data-session=\"codex:legacy-fixture\"] .jump-button').click()");
    check('Native UI opens the manual chooser inside the island',await until("IslandPreview.snapshot().settingsOpen && !document.getElementById('terminal-picker').hidden && document.querySelectorAll('.terminal-choice').length>0"));
    await wait(400);
    check('Chooser content is visibly painted after its transition',await evaluate("Number(getComputedStyle(document.getElementById('settings-scroll')).opacity)>.99 && document.querySelector('.terminal-choice').getBoundingClientRect().height>=44"));
    const clip=await evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const screenshot=await send('Page.captureScreenshot',{format:'png',clip});fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/orca-terminal-picker.png'),Buffer.from(screenshot.data,'base64'));
    // Resolve the same target from the rendered safe handle instead of assuming terminal-list ordering.
    await evaluate(`(()=>{const buttons=[...document.querySelectorAll('.terminal-choice')];const button=buttons.find(b=>b.textContent.includes(${JSON.stringify(expected)}));if(!button)throw Error('Owned terminal absent');button.click();})()`);
    check('Link and open collapses after real Orca acknowledgment',await until('!IslandPreview.snapshot().expanded'));
    links=JSON.parse(fs.readFileSync(linkFile,'utf8'));
    check('Manual choice is durably saved for the selected session',links['codex:legacy-fixture']?.binding.handle===expected && links['codex:legacy-fixture'].manual===true);
    await stop();await start();await inject('codex:legacy-fixture');await until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:legacy-fixture')");
    check('Manual binding survives host restart and revalidates before opening',(await invoke('codex:legacy-fixture','open')).state==='opened');
    links=JSON.parse(fs.readFileSync(linkFile,'utf8'));links['codex:legacy-fixture'].binding.runtime='00000000-0000-4000-8000-000000000001';fs.writeFileSync(linkFile,JSON.stringify(links));
    check('A stale runtime returns to selection instead of guessing',(await invoke('codex:legacy-fixture','open')).state==='choose');
    let rejected=false;try{await invoke('codex:legacy-fixture','choose',{...target.choice,runtime:'00000000-0000-4000-8000-000000000001'});}catch{rejected=true;}
    check('A stale picker choice cannot activate another target',rejected);
    let absent=false;try{await invoke('codex:absent','open');}catch{absent=true;}check('Unknown session IDs are rejected before navigation',absent);
    const result={passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks,modelCalls:0};fs.writeFileSync(path.join(root,'artifacts/orca-navigation-native.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.failed.length)process.exitCode=1;
  }finally{await stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
