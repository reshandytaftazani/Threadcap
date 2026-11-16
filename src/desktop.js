(() => {
  'use strict';
  if (!window.__TAURI__?.core) return;
  const { invoke, Channel } = window.__TAURI__.core;
  document.body.classList.add('is-native');
  let frame = 0, pending = null, inFlight = false, signature = '', ready = false, initialized = false, settled = false;
  let lastWatchState = null, watchQueue = Promise.resolve();

  function watchOutside() {
    if (!initialized) return;
    const active = document.getElementById('island-surface').dataset.expanded === 'true';
    if (active === lastWatchState) return;
    lastWatchState = active;
    // Preserve close/open ordering even when a quick toggle fits within one rendered frame.
    watchQueue = watchQueue.then(() => invoke('watch_outside_clicks', { active })).catch((error) => {
      lastWatchState = null;
      console.error('Native outside-click handling unavailable', error);
    });
  }

  async function flushRegion() {
    if (inFlight || !pending) return;
    const rects = pending; pending = null; inFlight = true;
    try {
      await invoke('update_region', { rects });
      if (!ready && settled && !pending) {
        const status = await invoke('desktop_ready');
        ready = true;
        window.dispatchEvent(new CustomEvent('island-desktop-ready', { detail: status }));
      }
    } catch (error) {
      signature = '';
      console.error('Native island geometry failed', error);
      document.getElementById('announcer').textContent = 'Could not synchronize the desktop window.';
    } finally {
      inFlight = false;
      if (pending) void flushRegion();
    }
  }

  function rect(element, squareTop = false) {
    const bounds = element.getBoundingClientRect(), style = getComputedStyle(element);
    return { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), width: bounds.width, height: bounds.height, radius: parseFloat(style.borderBottomLeftRadius) || 0, squareTop };
  }

  function measure() {
    frame = 0;
    if (!initialized) return;
    const surface = document.getElementById('island-surface');
    const toast = document.getElementById('toast');
    const rects = [rect(surface, document.body.classList.contains('bezel'))];
    if (toast.classList.contains('is-visible')) rects.push(rect(toast));
    settled = ![surface, toast].some((element) => element.getAnimations().some((animation) => animation.playState === 'running'));
    const next = JSON.stringify(rects.map((r) => Object.fromEntries(Object.entries(r).map(([key, value]) => [key, typeof value === 'number' ? Math.round(value * 100) / 100 : value]))));
    if (next !== signature || (!ready && settled)) { signature = next; pending = rects; void flushRegion(); }
    if (!settled) schedule();
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
  const geometry = new ResizeObserver(schedule);
  geometry.observe(document.getElementById('island-surface'));
  geometry.observe(document.getElementById('toast'));
  const attributes = new MutationObserver(() => { schedule(); watchOutside(); });
  attributes.observe(document.getElementById('island-surface'), { attributes: true, attributeFilter: ['style', 'class', 'data-expanded'] });
  attributes.observe(document.getElementById('toast'), { attributes: true, attributeFilter: ['class'] });
  attributes.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', schedule);
  addEventListener('island-app-ready', () => { initialized = true; schedule(); watchOutside(); }, { once: true });
  addEventListener('island-presentation-change', watchOutside);

  class NativeSessionSource {
    constructor() {
      this.closed = false;
      this.channel = new Channel();
      this.channel.onmessage = (event) => {
        if (this.closed || event.heartbeat) return;
        if (event.transportError) { this.fail(); return; }
        this.onmessage?.({ data: JSON.stringify(event) });
      };
      // Defer until the caller attaches handlers, just like EventSource.
      queueMicrotask(() => {
        if (!this.closed) invoke('connect_sessions', { channel: this.channel }).catch(() => this.fail());
      });
    }
    fail() {
      if (this.closed) return;
      this.onerror?.();
      this.retry = setTimeout(() => {
        if (!this.closed) invoke('connect_sessions', { channel: this.channel }).catch(() => this.fail());
      }, 1000);
    }
    close() { this.closed = true; clearTimeout(this.retry); }
  }
  window.IslandDesktop = Object.freeze({ createSource: () => new NativeSessionSource(), scheduleGeometry: schedule, codexIntegration: (action) => invoke('codex_integration', { action }), providerIntegration: (provider, action) => invoke('provider_integration', { provider, action }), readUsage: (provider = 'codex') => invoke('read_usage', { provider }), orcaTerminal: (sessionId, action, choice = null) => invoke('orca_terminal', { sessionId, action, choice }), archiveSession: (sessionId, archived) => invoke('archive_session', { sessionId, archived }), retentionSettings: (enabled = null) => invoke('retention_settings', { enabled }), archiveDelay: (minutes = null) => invoke('archive_delay', { minutes }), deleteArchived: targets => invoke('delete_archived', { targets }) });
  window.__TAURI__.event.listen('desktop-action', ({ payload }) => {
    window.dispatchEvent(new CustomEvent('island-desktop-action', { detail: payload }));
    schedule();
  }).catch((error) => console.error('Native island events unavailable', error));
  addEventListener('pagehide', () => { void invoke('watch_outside_clicks', { active: false }); void invoke('disconnect_sessions'); });
  schedule();
})();
