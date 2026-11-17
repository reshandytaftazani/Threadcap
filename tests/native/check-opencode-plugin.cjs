// Real isolated OpenCode server with owned session/form fixtures; no model prompt is sent.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),crypto=require('node:crypto'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'threadcap-plugin-load-'));
  const native=process.env.THREADCAP_TEST_NATIVE==='1';
  const replies=process.env.THREADCAP_TEST_REPLIES==='1';
  if(native) {
    const exe=process.env.VIBE_ISLAND_TEST_EXE || path.join(root,'src-tauri/target/release/vibe-island.exe');
    for(const file of ['src/app.js','src/desktop.js','src/island.css','src-tauri/src/opencode_questions.rs','crates/codex-bridge/src/providers.rs'])if(fs.statSync(exe).mtimeMs<fs.statSync(path.join(root,file)).mtimeMs)throw Error('Rebuild the native host before checking OpenCode questions.');
  }
  const h=native ? await require('./native-harness.cjs').startNative('opencode-questions') : null;
  const nativeChecks=[],nativeErrors=[];
  if(h) {
    h.on('Runtime.exceptionThrown',()=>nativeErrors.push('JavaScript exception'));
    h.on('Runtime.consoleAPICalled',event=>{if(event.type==='error')nativeErrors.push('Console error');});
    await h.send('Runtime.enable');
  }
  const check=(name,passed)=>{nativeChecks.push({name,passed:!!passed});if(!passed)throw Error(name);};
  const folder=path.join(temp,'config/opencode/plugins/threadcap-monitor');fs.mkdirSync(folder,{recursive:true});
  const helper=path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
  const reports=[];
  const receiver=http.createServer((req,res)=>{let body='';req.on('data',chunk=>{body+=chunk;});req.on('end',async()=>{try{const report=JSON.parse(body);reports.push(report);if(h)await h.inject(report);res.writeHead(200,{'Content-Type':'application/json'});res.end('{"accepted":true}');}catch{res.writeHead(500);res.end();}});});
  await new Promise(resolve=>receiver.listen(0,'127.0.0.1',resolve));
  fs.writeFileSync(path.join(folder,'index.js'),fs.readFileSync(path.join(root,'integrations/opencode/server.js'),'utf8').replace('__THREADCAP_HELPER__',JSON.stringify(helper)).replace('__THREADCAP_PORT__',String(receiver.address().port)));
  if(replies) {
    fs.writeFileSync(path.join(folder,'tui.js'),fs.readFileSync(path.join(root,'integrations/opencode/tui.js'),'utf8').replace('__THREADCAP_HELPER__',JSON.stringify(helper)).replace('__THREADCAP_PORT__',String(h.port)));
    fs.copyFileSync(path.join(root,'integrations/opencode/questions.js'),path.join(folder,'questions.js'));
    fs.writeFileSync(path.join(temp,'config/opencode/cli.json'),JSON.stringify({plugins:['./plugins/threadcap-monitor']}));
  }
  const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
  const env={...process.env,LOCALAPPDATA:replies?h.temp:temp,XDG_CONFIG_HOME:path.join(temp,'config'),XDG_DATA_HOME:path.join(temp,'data'),XDG_CACHE_HOME:path.join(temp,'cache'),XDG_STATE_HOME:path.join(temp,'state')};
  for(const key of Object.keys(env))if(key.startsWith('OPENCODE_'))delete env[key];
  const password=crypto.randomUUID();env.OPENCODE_SERVER_PASSWORD=password;
  const binary=path.join(process.env.APPDATA,'npm/node_modules/@opencode/cli/bin/opencode.exe');
  const logFile=path.join(root,'artifacts/threadcap-opencode-server.log'),log=fs.openSync(logFile,'w');
  const server=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(port)],{cwd:temp,env,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
  let plugin,error,ownedTerminal;
  try{
    for(let i=0;i<60;i++){
      try{
        const response=await fetch(`http://127.0.0.1:${port}/api/plugin`,{headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64')},signal:AbortSignal.timeout(2000)});
        if(!response.ok)throw Error('Plugin inspection HTTP '+response.status);
        const value=await response.json();plugin=value.data?.find(item=>item.id==='threadcap.monitor');
        if(plugin)break;
      }catch(failure){error=String(failure);}
      await wait(200);
    }
    const request=async(method,url,body)=>{const response=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!response.ok)throw Error(method+' '+url+' HTTP '+response.status);return response.status===204?null:response.json();};
    if(plugin?.state?.status!=='active')throw Error(error||'Plugin did not become active');
    const created=await request('POST','/api/session',{title:'Threadcap owned monitoring check',location:{directory:temp}});
    const session=created.data || created, id=session.id || session.sessionID;
    if(replies) {
      const manifest=path.join(temp,'reply-tui.json');
      fs.writeFileSync(manifest,JSON.stringify({binary,env:Object.fromEntries(['LOCALAPPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','XDG_STATE_HOME','OPENCODE_SERVER_PASSWORD'].map(key=>[key,env[key]])),serverUrl:`http://127.0.0.1:${port}`,sessionId:id,directory:temp}));
      const quote=value=>"'"+value.replaceAll("'","''")+"'";
      const command=`& ${quote(path.join(root,'tests/native/run-opencode-reply-tui.ps1'))} -Manifest ${quote(manifest)}`;
      const result=JSON.parse(execFileSync('orca.exe',['terminal','create','--title','Threadcap reply verification','--command',command,'--json'],{cwd:root,encoding:'utf8',windowsHide:true}));
      fs.writeFileSync(path.join(root,'artifacts/opencode-reply-terminal.json'),JSON.stringify(result,null,2));
      ownedTerminal=result.result?.terminal?.handle || result.result?.handle || result.result?.terminalHandle;
      await wait(3000);
    }
    const until=async fn=>{for(let i=0;i<80;i++){if(fn())return true;await wait(50);}return false;};
    const opened=await until(()=>reports.some(r=>r.sessionId===`opencode:${id}` && r.status==='idle' && r.workingDirectory===temp));
    const formResult=await request('POST',`/api/session/${encodeURIComponent(id)}/form`,{title:'Synthetic storage question',metadata:{kind:'question'},fields:[{key:'q0',type:'string',title:'Which database should store settings?',options:[{value:'sqlite',label:'SQLite',description:'Local storage'},{value:'postgres',label:'PostgreSQL',description:'Server storage'}]}]});
    const form=formResult.data || formResult;
    const questionObserved=await until(()=>reports.some(r=>r.sessionId===`opencode:${id}` && r.requestId===`form:${form.id}` && r.status==='waiting_input'));
    const question=reports.find(r=>r.requestId===`form:${form.id}`);
    if(h && replies) {
      await require('./opencode-reply-checks.cjs')({h,request,id,form,check,root});
      check('Direct replies report no native JavaScript errors',nativeErrors.length===0);
    } else if(h) {
      check('A real OpenCode form automatically opens its focused native request',await h.until(`IslandPreview.snapshot().focused && IslandPreview.snapshot().selected===${JSON.stringify('opencode:'+id)}`));
      check('Monitoring-only detail exposes question, choices, descriptions, and no answer buttons',await h.evaluate("document.querySelector('.question')?.textContent==='Which database should store settings?' && document.querySelectorAll('.observed-options li').length===2 && document.querySelector('.observed-options')?.textContent.includes('Local storage') && !document.querySelector('.option-button,.reply-input')"));
      await h.wait(400);
      const clip=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
      const screenshot=await h.send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(path.join(root,'artifacts/opencode-question-native.png'),Buffer.from(screenshot.data,'base64'));
      await h.evaluate('IslandPreview.setExpanded(false)');await h.inject(question);await h.wait(250);
      check('Replaying the same request does not reopen a dismissed surface',await h.evaluate('!IslandPreview.snapshot().expanded'));
      await request('DELETE',`/api/session/${id}/form/${form.id}`);
      check('Cancelling the owning OpenCode form withdraws native attention',await h.until("IslandPreview.snapshot().sessions.every(s=>s.status!=='waiting_input')"));
      await h.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:700});
      await h.evaluate('document.activeElement.blur();IslandPreview.showOverview()');
      const second=await request('POST',`/api/session/${id}/form`,{title:'Second synthetic question',fields:[{key:'q0',type:'string',title:'Choose the next step'}]});
      check('A fresh form reveals from an unattended unselected overview',await h.until('IslandPreview.snapshot().focused'));
      await request('DELETE',`/api/session/${id}/form/${(second.data||second).id}`);
      await h.until("IslandPreview.snapshot().sessions.every(s=>s.status!=='waiting_input')");
      await h.evaluate("document.getElementById('settings-button').click()");
      const third=await request('POST',`/api/session/${id}/form`,{title:'Deferred synthetic question',fields:[{key:'q0',type:'string',title:'Keep Settings in place?'}]});
      await h.until("IslandPreview.snapshot().sessions.some(s=>s.status==='waiting_input')");
      check('A fresh form preserves Settings and exposes a View request route',await h.evaluate("IslandPreview.snapshot().settingsOpen && !document.getElementById('settings-attention').hidden"));
      await h.evaluate("document.getElementById('settings-attention').click()");
      check('View request opens the deferred question explicitly',await h.until('!IslandPreview.snapshot().settingsOpen && IslandPreview.snapshot().focused'));
      await request('DELETE',`/api/session/${id}/form/${(third.data||third).id}`);
      await h.until("IslandPreview.snapshot().sessions.every(s=>s.status!=='waiting_input')");
      await h.evaluate("IslandPreview.setExpanded(false);const setting=document.getElementById('setting-auto-open');setting.checked=false;setting.dispatchEvent(new Event('change'))");
      const fourth=await request('POST',`/api/session/${id}/form`,{title:'Manual synthetic question',fields:[{key:'q0',type:'string',title:'Auto-open is disabled'}]});
      await h.until("IslandPreview.snapshot().sessions.some(s=>s.status==='waiting_input')");
      check('Disabled Auto-open retains the request without expanding',await h.evaluate('!IslandPreview.snapshot().expanded'));
      await request('DELETE',`/api/session/${id}/form/${(fourth.data||fourth).id}`);
      check('Request presentation reports no native JavaScript errors',nativeErrors.length===0);
    }
    await request('DELETE','/api/session/'+encodeURIComponent(id));
    const ended=await until(()=>reports.some(r=>r.sessionId===`opencode:${id}` && r.eventKind==='session_end' && r.connectionStatus==='disconnected'));
    const result={passed:plugin?.state?.status==='active' && opened && ended && questionObserved && question?.question==='Which database should store settings?' && question?.options?.length===2,plugin:plugin ? {id:plugin.id,state:plugin.state,features:plugin.features}:null,openedSessionObserved:opened,deletedSessionObserved:ended,questionObserved,questionTextObserved:question?.question==='Which database should store settings?',questionOptions:question?.options?.length || 0,nativeChecks,error:plugin?null:error,modelCalls:0,configuration:'Only isolated plugin/profile directories, an owned session, and synthetic interactive forms were created; no user configuration or model turn was used.'};
    fs.writeFileSync(path.join(root,replies?'artifacts/threadcap-opencode-replies-native.json':native?'artifacts/threadcap-opencode-questions-native.json':'artifacts/threadcap-opencode-plugin.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
    if(!result.passed)process.exitCode=1;
  }finally{
    if(ownedTerminal)try{
      fs.writeFileSync(path.join(root,'artifacts/opencode-reply-tui-screen.json'),execFileSync('orca.exe',['terminal','read','--terminal',ownedTerminal,'--screen','--json'],{cwd:root,encoding:'utf8',windowsHide:true}));
      execFileSync('orca.exe',['terminal','close','--terminal',ownedTerminal,'--json'],{cwd:root,encoding:'utf8',windowsHide:true});
    }catch{}
    await new Promise(resolve=>receiver.close(resolve));
    if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
    await h?.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
