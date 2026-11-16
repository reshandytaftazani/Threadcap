((root) => {
  'use strict';
  const pending = s => ['waiting_input', 'waiting_approval'].includes(s.status);
  const episodeKey = s => JSON.stringify([s.sessionId, s.requestId || '']);
  const connected = (s, offline) => !offline && s.connectionStatus !== 'disconnected' && s.connectionStatus !== 'reconnecting';
  const available = (s, offline) => !offline && s.terminalStatus !== 'closed' && (s.terminalStatus === 'open' || connected(s, offline));
  class PresentationPolicy {
    constructor() { this.seen = new Set(); this.completions = new Map(); this.queue = []; }
    pending(sessions) {
      const items = sessions.filter(pending);
      return items.sort((a,b) => {
        const key = episodeKey;
        const first = this.queue.indexOf(key(a)), second = this.queue.indexOf(key(b));
        return (first < 0 ? Infinity : first) - (second < 0 ? Infinity : second);
      });
    }
    ingest(result, now = Date.now()) {
      if (result.removed) {
        for (const id of result.removed) this.completions.delete(id);
        this.queue = this.queue.filter(key => !result.removed.includes(JSON.parse(key)[0]));
        for (const key of this.seen) if (result.removed.includes(JSON.parse(key)[0])) this.seen.delete(key);
      }
      if (result.snapshot) {
        this.completions.clear();
        const rows = result.sessions || [];
        this.queue = this.queue.filter(key => rows.some(s => pending(s) && key === episodeKey(s)));
        for (const s of [...rows].sort((a,b) => (a.requestedAt || 0) - (b.requestedAt || 0))) {
          if (pending(s) && !this.queue.includes(episodeKey(s))) this.queue.push(episodeKey(s));
          if (s.requestId) this.seen.add(episodeKey(s));
          if (s.status === 'completed') this.completions.set(s.sessionId, 0);
        }
        return null;
      }
      const s = result.session;
      if (!s) return null;
      if (s.status !== 'completed') this.completions.delete(s.sessionId);
      else if (result.previous?.status !== 'completed') this.completions.set(s.sessionId, s.eventKind === 'recovery' ? 0 : (s.completedAt || now) + 10000);
      const key = episodeKey(s);
      this.queue = this.queue.filter(item => JSON.parse(item)[0] !== s.sessionId || item === key);
      if (pending(s) && !this.queue.includes(key)) this.queue.push(key);
      if (!pending(s) || !s.requestId || this.seen.has(key)) return null;
      this.seen.add(key);
      return connected(s, false) && !s.archived ? s.sessionId : null;
    }
    compactState(s, offline, now = Date.now()) {
      if (s.terminalStatus === 'closed' && !offline) return 'disconnected';
      if (offline || !connected(s, offline)) {
        if (!offline && s.terminalStatus === 'open' && (s.endedAt || s.status === 'idle' || s.status === 'completed')) return 'idle';
        return 'checking';
      }
      if (s.status === 'completed' && this.completions.has(s.sessionId) && now >= this.completions.get(s.sessionId)) return 'idle';
      return s.status;
    }
  }
  function counts(sessions, offline) {
    const live = sessions.filter(s => available(s, offline)).length;
    return { live, saved: sessions.length - live, working: sessions.filter(s => connected(s, offline) && s.status === 'running').length };
  }
  const api = { PresentationPolicy, counts, available };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IslandPresentation = api;
})(globalThis);
