const {spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'island-edge-'));
  for(const port of [37898,9228])await new Promise((resolve,reject)=>{const p=require('node:net').createServer();p.once('error',reject);p.listen({host:'127.0.0.1',port,exclusive:true},()=>p.close(resolve));});
  const app=spawn(path.join(root,'src-tauri/target/release/vibe-island.exe'),[],{windowsHide:true,stdio:'ignore',env:{...process.env,CODEX_HOME:temp,LOCALAPPDATA:temp,VIBE_ISLAND_PORT:'37898',VIBE_ISLAND_STATE_FILE:':memory:',VIBE_ISLAND_USAGE_DISABLED:'1',WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9228 --remote-debugging-address=127.0.0.1',WEBVIEW2_USER_DATA_FOLDER:path.join(temp,'webview')}});let socket;
  try{
    let page;for(let i=0;i<150;i++){try{page=(await(await fetch('http://127.0.0.1:9228/json')).json()).find(p=>p.title==='Vibe Island');if(page)break;}catch{}await wait(50);}
    if(!page)throw Error('Isolated edge-test host unavailable.');
    socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=({data})=>{const msg=JSON.parse(data),job=pending.get(msg.id);if(job){pending.delete(msg.id);msg.error?job.reject(Error(msg.error.message)):job.resolve(msg.result);}};
    const evaluate=expression=>new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve:r=>r.exceptionDetails?reject(Error(r.exceptionDetails.text)):resolve(r.result.value),reject});socket.send(JSON.stringify({id:current,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
    await wait(500);await evaluate("IslandPreview.setExpanded(false);document.getElementById('compact-view').focus()");await wait(400);
    const results=[],capture=mode=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-File',path.join(root,'scripts/check-native-edge.ps1'),'-NativeProcessId',String(app.pid),'-Mode',mode],{windowsHide:true,encoding:'utf8'}));
    results.push(capture('baseline'));
    await evaluate("document.getElementById('island-surface').style.borderColor='transparent'");await wait(200);results.push(capture('css-transparent'));
    await evaluate("document.getElementById('island-surface').style.borderColor=''");results.push(capture('dwm-none'));
    const policy=await evaluate("(async()=>{const status=await __TAURI__.core.invoke('desktop_ready');return status.frameBorderSuppressed===true;})()");
    const report={framePolicyAccepted:policy,cases:results};
    fs.writeFileSync(path.join(root,'artifacts/native-edge-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    if(!policy || results.some(r=>r.brightEdgePixels!==0 || (r.mode==='dwm-none' && r.dwmResult!==0)))process.exitCode=1;
  }finally{socket?.close();app.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
