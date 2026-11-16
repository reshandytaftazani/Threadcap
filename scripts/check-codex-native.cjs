// Isolated hook fixtures exercise the production command, cache, Rust HTTP bridge, IPC, and native UI.
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-island-codex-native-'));
  const helper=path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
  const home=path.join(temporary,'codex'),cache=path.join(temporary,'VibeIsland/codex-hooks-37898.sqlite3');
  const env={...process.env,LOCALAPPDATA:temporary,CODEX_HOME:home};
  let available=false;
  try {await fetch('http://127.0.0.1:37898/api/status',{signal:AbortSignal.timeout(300)});available=true;}catch{}
  if(available)throw new Error('The isolated test port is already in use.');
  execFileSync(helper,['install','--codex-home',home,'--port','37898'],{env,windowsHide:true});
  const configuration=JSON.parse(fs.readFileSync(path.join(home,'hooks.json'),'utf8'));
  const checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
  const base={session_id:'native-codex-fixture',cwd:temporary,model:'fixture-model'};
  const hook=async(name,fields={})=>{
    const command=configuration.hooks[name].flatMap(group=>group.hooks).find(handler=>handler.command.includes(' --integration-id ') || handler.command.startsWith('powershell.exe -NoProfile -NonInteractive -EncodedCommand ')).command;
    const child=spawn('cmd.exe',['/D','/S','/C',`"${command}"`],{env,windowsHide:true,windowsVerbatimArguments:true,stdio:['pipe','pipe','pipe']});
    let output='',errors='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>errors+=data);
    const completed=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Hook process failed: '+errors)));});
    child.stdin.end(JSON.stringify({...base,hook_event_name:name,...fields}));await completed;
    if(output || errors)throw new Error('A monitoring hook emitted policy-visible output: '+JSON.stringify({output,errors}));
  };
  await hook('SessionStart',{source:'startup'});
  await hook('UserPromptSubmit',{turn_id:'turn-1',prompt:'Isolated Codex hook check 日本語 😀'});
  await hook('PermissionRequest',{turn_id:'turn-1',tool_name:'Bash',tool_input:{command:'npm test'}});
  check('Hooks finish quietly while the island is offline and persist context',fs.existsSync(cache));
  const app=spawn(path.join(root,'src-tauri/target/release/vibe-island.exe'),[],{windowsHide:true,stdio:'ignore',env:{...env,VIBE_ISLAND_PORT:'37898',VIBE_ISLAND_STATE_FILE:':memory:',VIBE_ISLAND_CODEX_STATE_FILE:cache,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9228 --remote-debugging-address=127.0.0.1',WEBVIEW2_USER_DATA_FOLDER:path.join(temporary,'webview')}});
  let socket,lines;
  try {
    let connected=false;
    for(let i=0;i<100;i++){try{const result=await fetch('http://127.0.0.1:37898/api/status');if(result.ok){connected=true;break;}}catch{}await wait(50);}
    if(!connected)throw new Error('The isolated native host did not start; close any other island instance first.');
    let page;
    for(let i=0;i<100;i++){try{const pages=await(await fetch('http://127.0.0.1:9228/json')).json();page=pages.find(page=>page.type==='page'&&page.title==='Vibe Island');if(page)break;}catch{}await wait(50);}
    if(!page)throw new Error('Native webview not available.');
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=({data})=>{const message=JSON.parse(data),request=pending.get(message.id);if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(new Error('Native inspection timed out'));},5000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
    const evaluate=async(expression)=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;};
    const until=async(expression)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return true;await wait(30);}return false;};
    check('Startup imports the offline hook snapshot',await until(`window.IslandPreview?.snapshot().sessions.length===1`));
    check('Recovered requests stay disconnected and do not replay attention',await evaluate(`IslandPreview.snapshot().sessions[0].connectionStatus==='disconnected' && document.getElementById('announcer').textContent===''`));
    await hook('PostToolUse',{turn_id:'turn-1',tool_name:'Bash',tool_use_id:'tool-1',tool_input:{command:'npm test'},tool_response:{exit_code:0}});
    check('A fresh matching hook restores live activity through Rust and IPC',await until(`IslandPreview.snapshot().sessions[0].status==='running' && IslandPreview.snapshot().sessions[0].connectionStatus==='connected'`));
    await hook('UserPromptSubmit',{turn_id:'turn-2',prompt:'Isolated live Codex hook check 日本語 😀'});
    await hook('PreToolUse',{turn_id:'turn-2',tool_name:'Bash',tool_use_id:'tool-2',tool_input:{command:'npm test'}});
    await hook('PermissionRequest',{turn_id:'turn-2',tool_name:'Bash',tool_input:{command:'npm test'}});
    check('Real adapter transport reports a pending approval without granting capability',await until(`IslandPreview.snapshot().sessions[0].status==='waiting_approval' && !IslandPreview.snapshot().sessions[0].capabilities.canApprove`));
    await evaluate(`IslandPreview.showFocused('codex:native-codex-fixture')`);await wait(350);
    check('The selected Codex detail shows the original Unicode prompt and command',await evaluate(`document.getElementById('sessions-list').textContent.includes('日本語 😀') && document.querySelector('.command').textContent==='npm test' && !document.querySelector('[data-action=allow]')`));
    const clip=await evaluate(`(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    const screenshot=await send('Page.captureScreenshot',{format:'png',clip});fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/codex-hook-native.png'),Buffer.from(screenshot.data,'base64'));
    await hook('PostToolUse',{turn_id:'turn-2',tool_name:'Bash',tool_use_id:'tool-2',tool_input:{command:'npm test'}});
    await hook('Stop',{turn_id:'turn-2',stop_hook_active:false,last_assistant_message:'Isolated hook fixture finished.'});
    check('Stop reports the observed response instead of process-exit inference',await until(`IslandPreview.snapshot().sessions[0].status==='completed' && IslandPreview.snapshot().sessions[0].result==='Isolated hook fixture finished.'`));
    await hook('SessionEnd',{reason:'other'});
    check('Session end preserves completion while marking the provider disconnected',await until(`IslandPreview.snapshot().sessions[0].status==='completed' && IslandPreview.snapshot().sessions[0].connectionStatus==='disconnected'`));
    const doctor=JSON.parse(execFileSync(helper,['doctor','--codex-home',home,'--port','37898'],{env,windowsHide:true,encoding:'utf8'}));
    check('Doctor recognizes CLI, registration, and the running Rust bridge',doctor.registeredEvents.length===10 && doctor.bridge.runtime==='rust' && doctor.responseDelivery===false);
    execFileSync(helper,['uninstall','--codex-home',home],{env,windowsHide:true});
    const uninstalled=JSON.parse(fs.readFileSync(path.join(home,'hooks.json'),'utf8'));
    check('Uninstall removes generated handlers from the isolated configuration',Object.values(uninstalled.hooks).every(groups=>groups.every(group=>group.hooks.length===0)));
    const result={passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks,modelCalls:0};console.log(JSON.stringify(result,null,2));fs.writeFileSync(path.join(root,'artifacts/codex-native-results.json'),JSON.stringify(result,null,2));if(result.failed.length)process.exitCode=1;
  } finally {socket?.close();lines?.close();app.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
