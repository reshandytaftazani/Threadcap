(async () => {
  const frame = document.createElement('iframe'); frame.width = 592; frame.height = 768;
  frame.style.cssText = 'position:fixed;left:0;top:0;border:0;z-index:99999';
  const ready = new Promise(resolve => frame.onload = resolve); frame.src = '/?preview=1'; document.body.append(frame);
  const checks=[],check=(name,passed)=>checks.push({name,passed:Boolean(passed)}),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try {
    await ready;
    const w=frame.contentWindow,d=w.document,api=w.IslandPreview;
    api.setReducedMotion(true);
    const question=api.snapshot().sessions.find(s=>s.agentId==='antigravity');
    api.showFocused(question.sessionId); await wait(30);
    const input=d.querySelector('.reply-input'); input.focus(); input.value='Keep my draft'; input.setSelectionRange(4,7);input.dispatchEvent(new w.Event('input',{bubbles:true}));
    d.getElementById('settings-button').click();
    check('Settings preserves the mounted reply and draft',input.isConnected && api.snapshot().drafts[`${question.sessionId}:${question.requestId}`]==='Keep my draft');
    d.querySelector('[data-settings-page="appearance"]').click();
    d.getElementById('setting-motion').click();d.getElementById('setting-motion').click();
    check('Appearance motion control changes the actual preference',api.snapshot().reducedMotion);
    const original=d.body.classList.contains('bezel');d.getElementById('setting-bezel').click();
    check('Appearance attachment control changes the surface',d.body.classList.contains('bezel')!==original);d.getElementById('setting-bezel').click();
    d.querySelector('[data-settings-page="behavior"]').click();
    check('Behavior has the supported sound and shortcut controls',!d.getElementById('settings-behavior').hidden && d.getElementById('setting-sound') && d.getElementById('shortcut-hint'));
    const priorSound=d.getElementById('sound-button').getAttribute('aria-pressed');
    d.getElementById('setting-sound').click();
    check('Sound switch updates the actual shared audio setting',d.getElementById('sound-button').getAttribute('aria-pressed')!==priorSound && String(d.getElementById('setting-sound').checked)===d.getElementById('sound-button').getAttribute('aria-pressed'));
    d.getElementById('sound-button').click();
    check('Header sound action updates the Settings switch',d.getElementById('sound-button').getAttribute('aria-pressed')===priorSound && String(d.getElementById('setting-sound').checked)===priorSound);
    d.getElementById('settings-back').click();
    check('Back restores focused session, input focus, caret, and draft',api.snapshot().selected===question.sessionId && d.activeElement===input && input.selectionStart===4 && input.selectionEnd===7 && input.value==='Keep my draft');
    d.getElementById('settings-button').click();
    check('Pending requests expose explicit navigation without replacing Settings',api.snapshot().settingsOpen && !d.getElementById('settings-attention').hidden);
    d.getElementById('settings-attention').click();check('View request explicitly leaves Settings and opens a request',!api.snapshot().settingsOpen && api.snapshot().focused);
    api.showOverview();
    const fixture={status:'fresh',revision:1,providerId:'codex',observedAt:Date.now()/1000,sessionMapped:false,source:'Isolated browser fixture',buckets:[{id:'codex',name:'Codex fixture',windows:[{remainingPercent:75,windowMinutes:300,resetsAt:Math.floor(Date.now()/1000)+3600},{remainingPercent:40,windowMinutes:10080}]}]};
    check('An explicitly injected preview snapshot validates',w.IslandUsage.accept(fixture));
    check('Shared account quota appears once despite two Codex sessions',d.querySelectorAll('[data-usage-provider="codex"]').length===1 && d.getElementById('usage-band').textContent.includes('5h 75%'));
    api.showFocused(api.snapshot().sessions.find(s=>s.agentId==='codex').sessionId);
    check('Unverified session mapping never claims a session balance',d.getElementById('usage-band').textContent.includes('Session account unverified') && d.getElementById('usage-band').textContent.includes('Usage unavailable'));
    api.showOverview();d.querySelector('[data-usage-provider="codex"]').click();
    check('Quota detail is an Agents page in the same island',api.snapshot().settingsOpen && api.snapshot().providerPage==='codex' && d.getElementById('provider-usage-detail').textContent.includes('75% remaining') && !d.querySelector('dialog'));
    check('Malformed percentages cannot replace a verified snapshot',!w.IslandUsage.accept({...fixture,revision:2,buckets:[{windows:[{remainingPercent:101,windowMinutes:300}]}]}) && w.IslandUsage.snapshot().revision===1);
    w.IslandUsage.accept({...fixture,revision:2,status:'stale',reason:'Fixture disconnect',observedAt:Date.now()/1000-600});
    check('Stale quota shows freshness and failure context',w.IslandUsage.summary('codex').startsWith('Updated') && d.getElementById('provider-usage-detail').textContent.includes('Last known reading') && d.getElementById('provider-usage-detail').textContent.includes('Fixture disconnect'));
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    check('Escape goes from provider detail to Agents',api.snapshot().settingsOpen && !api.snapshot().providerPage);
    for(const provider of ['codex','antigravity','opencode']){
      d.querySelector(`[data-provider="${provider}"]`).click();
      check(`${provider} identity opens actual diagnostics in the island`,api.snapshot().providerPage===provider && !d.getElementById('provider-detail').hidden && d.getElementById('provider-diagnostics').textContent.length>0);
      d.getElementById('settings-back').click();
    }
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    check('A second Escape returns to sessions',!api.snapshot().settingsOpen);
    d.getElementById('settings-button').click();d.querySelector('[data-settings-page="appearance"]').click();api.setExpanded(false);
    check('Collapse retains the Settings route',!api.snapshot().settingsOpen && api.snapshot().settingsPage==='appearance');
    d.getElementById('settings-button').click();check('Explicit Settings reopening restores the section',api.snapshot().settingsOpen && !d.getElementById('settings-appearance').hidden);
    for(const screen of [[1366,768],[1920,1080]])for(const scale of [1,1.25,1.5,2]){
      frame.width=Math.min(592,screen[0]/scale);frame.height=screen[1]/scale;w.dispatchEvent(new w.Event('resize'));await wait(30);
      for(const page of ['agents','appearance','behavior']){
        d.querySelector(`[data-settings-page="${page}"]`).click();
        const r=d.getElementById('island-surface').getBoundingClientRect(),scroll=d.getElementById('settings-scroll').getBoundingClientRect();
        check(`${screen.join('x')} at ${scale*100}% logical size: ${page} stays within the island`,r.bottom<=w.innerHeight && d.documentElement.scrollWidth<=w.innerWidth && scroll.bottom<=r.bottom+1);
      }
    }
    frame.width=320;frame.height=640;w.dispatchEvent(new w.Event('resize'));
    for(const page of ['agents','appearance','behavior']){d.querySelector(`[data-settings-page="${page}"]`).click();await wait(30);check(`320px preview: ${page} has no horizontal overflow`,d.documentElement.scrollWidth<=w.innerWidth && d.getElementById('settings-scroll').scrollWidth<=d.getElementById('settings-scroll').clientWidth);}
  } finally { frame.remove(); }
  return {passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed),checks};
})();
