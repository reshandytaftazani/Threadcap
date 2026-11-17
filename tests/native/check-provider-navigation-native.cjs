// Owns temporary shell/TUI terminals and a private native host. No model turn is started.
const {startNative}=require('./native-harness.cjs');
const {execFileSync,spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
(async()=>{
 const root=path.resolve(__dirname,'../..'),exe=process.env.VIBE_ISLAND_TEST_EXE || path.join(root,'src-tauri/target/release/vibe-island.exe');
 for(const file of ['src-tauri/src/navigation.rs','src-tauri/src/main.rs','crates/codex-bridge/src/client_presence.rs','crates/codex-bridge/src/providers.rs','crates/codex-bridge/src/terminal.rs'])if(fs.statSync(exe).mtimeMs<fs.statSync(path.join(root,file)).mtimeMs)throw Error('Build the current smoke host first.');
 let h=await startNative('provider-navigation',{useDefaultCache:true});
 const owned=[],checks=[],fixtures=[];
 const orca=(...args)=>JSON.parse(execFileSync(process.env.ORCA_CLI_COMMAND || 'orca.exe',[...args,'--environment','local','--json'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000}));
 const quote=value=>"'"+value.replaceAll("'","''")+"'";
 const create=(title,script,manifest,extra=[])=>{const result=orca('terminal','create','--title',title,'--command',`& ${quote(path.join(root,script))} -Manifest ${quote(manifest)} ${extra.join(' ')}`);const handle=result.result?.terminal?.handle;if(!handle)throw Error('No owned terminal handle');owned.push(handle);return handle;};
 const check=(name,passed)=>{checks.push({name,passed:!!passed});console.log((passed?'PASS ':'FAIL ')+name);if(!passed)throw Error(name);};
 const invoke=(sid,action='open',choice=null)=>h.evaluate(`IslandDesktop.orcaTerminal(${JSON.stringify(sid)},${JSON.stringify(action)},${JSON.stringify(choice)}).catch(error=>{throw new Error(String(error));})`);
 const helper=path.join(path.dirname(exe),'vibe-island-codex.exe');
 const common={LOCALAPPDATA:h.temp,VIBE_ISLAND_CODEX_STATE_FILE:h.env.VIBE_ISLAND_CODEX_STATE_FILE};
 const manifest=(name,value)=>{const p=path.join(h.temp,name+'.json');fs.writeFileSync(p,JSON.stringify(value));return p;};
 let server, localClient;
 try {
  const localId = 'codex:local-closure-' + crypto.randomUUID();
  const localBinary = path.join(h.temp, 'codex.exe');
  fs.copyFileSync(path.join(process.env.SystemRoot, 'System32/cmd.exe'), localBinary);
  const localEvent = manifest('local-codex-event', {
   hook_event_name: 'UserPromptSubmit', session_id: localId.slice('codex:'.length),
   cwd: h.temp, turn_id: 'fixture', prompt: 'Local terminal closure fixture'
  });
  const localEnv = {...h.env, THREADCAP_CODEX_LOCAL_CLIENT:'1'};
  for (const key of Object.keys(localEnv)) if (key.startsWith('ORCA_')) delete localEnv[key];
  const localCommand = `call "${helper}" hook --port ${h.port} --state-file "${h.env.VIBE_ISLAND_CODEX_STATE_FILE}" < "${localEvent}"`;
  localClient = spawn(localBinary, ['/d','/q','/s','/k',`"${localCommand}"`], {
   env:localEnv, windowsHide:true, windowsVerbatimArguments:true, stdio:['pipe','ignore','ignore']
  });
  const localVisible = `IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(localId)})`;
  check('A local Codex hook with no Orca identity reaches the current native host', await h.until(localVisible));
  const localExit = new Promise(resolve => localClient.once('exit', resolve));
  localClient.kill();
  await localExit;
  check('Forced local Codex process termination archives its session without SessionEnd', await h.until(`!(${localVisible})`));
  let localClosedRejected = false;
  try { await invoke(localId); } catch (error) { localClosedRejected = error.message.includes('source terminal has closed'); }
  check('A confirmed local Codex process exit cannot open a leftover terminal', localClosedRejected);
  for(const provider of ['codex','antigravity']) {
   const id=provider+'-navigation-'+crypto.randomUUID(),sid=provider+':'+id;
   const event=provider==='codex'?{hook_event_name:'SessionStart',session_id:id,cwd:root,source:'startup'}:{conversationId:id,workspacePaths:[root]};
   const handle=create('Threadcap '+provider+' navigation check','tests/native/run-navigation-hook-fixture.ps1',manifest(provider,{provider,event,helper,port:h.port,cache:h.env.VIBE_ISLAND_CODEX_STATE_FILE,env:common}));
   check(provider+' observer reaches the current native host',await h.until(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(sid)})`));
   let result;try{result=await invoke(sid);}catch(error){throw Error(provider+': '+error.message);}check(provider+' automatically opens its exact source terminal',result.state==='opened' && result.acknowledged);
   const links=JSON.parse(fs.readFileSync(path.join(h.temp,'VibeIsland',`orca-terminal-links-${h.port}.json`),'utf8'));
   check(provider+' pins its own handle, not another provider terminal',links[sid].binding.handle===handle && !links[sid].manual);
   fixtures.push({provider,sid,handle});
   await h.evaluate(`IslandPreview.showOverview();document.querySelector('[data-session="${sid}"] .jump-button').click()`);
   check(provider+' terminal button collapses only after native navigation',await h.until("!IslandPreview.snapshot().expanded && !document.querySelector('.jump-button[aria-busy=\"true\"]')"));
   if(provider==='antigravity') {
    const env={...h.env};for(const key of Object.keys(env))if(key.startsWith('ORCA_'))delete env[key];
    execFileSync(helper,['provider-hook','--provider',provider,'--kind','Stop','--port',String(h.port),'--state-file',h.env.VIBE_ISLAND_CODEX_STATE_FILE],{env,input:JSON.stringify(event),windowsHide:true,timeout:5000});
    check('Antigravity retains its verified link after an event without launch variables',(await invoke(sid)).state==='opened');
   }
  }
  const plugin=path.join(h.temp,'config/opencode/plugins/threadcap-monitor');fs.mkdirSync(plugin,{recursive:true});
  for(const [source,destination] of [['server.js','index.js'],['tui.js','tui.js'],['questions.js','questions.js']])fs.writeFileSync(path.join(plugin,destination),fs.readFileSync(path.join(root,'integrations/opencode',source),'utf8').replace('__THREADCAP_HELPER__',JSON.stringify(helper)).replace('__THREADCAP_PORT__',String(h.port)));
  fs.writeFileSync(path.join(h.temp,'config/opencode/cli.json'),JSON.stringify({plugins:['./plugins/threadcap-monitor']}));
  const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const password=crypto.randomUUID(),env={...h.env,OPENCODE_SERVER_PASSWORD:password,XDG_DATA_HOME:path.join(h.temp,'data'),XDG_CACHE_HOME:path.join(h.temp,'cache'),XDG_STATE_HOME:path.join(h.temp,'state')};
  for(const key of Object.keys(env))if(key.startsWith('ORCA_'))delete env[key];
  const binary=path.join(process.env.APPDATA,'npm/node_modules/@opencode/cli/bin/opencode.exe');
  const log=fs.openSync(path.join(h.temp,'server.log'),'w');server=spawn(binary,['serve','--hostname','127.0.0.1','--port',String(port)],{cwd:h.temp,env,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
  const api=async(method,url,body)=>{const r=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error('OpenCode HTTP '+r.status);return r.status===204?null:r.json();};
  let ready=false;for(let n=0;n<100;n++){try{const p=await api('GET','/api/plugin');if(p.data.some(p=>p.id==='threadcap.monitor' && p.state.status==='active')){ready=true;break;}}catch{}await h.wait(100);}check('Real OpenCode server loads the isolated monitor',ready);
  const created=await api('POST','/api/session',{title:'Owned terminal navigation',location:{directory:h.temp}}),id=(created.data||created).id,sid='opencode:'+id;
  const tui=manifest('tui',{binary,env:Object.fromEntries(['LOCALAPPDATA','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','XDG_STATE_HOME','OPENCODE_SERVER_PASSWORD'].map(k=>[k,env[k]])),serverUrl:`http://127.0.0.1:${port}`,sessionId:id,directory:h.temp});
  const a=create('Threadcap OpenCode navigation A','tests/native/run-opencode-reply-tui.ps1',tui,['-KeepOrcaIdentity']);
  const bindings=()=>{try{const db=new DatabaseSync(h.env.VIBE_ISLAND_CODEX_STATE_FILE,{readOnly:true});try{return db.prepare('SELECT binding FROM opencode_client_terminals').all().map(r=>JSON.parse(r.binding));}finally{db.close();}}catch{return[];}};
  for(let n=0;n<150 && !bindings().some(b=>b.handle===a);n++)await h.wait(100);
  check('The real OpenCode TUI captures its own pane independently of the server',bindings().some(b=>b.handle===a));
  check('The owning OpenCode session reaches the canonical native snapshot',await h.until(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(sid)})`));
  check('OpenCode automatically opens its exact source TUI',(await invoke(sid)).state==='opened');
  const linksPath=path.join(h.temp,'VibeIsland',`orca-terminal-links-${h.port}.json`);
  check('OpenCode never links to the server or a different provider',JSON.parse(fs.readFileSync(linksPath,'utf8'))[sid].binding.handle===a);
  await h.evaluate(`IslandPreview.showOverview();document.querySelector('[data-session="${sid}"] .jump-button').click()`);
  check('OpenCode terminal button completes the native navigation route',await h.until("!IslandPreview.snapshot().expanded && !document.querySelector('.jump-button[aria-busy=\"true\"]')"));
  const restart={temp:h.temp,port:h.port,useDefaultCache:true};await h.close();h=await startNative('provider-navigation-restart',restart);
  for(const fixture of [...fixtures,{provider:'opencode',sid,handle:a}]) {
   if(!await h.until(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(fixture.sid)})`))throw Error('Restart snapshot missing '+fixture.provider);
   check(fixture.provider+' source navigation survives a host restart',(await invoke(fixture.sid)).state==='opened' && JSON.parse(fs.readFileSync(linksPath,'utf8'))[fixture.sid].binding.handle===fixture.handle);
  }
  const b=create('Threadcap OpenCode navigation B','tests/native/run-opencode-reply-tui.ps1',tui,['-KeepOrcaIdentity']);
  for(let n=0;n<150 && !bindings().some(t=>t.handle===b);n++)await h.wait(100);
  check('A second real TUI records independent ownership',bindings().some(t=>t.handle===b));
  const links=JSON.parse(fs.readFileSync(linksPath,'utf8'));delete links[sid];fs.writeFileSync(linksPath,JSON.stringify(links));
  const ambiguous=await invoke(sid);check('Multiple owning TUIs require an explicit choice',ambiguous.state==='choose');
  const choice=ambiguous.terminals.find(t=>t.choice.handle===b)?.choice;
  check('The explicitly selected second TUI opens successfully',(await invoke(sid,'choose',choice)).state==='opened');
  orca('terminal','close','--terminal',b);owned.splice(owned.indexOf(b),1);await h.wait(700);
  check('Closing one TUI redirects to the remaining verified owner',(await invoke(sid)).state==='opened');
  check('The surviving owner is the first TUI',JSON.parse(fs.readFileSync(linksPath,'utf8'))[sid].binding.handle===a);
  const stale=JSON.parse(fs.readFileSync(linksPath,'utf8'));stale[sid].incarnation='00000000-0000-4000-8000-000000000002';fs.writeFileSync(linksPath,JSON.stringify(stale));
  check('A changed PTY incarnation is never silently reused',(await invoke(sid)).state==='choose');
  orca('terminal','close','--terminal',a);owned.splice(owned.indexOf(a),1);
  check('The last real TUI exit removes the session from Sessions',await h.until(`!IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(sid)})`));
  let rejected=false;try{await invoke(sid);}catch{rejected=true;}check('A confirmed closed session cannot navigate to a leftover shell',rejected);
  check('The persistent server stays alive after TUI exits',server.exitCode===null);
  fs.writeFileSync(path.join(root,'artifacts/provider-navigation-native.json'),JSON.stringify({checks,modelCalls:0,realOpenCodeTui:true,hookFixtures:['codex','antigravity'],executableSha256:crypto.createHash('sha256').update(fs.readFileSync(exe)).digest('hex')},null,2));
  console.log(JSON.stringify(checks,null,2));
 } finally {
  if (localClient && localClient.exitCode === null && localClient.signalCode === null) localClient.kill();
  for(const handle of owned)try{orca('terminal','close','--terminal',handle);}catch{}
  if(server && server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});
  await h.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
