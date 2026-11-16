(async () => {
  const checks = [], wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), ...(passed || !detail ? {} : {detail}) });
  const html = await (await fetch('/index.html')).text();
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:592px;height:768px;border:0;z-index:99999';
  const stub = `
    window.nativeCalls = []; window.nativeListener = null; window.testErrors = []; addEventListener('error',event=>window.testErrors.push(event.message));
    window.__TAURI__ = {
      core: {
        Channel: class {},
        invoke: async (command, args) => {
          window.nativeCalls.push({command, args});
          if (command === 'connect_sessions') { window.nativeChannel = args.channel; args.channel.onmessage({protocolVersion:1,bridgeId:'native-test',sequence:0,eventId:'native-test:0',type:'sync',sessions:[]}); }
          if (command === 'read_usage') return {status:'unavailable',revision:1,buckets:[],reason:'Isolated test'};
          if (command === 'codex_integration') {
            await new Promise(resolve => setTimeout(resolve, 40));
            if (window.setupError) throw new Error(window.setupError);
            if (args.action === 'connect') window.codexRegistered = true;
            return {registered:Boolean(window.codexRegistered),cliAvailable:true,bridgeAvailable:true,error:null};
          }
          return command === 'desktop_ready' ? {globalShortcut:false} : undefined;
        }
      },
      event: { listen: async (name, callback) => { window.nativeListener = callback; return () => {}; } }
    };`;
  const ready = new Promise((resolve) => { frame.onload = resolve; });
  frame.srcdoc = html.replace('<head>', `<head><base href=${location.origin}/><script>${stub}</script>`);
  document.body.append(frame);
  try {
    await ready;
    const win = frame.contentWindow, doc = win.document;
    for (let attempt = 0; attempt < 100 && !win.nativeCalls.some((call) => call.command === 'desktop_ready'); attempt++) await wait(20);
    check('Native mode uses IPC and starts without fixtures', doc.body.classList.contains('is-native') && !win.IslandPreview.enabled && win.nativeCalls.some((call) => call.command === 'connect_sessions') && win.IslandPreview.snapshot().sessions.length === 0);
    check('Window is shown only after initial region acknowledgment', win.nativeCalls.findIndex((call) => call.command === 'update_region') < win.nativeCalls.findIndex((call) => call.command === 'desktop_ready'));
    const region = () => win.nativeCalls.filter((call) => call.command === 'update_region').at(-1)?.args.rects;
    const watch = () => win.nativeCalls.filter((call) => call.command === 'watch_outside_clicks').at(-1)?.args.active;
    check('Outside-click monitoring starts inactive for the compact island', watch() === false);
    check('Compact hit region matches the rendered attached island', region()?.[0].squareTop && Math.abs(region()[0].width - doc.getElementById('island-surface').getBoundingClientRect().width) < 2);
    check('Failed global shortcut registration is described honestly', doc.getElementById('shortcut-hint').textContent.includes('global shortcut unavailable'));
    const surface = doc.getElementById('island-surface'); win.IslandPreview.setReducedMotion(true); await wait(20);
    const beforePeek = surface.getBoundingClientRect();
    surface.dispatchEvent(new win.PointerEvent('pointerenter', {pointerType:'mouse'})); await wait(240);
    surface.getBoundingClientRect(); await wait(260);
    check('Reduced-motion hover changes width without changing height or opening sessions', surface.getBoundingClientRect().width > beforePeek.width && surface.getBoundingClientRect().height === beforePeek.height && !win.IslandPreview.snapshot().expanded);
    check('Hover does not start another quota collector', win.nativeCalls.filter(c=>c.command==='read_usage').length===1);
    surface.dispatchEvent(new win.PointerEvent('pointerleave', {pointerType:'mouse'})); await wait(480);
    check('Pointer exit restores compact width', Math.abs(surface.getBoundingClientRect().width-beforePeek.width)<1);
    win.IslandPreview.setReducedMotion(false);
    win.nativeListener({ payload: 'show' }); await wait(380);
    check('Tray show opens the actual session presentation', win.IslandPreview.snapshot().expanded);
    check('Opening the panel enables native outside-click monitoring', watch() === true);
    const expandedHeight = doc.getElementById('island-surface').getBoundingClientRect().height;
    check('Expanded hit region follows the visible shape', region()?.[0] && Math.abs(region()[0].height - expandedHeight) < 2);
    win.nativeListener({ payload: 'settings' }); await wait(260);
    check('Settings inhabits the same native hit region', win.IslandPreview.snapshot().settingsOpen && region().length === 1 && surface.contains(doc.getElementById('settings-view')) && !doc.querySelector('dialog'));
    const connect = doc.getElementById('connect-codex');
    check('Unregistered native Codex exposes Connect without claiming a session', connect.textContent === 'Connect' && doc.getElementById('codex-integration-status').textContent === 'Not connected');
    connect.focus(); connect.click(); connect.click();
    check('Setup disables duplicate clicks while work is pending', connect.disabled && connect.getAttribute('aria-busy') === 'true');
    await wait(100);
    check('Connect registers once and retains focus without claiming trust', win.nativeCalls.filter(call => call.command === 'codex_integration' && call.args.action === 'connect').length === 1 && doc.activeElement === connect && doc.getElementById('codex-integration-status').textContent === 'Registered' && doc.getElementById('codex-setup-note').textContent.includes('/hooks'));
    win.setupError = 'Codex CLI was not found on PATH.'; connect.click(); await wait(100);
    check('Setup errors are readable and leave a retry action', !connect.disabled && doc.getElementById('codex-setup-note').textContent.includes('not found on PATH') && doc.getElementById('codex-setup-note').classList.contains('is-error'));
    win.setupError = ''; connect.click(); await wait(100);
    check('Reconnecting clears setup errors', !doc.getElementById('codex-setup-note').classList.contains('is-error'));
    doc.querySelector('[data-settings-page="appearance"]').click(); await wait(280);
    check('Appearance is an actual island page', !doc.getElementById('settings-appearance').hidden && doc.getElementById('settings-agents').hidden);
    doc.querySelector('[data-settings-page="behavior"]').click(); await wait(280);
    check('Behavior is an actual island page', !doc.getElementById('settings-behavior').hidden && doc.getElementById('setting-sound'));
    doc.getElementById('settings-back').click();
    for (let attempt = 0; attempt < 50 && region()?.length !== 1; attempt++) await wait(20);
    check('Back restores sessions within one native hit region', !win.IslandPreview.snapshot().settingsOpen && region().length === 1);
    win.nativeListener({ payload: 'blur' }); await wait(280);
    check('Losing native focus collapses the panel', !win.IslandPreview.snapshot().expanded);
    win.nativeListener({ payload: 'toggle' }); await wait(380);
    check('Global action toggles the same presentation state', win.IslandPreview.snapshot().expanded);
    win.nativeListener({ payload: 'settings' }); await wait(220);
    win.nativeListener({ payload: 'outside-click' }); await wait(280);
    check('Native outside click dismisses Settings and collapses without a blur event', !win.IslandPreview.snapshot().settingsOpen && !win.IslandPreview.snapshot().expanded);
    check('Outside-click monitoring stops after dismissal', watch() === false);
    const first = win.nativeCalls.length;
    win.IslandPreview.setExpanded(true); win.IslandPreview.setExpanded(false); win.IslandPreview.setExpanded(true);
    await wait(20);
    check('Rapid reopen preserves each native watch lifecycle change', win.nativeCalls.slice(first).filter((call) => call.command === 'watch_outside_clicks').map((call) => call.args.active).join(',') === 'true,false,true');
    const session = {sessionId:'opencode:native-test',agentId:'opencode',status:'running',connectionStatus:'connected',revision:1,taskTitle:'IPC transport check',capabilities:{}};
    win.nativeChannel.onmessage({protocolVersion:1,bridgeId:'native-test',sequence:1,eventId:'native-test:1',type:'session_update',session});
    check('Native channel applies canonical sessions through the shared model', win.IslandPreview.snapshot().sessions[0]?.sessionId === session.sessionId);
    win.nativeChannel.onmessage({transportError:true}); await wait(1100);
    check('Native transport failure requests a fresh snapshot', win.nativeCalls.filter((call) => call.command === 'connect_sessions').length >= 2);
  } finally { frame.remove(); }
  return { passed: checks.filter((c) => c.passed).length, failed: checks.filter((c) => !c.passed), checks };
})();
