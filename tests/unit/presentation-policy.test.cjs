const {test}=require('node:test'),assert=require('node:assert/strict');
const {PresentationPolicy,counts}=require('../../src/presentation-policy.js');
const request=(id='one')=>({sessionId:'codex:test',status:'waiting_approval',requestId:id,connectionStatus:'connected'});
test('snapshot, duplicate, offline, and deferred episodes never replay request reveal',()=>{
  const p=new PresentationPolicy();p.ingest({snapshot:true,sessions:[request()]});
  assert.equal(p.ingest({session:request()}),null);
  assert.equal(p.ingest({session:request('two')}),'codex:test');
  assert.equal(p.ingest({session:request('two')}),null);
  assert.equal(p.ingest({session:{...request('offline'),connectionStatus:'disconnected'}}),null);
  assert.equal(p.ingest({session:request('offline')}),null);
});
test('completion cooldown preserves lifecycle and does not restart on unrelated updates',()=>{
  const p=new PresentationPolicy(),s={sessionId:'codex:test',status:'completed',connectionStatus:'connected'};
  p.ingest({session:s,previous:{status:'running'}},1000);
  assert.equal(p.compactState(s,false,10999),'completed');
  p.ingest({session:s,previous:s},5000);
  assert.equal(p.compactState(s,false,11001),'idle');
  assert.equal(s.status,'completed');assert.equal(p.compactState(s,true,11001),'checking');
  p.ingest({session:{...s,status:'running'},previous:s},12000);
  assert.equal(p.compactState({...s,status:'running'},false,13000),'running');
  p.ingest({snapshot:true,sessions:[s]},14000);assert.equal(p.compactState(s,false,14000),'idle');
});
test('verified pane presence is independent of provider transport and task lifecycle',()=>{
  const p=new PresentationPolicy();
  const s={sessionId:'codex:test',status:'running',connectionStatus:'disconnected'};
  assert.equal(p.compactState(s,false),'checking');
  assert.equal(p.compactState({...s,terminalStatus:'open'},false),'checking');
  assert.equal(p.compactState({...s,terminalStatus:'open',endedAt:1000},false),'idle');
  assert.equal(p.compactState({...s,terminalStatus:'closed'},false),'disconnected');
  assert.equal(p.compactState({...s,terminalStatus:'closed'},true),'checking');
  assert.deepEqual(counts([{...s,terminalStatus:'open'}],false),{live:1,saved:0,working:0});
});
test('recovered results and reactivation do not restart completion or request alerts',()=>{
  const p=new PresentationPolicy(),s={sessionId:'codex:test',status:'completed',connectionStatus:'disconnected',terminalStatus:'open',eventKind:'recovery'};
  p.ingest({session:s},10000);
  assert.equal(p.compactState(s,false,10000),'idle');
  p.ingest({snapshot:true,sessions:[request()]});
  assert.equal(p.ingest({session:{...request(),archived:false,terminalStatus:'open'},previous:{...request(),archived:true}}),null);
});
test('live, retained, and working counts remain independent',()=>{
  const rows=[{status:'running',connectionStatus:'connected'},{status:'completed',connectionStatus:'connected'},{status:'running',connectionStatus:'disconnected'}];
  assert.deepEqual(counts(rows,false),{live:2,saved:1,working:1});
  assert.deepEqual(counts(rows,true),{live:0,saved:3,working:0});
});
test('request navigation follows episode order rather than session creation order',()=>{
  const p=new PresentationPolicy(),a={...request('a'),sessionId:'codex:old-session'},b={...request('b'),sessionId:'codex:new-session'};
  p.ingest({session:b});p.ingest({session:a});
  assert.equal(p.pending([a,b])[0].sessionId,b.sessionId);
  p.ingest({session:{...b,status:'running'}});
  assert.equal(p.pending([a,{...b,status:'running'}])[0].sessionId,a.sessionId);
  const restored=new PresentationPolicy();restored.ingest({snapshot:true,sessions:[{...a,requestedAt:200},{...b,requestedAt:100}]});
  assert.equal(restored.pending([a,b])[0].sessionId,b.sessionId);
});
