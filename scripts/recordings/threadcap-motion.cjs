const {startNative}=require('../../tests/native/native-harness.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const h=await startNative('threadcap-motion'),frames=[];
  try{
    h.on('Page.screencastFrame',event=>{if(frames.length<600)frames.push({jpeg:event.data,timestamp:event.metadata.timestamp});void h.send('Page.screencastFrameAck',{sessionId:event.sessionId});});
    await h.inject({agentId:'codex',sessionId:'motion',sourceRevision:1,eventId:'motion-1',status:'running',taskTitle:'Isolated motion fixture',eventKind:'activity'});
    await h.wait(450);
    await h.send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:740,maxHeight:800,everyNthFrame:2});
    await h.wait(250);
    const point=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+20};})()");
    await h.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await h.wait(650);
    await h.evaluate('IslandPreview.showOverview()');await h.wait(600);
    await h.evaluate("document.getElementById('archive-button').click()");await h.wait(500);
    await h.evaluate("document.getElementById('settings-back').click();document.getElementById('settings-button').click()");await h.wait(500);
    await h.evaluate("document.querySelector('[data-provider=opencode]').click()");await h.wait(600);
    await h.evaluate('IslandPreview.setExpanded(false)');await h.wait(500);
    await h.inject({agentId:'codex',sessionId:'motion',sourceRevision:2,eventId:'motion-2',status:'waiting_input',requestId:'question',question:'Inspect this fixture transition in the island.',eventKind:'request'});await h.wait(700);
    await h.evaluate('IslandPreview.setExpanded(false);IslandPreview.setReducedMotion(true);IslandPreview.showOverview()');await h.wait(300);
    await h.send('Page.stopScreencast');
    if(frames.length<3)throw Error('Native recording produced too few frames');
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Threadcap native motion recording</title><style>body{background:#202126;color:#eee;font:14px Segoe UI;margin:24px}img{display:block;max-width:100%;margin-top:16px}button{padding:8px 12px;cursor:pointer}</style><h1>Threadcap native motion recording</h1><p>Width-only hover, Sessions, Archive, Settings, request reveal, and reduced motion. Synthetic fixtures, no model calls.</p><button id="play">Replay</button><img id="frame" alt="Recorded Threadcap native frame"><script>const frames=${JSON.stringify(frames)};const img=document.getElementById('frame');let timers=[];function play(){timers.forEach(clearTimeout);timers=frames.map(f=>setTimeout(()=>{img.src='data:image/jpeg;base64,'+f.jpeg},Math.max(0,(f.timestamp-frames[0].timestamp)*1000)));}document.getElementById('play').onclick=play;play();</script></html>`;
    fs.writeFileSync(path.join(h.root,'artifacts/threadcap-motion.html'),html);console.log(JSON.stringify({frames:frames.length,artifact:'artifacts/threadcap-motion.html'}));
  }finally{await h.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
