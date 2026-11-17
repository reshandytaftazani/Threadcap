// Real WebView2/IPC and Orca navigation; provider lifecycle reports below are explicit fixtures.
const {startNative}=require('./native-harness.cjs');
const {execFileSync,spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
async function main(){
  let h,owned;
  const checks=[],screens=[];
  const check=(name,passed)=>{checks.push({name,passed:Boolean(passed)});if(!passed)throw Error(name);};
  const cli=args=>JSON.parse(execFileSync(process.env.ORCA_CLI_COMMAND || 'orca.exe',[...args,'--environment','local','--json'],{encoding:'utf8',windowsHide:true,timeout:15000}));
  const listing=()=>cli(['terminal','list','--limit','10000']);
  const rows=()=>h.evaluate('IslandPreview.snapshot().sessions');
  const click=id=>h.evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const report=(id,revision,status,extra={})=>({agentId:'codex',sessionId:id,sourceRevision:revision,eventId:`${id}-${revision}`,status,taskTitle:`Fixture ${id}`,eventKind:'activity',...extra});
  async function shot(name){
    await h.wait(400);
    const clip=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const image=await h.send('Page.captureScreenshot',{format:'png',clip});
    const file=path.join(h.root,`artifacts/threadcap-${name}.png`);fs.writeFileSync(file,Buffer.from(image.data,'base64'));screens.push(path.basename(file));
  }
  try{
    h=await startNative('threadcap');
    check('New profiles enable closed-pane archival with a five-minute delay',await h.evaluate('(async()=>await IslandDesktop.retentionSettings() && await IslandDesktop.archiveDelay()===5)()'));
    check('Native host starts with empty live data',(await rows()).length===0);
    await h.inject(report('saved',1,'running',{connectionStatus:'disconnected'}));
    check('Unknown retained activity is Checking, not Offline',await h.until("document.querySelector('.activity-text')?.textContent.includes('Checking')"));
    await h.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:600});await h.wait(550);
    const before=await h.evaluate("document.getElementById('island-surface').getBoundingClientRect().height");
    const point=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+20};})()");
    await h.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await h.wait(550);
    check('Hover widens without changing compact height or opening the body',await h.evaluate(`IslandPreview.snapshot().peek && !IslandPreview.snapshot().expanded && Math.abs(document.getElementById('island-surface').getBoundingClientRect().height-${before})<1`));await shot('hover');
    await h.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:600});
    await h.evaluate('IslandPreview.showOverview()');await click('archive-button');
    check('Archive is reachable directly from Sessions with an explicit return',await h.evaluate("IslandPreview.snapshot().settingsPage==='archive' && document.getElementById('back-destination').textContent==='Sessions'"));
    await click('settings-back');
    check('Archive Back restores Sessions',await h.evaluate('!IslandPreview.snapshot().settingsOpen'));
    await h.inject(report('result',1,'completed',{eventKind:'completion',result:'Preserved fixture output'}));
    await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:result')");
    await h.evaluate("IslandDesktop.archiveSession('codex:result',true)");await click('archive-button');
    await h.until("document.querySelector('#archive-list .archive-remove')");
    await h.evaluate("document.querySelector('#archive-list .archive-remove').click()");
    check('Delete review has visible scope, Cancel focus, and Archive return',await h.evaluate("!document.getElementById('archive-confirm').hidden && document.getElementById('archive-browser').hidden && document.activeElement.id==='archive-delete-cancel' && document.getElementById('back-destination').textContent==='Archive'"));await shot('delete-review');
    await click('settings-back');
    check('Back cancels deletion and restores Archive',await h.evaluate("document.getElementById('archive-confirm').hidden && !document.getElementById('archive-browser').hidden"));
    await h.evaluate("document.querySelector('#archive-list .archive-restore').click()");
    check('Restore removes only the archive presentation and preserves context',await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:result' && s.result==='Preserved fixture output')"));
    await click('settings-back');await click('settings-button');
    await h.evaluate("document.querySelector('[data-connect-provider=antigravity]').click()");
    check('Antigravity Connect registers the isolated observer with one click',await h.until("document.getElementById('provider-connect-state').textContent==='Waiting for activity'"));
    const agy=JSON.parse(fs.readFileSync(path.join(h.temp,'.gemini/config/hooks.json'),'utf8'));
    check('Antigravity registration excludes policy-changing PreToolUse',!agy['threadcap-monitor'].PreToolUse && Boolean(agy['threadcap-monitor'].PreInvocation));
    await click('settings-back');await h.evaluate("document.querySelector('[data-connect-provider=opencode]').click()");
    check('OpenCode Connect installs an isolated v2 plugin with one click',await h.until("document.getElementById('provider-connect-state').textContent==='Waiting for activity'"));await shot('provider-setup');
    const plugin=path.join(h.temp,'config/opencode/plugins/threadcap-monitor/index.js');
    check('OpenCode plugin file exists without editing user configuration',fs.existsSync(plugin));
    await click('settings-back');await click('settings-back');
    const created=cli(['terminal','create','--worktree','current','--title','Threadcap isolated navigation check','--shell','powershell.exe']);
    owned=created.result?.terminal?.handle || created.result?.handle;
    if(!owned)throw Error('Orca did not return the owned terminal handle');
    let current;for(let i=0;i<40;i++){current=listing();if(current.result.terminals.some(t=>t.handle===owned && t.connected))break;await h.wait(100);}
    const terminal=current.result.terminals.find(t=>t.handle===owned && t.connected);
    if(!terminal)throw Error('Owned shell is unavailable');
    const helper=path.join(h.root,'src-tauri/binaries/vibe-island-codex-x86_64-pc-windows-msvc.exe');
    const inherited={...h.env,ORCA_TERMINAL_HANDLE:owned,ORCA_PANE_KEY:`${terminal.tabId}:${terminal.leafId}`,ORCA_WORKSPACE_ID:terminal.worktreeId,ORCA_WORKTREE_ID:terminal.worktreeId,ORCA_RUNTIME_SOURCE_INCARNATION:current._meta.runtimeId};
    const hook=(payload,env=inherited)=>execFileSync(helper,['hook','--port',String(h.port),'--state-file',h.env.VIBE_ISLAND_CODEX_STATE_FILE],{env,input:JSON.stringify(payload),windowsHide:true,timeout:5000});
    hook({hook_event_name:'SessionStart',session_id:'automatic',cwd:h.root,source:'startup'});
    check('Bundled hook helper delivers an inherited source identity through native IPC',await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:automatic')"));
    check('Fresh inherited identity opens its exact owned source without manual selection',(await h.evaluate("IslandDesktop.orcaTerminal('codex:automatic','open')")).state==='opened');
    const withoutIdentity={...inherited};for(const key of ['ORCA_TERMINAL_HANDLE','ORCA_PANE_KEY','ORCA_WORKSPACE_ID','ORCA_WORKTREE_ID','ORCA_RUNTIME_SOURCE_INCARNATION'])delete withoutIdentity[key];
    hook({hook_event_name:'UserPromptSubmit',session_id:'automatic',turn_id:'fixture-turn',cwd:h.root,prompt:'Isolated source identity fixture'},withoutIdentity);
    check('A later hook without inherited environment preserves its verified source link',(await h.evaluate("IslandDesktop.orcaTerminal('codex:automatic','open')")).state==='opened');
    const providerEvent={id:'fixture-approval',created:Date.now(),type:'permission.asked',data:{sessionID:'provider-fixture',id:'approval-one',action:'shell',resources:[],message:'Isolated provider permission fixture'}};
    execFileSync(helper,['provider-hook','--provider','opencode','--port',String(h.port),'--state-file',h.env.VIBE_ISLAND_CODEX_STATE_FILE],{env:h.env,input:JSON.stringify(providerEvent),windowsHide:true,timeout:5000});
    check('OpenCode event fixtures expose a request without granting response capability',await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='opencode:provider-fixture' && s.status==='waiting_approval' && !s.capabilities.canApprove)"));
    await h.evaluate('IslandPreview.setExpanded(false)');
    await h.inject(report('pane',1,'running'));
    await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:pane')");
    const choice={handle:owned,runtime:current._meta.runtimeId,incarnation:terminal.incarnationId};
    const opened=await h.evaluate(`IslandDesktop.orcaTerminal('codex:pane','choose',${JSON.stringify(choice)})`);
    check('An owned shell without a Codex label is an exact verified navigation target',opened.state==='opened' && opened.acknowledged===true);
    check('Background observation verifies pane availability',await h.until("IslandPreview.snapshot().sessions.find(s=>s.sessionId==='codex:pane')?.terminalStatus==='open'"));
    const temp=h.temp,port=h.port;await h.close();h=await startNative('threadcap-restart',{temp,port});
    check('Restart restores prior task context without Connect',await h.until("IslandPreview.snapshot().sessions.some(s=>s.sessionId==='codex:pane' && s.status==='running')"));
    check('Restart revalidates the saved pane independently of hooks',await h.until("IslandPreview.snapshot().sessions.find(s=>s.sessionId==='codex:pane')?.terminalStatus==='open'"));
    check('An open pane does not fabricate fresh Working after restart',await h.evaluate("[...document.querySelectorAll('.session')].find(el=>el.dataset.session==='codex:pane').querySelector('.activity-text').textContent.includes('Checking')"));
    const resumed=await h.evaluate("IslandDesktop.orcaTerminal('codex:pane','open')");
    check('Saved navigation survives app restart without another selection',resumed.state==='opened');
    await h.inject(report('pane',2,'completed',{eventKind:'session_end',connectionStatus:'disconnected',result:'Completed fixture remains readable'}));
    check('CLI exit with a surviving pane displays Idle',await h.until("[...document.querySelectorAll('.session')].find(el=>el.dataset.session==='codex:pane')?.querySelector('.activity-text').textContent.startsWith('Idle')"));
    await h.evaluate('IslandPreview.showOverview()');await shot('sessions');
    cli(['terminal','close','--terminal',owned,'--tab']);owned=null;
    check('Actual closure of the owned pane becomes Offline',await h.until("IslandPreview.snapshot().sessions.find(s=>s.sessionId==='codex:pane')?.terminalStatus==='closed'"));
    await h.evaluate("IslandDesktop.archiveDelay(1)");
    const child=spawnSync(process.execPath,[path.join(__dirname,'check-outside-click.cjs'),String(h.app.pid),String(h.debug)],{encoding:'utf8',windowsHide:true,timeout:45000});
    check('Physical native outside clicks dismiss without focus theft and forward input',child.status===0);
    await h.wait(400);
    const geometry=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{width:r.width,height:r.height,scale:devicePixelRatio};})()");
    const geometryFile=path.join(h.root,'artifacts/threadcap-surface.json');fs.writeFileSync(geometryFile,JSON.stringify({geometry}));
    const windowProbe=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-File',path.join(__dirname,'check-native-window.ps1'),'-NativeProcessId',String(h.app.pid),'-GeometryFile',geometryFile,'-CompactResult'],{encoding:'utf8',windowsHide:true}));
    check('Native shape matches rendered bounds and transparent regions pass through',Object.values(windowProbe.checks).every(Boolean));
    fs.writeFileSync(path.join(h.root,'artifacts/threadcap-native-window.json'),JSON.stringify(windowProbe,null,2));
    for(let i=0;i<40;i++){
      const state=await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json();
      if(state.sessions.find(s=>s.sessionId==='codex:pane')?.archived)break;
      await h.wait(2000);
    }
    const finalState=await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json();
    check('Verified closed pane automatically archives after the configured minute',finalState.sessions.find(s=>s.sessionId==='codex:pane')?.archived===true);
    await h.evaluate('IslandPreview.showOverview()');await click('archive-button');await h.wait(400);
    await shot('archive');
    const outcome={checks,screens,modelCalls:0,providerEvidence:'Installed CLI detection and configuration; synthetic event adapter tests. No live agent task was launched.',limitations:['Mixed-DPI/multi-monitor and human UX acceptance are not established by this run.','Five-minute retention timing is covered by store tests; this native check waits one configured minute.']};
    fs.writeFileSync(path.join(h.root,'artifacts/threadcap-native.json'),JSON.stringify(outcome,null,2));
    console.log(JSON.stringify(outcome,null,2));
  }catch(error){if(h){try{await shot('failure');}catch{}fs.writeFileSync(path.join(h.root,'artifacts/threadcap-native.json'),JSON.stringify({checks,error:String(error)},null,2));}throw error;}
  finally {if(owned)cli(['terminal','close','--terminal',owned,'--tab']);await h?.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
