const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function startNative(name,options={}){
  const root=path.resolve(__dirname,'..'),temp=options.temp || fs.mkdtempSync(path.join(os.tmpdir(),`island-${name}-`));
  const free=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  const port=await free(),debug=await free();
  const env={...process.env,LOCALAPPDATA:temp,THREADCAP_CONFIG_ROOT:temp,XDG_CONFIG_HOME:path.join(temp,'config'),CODEX_HOME:path.join(temp,'codex'),VIBE_ISLAND_PORT:String(options.port || port),VIBE_ISLAND_STATE_FILE:path.join(temp,'sessions.sqlite3'),VIBE_ISLAND_CODEX_STATE_FILE:path.join(temp,'codex.sqlite3'),VIBE_ISLAND_USAGE_DISABLED:options.usageEnabled?'0':'1',VIBE_ISLAND_CODEX_USAGE_DISABLED:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${debug} --remote-debugging-address=127.0.0.1`,WEBVIEW2_USER_DATA_FOLDER:path.join(temp,'webview')};
  const logFile=path.join(temp,'native-host.log'),log=fs.openSync(logFile,'a');
  if(options.useDefaultCache)env.VIBE_ISLAND_CODEX_STATE_FILE=path.join(temp,'VibeIsland',`codex-hooks-${env.VIBE_ISLAND_PORT}.sqlite3`);
  const app=spawn(process.env.VIBE_ISLAND_TEST_EXE || path.join(root,'src-tauri/target/release/vibe-island.exe'),[],{env,windowsHide:true,stdio:['ignore',log,log]});
  fs.closeSync(log);
  let socket;
  const close=async()=>{socket?.close();if(app.exitCode===null)await new Promise(resolve=>{app.once('exit',resolve);app.kill();});};
  try {
    let page,lastPages,lastFailure;for(let i=0;i<200;i++){try{lastPages=await(await fetch(`http://127.0.0.1:${debug}/json`)).json();page=lastPages.find(p=>p.title==='Threadcap');if(page)break;}catch(error){lastFailure=String(error);}await wait(50);}
    if(!page)throw Error(`Smoke host did not start (exit ${app.exitCode}; pages ${JSON.stringify(lastPages?.map(p=>({title:p.title,url:p.url})))}; ${lastFailure || ''}). ${fs.readFileSync(logFile,'utf8').slice(-2500)}`);
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const jobs=new Map(),listeners=new Map();socket.onmessage=({data})=>{const msg=JSON.parse(data),job=jobs.get(msg.id);if(job){jobs.delete(msg.id);clearTimeout(job.timer);msg.error?job.reject(Error(msg.error.message)):job.resolve(msg.result);}else if(msg.method)listeners.get(msg.method)?.(msg.params);};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{jobs.delete(key);reject(Error('Native inspection timed out'));},15000);jobs.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const until=async expression=>{for(let i=0;i<300;i++){if(await evaluate(expression))return true;await wait(35);}return false;};
    if(!await until('Boolean(window.IslandPreview && window.IslandDesktop)'))throw Error('Native UI did not initialize');
    const activePort=Number(env.VIBE_ISLAND_PORT);
    const inject=async report=>{const response=await fetch(`http://127.0.0.1:${activePort}/api/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(await response.text());return response.json();};
    return {root,temp,port:activePort,debug,env,app,send,evaluate,until,inject,close,wait,on:(method,handler)=>listeners.set(method,handler)};
  } catch(error){await close();throw error;}
}
module.exports={startNative};
