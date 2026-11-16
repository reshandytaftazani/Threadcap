(() => {
  'use strict';
  const avatars = window.IslandAvatars;
  const status = document.getElementById('icon-study-status');
  if (!avatars) {
    status.textContent = 'Icon artwork could not load. Reload this page to retry.';
    document.getElementById('pause-icons').disabled = true;
    return;
  }
  const sources = {
    codex: { file: 'codex-reference.svg', url: 'https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/codex-color.svg', caption: 'Community SVG reference, cross-checked against OpenAI material.' },
    antigravity: { file: 'antigravity-original.svg', url: 'https://antigravity.google/press', caption: 'Unmodified first-party press asset.' },
    opencode: { file: 'opencode-original.svg', url: 'https://opencode.ai/brand', caption: 'Unmodified first-party dark-background asset. Original 4:5 ratio retained.' }
  };
  if (!Object.keys(sources).length) {
    status.textContent = 'No source references are available yet.';
    document.getElementById('pause-icons').disabled = true;
    return;
  }
  document.getElementById('icon-comparisons').innerHTML = Object.entries(sources).map(([id, source]) => `<section class="study-row"><h2>${avatars.names[id]}</h2><div class="study-comparison"><div class="study-sample"><div class="study-large"><img src="assets/agents/sources/${source.file}" width="96" height="96" alt="${avatars.names[id]} source reference"></div><span class="study-caption">Source reference</span></div><div class="study-sample"><div class="study-large">${avatars.render(id, 'idle', true)}</div><span class="study-caption">Pixel mark, enlarged 4x</span></div><div class="study-states">${Object.entries(avatars.states).map(([state, label]) => `<div class="study-state">${avatars.render(id, state)}<span>${label}</span></div>`).join('')}</div></div><p class="study-reference">${source.caption} <a href="${source.url}">View source</a></p></section>`).join('');
  status.hidden = true;
  document.querySelectorAll('.study-large img').forEach((image) => image.addEventListener('error', () => {
    const caption = image.closest('.study-sample').querySelector('.study-caption');
    caption.textContent = 'Source image unavailable. Use View source.';
  }));
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = query.matches;
  const button = document.getElementById('pause-icons');
  function applyPause() {
    document.body.classList.toggle('reduced-motion', paused);
    document.body.classList.toggle('motion-allowed', !paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Resume animation' : 'Pause animation';
  }
  button.addEventListener('click', () => { paused = !paused; applyPause(); });
  query.addEventListener('change', (event) => { paused = event.matches; applyPause(); });
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('page-hidden', document.hidden));
  applyPause();
})();
