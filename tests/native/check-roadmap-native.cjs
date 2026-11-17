const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path');
async function main(){
  const h=await startNative('roadmap'),checks=[];
  const check=(name,value)=>{checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
  const report=(id,rev,status,extra={})=>({agentId:'codex',sessionId:id,sourceRevision:rev,eventId:`${id}-${rev}`,status,taskTitle:`Isolated ${id}`,eventKind:'activity',...extra});
  const snap='IslandPreview.snapshot()';
  async function shot(name){await h.wait(400);const clip=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");const image=await h.send('Page.captureScreenshot',{format:'png',clip});fs.mkdirSync(path.join(h.root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(h.root,`artifacts/roadmap-${name}.png`),Buffer.from(image.data,'base64'));}
  try{
    check('Auto-open requests defaults on',await h.evaluate("document.getElementById('setting-auto-open').checked"));
    check('Automatic archive defaults off',!(await h.evaluate('IslandDesktop.retentionSettings(null)')));
    await h.inject(report('saved',1,'completed',{connectionStatus:'disconnected'}));
    check('Retained disconnected session is labeled saved',await h.until("document.getElementById('compact-title').textContent==='1 saved'"));await shot('saved');
    await h.inject(report('live',1,'running'));
    check('Mixed group counts only connected sessions as live',await h.until("document.getElementById('compact-title').textContent==='1 live'"));await shot('mixed');
    await h.inject(report('request',1,'waiting_approval',{requestId:'first',eventKind:'request',command:'Isolated fixture command'}));
    check('Fresh request reveals its focused surface without a UI focus call',await h.until(`${snap}.focused && ${snap}.selected==='codex:request' && document.activeElement.id!=='collapse-button'`));await shot('request');
    check('Monitoring request has no false Allow button',await h.evaluate("!document.querySelector('[data-session=\"codex:request\"] [data-action=allow]')"));
    await h.evaluate('IslandPreview.setExpanded(false)');
    await h.inject(report('request',2,'waiting_approval',{requestId:'first',eventKind:'request'}));
    await h.wait(150);check('Dismissed request does not reopen on progress',await h.evaluate(`!${snap}.expanded`));
    await h.evaluate("document.getElementById('settings-button').click()");
    await h.inject(report('request',3,'waiting_input',{requestId:'second',eventKind:'request',question:'Fixture question'}));
    check('New request preserves Settings and shows explicit attention',await h.until(`${snap}.settingsOpen && !document.getElementById('settings-attention').hidden`));
    await h.evaluate("document.getElementById('setting-auto-open').click();IslandPreview.setExpanded(false)");
    await h.inject(report('request',4,'waiting_approval',{requestId:'third',eventKind:'request'}));await h.wait(150);
    check('Disabled auto-open keeps the island compact',await h.evaluate(`!${snap}.expanded`));
    await h.inject(report('request',5,'completed'));
    await h.inject(report('live',2,'completed'));
    await h.wait(10300);
    check('Cooldown changes compact presentation without changing completed lifecycle',await h.evaluate(`${snap}.sessions.find(s=>s.sessionId==='codex:live').status==='completed' && !document.querySelector('#compact-avatars [data-state=completed]')`));
    await h.evaluate("IslandPreview.showFocused('codex:saved')");
    await h.wait(400);
    check('Archive control is available for eligible session detail',await h.evaluate("Boolean(document.querySelector('[data-session=\"codex:saved\"] [data-action=archive]'))"));
    await h.evaluate("document.querySelector('[data-session=\"codex:saved\"] [data-action=archive]').click()");
    check('Native archive removes the row from active sessions',await h.until(`!${snap}.sessions.some(s=>s.sessionId==='codex:saved')`));
    await h.evaluate("document.getElementById('settings-button').click();document.querySelector('[data-settings-page=behavior]').click();document.getElementById('show-archived').click()");
    check('Archive is inspectable in island Settings',await h.until("!document.getElementById('archive-list').hidden && document.getElementById('archive-list').textContent.includes('Isolated saved')"));await shot('archive');
    await h.evaluate("document.querySelector('#archive-list button').click()");
    check('Restore returns canonical session to active list',await h.until(`${snap}.sessions.some(s=>s.sessionId==='codex:saved')`));
    await h.inject(report('running',1,'running'));
    let protectedRun=false;try{await h.evaluate("IslandDesktop.archiveSession('codex:running',true)");}catch{protectedRun=true;}check('Native store rejects archiving running work',protectedRun);
    await h.evaluate("document.querySelector('[data-settings-page=agents]').click();document.querySelector('[data-provider=codex]').click()");
    check('Setup remains inside the island',await h.until("!document.getElementById('provider-connect-guide').hidden"));await shot('setup');
    await h.evaluate("document.getElementById('provider-connect').click()");
    check('Connect registers hooks and leaves trust review in Codex',await h.until("document.getElementById('provider-connect-state').textContent==='Waiting for activity' && document.getElementById('provider-connect-note').textContent.includes('/hooks')"));
    await h.inject(report('setup-fresh',1,'idle'));
    check('Fresh accepted event completes activity verification',await h.until("document.getElementById('provider-connect-state').textContent==='Connected'"));await shot('setup-verified');
    await h.evaluate("IslandPreview.setReducedMotion(true);IslandPreview.setExpanded(false)");
    check('Reduced motion suppresses companion animations',await h.evaluate("[...document.querySelectorAll('#compact-avatars .sprite-frame')].every(el=>getComputedStyle(el).animationName==='none')"));
    console.log(JSON.stringify({passed:checks.length,failed:[],modelCalls:0},null,2));
  }finally{await h.close();fs.mkdirSync(path.join(h.root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(h.root,'artifacts/roadmap-native.json'),JSON.stringify({checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed)},null,2));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
