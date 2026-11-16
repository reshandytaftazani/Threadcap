// Real OpenCode TUI clients attach to an isolated server and native island; no model prompt is sent.
const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'threadcap opencode lifetime '));
 let h=await startNative('opencode-lifetime',{temp,useDefaultCache:true});
 const checks=[];const check=(name,passed)=>{checks.push({name,passed:!!passed});if(!passed)throw Error(name);};
 const serverPort=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>resolve(p));});});
 const password=crypto.randomUUID(),env={...h.env,XDG_DATA_HOME:path.join(temp,'data'),XDG_CACHE_HOME:path.join(temp,'cache'),XDG_STATE_HOME:path.join(temp,'state'),OPENCODE_SERVER_PASSWORD:password};
 for(const key of Object.keys(env))if(key.startsWith('ORCA_'))delete env[key];
 const binary=path.join(process.env.APPDATA,'npm/node_modules/@opencode/cli/bin/opencode.exe');
 await h.evaluate("IslandDesktop.providerIntegration('opencode','connect')");
 const log=fs.openSync(path.join(temp,'server.log'),'w');
 const server=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(serverPort)],{cwd:temp,env,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
 const api=async(method,url,body)=>{const r=await fetch(`http://127.0.0.1:${serverPort}${url}`,{method,headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error('OpenCode HTTP '+r.status);return r.status===204?null:r.json();};
 const owned=()=>JSON.parse(execFileSync('python',['-c',"import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); print(json.dumps([json.loads(x[0]) for x in c.execute('SELECT identity FROM opencode_clients')]))",env.VIBE_ISLAND_CODEX_STATE_FILE],{windowsHide:true,encoding:'utf8'}));
 const rows=async()=> (await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json()).sessions;
 let seed,id;
 const manifest=path.join(h.root,'artifacts/opencode-lifetime-manifest.json'),control=path.join(h.root,'artifacts/opencode-lifetime-control.json');
 const phase=(name,extra={})=>{fs.writeFileSync(path.join(h.root,'artifacts/opencode-lifetime-phase.json'),JSON.stringify({phase:name,checks,...extra},null,2));console.log(name);};
 const controlAt=async expected=>{for(let n=0;n<1200;n++){try{if(JSON.parse(fs.readFileSync(control,'utf8')).phase===expected)return;}catch{}await wait(250);}throw Error('Timed out waiting for owned TUI action: '+expected);};
 try {
  for(let n=0;n<100;n++){try{const p=await api('GET','/api/plugin');if(p.data.some(p=>p.id==='threadcap.monitor'))break;}catch{}await wait(100);}
  seed=await api('POST','/api/session',{title:'Owned CLI lifetime verification',location:{directory:temp}});id=(seed.data||seed).id;
  if(fs.existsSync(control))fs.unlinkSync(control);
  fs.writeFileSync(manifest,JSON.stringify({binary,env:Object.fromEntries(['LOCALAPPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','XDG_STATE_HOME','OPENCODE_SERVER_PASSWORD'].map(k=>[k,env[k]])),serverUrl:`http://127.0.0.1:${serverPort}`,sessionId:id,directory:temp},null,2));
  phase('ready');
  await controlAt('two-open');
  check('The session is visible while two real TUI clients are attached',await h.until(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify('opencode:'+id)} && s.terminalStatus==='open')`));
  const clients=owned();check('Client identities are captured separately from the persistent server',clients.length>=2 && clients.every(c=>c.pid!==server.pid));
  phase('two-open-verified');
  await controlAt('one-closed');await wait(1500);
  const liveOwners=owned().filter(owner=>{try{process.kill(owner.pid,0);return true;}catch(error){return error.code!=='ESRCH';}});
  check('Exactly one captured TUI process remains alive after the first exit',liveOwners.length===1);
  check('Closing one client leaves the other client session visible',(await rows()).some(s=>s.sessionId==='opencode:'+id && !s.archived && s.terminalStatus==='open'));
  phase('one-closed-verified');
  await controlAt('all-closed');
  const at=Date.now();check('Closing the last TUI removes its session from the native main list',await h.until(`!IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify('opencode:'+id)})`));
  check('The OpenCode server remains running after client closure',server.exitCode===null);
  const ended=(await rows()).find(s=>s.sessionId==='opencode:'+id);check('Closure preserves the canonical session in Archive',ended.archived && ended.terminalStatus==='closed');
  await h.inject({agentId:'opencode',sessionId:id,sourceRevision:ended.sourceRevision+1,eventId:'isolated-background-event',eventKind:'prompt',connectionStatus:'connected',status:'running'});
  check('Background server updates cannot revive a closed terminal session',(await rows()).find(s=>s.sessionId==='opencode:'+id).archived===true);
  phase('all-closed-verified',{observedRemovalMs:Date.now()-at});
  const port=h.port;await h.close();h=await startNative('opencode-lifetime-restart',{temp,port,useDefaultCache:true});
  check('Restart preserves confirmed closed-client archival',!await h.evaluate(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify('opencode:'+id)})`));
  phase('restart-verified');
  await controlAt('resumed');
  check('A fresh TUI reactivates the same session without a duplicate',await h.until(`IslandPreview.snapshot().sessions.filter(s=>s.sessionId===${JSON.stringify('opencode:'+id)} && s.terminalStatus==='open').length===1`));
  phase('resume-verified');
  await controlAt('finish');
  check('The resumed client is removed again on exit',await h.until(`!IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify('opencode:'+id)})`));
  fs.writeFileSync(path.join(h.root,'artifacts/opencode-lifetime-native.json'),JSON.stringify({checks,modelCalls:0,realTui:true,serverStillRunning:server.exitCode===null},null,2));phase('complete');
 } finally {
  await h.close();if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
