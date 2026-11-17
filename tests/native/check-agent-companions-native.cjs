// Synthetic sessions in a private profile; no provider tasks or user data are used.
const {startNative} = require('./native-harness.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const exe = process.env.VIBE_ISLAND_TEST_EXE || path.join(root, 'src-tauri/target/release/vibe-island.exe');
  for (const file of ['src/avatars.js', 'src/island.css', 'src/app.js']) {
    if (fs.statSync(exe).mtimeMs < fs.statSync(path.join(root, file)).mtimeMs) {
      throw Error(`Rebuild the native host before testing: ${file} is newer than the executable.`);
    }
  }
  const h = await startNative('agent-companions');
  const checks = [], errors = [], frames = [], acknowledgments = [];
  const check = (name, passed) => {
    checks.push({name, passed: Boolean(passed)});
    if (!passed) throw Error(name);
  };
  const click = id => h.evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const shot = async name => {
    const clip = await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
    const result = await h.send('Page.captureScreenshot', {format:'png', clip});
    fs.writeFileSync(path.join(root, 'artifacts', name), Buffer.from(result.data, 'base64'));
  };
  try {
    h.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text));
    h.on('Runtime.consoleAPICalled', event => { if (event.type === 'error') errors.push('Console error'); });
    await h.send('Runtime.enable');
    for (const agentId of ['codex', 'antigravity', 'opencode']) {
      await h.inject({agentId, sessionId:`companion-${agentId}`, sourceRevision:1,
        eventId:`companion-${agentId}-1`, status:'running', taskTitle:'Synthetic icon visibility check',
        activity:'Working fixture, no CLI task', eventKind:'activity'});
    }
    check('Three fixture sessions arrive in the current native build', await h.until('IslandPreview.snapshot().sessions.length===3'));
    await h.evaluate('IslandPreview.setExpanded(false)');
    await h.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:0, y:700});
    await h.wait(600);
    check('Compact group has static marks and exactly one shared companion', await h.evaluate("document.querySelectorAll('#compact-avatars .is-static').length===3 && document.querySelectorAll('#compact-avatars .sprite-frame').length===0 && document.querySelectorAll('#compact-status .is-indicator').length===1"));
    await h.evaluate("window.__companionBefore=document.querySelector('#compact-status .agent-avatar')");
    await h.inject({agentId:'codex', sessionId:'companion-codex', sourceRevision:2,
      eventId:'companion-codex-2', status:'running', taskTitle:'Updated synthetic task', eventKind:'activity'});
    await h.until("IslandPreview.snapshot().sessions.some(s=>s.taskTitle==='Updated synthetic task')");
    check('An unrelated activity update preserves the shared animation node', await h.evaluate("window.__companionBefore===document.querySelector('#compact-status .agent-avatar')"));
    const height = await h.evaluate("document.getElementById('island-surface').getBoundingClientRect().height");
    const point = await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+20};})()");
    await h.send('Input.dispatchMouseEvent', {type:'mouseMoved', ...point});
    await h.wait(650);
    check('Hover preserves compact height and keeps the panel closed', await h.evaluate(`IslandPreview.snapshot().peek && !IslandPreview.snapshot().expanded && Math.abs(document.getElementById('island-surface').getBoundingClientRect().height-${height})<1`));
    await shot('agent-companions-hover.png');
    await click('compact-view');
    check('Compact click opens Sessions', await h.until('IslandPreview.snapshot().expanded'));
    await h.wait(500);
    check('Expanded avatars use 32 DIP slots and unchanged 16 DIP brand drawings', await h.evaluate("[...document.querySelectorAll('#sessions-list .agent-avatar')].every(el=>el.getBoundingClientRect().width===32 && el.querySelector('svg').getBoundingClientRect().height===16 && el.querySelector('.brand-mark').getBBox().width<=16)"));
    await shot('agent-companions-sessions.png');
    const audit = await h.evaluate(`(()=>{
      const sandbox=document.createElement('div');document.body.append(sandbox);
      sandbox.innerHTML=['codex','antigravity','opencode'].flatMap(agent=>Object.keys(IslandAvatars.states).map(state=>IslandAvatars.render(agent,state))).join('');
      const avatars=[...sandbox.children];
      const result={count:avatars.length,clipped:[],thin:[],brandsStable:true};
      for(const el of avatars){
        const brand=el.querySelector('.brand-mark').innerHTML;
        const label=el.dataset.agent+':'+el.dataset.state;
        for(const frame of el.querySelectorAll('.sprite-frame')){
          const b=frame.getBBox(),t=frame.transform.baseVal.consolidate().matrix;
          if(b.x+t.e<17 || b.x+b.width+t.e>32 || b.y+t.f<0 || b.y+b.height+t.f>16)result.clipped.push(label);
          if(el.dataset.state!=='idle' && (b.width<4 || b.height<4))result.thin.push(label);
        }
        if(brand!==new DOMParser().parseFromString(IslandAvatars.render(el.dataset.agent,'idle',true),'text/html').querySelector('.brand-mark').innerHTML)result.brandsStable=false;
      }
      sandbox.remove();return result;
    })()`);
    check('All 27 provider/state combinations fit their motion slots', audit.count===27 && !audit.clipped.length);
    check('Meaningful glyphs have filled visible bounds and stable product marks', !audit.thin.length && audit.brandsStable);
    await h.evaluate('IslandPreview.setReducedMotion(true)');
    check('Reduced motion leaves exactly one complete pose', await h.evaluate("[...document.querySelectorAll('#sessions-list .agent-avatar')].every(el=>[...el.querySelectorAll('.sprite-frame')].filter(f=>getComputedStyle(f).opacity==='1').length===1 && [...el.querySelectorAll('.sprite-frame')].every(f=>getComputedStyle(f).animationName==='none'))"));
    await click('settings-button');
    check('Settings opens inside the island', await h.until('IslandPreview.snapshot().settingsOpen'));
    await click('settings-back');
    check('Settings Back returns to Sessions', await h.until('!IslandPreview.snapshot().settingsOpen'));
    await h.evaluate('IslandPreview.setReducedMotion(false)');
    h.on('Page.screencastFrame', event => {
      frames.push({image:event.data, timestamp:event.metadata.timestamp});
      acknowledgments.push(h.send('Page.screencastFrameAck', {sessionId:event.sessionId}));
    });
    await h.send('Page.startScreencast', {format:'jpeg', quality:85, everyNthFrame:2});
    const poses = new Set();
    for (let i=0; i<10; i++) {
      poses.add(await h.evaluate("[...document.querySelectorAll('#sessions-list .sprite-frame')].map(f=>getComputedStyle(f).opacity).join(',')"));
      await h.wait(130);
    }
    await h.send('Page.stopScreencast');
    h.on('Page.screencastFrame', () => {});
    await Promise.all(acknowledgments);
    check('Working companions advance discrete poses in WebView2', poses.size>1);
    check('A fresh native motion recording contains multiple frames', frames.length>2);
    fs.writeFileSync(path.join(root, 'artifacts/agent-companions-motion.json'), JSON.stringify(frames));
    fs.writeFileSync(path.join(root, 'artifacts/agent-companions-motion.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Threadcap companion recording</title><style>body{background:#111;color:#eee;font:14px 'Segoe UI',sans-serif}button{cursor:pointer;padding:10px}img{display:block;object-fit:contain;object-position:top left;max-width:100%}</style><header><h1>Native companion recording</h1></header><main><p>Synthetic sessions in the freshly built WebView2 host.</p><button id="play">Play</button> <button id="pause">Pause</button><img id="frame" width="592" height="800" alt="Recorded Threadcap fixture sessions"></main><footer>No live provider tasks were started.</footer><script>const frames=${JSON.stringify(frames)};const image=document.getElementById('frame');let timers=[];function pause(){timers.forEach(clearTimeout);timers=[]}document.getElementById('play').onclick=()=>{pause();frames.forEach(frame=>timers.push(setTimeout(()=>image.src='data:image/jpeg;base64,'+frame.image,(frame.timestamp-frames[0].timestamp)*1000)))};document.getElementById('pause').onclick=pause;image.src='data:image/jpeg;base64,'+frames[0].image;</script></html>`);
    check('Native UI reports no JavaScript exceptions or console errors', errors.length===0);
    const report={executableSha256:crypto.createHash('sha256').update(fs.readFileSync(exe)).digest('hex'), checks, audit, frames:frames.length, limitations:'Synthetic WebView2 fixtures. Mixed-monitor DPI, physical outside-click, and live provider integration were not tested.'};
    fs.writeFileSync(path.join(root, 'artifacts/agent-companions-native.json'), JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {
    await h.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
