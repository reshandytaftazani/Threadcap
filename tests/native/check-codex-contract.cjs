// Ask the installed Codex to parse isolated hooks. No thread, turn, trust mutation, or model call is created.
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

async function main() {
  const root=path.resolve(__dirname,'../..');
  const helper=path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-island-codex-contract-'));
  const home=path.join(temporary,'codex');fs.mkdirSync(home);
  const env={...process.env,CODEX_HOME:home,LOCALAPPDATA:temporary};
  execFileSync(helper,['install','--codex-home',home],{env,encoding:'utf8',windowsHide:true});
  const server=spawn('codex.exe',['app-server','--listen','stdio://'],{env,cwd:temporary,windowsHide:true,stdio:['pipe','pipe','pipe']});
  server.stderr.resume();
  const pending=new Map();let nextId=0;
  const lines=readline.createInterface({input:server.stdout});
  lines.on('line',(line)=>{try{const message=JSON.parse(line),request=pending.get(message.id);if(request){pending.delete(message.id);clearTimeout(request.timer);message.error?request.reject(new Error(message.error.message)):request.resolve(message.result);}}catch{}});
  const request=(method,params)=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Codex RPC timeout: '+method));},12000);pending.set(id,{resolve,reject,timer});server.stdin.write(JSON.stringify({id,method,params})+'\n');});
  try {
    await request('initialize',{clientInfo:{name:'vibe_island_contract_test',version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version},capabilities:{experimentalApi:true}});
    server.stdin.write(JSON.stringify({method:'initialized'})+'\n');
    const result=await request('hooks/list',{cwds:[temporary]});
    const ours=(result.data||[]).flatMap(entry=>entry.hooks||[]).filter(hook=>{
      const prefix='powershell.exe -NoProfile -NonInteractive -EncodedCommand ';
      return (hook.command?.startsWith('"') && hook.command.endsWith(' --integration-id vibe-island.codex.v1')) || (hook.command?.startsWith(prefix) && Buffer.from(hook.command.slice(prefix.length),'base64').toString('utf16le').startsWith('# vibe-island.codex.v1\n'));
    });
    const summary={codexVersion:execFileSync('codex.exe',['--version'],{env,encoding:'utf8',windowsHide:true}).trim(),registeredHooks:ours.length,trustStatuses:[...new Set(ours.map(hook=>hook.trustStatus))],parseErrors:(result.data||[]).flatMap(entry=>entry.errors||[]).length,modelCalls:0};
    console.log(JSON.stringify(summary,null,2));
    if(ours.length!==10 || ours.some(hook=>hook.trustStatus!=='untrusted') || summary.parseErrors) throw new Error('Codex did not recognize the expected untrusted monitoring hooks.');
  } finally { lines.close();server.stdin.end();server.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
