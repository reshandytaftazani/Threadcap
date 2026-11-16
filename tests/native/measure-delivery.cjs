const {startNative}=require('./native-harness.cjs');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)];
async function main(){
  const h=await startNative('latency');
  try{
    await h.evaluate(`(()=>{window.deliveryMarks={};new MutationObserver(()=>{for(const row of document.querySelectorAll('[data-session]')){const id=row.dataset.session;if(!window.deliveryMarks[id]){window.deliveryMarks[id]={dom:Date.now()};requestAnimationFrame(()=>requestAnimationFrame(()=>{window.deliveryMarks[id].frame=Date.now();}));}}}).observe(document.getElementById('sessions-list'),{childList:true,subtree:true});})()`);
    const helper=path.join(h.root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe'),samples=[];
    for(const mode of ['direct','cmd','powershell'])for(let i=0;i<8;i++){
      const id=`latency-${mode}-${i}`,sid=`codex:${id}`,event={hook_event_name:'SessionStart',session_id:id,cwd:h.temp,source:'startup'};
      const cache=path.join(h.temp,`helper-${mode}${i===0?'-cold':''}.sqlite3`);
      const directArgs=['hook','--port',String(h.port),'--state-file',cache];
      const script=`[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false);$OutputEncoding=[Console]::InputEncoding;[Console]::In.ReadToEnd() | & '${helper.replaceAll("'","''")}' hook --port ${h.port} --state-file '${cache.replaceAll("'","''")}'`;
      const started=Date.now();
      const executable=mode==='direct'?helper:mode==='cmd'?'cmd.exe':'powershell.exe';
      const args=mode==='direct'?directArgs:mode==='cmd'?['/D','/S','/C',`""${helper}" hook --port ${h.port} --state-file "${cache}""`]:['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
      await new Promise((resolve,reject)=>{const proc=spawn(executable,args,{env:h.env,windowsHide:true,windowsVerbatimArguments:mode==='cmd',stdio:['pipe','ignore','pipe']});let error='';proc.stderr.on('data',b=>error+=b);proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(Error(error)));proc.stdin.end(JSON.stringify(event));});
      const exited=Date.now();
      if(!await h.until(`Boolean(window.deliveryMarks[${JSON.stringify(sid)}]?.frame)`))throw Error('Report lost before DOM/frame: '+sid);
      const result=await h.evaluate(`({marks:window.deliveryMarks[${JSON.stringify(sid)}],session:IslandPreview.snapshot().sessions.find(s=>s.sessionId===${JSON.stringify(sid)})})`);
      samples.push({mode,cold:i===0,processMs:exited-started,launchToCoreMs:result.session.lastSeenAt-started,coreToDomMs:result.marks.dom-result.session.lastSeenAt,launchToFrameMs:result.marks.frame-started});
    }
    const summary={};for(const mode of ['direct','cmd','powershell']){const rows=samples.filter(s=>s.mode===mode&&!s.cold);summary[mode]={warmSamples:rows.length,p50FrameMs:quantile(rows.map(s=>s.launchToFrameMs),.5),p95FrameMs:quantile(rows.map(s=>s.launchToFrameMs),.95),coldFrameMs:samples.find(s=>s.mode===mode&&s.cold).launchToFrameMs};}
    const burst=await Promise.all(Array.from({length:6},async(_,i)=>{
      const id=`burst-${i}`,sid=`codex:${id}`,cache=path.join(h.temp,'burst.sqlite3'),started=Date.now();
      const args=['/D','/S','/C',`""${helper}" hook --port ${h.port} --state-file "${cache}""`];
      await new Promise((resolve,reject)=>{const proc=spawn('cmd.exe',args,{env:h.env,windowsHide:true,windowsVerbatimArguments:true,stdio:['pipe','ignore','pipe']});proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(Error('Concurrent hook failed')));proc.stdin.end(JSON.stringify({hook_event_name:'SessionStart',session_id:id,cwd:h.temp,source:'startup'}));});
      if(!await h.until(`Boolean(window.deliveryMarks[${JSON.stringify(sid)}]?.frame)`))throw Error('Concurrent report lost');
      return {sessionId:sid,launchToFrameMs:await h.evaluate(`window.deliveryMarks[${JSON.stringify(sid)}].frame`)-started};
    }));
    const report={summary,samples,burst,modelCalls:0,dropped:0,limits:'Small isolated sample on this machine, growing from zero to 30 retained sessions, including six concurrent reporters sharing a helper cache. Frame means a double requestAnimationFrame opportunity after DOM mutation, not a physical display measurement. Core timestamp precedes commit; core-to-DOM includes commit, IPC and rendering. First sample uses a fresh helper cache; subsequent samples reuse the warm cache.'};
    fs.mkdirSync(path.join(h.root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(h.root,'artifacts/session-delivery.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary,dropped:0,modelCalls:0},null,2));
  }finally{await h.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
