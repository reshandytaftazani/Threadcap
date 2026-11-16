// Reproduces the missing upgrade case with a staged old observer and PID-less local cache.
const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
(async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'threadcap-observer-upgrade-'));
  const staged=path.join(temp,'VibeIsland/bridge/vibe-island-codex.exe');fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,'old owned observer fixture');
  const hookFile=path.join(temp,'.gemini/config/hooks.json');fs.mkdirSync(path.dirname(hookFile),{recursive:true});
  const config=JSON.stringify({'other-hook':{enabled:false},'threadcap-monitor':{threadcapOwner:'threadcap.monitor.v1',enabled:true}});fs.writeFileSync(hookFile,config);
  const report={agentId:'antigravity',sessionId:'antigravity:legacy-fixture',status:'completed',connectionStatus:'connected',eventId:'legacy-stop',sourceRevision:3,eventKind:'completion',observedAt:1,result:'Preserved legacy fixture output',capabilities:{canApprove:false,canAnswer:false,canJump:false},supportsAcknowledgment:false};
  execFileSync('python',['-c',"import sqlite3,json,sys,pathlib; p=pathlib.Path(sys.argv[1]); r=json.loads(sys.argv[2]); c=sqlite3.connect(p/'sessions.sqlite3'); c.execute('CREATE TABLE sessions(id TEXT PRIMARY KEY,body TEXT NOT NULL,source_revision INTEGER NOT NULL)'); c.execute('INSERT INTO sessions VALUES(?,?,?)',(r['sessionId'],json.dumps(dict(r,revision=1,archived=False)),3)); c.commit(); c.close(); c=sqlite3.connect(p/'codex.sqlite3'); c.execute('CREATE TABLE provider_sessions(id TEXT PRIMARY KEY,body TEXT NOT NULL)'); c.execute('INSERT INTO provider_sessions VALUES(?,?)',(r['sessionId'],json.dumps(r))); c.execute('CREATE TABLE codex_sessions(id TEXT PRIMARY KEY,body TEXT NOT NULL)'); c.commit(); c.close()",temp,JSON.stringify(report)],{windowsHide:true});
  let h;const checks=[];const check=(name,passed)=>{checks.push({name,passed:Boolean(passed)});if(!passed)throw Error(name);};
  try{
    h=await startNative('observer-upgrade',{temp});
    const root=h.root,sibling=process.env.VIBE_ISLAND_TEST_EXE && path.join(path.dirname(process.env.VIBE_ISLAND_TEST_EXE),'vibe-island-codex.exe');
    const source=sibling && fs.existsSync(sibling)?sibling:path.join(root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
    const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    check('Startup refreshes the pre-existing staged observer without Connect',hash(staged)===hash(source));
    check('The refreshed observer reports the installed build version',execFileSync(staged,['--version'],{encoding:'utf8',windowsHide:true}).includes(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version));
    check('Automatic binary refresh preserves hook configuration byte-for-byte',fs.readFileSync(hookFile,'utf8')===config && !fs.existsSync(path.join(temp,'codex/hooks.json')));
    const rows=async()=> (await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json()).sessions;
    check('Legacy PID-less local context is absent from Sessions after verified process absence',await h.until("!IslandPreview.snapshot().sessions.some(s=>s.sessionId==='antigravity:legacy-fixture')"));
    let legacy=(await rows()).find(s=>s.sessionId==='antigravity:legacy-fixture');
    check('Legacy cleanup archives the same record and preserves its output',legacy?.archived===true && legacy.result==='Preserved legacy fixture output' && legacy.endedAt>0);
    const revision=legacy.sourceRevision,port=h.port;await h.close();h=await startNative('observer-upgrade-restart',{temp,port});
    legacy=(await rows()).find(s=>s.sessionId==='antigravity:legacy-fixture');
    check('Restart neither resurrects nor repeatedly ends the archived legacy session',legacy.archived===true && legacy.sourceRevision===revision);
    await h.inject({agentId:'antigravity',sessionId:'external-unverified',sourceRevision:1,eventId:'external',status:'completed',connectionStatus:'disconnected'});
    check('Zero-process legacy cleanup does not erase unverified external producer sessions',await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='antigravity:external-unverified')"));
    fs.writeFileSync(path.join(root,'artifacts/observer-upgrade-native.json'),JSON.stringify({checks,modelCalls:0},null,2));console.log(JSON.stringify({checks,modelCalls:0},null,2));
  }finally{await h?.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
