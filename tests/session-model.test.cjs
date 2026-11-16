const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SessionModel } = require('../src/session-model.js');

const session = (revision = 1, extra = {}) => ({ sessionId: 'codex:one', agentId: 'codex', status: 'running', connectionStatus: 'connected', revision, ...extra });
const envelope = (sequence, extra = {}, bridgeId = 'bridge-a') => ({ protocolVersion: 1, bridgeId, sequence, eventId: bridgeId + ':' + sequence, ...extra });
const sync = (sequence = 0, sessions = [], bridgeId) => envelope(sequence, { type: 'sync', sessions }, bridgeId);
const update = (sequence, value = session(), bridgeId) => envelope(sequence, { type: 'session_update', session: value }, bridgeId);

test('ordered deletion removes only named sessions and malformed removals require resync', () => {
  const model=new SessionModel();model.ingest(sync(0,[session(),session(1,{sessionId:'codex:two'})]));
  const removal=envelope(1,{type:'sessions_removed',sessionIds:['codex:one']});
  assert.deepEqual(model.ingest(removal).removed,['codex:one']);
  assert.deepEqual(model.sessions.map(s=>s.sessionId),['codex:two']);
  assert.equal(model.ingest(removal).accepted,false);
  assert.equal(model.ingest(envelope(2,{type:'sessions_removed',sessionIds:['codex:two','codex:two']})).needsSync,true);
  assert.equal(model.sessions.length,1);
});

test('updates cannot enable interaction before a complete snapshot', () => {
  const model = new SessionModel();
  assert.equal(model.ingest(update(1)).needsSync, true);
  assert.deepEqual(model.sessions, []);
  assert.equal(model.ingest(sync(1, [session()])).accepted, true);
  assert.equal(model.connectionState, 'connected');
});

test('duplicates and out-of-order events never replace newer context', () => {
  const model = new SessionModel();
  model.ingest(sync());
  model.ingest(update(1));
  model.ingest(update(2, session(3, { status: 'waiting_input', requestId: 'r1' })));
  assert.equal(model.ingest(update(1, session(2))).accepted, false);
  assert.equal(model.ingest(update(2)).accepted, false);
  assert.equal(model.sessions[0].requestId, 'r1');
  assert.equal(model.ingest(update(3, session(2))).accepted, false);
  assert.equal(model.sequence, 3);
  assert.equal(model.sessions[0].revision, 3);
});

test('a sequence gap retains context and blocks updates until resynchronized', () => {
  const model = new SessionModel();
  model.ingest(sync(1, [session()]));
  assert.equal(model.ingest(update(3, session(3))).needsSync, true);
  assert.equal(model.sessions[0].revision, 1);
  assert.equal(model.connectionState, 'reconnecting');
  assert.equal(model.ingest(update(2, session(2))).needsSync, true);
  assert.equal(model.ingest(sync(3, [session(3)])).snapshot, true);
  assert.equal(model.sessions[0].revision, 3);
});

test('disconnect preserves the request and reconnect snapshots are silent', () => {
  const model = new SessionModel();
  model.ingest(sync(7, [session(4, { status: 'waiting_input', requestId: 'r1', question: 'Choose?' })]));
  model.disconnect();
  assert.equal(model.sessions[0].question, 'Choose?');
  const result = model.ingest(sync(7, structuredClone(model.sessions)));
  assert.equal(result.snapshot, true);
  assert.equal(result.session, undefined);
  assert.equal(model.connectionState, 'connected');
});

test('bridge restart accepts a new epoch and rejects old stream updates', () => {
  const model = new SessionModel();
  model.ingest(sync(100, [session(10)]));
  model.disconnect();
  assert.equal(model.ingest(sync(0, [session(10, { connectionStatus: 'disconnected' })], 'bridge-b')).accepted, true);
  assert.equal(model.bridgeId, 'bridge-b');
  assert.equal(model.ingest(update(101, session(11))).needsSync, true);
  assert.equal(model.sessions[0].revision, 10);
});

test('malformed or duplicate-identity snapshots are rejected atomically', () => {
  for (const invalid of [session(2, { agentId: 'claude' }), session(2, { revision: -1 }), session(2, { options: [42] }), session(2, { status: 'disconnected' }), session(2, { taskTitle: {} })]) {
    const model = new SessionModel();
    model.ingest(sync(1, [session()]));
    assert.equal(model.ingest(sync(2, [session(2), invalid])).needsSync, true);
    assert.equal(model.sessions[0].revision, 1);
  }
  const model = new SessionModel();
  assert.equal(model.ingest(sync(1, [session(), session()])).needsSync, true);
  assert.deepEqual(model.sessions, []);
});

test('stale snapshots cannot roll revisions backward', () => {
  const model = new SessionModel();
  model.ingest(sync(2, [session(3)]));
  assert.equal(model.ingest(sync(1, [session(2)])).accepted, false);
  assert.equal(model.ingest(sync(3, [session(2)])).needsSync, true);
  assert.equal(model.sessions[0].revision, 3);
});

test('connection state and lifecycle remain independent', () => {
  const model = new SessionModel();
  model.ingest(sync(1, [session(1, { status: 'failed', connectionStatus: 'disconnected', error: 'Exit 1' })]));
  assert.equal(model.sessions[0].status, 'failed');
  assert.equal(model.sessions[0].connectionStatus, 'disconnected');
  assert.equal(model.connectionState, 'connected');
});

test('capabilities require explicit adapter acknowledgment support', () => {
  const model = new SessionModel();
  const input = session(1, { status: 'waiting_approval', requestId: 'r1', capabilities: { canApprove: true } });
  model.ingest(sync(1, [input]));
  assert.equal(model.sessions[0].capabilities.canApprove, false);
  model.ingest(update(2, { ...input, revision: 2, supportsAcknowledgment: true }));
  assert.equal(model.sessions[0].capabilities.canApprove, true);
});

test('authoritative withdrawal removes request capability without changing task success', () => {
  const model = new SessionModel();
  model.ingest(sync(1, [session(1, { status: 'waiting_approval', requestId: 'r1' })]));
  model.ingest(update(2, session(2, { status: 'idle', requestId: null })));
  assert.equal(model.sessions[0].status, 'idle');
  assert.equal(model.sessions[0].capabilities.canApprove, false);
});
