// Isolated native acceptance. Fixtures stay in memory; the installed user's app is untouched.
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'island-refinements-'));
  for(const port of [37898,9228])await new Promise((resolve,reject)=>{const p=require('node:net').createServer();p.once('error',reject);p.listen({host:'127.0.0.1',port,exclusive:true},()=>p.close(resolve));});
  const liveRead=process.argv.includes('--read-account');
  const env={...process.env,LOCALAPPDATA:temp,VIBE_ISLAND_PORT:'37898',VIBE_ISLAND_STATE_FILE:':memory:',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9228 --remote-debugging-address=127.0.0.1',WEBVIEW2_USER_DATA_FOLDER:path.join(temp,'webview')};
  if(!liveRead){env.CODEX_HOME=path.join(temp,'codex');env.VIBE_ISLAND_USAGE_DISABLED='1';}
  const app=spawn(process.env.VIBE_ISLAND_TEST_EXE || path.join(root,'src-tauri/target/release/vibe-island.exe'),[],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='',socket;
  app.stdout.on('data',d=>log+=d);app.stderr.on('data',d=>log+=d);
  try{
    let page;for(let i=0;i<150;i++){try{page=(await(await fetch('http://127.0.0.1:9228/json')).json()).find(p=>p.title==='Vibe Island');if(page)break;}catch{}await wait(50);}
    if(!page)throw Error('Native smoke host unavailable. '+log);
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map(),errors=[],frames=[];
    socket.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.method==='Page.screencastFrame'){frames.push({image:msg.params.data,timestamp:msg.params.metadata.timestamp});socket.send(JSON.stringify({id:++id,method:'Page.screencastFrameAck',params:{sessionId:msg.params.sessionId}}));}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);if(msg.method==='Runtime.consoleAPICalled'&&msg.params.type==='error')errors.push('Console error');const job=pending.get(msg.id);if(job){pending.delete(msg.id);clearTimeout(job.timer);msg.error?job.reject(Error(msg.error.message)):job.resolve(msg.result);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>reject(Error('CDP timeout')),20000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const until=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return true;await wait(50);}return false;};
    await send('Runtime.enable');await until('Boolean(window.IslandPreview)');
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
    if(liveRead){
      const result=await evaluate("(async()=>{const v=await __TAURI__.core.invoke('read_usage');return {status:v.status,reason:v.reason||null,buckets:v.buckets?.length||0,source:v.source||null,sessionMapped:v.sessionMapped===true};})()");
      await evaluate('IslandPreview.showOverview()');await wait(400);
      const clip=await evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
      const shot=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(path.join(root,'artifacts/quota-native-account.png'),Buffer.from(shot.data,'base64'));
      result.visibleReading=await evaluate("document.getElementById('usage-band').textContent.includes('left')");
      fs.writeFileSync(path.join(root,'artifacts/quota-account-read.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));return;
    }
    const checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
    const shot=async name=>{const clip=await evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");const image=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(path.join(root,'artifacts',name+'.png'),Buffer.from(image.data,'base64'));};
    await wait(400);
    check('Native empty strip uses Idle and the application mark',await evaluate("document.getElementById('compact-title').textContent==='Idle' && !!document.querySelector('.application-mark')"));
    const bounds=()=>evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})()");
    const before=await bounds();
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x+before.width/2,y:20});
    await until('IslandPreview.snapshot().peek');
    const samples=[];for(let i=0;i<12;i++){samples.push(await bounds());await wait(25);}
    const after=await bounds();
    check('Hover widens horizontally without opening or changing height',after.width>before.width && samples.every(r=>r.height===before.height && r.y===before.y) && !await evaluate('IslandPreview.snapshot().expanded'));
    check('Native hover animation reaches its requested width',Math.abs(after.width-440)<1);
    await shot('refinement-native-hover');
    fs.writeFileSync(path.join(root,'artifacts/hover-motion-samples.json'),JSON.stringify(samples,null,2));
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:300});await wait(500);
    check('Pointer exit settles at compact width',Math.abs((await bounds()).width-before.width)<1);
    await evaluate("document.getElementById('compact-view').focus()");await wait(420);
    check('Keyboard focus reveals the same width-only information',(await bounds()).width>before.width && !await evaluate('IslandPreview.snapshot().expanded'));
    await evaluate("document.getElementById('compact-view').blur();IslandPreview.showOverview()");await wait(350);
    await send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1,maxWidth:740,maxHeight:1080});
    await evaluate("document.getElementById('settings-button').click()");await wait(350);
    check('Settings stays in the island with no dialog or extra surface',await evaluate("IslandPreview.snapshot().settingsOpen && !document.querySelector('dialog') && document.getElementById('island-surface').contains(document.getElementById('settings-view'))"));
    for(const page of ['agents','appearance','behavior']){
      await evaluate(`document.querySelector('[data-settings-page="${page}"]').click()`);await wait(300);
      check(`${page} navigation reveals real controls`,await evaluate(`!document.getElementById('settings-${page}').hidden`));
      await shot('refinement-native-'+page);
    }
    await send('Page.stopScreencast');
    fs.mkdirSync(path.join(root,'artifacts/motion-frames'),{recursive:true});
    const recording=frames.map((frame,i)=>{const file=`frame-${String(i).padStart(3,'0')}.jpg`;fs.writeFileSync(path.join(root,'artifacts/motion-frames',file),Buffer.from(frame.image,'base64'));return{file,timestamp:frame.timestamp};});
    fs.writeFileSync(path.join(root,'artifacts/motion-frames/recording.json'),JSON.stringify(recording,null,2));
    await evaluate("document.querySelector('[data-settings-page=appearance]').click();document.getElementById('setting-motion').click()");
    check('Reduced motion updates the native surface immediately',await evaluate("IslandPreview.snapshot().reducedMotion && getComputedStyle(document.getElementById('island-surface')).transitionDuration.split(',').every(v=>parseFloat(v)===0)"));
    await evaluate("document.getElementById('setting-motion').click();document.querySelector('[data-settings-page=agents]').click();document.querySelector('[data-provider=codex]').click()");
    check('Provider detail explains unavailable account quota',await evaluate("document.getElementById('provider-usage-detail').textContent.includes('Usage unavailable')"));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    check('Escape returns from provider detail to Agents',await evaluate('IslandPreview.snapshot().settingsOpen && !IslandPreview.snapshot().providerPage'));
    const report={agentId:'codex',sessionId:'refinement-only',eventId:'event-1',sourceRevision:1,status:'waiting_approval',requestId:'test-request',taskTitle:'Isolated native fixture',command:'npm test'};
    await fetch('http://127.0.0.1:37898/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
    await until('IslandPreview.snapshot().sessions.length===1');
    check('A new request updates attention without replacing Settings',await evaluate("IslandPreview.snapshot().settingsOpen && !document.getElementById('settings-attention').hidden"));
    await evaluate("document.getElementById('settings-attention').click()");
    check('View request opens monitoring-only detail explicitly',await evaluate("!IslandPreview.snapshot().settingsOpen && IslandPreview.snapshot().focused && !document.querySelector('[data-action=allow]')"));
    await evaluate("IslandPreview.setExpanded(false);IslandPreview.setExpanded(true);IslandPreview.setExpanded(false)");await wait(350);
    check('Interrupted native transitions settle at compact height',!await evaluate('IslandPreview.snapshot().expanded') && (await bounds()).height===42);
    check('No native JavaScript exceptions or console errors',errors.length===0);
    const result={passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks,modelCalls:0};
    fs.writeFileSync(path.join(root,'artifacts/refinements-native.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
    if(result.failed.length)process.exitCode=1;
    const physical=JSON.parse(execFileSync(process.execPath,[path.join(root,'tests/native/check-outside-click.cjs'),String(app.pid)],{encoding:'utf8',windowsHide:true,timeout:60000}));
    fs.writeFileSync(path.join(root,'artifacts/refinements-outside-click.json'),JSON.stringify(physical,null,2));console.log('Physical outside clicks:',physical.passed,'passed');
  }finally{socket?.close();app.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
