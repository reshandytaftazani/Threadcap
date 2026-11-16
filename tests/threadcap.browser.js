(async () => {
  const api=window.IslandPreview,checks=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const check=(name,passed)=>checks.push({name,passed:Boolean(passed)});
  if(!api?.enabled)throw Error('Use explicit Preview mode.');
  api.stopTour();api.setReducedMotion(false);
  if(!document.body.classList.contains('bezel'))document.getElementById('bezel-button').click();
  api.showOverview();document.getElementById('archive-button').click();await wait(420);
  check('Direct Archive keeps the same surface and exposes Sessions return',api.snapshot().settingsPage==='archive' && document.getElementById('back-destination').textContent==='Sessions' && !document.getElementById('archive-list').hidden);
  document.getElementById('settings-back').click();
  check('Archive return restores the session presentation',!api.snapshot().settingsOpen);
  api.showFocused(api.snapshot().sessions[0].sessionId);await wait(420);
  check('Focused session exposes Sessions as a visible return destination',!document.getElementById('settings-back').hidden && document.getElementById('back-destination').textContent==='Sessions');
  document.getElementById('settings-back').click();
  check('Focused Back returns to all sessions',!api.snapshot().focused);
  for(const agent of ['codex','antigravity','opencode']){
    const marks=[];
    for(const state of ['idle','running','waiting_input','waiting_approval','sending','completed','failed','disconnected','checking']){
      const sample=document.createElement('div');sample.innerHTML=IslandAvatars.render(agent,state);marks.push(sample.querySelector('.brand-mark').innerHTML);
      check(`${agent} ${state} has a static readable label and independent companion`,sample.querySelector('.agent-avatar').getAttribute('aria-label').length>5 && sample.querySelectorAll('.sprite-frame').length===3);
    }
    check(`${agent} product geometry stays identical across states`,new Set(marks).size===1);
  }
  for(const agent of ['codex','antigravity','opencode']){api.setAgent(agent);api.setState('idle');}
  api.showAggregate();await wait(400);
  check('Aggregated provider avatars retain state companions',document.querySelectorAll('#compact-avatars .agent-avatar:not(.is-static) .sprite-frame').length===9);
  api.setReducedMotion(true);await wait(30);
  check('Reduced motion keeps the last state pose readable',getComputedStyle(document.querySelector('#compact-avatars .sprite-frame-2')).opacity==='1' && getComputedStyle(document.querySelector('#compact-avatars .sprite-frame-0')).opacity==='0');
  api.setReducedMotion(false);api.showOverview();
  return {passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks};
})();
