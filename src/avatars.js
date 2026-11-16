/* Project pixel interpretations. Source provenance: docs/design/agent-icons.md. */
(() => {
  'use strict';
  const names = { codex: 'Codex', antigravity: 'Antigravity', opencode: 'OpenCode', unknown: 'Agent' };
  const states = { idle: 'Idle', running: 'Working', waiting_input: 'Needs input', waiting_approval: 'Needs approval', sending: 'Sending', completed: 'Done', failed: 'Failed', disconnected: 'Offline', checking: 'Checking terminal' };
  function pixelPath(rows, colorForPixel) {
    const layers = new Map();
    rows.forEach((spans, y) => {
      for (const [left, right] of spans) for (let x = left; x <= right; x++) {
        const fill = colorForPixel(x, y);
        layers.set(fill, (layers.get(fill) || '') + `M${x} ${y}h1v1h-1z`);
      }
    });
    return [...layers].map(([fill, path]) => `<path fill="${fill}" d="${path}"/>`).join('');
  }
  // Deliberate lobe notches preserve the Codex product cloud at utility scale.
  const codexRows = [
    [[5,8]], [[4,11]], [[3,13]], [[2,14]], [[1,14]], [[0,14]],
    [[0,14]], [[0,15]], [[0,15]], [[1,15]], [[1,14]], [[1,14]],
    [[2,13]], [[3,12]], [[6,10]], [[7,9]]
  ];
  const codexMark = pixelPath(codexRows, (_x, y) => y < 3 ? '#B1A7FF' : y < 6 ? '#969FFF' : y < 9 ? '#7A9DFF' : y < 12 ? '#5A72FF' : '#3941FF')
    + '<path fill="#FFFFFF" d="M4 5h1v1H4zM5 6h1v1H5zM6 7h1v1H6zM5 8h1v1H5zM4 9h1v1H4zM8 10h4v1H8z"/>';
  const archRows = [
    [[7,8]], [[6,9]], [[5,10]], [[4,11]], [[4,11]], [[3,12]],
    [[3,12]], [[3,12]], [[2,6],[9,13]], [[2,5],[10,13]],
    [[2,5],[10,13]], [[1,4],[11,14]], [[1,4],[11,14]],
    [[0,3],[12,15]], [[0,2],[13,15]], [[1,1],[14,14]]
  ];
  const antigravityMark = pixelPath(archRows, (x, y) => {
    if (y < 3) return x < 8 ? '#F7B92F' : '#F86A3A';
    if (y < 5) return x < 6 ? '#A7C751' : x < 9 ? '#CF9060' : '#F05F55';
    if (y < 7) return x < 6 ? '#5BB987' : x < 9 ? '#89A3BD' : '#C381B4';
    if (y < 9) return x < 6 ? '#378FC8' : x < 9 ? '#4D91ED' : '#8B8FE0';
    return '#3186FF';
  });
  // A compact project rendition keeps 4:5 proportions and integer 3px strokes.
  const opencodeMark = '<g transform="translate(2 0)"><path fill="#EEEEEE" fill-rule="evenodd" d="M0 0h12v15H0zM3 3v9h6V3z"/><path fill="#4B4B4B" d="M3 6h6v6H3z"/></g>';
  const unknownMark = '<path fill="#A8A8B3" fill-rule="evenodd" d="M2 2h12v12H2zM4 4v8h8V4z"/><path fill="#A8A8B3" d="M6 6h4v4H6z"/>';
  const marks = { codex: codexMark, antigravity: antigravityMark, opencode: opencodeMark, unknown: unknownMark };
  const symbols = {
    idle: ['.......','.......','.......','..xx...','..xx...','.......','.......','.......'],
    waiting_input: ['.xxxx..','xx..xx.','....xx.','...xx..','..xx...','.......','..xx...','.......'],
    waiting_approval: ['..xx...','..xx...','..xx...','..xx...','..xx...','.......','..xx...','.......'],
    completed: ['.......','.....xx','....xx.','xx.xx..','.xxx...','..x....','.......','.......'],
    failed: ['xx...xx','.xx.xx.','..xxx..','...x...','..xxx..','.xx.xx.','xx...xx','.......'],
    disconnected: ['xx...xx','.xx.xx.','.......','.......','.xx.xx.','xx...xx','.......','.......']
    ,checking: ['.xxxx..','xx..xx.','xx..xx.','xx..xx.','.xxxx..','.......','..xx...','.......']
  };
  function symbolPath(grid) {
    let path = '';
    grid.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === 'x') path += `M${x} ${y}h1v1h-1z`; }));
    return `<path fill="currentColor" d="${path}"/>`;
  }
  function companion(agent, state, frame) {
    if (state === 'running' || state === 'sending') {
      if (agent === 'antigravity') return `<path fill="currentColor" d="M3 ${4 - frame}h2v3H3zM0 ${6 - frame}h2v2H0zM6 ${6 - frame}h2v2H6z"/>`;
      if (agent === 'opencode') return `<path fill="currentColor" d="M0 5h2v2H0zM3 ${5 - frame}h2v${2 + frame}H3zM6 ${4 - frame}h2v${3 + frame}H6z"/>`;
      return `<path fill="currentColor" d="M0 1h2v2H0zM2 3h2v2H2zM0 5h2v2H0zM${4 + frame} 6h2v2h-2z"/>`;
    }
    const dx = agent === 'codex' && frame === 1 ? 1 : 0;
    const dy = agent === 'antigravity' && frame === 1 ? -1 : agent === 'opencode' && frame === 1 ? 1 : 0;
    const resolved = ['completed', 'failed', 'disconnected'].includes(state);
    const arrivalX = resolved && agent === 'codex' ? [-2,-1,0][frame] : resolved && agent === 'opencode' ? [1,-1,0][frame] : dx;
    const arrivalY = resolved && agent === 'antigravity' ? [2,1,0][frame] : resolved ? 0 : dy;
    // Only the companion moves. The product mark never deforms or changes palette.
    return `<g transform="translate(${arrivalX} ${arrivalY})">${symbolPath(symbols[state] || symbols.idle)}</g>`;
  }
  function render(agent = 'unknown', state = 'idle', isStatic = false, settled = false) {
    agent = Object.hasOwn(marks, agent) ? agent : 'unknown';
    state = Object.hasOwn(states, state) ? state : 'idle';
    const frames = isStatic ? '' : [0,1,2].map((frame) => `<g class="sprite-frame sprite-frame-${frame}" transform="translate(20 4)">${companion(agent, state, frame)}</g>`).join('');
    return `<span class="agent-avatar${isStatic ? ' is-static' : ''}${settled ? ' is-settled' : ''}" data-agent="${agent}" data-state="${state}" role="img" aria-label="${names[agent]}: ${states[state]}" title="${names[agent]} · ${states[state]}"><svg viewBox="0 0 ${isStatic ? '16 16' : '28 16'}" width="${isStatic ? 16 : 28}" height="16" shape-rendering="crispEdges" aria-hidden="true"><g class="brand-mark">${marks[agent]}</g>${frames}</svg></span>`;
  }
  window.IslandAvatars = Object.freeze({ render, names, states });
})();
