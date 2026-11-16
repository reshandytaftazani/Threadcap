/* Shared by the live UI and dependency-free event-ordering tests. */
((root) => {
  'use strict';
  const agents = new Set(['codex', 'antigravity', 'opencode']);
  const states = new Set(['idle', 'running', 'waiting_input', 'waiting_approval', 'completed', 'failed']);
  const connections = new Set(['connected', 'reconnecting', 'disconnected']);
  const counter = (value) => Number.isSafeInteger(value) && value >= 0;
  function session(raw) {
    if (!raw || !agents.has(raw.agentId) || typeof raw.sessionId !== 'string' || !raw.sessionId.startsWith(raw.agentId + ':') || raw.sessionId.length <= raw.agentId.length + 1 || !states.has(raw.status) || !counter(raw.revision) || !connections.has(raw.connectionStatus)) return null;
    for (const field of ['taskTitle', 'projectName', 'activity', 'terminalName', 'modelName', 'elapsed']) {
      if (raw[field] !== undefined && typeof raw[field] !== 'string') return null;
    }
    for (const field of ['requestId', 'question', 'prompt', 'command', 'workingDirectory', 'result', 'error']) {
      if (raw[field] != null && typeof raw[field] !== 'string') return null;
    }
    if (raw.options !== undefined && (!Array.isArray(raw.options) || raw.options.some((option) => typeof option !== 'string' && (!option || typeof option.label !== 'string' || typeof (option.value ?? option.label) !== 'string')))) return null;
    const caps = raw.capabilities || {};
    if (raw.terminalStatus !== undefined && !['checking','open','closed'].includes(raw.terminalStatus)) return null;
    const canRespond = Boolean(raw.requestId && raw.supportsAcknowledgment === true);
    return { ...structuredClone(raw), capabilities: { canApprove: canRespond && caps.canApprove === true, canAnswer: canRespond && caps.canAnswer === true, canJump: caps.canJump === true } };
  }
  class SessionModel {
    constructor() {
      this.sessions = [];
      this.bridgeId = null;
      this.sequence = -1;
      this.connectionState = 'reconnecting';
    }
    disconnect() {
      this.connectionState = 'reconnecting';
    }
    ingest(event) {
      const invalid = () => { this.disconnect(); return { accepted: false, needsSync: true }; };
      if (!event || event.protocolVersion !== 1 || typeof event.bridgeId !== 'string' || !event.bridgeId || !counter(event.sequence) || event.eventId !== event.bridgeId + ':' + event.sequence) return invalid();
      if (event.type === 'sync') {
        if (!Array.isArray(event.sessions)) return invalid();
        const next = event.sessions.map(session);
        if (next.some((s) => !s) || new Set(next.map((s) => s.sessionId)).size !== next.length) return invalid();
        if (event.bridgeId === this.bridgeId && event.sequence < this.sequence) return { accepted: false, needsSync: this.connectionState !== 'connected' };
        if (event.bridgeId === this.bridgeId && next.some((s) => s.revision < (this.sessions.find((old) => old.sessionId === s.sessionId)?.revision ?? -1))) return invalid();
        this.sessions = next;
        this.bridgeId = event.bridgeId;
        this.sequence = event.sequence;
        this.connectionState = 'connected';
        return { accepted: true, snapshot: true };
      }
      if (this.connectionState !== 'connected' || event.bridgeId !== this.bridgeId) return invalid();
      if (event.sequence <= this.sequence) return { accepted: false };
      if (event.sequence !== this.sequence + 1) return invalid();
      if (event.type === 'sessions_removed') {
        const ids = event.sessionIds;
        if (!Array.isArray(ids) || !ids.length || ids.length > 10000 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || ![...agents].some(agent => id.startsWith(agent + ':') && id.length > agent.length + 1))) return invalid();
        this.sessions = this.sessions.filter(s => !ids.includes(s.sessionId));
        this.sequence = event.sequence;
        return { accepted: true, snapshot: false, removed: ids };
      }
      if (event.type !== 'session_update') return invalid();
      const next = session(event.session);
      if (!next) return invalid();
      const index = this.sessions.findIndex((s) => s.sessionId === next.sessionId);
      const previous = this.sessions[index];
      this.sequence = event.sequence;
      if (previous && next.revision <= previous.revision) return { accepted: false };
      if (index < 0) this.sessions.push(next);
      else this.sessions[index] = next;
      return { accepted: true, snapshot: false, session: next, previous };
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { SessionModel };
  else root.IslandSessionModel = SessionModel;
})(globalThis);
