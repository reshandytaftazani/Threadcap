const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function usage(){const context={window:{dispatchEvent(){}},Event:class{},addEventListener(){},structuredClone,Date,Map,Set,Number,Promise,setInterval,clearInterval};vm.createContext(context);vm.runInContext(fs.readFileSync('src/usage.js','utf8'),context);return context.window.IslandUsage;}
const reading=(providerId,revision,window)=>({providerId,revision,status:'fresh',observedAt:Date.now()/1000,buckets:[{id:providerId,name:'Account',windows:[window]}]});
test('account quota stays separate across providers and revisions',()=>{
 const u=usage();assert(u.accept(reading('codex',9,{remainingPercent:25,windowMinutes:300})));
 assert(u.accept(reading('antigravity',1,{remainingAmount:42})));
 assert.match(u.summary('codex'),/5h 25%/);assert.match(u.summary('antigravity'),/42 units/);
 assert.match(u.detail('antigravity'),/Window not reported/);assert.match(u.detail('antigravity'),/Antigravity CLI status line/);
 assert.equal(u.summary('antigravity',true),'Usage unavailable');
 assert(!u.accept(reading('codex',8,{remainingPercent:90,windowMinutes:300})));
 assert.match(u.summary('codex'),/25%/);
});
test('quota rejects invalid values, exposes stale readings and escapes bucket labels',()=>{
 const u=usage();assert(!u.accept(reading('antigravity',1,{remainingPercent:130,remainingAmount:10})));
 assert(!u.accept(reading('codex',1,{remainingAmount:10})));
 const r=reading('antigravity',2,{remainingPercent:30});r.observedAt-=180;r.buckets[0].name='<img onerror=alert(1)>';
 assert(u.accept(r));assert.match(u.summary('antigravity'),/^Updated/);assert.match(u.detail('antigravity'),/Last known/);assert(!u.detail('antigravity').includes('<img'));
 assert(u.accept({providerId:'antigravity',revision:3,status:'unavailable',buckets:[],reason:'Account unverified'}));
 assert.equal(u.summary('antigravity'),'Usage unavailable');assert(!u.detail('antigravity').includes('30%'));
});
