// Starts an isolated local OpenCode server to verify plugin discovery. No session or prompt is created.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),crypto=require('node:crypto'),http=require('node:http');
const {spawn}=require('node:child_process');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'threadcap-plugin-load-'));
  const folder=path.join(temp,'config/opencode/plugins/threadcap-monitor');fs.mkdirSync(folder,{recursive:true});
  const helper=path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
  const reports=[];
  const receiver=http.createServer((req,res)=>{let body='';req.on('data',chunk=>{body+=chunk;});req.on('end',()=>{reports.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end('{"accepted":true}');});});
  await new Promise(resolve=>receiver.listen(0,'127.0.0.1',resolve));
  fs.writeFileSync(path.join(folder,'index.js'),fs.readFileSync(path.join(root,'bridge/opencode-threadcap.js'),'utf8').replace('__THREADCAP_HELPER__',JSON.stringify(helper)).replace('__THREADCAP_PORT__',String(receiver.address().port)));
  const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
  const env={...process.env,LOCALAPPDATA:temp,XDG_CONFIG_HOME:path.join(temp,'config'),XDG_DATA_HOME:path.join(temp,'data'),XDG_CACHE_HOME:path.join(temp,'cache'),XDG_STATE_HOME:path.join(temp,'state')};
  for(const key of Object.keys(env))if(key.startsWith('OPENCODE_'))delete env[key];
  const password=crypto.randomUUID();env.OPENCODE_SERVER_PASSWORD=password;
  const binary=path.join(process.env.APPDATA,'npm/node_modules/@opencode/cli/bin/opencode.exe');
  const logFile=path.join(root,'artifacts/threadcap-opencode-server.log'),log=fs.openSync(logFile,'w');
  const server=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(port)],{cwd:temp,env,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
  let plugin,error;
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
    const until=async fn=>{for(let i=0;i<80;i++){if(fn())return true;await wait(50);}return false;};
    const opened=await until(()=>reports.some(r=>r.sessionId===`opencode:${id}` && r.status==='idle' && r.workingDirectory===temp));
    await request('DELETE','/api/session/'+encodeURIComponent(id));
    const ended=await until(()=>reports.some(r=>r.sessionId===`opencode:${id}` && r.eventKind==='session_end' && r.connectionStatus==='disconnected'));
    const result={passed:plugin?.state?.status==='active' && opened && ended,plugin:plugin ? {id:plugin.id,state:plugin.state,features:plugin.features}:null,openedSessionObserved:opened,deletedSessionObserved:ended,error:plugin?null:error,modelCalls:0,configuration:'Only the isolated plugin directory and an owned empty session were created; no user configuration or model turn was used.'};
    fs.writeFileSync(path.join(root,'artifacts/threadcap-opencode-plugin.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
    if(!result.passed)process.exitCode=1;
  }finally{
    await new Promise(resolve=>receiver.close(resolve));
    if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
