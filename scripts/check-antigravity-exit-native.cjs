// Native exit verification uses owned cmd process fixtures named agy.exe, not real model tasks.
const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  let h=await startNative('agy-exit');const children=[],checks=[];
  const check=(name,value)=>{checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
  const visible=id=>`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify('antigravity:'+id)})`;
  const rows=async()=> (await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json()).sessions;
  const fakeAgy=path.join(h.temp,'agy.exe');fs.copyFileSync(path.join(process.env.SystemRoot,'System32/cmd.exe'),fakeAgy);
  async function start(id,kind='SessionStart'){
    const input=path.join(h.temp,`${id}-${children.length}.json`);fs.writeFileSync(input,JSON.stringify({conversationId:id,lastUserInput:'Explicit Antigravity exit fixture',workspacePaths:[h.temp]}));
    const helper=path.join(h.root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
    const command=`call "${helper}" provider-hook --provider antigravity --kind ${kind} --port ${h.port} --state-file "${h.env.VIBE_ISLAND_CODEX_STATE_FILE}" < "${input}"`;
    const env={...h.env};for(const key of ['ORCA_TERMINAL_HANDLE','ORCA_PANE_KEY','ORCA_WORKSPACE_ID','ORCA_WORKTREE_ID','ORCA_RUNTIME_SOURCE_INCARNATION'])delete env[key];
    const child=spawn(fakeAgy,['/d','/q','/s','/k',`"${command}"`],{env,windowsHide:true,windowsVerbatimArguments:true,stdio:['pipe','ignore','ignore']});children.push(child);
    if(!await h.until(visible(id)))throw Error('Owned process hook fixture did not arrive');
    return child;
  }
  async function exit(child,force=false){
    if(child.exitCode!==null || child.signalCode!==null)return;
    const stopped=new Promise(resolve=>child.once('exit',resolve));
    if(force)child.kill();else child.stdin.end('exit\r\n');
    await stopped;
  }
  try{
    await h.evaluate('IslandDesktop.retentionSettings(false);IslandPreview.showOverview()');
    const turn=await start('turn','Stop');
    check('A completed turn remains in Sessions while its exact process is alive',await h.evaluate(visible('turn')));
    const startTime=Date.now();await exit(turn);
    check('Orderly CLI-process exit removes the session without the archive delay',await h.until(`!(${visible('turn')})`));
    const removalMs=Date.now()-startTime;
    check('Archived exit context remains available without deleting CLI history',(await rows()).some(s=>s.sessionId==='antigravity:turn' && s.archived && s.endedAt));
    check('The exit reaches native UI within the bounded observation window',removalMs<3000);
    const killed=await start('closed-pane');await exit(killed,true);
    check('Forced process closure also removes its session with retention disabled',await h.until(`!(${visible('closed-pane')})`));
    const resumed=await start('turn');
    check('Fresh SessionStart reactivates the same canonical session without duplication',(await rows()).filter(s=>s.sessionId==='antigravity:turn').length===1 && await h.evaluate(visible('turn')));
    await exit(resumed);await h.until(`!(${visible('turn')})`);
    const downtime=await start('downtime');const temp=h.temp,port=h.port;await h.close();await exit(downtime);
    h=await startNative('agy-exit-restart',{temp,port});
    check('An exit while the host was stopped is already absent after startup recovery',!await h.evaluate(visible('downtime')) && (await rows()).some(s=>s.sessionId==='antigravity:downtime' && s.archived));
    await h.inject({agentId:'antigravity',sessionId:'unverified',sourceRevision:1,eventId:'unverified',status:'completed',connectionStatus:'disconnected',agentProcess:{pid:1,created:'0'}});
    check('Unverified transport loss and producer-supplied PID do not authorize removal',await h.until(visible('unverified')) && !(await rows()).find(s=>s.sessionId==='antigravity:unverified').archived);
    const result={checks,exitToRemovalMs:removalMs,modelCalls:0,fixture:'Owned Windows process lifetime plus real WebView2/IPC; not an interactive Antigravity /exit run.'};
    fs.writeFileSync(path.join(h.root,'artifacts/antigravity-exit-native.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{
    for(const child of children)if(child.exitCode===null && child.signalCode===null)await exit(child,true);
    await h.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
