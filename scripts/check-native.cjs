// Run only against an isolated native host with an in-memory store and local CDP enabled.
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const debugPort = Number(process.argv[2] || 9228);
  const bridgePort = Number(process.argv[3] || 37898);
  if (bridgePort === 37891) throw new Error('Use an isolated test port and an in-memory session store.');
  const bridge = 'http://127.0.0.1:' + bridgePort;
  const health = await (await fetch(bridge + '/api/status')).json();
  const initial = await (await fetch(bridge + '/api/sessions')).json();
  if (health.runtime !== 'rust' || initial.sessions.length) throw new Error('Expected an empty, isolated Rust bridge.');
  const pages = await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json();
  const page = pages.find((p) => p.type === 'page' && p.title === 'Vibe Island');
  if (!page) throw new Error('Native WebView2 page not found.');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map(), errors = [], checks = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((a) => a.value || a.description).join(' '));
    const request = pending.get(message.id);
    if (request) { pending.delete(message.id); clearTimeout(request.timeout); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const check = (name, passed) => { checks.push({ name, passed: Boolean(passed) }); };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return true; await wait(30); }
    return false;
  };
  const screenshot = async (name) => {
    const clip = await evaluate(`(() => { const r=document.getElementById('island-surface').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`);
    const result = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
    const directory = path.resolve(__dirname, '../artifacts'); await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  try {
    await send('Runtime.enable');
    check('Actual native runtime exposes IPC and no preview fixtures', await evaluate(`Boolean(window.IslandDesktop && !IslandPreview.enabled && IslandPreview.snapshot().sessions.length===0)`));
    check('Native surface starts attached to the upper edge', await evaluate(`(() => { const e=document.getElementById('island-surface'); return e.getBoundingClientRect().top===0 && getComputedStyle(e).borderTopLeftRadius==='0px'; })()`));
    await wait(400); await screenshot('native-compact');
    for (const [index, agent] of ['codex', 'antigravity', 'opencode'].entries()) {
      const response = await fetch(bridge + '/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agent, sessionId: 'native-smoke-' + index, status: index === 2 ? 'waiting_approval' : 'running', requestId: index === 2 ? 'native-request' : null, command: index === 2 ? 'npm test' : '', taskTitle: 'Isolated native transport check', projectName: 'Native test', eventId: 'event-1', sourceRevision: 1 }) });
      if (!response.ok) throw new Error('Native producer ingestion failed: ' + response.status);
    }
    check('Rust HTTP updates arrive through real Tauri IPC', await until(`IslandPreview.snapshot().sessions.length===3`));
    await evaluate(`IslandPreview.openFromCompact()`); await wait(400);
    check('Focused request preserves monitoring-only capability', await evaluate(`IslandPreview.snapshot().focused && !document.querySelector('[data-action=allow]') && document.getElementById('sessions-list').textContent.includes('Monitoring only.')`));
    await screenshot('native-request');
    await evaluate(`document.getElementById('all-sessions-button').click()`); await wait(350);
    check('Overview shows every provider without preview controls', await evaluate(`!IslandPreview.snapshot().focused && [...document.querySelectorAll('.session')].every(r=>!r.hidden) && document.getElementById('preview-tools').hidden`));
    check('Native region validation rejects invalid bounds', await evaluate(`(async()=>{try{await __TAURI__.core.invoke('update_region',{rects:[{x:-1,y:0,width:20,height:20,radius:0,squareTop:true}]});return false;}catch{return true;}})()`));
    await evaluate(`document.getElementById('settings-button').click()`); await wait(300);
    check('Settings opens inside the actual native island', await evaluate(`IslandPreview.snapshot().settingsOpen && !document.querySelector('dialog')`));
    await evaluate(`document.getElementById('settings-back').click(); IslandPreview.setExpanded(false); IslandPreview.setExpanded(true); IslandPreview.setExpanded(false);`); await wait(450);
    check('Interrupted native transitions settle at compact geometry', await evaluate(`!IslandPreview.snapshot().expanded && Math.abs(document.getElementById('island-surface').getBoundingClientRect().height-42)<1`));
    const snapshot = await (await fetch(bridge + '/api/sessions')).json();
    await evaluate(`IslandPreview.applyEvent(${JSON.stringify({ ...snapshot, type: 'session_update', sequence: snapshot.sequence + 5, eventId: snapshot.bridgeId + ':' + (snapshot.sequence + 5), session: snapshot.sessions[0] })})`);
    check('Native stream gap recovers from the authoritative Rust snapshot', await until(`document.getElementById('connection-label').textContent==='Local' && IslandPreview.snapshot().sessions.length===3`));
    await evaluate(`IslandPreview.setReducedMotion(true); IslandPreview.setExpanded(true);`);
    check('Reduced motion removes native surface interpolation', await evaluate(`getComputedStyle(document.getElementById('island-surface')).transitionDuration.split(',').every(s=>parseFloat(s)===0)`));
    const decision = await fetch(bridge + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'opencode:native-smoke-2', requestId: 'native-request', action: 'allow' }) });
    check('Native bridge never acknowledges an unsupported action', decision.status === 501 && (await decision.json()).acknowledged === false);
    check('No native JavaScript exceptions or console errors', errors.length === 0);
    // Leave a stable compact surface; detaching a debugger may also trigger native blur.
    await evaluate(`IslandPreview.setExpanded(false)`); await wait(100);
    const geometry = await evaluate(`(() => {const r=document.getElementById('island-surface').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:devicePixelRatio};})()`);
    const result = { passed: checks.filter((c) => c.passed).length, failed: checks.filter((c) => !c.passed), checks, errors, geometry };
    await fs.writeFile(path.resolve(__dirname, '../artifacts/native-runtime.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.failed.length ? 1 : 0;
  } finally { socket.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
