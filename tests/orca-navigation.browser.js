(async()=>{
  const frame=document.createElement('iframe');frame.width=592;frame.height=768;frame.style.cssText='position:fixed;left:0;top:0;border:0;z-index:99999';
  const html=await(await fetch('/index.html')).text();
  const stub=`window.navCalls=[];window.failNavigation=false;window.emptyTerminals=false;window.badAck=false;window.delayNavigation=40;
  window.__TAURI__={core:{Channel:class{},invoke:async(command,args)=>{
    if(command==='connect_sessions')args.channel.onmessage({protocolVersion:1,bridgeId:'orca-ui',sequence:0,eventId:'orca-ui:0',type:'sync',sessions:[{sessionId:'codex:legacy',agentId:'codex',revision:1,status:'waiting_approval',connectionStatus:'connected',requestId:'fixture',command:'npm test',taskTitle:'Navigation fixture',capabilities:{}}]});
    if(command==='desktop_ready')return{globalShortcut:false};
    if(command==='read_usage')return{revision:1,status:'unavailable',buckets:[]};
    if(command==='codex_integration')return{registered:true,error:null};
    if(command==='orca_terminal'){
      window.navCalls.push(args);await new Promise(r=>setTimeout(r,window.delayNavigation));
      if(window.failNavigation)throw Error('Orca CLI unavailable');
      if(args.action==='choose')return{state:'opened',sessionId:args.sessionId,acknowledged:!window.badAck};
      return{state:'choose',sessionId:args.sessionId,message:'Choose a live terminal',terminals:window.emptyTerminals?[]:[{label:'<img src=x onerror=alert(1)> Codex',path:'C:/fixture',choice:{handle:'term_fixture',runtime:'runtime-fixture',incarnation:'pty-fixture'}}]};
    }
  }},event:{listen:async()=>()=>{}}};`;
  const ready=new Promise(resolve=>frame.onload=resolve);frame.srcdoc=html.replace('<head>',`<head><base href=${location.origin}/><script>${stub}</script>`);document.body.append(frame);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
  try{
    await ready;const w=frame.contentWindow,d=w.document;w.IslandPreview.setReducedMotion(true);w.IslandPreview.showOverview();
    const button=()=>d.querySelector('.jump-button');
    check('Native Codex navigation offers opening or linking instead of not connected',!button().disabled && button().title==='Open or link Codex terminal in Orca');
    check('Native navigation does not grant producer response capabilities',!w.IslandPreview.snapshot().sessions[0].capabilities.canJump && !d.querySelector('[data-action=allow]'));
    button().click();button().click();check('Duplicate navigation clicks are disabled',button().disabled);await wait(100);
    check('Unbound session opens an in-island terminal chooser',w.IslandPreview.snapshot().settingsOpen && !d.getElementById('terminal-picker').hidden && !d.querySelector('dialog'));
    check('Terminal labels are rendered as text',d.getElementById('terminal-choices').textContent.includes('<img') && !d.querySelector('#terminal-choices img'));
    d.querySelector('.terminal-choice').click();d.querySelector('.terminal-choice').click();await wait(100);
    check('A selected terminal is submitted once and collapses only after acknowledgment',w.navCalls.filter(c=>c.action==='choose').length===1 && !w.IslandPreview.snapshot().expanded);
    w.badAck=true;w.IslandPreview.showOverview();button().click();await wait(100);d.querySelector('.terminal-choice').click();await wait(100);
    check('Missing positive acknowledgment leaves a readable error',w.IslandPreview.snapshot().settingsOpen && d.getElementById('terminal-picker-note').dataset.error==='true');
    w.badAck=false;w.emptyTerminals=true;d.getElementById('terminal-refresh').click();await wait(100);
    check('An empty list explains how to refresh without guessing a terminal',d.getElementById('terminal-choices').children.length===0 && d.getElementById('terminal-picker-note').textContent.includes('No matching live local Codex terminals'));
    w.failNavigation=true;d.getElementById('terminal-refresh').click();await wait(100);
    check('CLI errors remain inside the island with an enabled retry',d.getElementById('terminal-picker-note').textContent.includes('Orca CLI unavailable') && !d.getElementById('terminal-refresh').disabled);
    w.failNavigation=false;w.emptyTerminals=false;w.delayNavigation=200;d.getElementById('terminal-refresh').click();w.IslandPreview.setExpanded(false);await wait(260);
    check('Delayed chooser responses do not reopen a dismissed island',!w.IslandPreview.snapshot().expanded && !w.IslandPreview.snapshot().settingsOpen);
    w.IslandPreview.showOverview();button().click();await wait(260);d.getElementById('terminal-refresh').focus();
    check('Picker retry is keyboard focusable',d.activeElement===d.getElementById('terminal-refresh'));
  }finally{frame.remove();}
  return{passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks};
})();
