/* Run this expression with the Orca browser against /?preview=1. No packages required. */
(async () => {
  const api = window.IslandPreview;
  if (!api?.enabled) throw new Error('Open the explicit Preview route first.');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const results = [];
  const check = (name, condition, detail = '') => {
    results.push({ name, passed: Boolean(condition), detail });
  };
  const surface = document.getElementById('island-surface');
  const initialRequests = performance.getEntriesByType('resource').filter((r) => /api\/(events|action)/.test(r.name));
  check('Preview does not connect to the live bridge', initialRequests.length === 0);
  api.setReducedMotion(false);
  api.showOverview();
  check('Default island joins the top edge without upper corners', document.body.classList.contains('bezel') && surface.getBoundingClientRect().top === 0 && getComputedStyle(surface).borderTopLeftRadius === '0px' && document.getElementById('setting-bezel').checked);
  const agents = ['codex', 'antigravity', 'opencode'];
  const states = ['idle', 'running', 'waiting_input', 'waiting_approval', 'completed', 'failed', 'disconnected'];
  for (const agent of agents) {
    let stableMark;
    api.setAgent(agent);
    for (const state of states) {
      api.setState(state);
      await wait(20);
      const session = api.snapshot().sessions.find((s) => s.agentId === agent);
      const row = [...document.querySelectorAll('.session')].find((el) => el.dataset.session === session.sessionId);
      const sprite = row.querySelector('.agent-avatar');
      const animations = [...sprite.querySelectorAll('g,path')].map((el) => getComputedStyle(el).animationName).filter((name) => name !== 'none');
      check(`${agent}: ${state} renders its state companion`, sprite.dataset.agent === agent && sprite.dataset.state === state && animations.length > 0, animations.join(', '));
      const mark = sprite.querySelector('.brand-mark');
      stableMark ||= mark.innerHTML;
      check(`${agent}: ${state} preserves logo geometry and palette`, mark.innerHTML === stableMark && getComputedStyle(mark).opacity === '1' && getComputedStyle(sprite).opacity === '1');
    }
    api.setState('running');
    const referenceBox = document.querySelector(`.session .agent-avatar[data-agent=${agent}] .brand-mark`).getBBox();
    check(`${agent}: recognizable whole-pixel logo size`, agent === 'opencode' ? referenceBox.width === 12 && referenceBox.height === 15 : referenceBox.width === 16 && referenceBox.height === 16);
  }
  api.setAgent('antigravity'); api.setState('waiting_input');
  const question = api.snapshot().sessions.find((s) => s.agentId === 'antigravity');
  api.select(question.sessionId);
  await wait(350);
  const input = document.getElementById('reply-' + question.sessionId);
  input.focus(); input.value = 'Keep my draft'; input.setSelectionRange(4, 8); input.dispatchEvent(new Event('input', { bubbles: true }));
  api.setAgent('codex'); api.setState('waiting_approval');
  check('Unrelated state changes preserve input, caret, and focus', document.activeElement === input && input.value === 'Keep my draft' && input.selectionStart === 4);
  api.setExpanded(false); await wait(70); api.setExpanded(true); await wait(350);
  check('Collapse and reopen preserve the draft', input.value === 'Keep my draft' && api.snapshot().drafts[question.sessionId + ':' + question.requestId] === 'Keep my draft');
  api.setExpanded(false);
  // Sample the real CSS transition deterministically; background webviews may throttle frames.
  const widthTransition = surface.getAnimations().find((animation) => animation.transitionProperty === 'width');
  if (widthTransition) widthTransition.currentTime = 65;
  const intermediateWidth = surface.getBoundingClientRect().width;
  check('Surface has measurable intermediate geometry', Boolean(widthTransition) && intermediateWidth > 352 && intermediateWidth < 560, String(intermediateWidth));
  api.setExpanded(true); await wait(40); api.setExpanded(false); await wait(30); api.setExpanded(true);
  surface.getBoundingClientRect();
  await Promise.race([Promise.all(surface.getAnimations().map((animation) => animation.finished.catch(() => {}))), wait(900)]);
  // Embedded browser tabs can throttle painting while another Orca terminal is foregrounded.
  for (let attempt = 0; attempt < 60 && Math.abs(surface.getBoundingClientRect().width - Math.min(560, innerWidth - 32)) >= 2; attempt++) await wait(50);
  check('Interrupted transitions settle at the last requested view', api.snapshot().expanded && Math.abs(surface.getBoundingClientRect().width - Math.min(560, innerWidth - 32)) < 2 && !document.getElementById('expanded-view').inert, JSON.stringify({width:surface.getBoundingClientRect().width,target:surface.style.width,viewport:innerWidth,animations:surface.getAnimations().map(a=>({time:a.currentTime,state:a.playState,property:a.transitionProperty}))}));
  api.setAgent('codex'); api.setState('waiting_approval');
  const codex = api.snapshot().sessions.find((s) => s.agentId === 'codex');
  api.select(codex.sessionId); await wait(350);
  const row = [...document.querySelectorAll('.session')].find((el) => el.dataset.session === codex.sessionId);
  const allow = row.querySelector('[data-action=allow]');
  allow.click(); allow.click();
  check('Sending disables both decisions', row.querySelector('[data-action=deny]').disabled && row.querySelector('[data-action=allow]').disabled);
  check('Sending does not claim instant success', api.snapshot().delivery[codex.sessionId + ':' + codex.requestId] === 'sending');
  await wait(650);
  check('Preview acknowledgment occurs before simulated resume', api.snapshot().delivery[codex.sessionId + ':' + codex.requestId] === 'acknowledged' && api.snapshot().sessions.find((s) => s.sessionId === codex.sessionId).status === 'waiting_approval');
  await wait(750);
  check('Simulated resume is separate from acknowledgment', api.snapshot().sessions.find((s) => s.sessionId === codex.sessionId).status === 'running');
  api.setState('disconnected');
  check('Offline remains distinct from task completion', row.querySelector('.agent-avatar').dataset.state === 'disconnected' && api.snapshot().sessions.find((s) => s.sessionId === codex.sessionId).status === 'running');
  api.setReducedMotion(true); api.setState('running');
  const moving = [...row.querySelectorAll('.agent-avatar *')].some((el) => getComputedStyle(el).animationName !== 'none');
  check('Reduced motion removes sprite loops', !moving);
  api.setExpanded(false); await wait(20);
  check('Reduced motion changes geometry without interpolation', Math.abs(surface.getBoundingClientRect().width - Math.min(312, innerWidth - 32)) < 2);
  api.setExpanded(true); api.setReducedMotion(false);
  api.setAgent('opencode'); api.setState('waiting_approval');
  api.setAgent('antigravity'); api.setState('waiting_input');
  api.setAgent('codex'); api.setState('running');
  api.select(codex.sessionId); // Close detail for the final overview.
  await wait(400);
  check('Closed details do not create phantom scrolling', document.getElementById('sessions-list').scrollHeight <= document.getElementById('sessions-list').clientHeight + 2 || innerHeight < 450);
  check('No horizontal document overflow', document.documentElement.scrollWidth <= innerWidth);
  api.setAgent('opencode'); api.setState('waiting_approval'); api.setExpanded(false); api.openFromCompact();
  check('Compact request opens focused presentation', api.snapshot().focused && api.snapshot().selected === 'sess-opencode-1');
  check('Focused view shows exactly one session', [...document.querySelectorAll('.session')].filter((row) => !row.hidden).length === 1 && !document.getElementById('all-sessions-button').hidden);
  api.showOverview();
  check('Show all restores the overview without losing sessions', !api.snapshot().focused && [...document.querySelectorAll('.session')].every((row) => !row.hidden) && api.snapshot().sessions.length === 4);
  api.setAgent('antigravity'); api.setState('completed'); api.setExpanded(false); api.openFromCompact();
  check('Compact completion opens the correct focused result', api.snapshot().focused && api.snapshot().selected === 'sess-antigravity-1');
  api.setReducedMotion(true);
  const reducedSprite = document.querySelector('.is-selected .agent-avatar');
  const visibleFrames = [...reducedSprite.querySelectorAll('.sprite-frame')].filter((frame) => getComputedStyle(frame).opacity === '1');
  check('Reduced motion renders exactly one complete pixel pose', visibleFrames.length === 1 && visibleFrames[0].classList.contains('sprite-frame-2'));
  api.setReducedMotion(false); api.showOverview();
  for (const id of ['codex','antigravity','opencode']) { api.setAgent(id); api.setState('running'); }
  api.showAggregate();
  check('Aggregate compact shows the live session count', document.getElementById('compact-title').textContent === '4 live');
  check('Aggregate provider group contains stable marks with independent state companions', document.querySelectorAll('#compact-avatars .brand-mark').length === 3 && document.querySelectorAll('#compact-avatars .sprite-frame').length === 9);
  check('Aggregate status counts running sessions without a per-session timer', document.getElementById('compact-status').textContent === '3 working');
  check('Aggregate accessible label describes all sessions', document.getElementById('compact-view').getAttribute('aria-label').includes('4 live, 0 saved, 3 working'));
  return { passed: results.filter((r) => r.passed).length, failed: results.filter((r) => !r.passed), checks: results };
})();
