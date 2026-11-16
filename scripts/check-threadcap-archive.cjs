const {startNative}=require('./native-harness.cjs');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const h=await startNative('threadcap-archive'),checks=[];
  const check=(name,value)=>{checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
  const rows=async()=> (await(await fetch(`http://127.0.0.1:${h.port}/api/sessions`)).json()).sessions;
  const inject=(id,revision=1)=>h.inject({agentId:'codex',sessionId:id,sourceRevision:revision,eventId:`${id}-${revision}`,status:'completed',taskTitle:`Fixture ${id}`,eventKind:'completion'});
  const archive=id=>h.evaluate(`IslandDesktop.archiveSession(${JSON.stringify('codex:'+id)},true)`);
  const click=id=>h.evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const remove=id=>h.evaluate(`document.querySelector('[data-session-id=${JSON.stringify('codex:'+id)}] .archive-remove').click()`);
  try{
    for(const id of ['one','two','three']){await inject(id);await archive(id);}
    await h.until("IslandPreview.snapshot().sessions.length===0");
    for(let i=0;i<40;i++){if((await rows()).every(s=>s.terminalStatus==='checking'))break;await h.wait(200);}
    await h.evaluate("IslandPreview.showOverview();document.getElementById('archive-button').click()");
    await h.until("document.querySelectorAll('#archive-list .settings-row').length===3");
    await remove('one');await h.wait(350);
    check('Archive review keeps both decisions inside the visible island',await h.evaluate("(()=>{const panel=document.getElementById('settings-scroll').getBoundingClientRect();return ['archive-delete-confirm','archive-delete-cancel'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=panel.top && r.bottom<=panel.bottom;});})()"));
    await inject('one',2);await click('archive-delete-confirm');
    check('A changed canonical revision rejects deletion and preserves every target',await h.until("document.getElementById('archive-delete-note').textContent.includes('changed')") && (await rows()).length===3);
    await click('archive-delete-cancel');await remove('one');
    check('Confirmation disables duplicate submission and Cancel while sending',await h.evaluate("(()=>{const button=document.getElementById('archive-delete-confirm');button.click();button.click();return button.disabled && document.getElementById('archive-delete-cancel').disabled;})()"));
    check('Confirmed single Delete removes its row through native ordered updates',await h.until("document.querySelectorAll('#archive-list .settings-row').length===2 && document.getElementById('archive-confirm').hidden"));
    check('Single Delete preserves other archived sessions',(await rows()).every(s=>s.sessionId!=='codex:one') && (await rows()).length===2);
    await click('clear-archive');await inject('four');await archive('four');await click('archive-delete-confirm');
    check('Delete all excludes sessions archived after confirmation',await h.until("document.querySelectorAll('#archive-list .settings-row').length===1 && document.getElementById('archive-confirm').hidden") && (await rows())[0]?.sessionId==='codex:four');
    await click('clear-archive');await click('archive-delete-confirm');
    check('Deleting the final archive leaves a clear empty state and a valid return',await h.until("document.getElementById('archive-list').textContent==='No archived sessions.' && document.getElementById('archive-confirm').hidden") && (await rows()).length===0);
    await click('settings-back');check('Back after deletion returns to Sessions',await h.evaluate('!IslandPreview.snapshot().settingsOpen'));
    console.log(JSON.stringify({checks,modelCalls:0},null,2));
  }finally{fs.writeFileSync(path.join(h.root,'artifacts/threadcap-archive-native.json'),JSON.stringify({checks,modelCalls:0},null,2));await h.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
