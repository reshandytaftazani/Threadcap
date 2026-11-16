// Physical Windows click regression against an isolated app and an owned, harmless receiver window.
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const readline = require('node:readline');
const path = require('node:path');
const execute = promisify(execFile);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const appProcess = Number(process.argv[2]);
  if (!appProcess) throw new Error('Supply the isolated native app process ID.');
  const debugPort = Number(process.argv[3] || 9228);
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const page = pages.find((page) => page.type === 'page' && page.title === 'Threadcap');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data), request = pending.get(message.id);
    if (request) { pending.delete(message.id); clearTimeout(request.timer); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
  };
  const evaluate = async (expression) => {
    const result = await new Promise((resolve,reject) => {
      const id = ++nextId, timer = setTimeout(()=>{pending.delete(id);reject(new Error('Native evaluation timed out'));},5000);
      pending.set(id,{resolve,reject,timer}); socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const receiver = spawn('powershell.exe',['-NoProfile','-File',path.join(__dirname,'native-click-receiver.ps1')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let clicks=0;
  const lines=readline.createInterface({input:receiver.stdout});
  const receiverReady = new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Test receiver did not start')),8000);
    lines.on('line',(line)=>{try {const event=JSON.parse(line);if(event.kind==='ready'){clearTimeout(timer);resolve(event);}if(event.kind==='click')clicks=event.count;}catch{}});
    receiver.on('error',reject);
  });
  const checks=[];
  const check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
  const until=async(expression)=>{for(let i=0;i<50;i++){if(await evaluate(expression))return true;await wait(30);}return false;};
  const click=async(processId,x,y,right=false)=>{
    await execute('powershell.exe',['-NoProfile','-File',path.join(__dirname,'native-test-click.ps1'),'-ExpectedProcessId',String(processId),'-X',String(Math.round(x)),'-Y',String(Math.round(y)),...(right?['-Right']:[])],{windowsHide:true,timeout:8000});
  };
  try {
    const target=await receiverReady;
    await evaluate('IslandPreview.setExpanded(false)');
    await click(target.processId,target.x,target.y);
    await until('!IslandPreview.snapshot().expanded');
    // Open without moving OS focus away from the receiver: blur alone cannot dismiss this case.
    await evaluate('IslandPreview.showOverview()');await wait(400);
    const foreground=JSON.parse((await execute('powershell.exe',['-NoProfile','-File',path.join(__dirname,'native-test-click.ps1'),'-ExpectedProcessId',String(appProcess),'-Locate'],{windowsHide:true})).stdout).foregroundProcessId;
    check('Panel opened while another window retained foreground focus',await evaluate('IslandPreview.snapshot().expanded') && foreground===target.processId);
    let before=clicks;
    await click(target.processId,target.x,target.y);
    check('Outside click collapses a panel that never acquired focus',await until('!IslandPreview.snapshot().expanded'));
    check('The same outside click reaches its intended window',clicks===before+1);

    await evaluate('IslandPreview.showOverview()');await wait(400);
    const position=JSON.parse((await execute('powershell.exe',['-NoProfile','-File',path.join(__dirname,'native-test-click.ps1'),'-ExpectedProcessId',String(appProcess),'-Locate'],{windowsHide:true})).stdout);
    const location=await evaluate(`(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return {x:(r.x+r.width/2)*devicePixelRatio,y:12*devicePixelRatio};})()`);
    await click(appProcess,position.x+location.x,position.y+location.y);await wait(120);
    check('Clicking inside the island keeps the panel open',await evaluate('IslandPreview.snapshot().expanded'));
    await click(target.processId,target.x,target.y);
    check('Outside click also collapses after direct island interaction',await until('!IslandPreview.snapshot().expanded'));

    await evaluate('IslandPreview.showOverview();document.getElementById(\'settings-button\').click()');await wait(400);
    const settingsPoint=await evaluate(`(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return {x:(r.x+r.width/2)*devicePixelRatio,y:(r.y+55)*devicePixelRatio};})()`);
    await click(appProcess,position.x+settingsPoint.x,position.y+settingsPoint.y);
    check('Clicking inside Settings does not dismiss it',await evaluate('IslandPreview.snapshot().settingsOpen'));
    before=clicks;
    await click(target.processId,target.x,target.y,true);
    check('Outside right-click closes Settings and collapses the island',await until('!IslandPreview.snapshot().settingsOpen && !IslandPreview.snapshot().expanded'));
    check('Outside right-click is forwarded to its target',clicks===before+1);

    await evaluate('IslandPreview.setExpanded(true);IslandPreview.setExpanded(false);IslandPreview.setExpanded(true)');await wait(400);
    await click(target.processId,target.x,target.y);
    check('Rapid close and reopen correctly re-arms outside dismissal',await until('!IslandPreview.snapshot().expanded'));
    console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks},null,2));
    process.exitCode=checks.some(c=>!c.passed)?1:0;
  } finally { receiver.kill();lines.close();socket.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
