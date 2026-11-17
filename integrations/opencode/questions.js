// Threadcap's TUI-owned connector for OpenCode 2.3.0 question forms.
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, renameSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export async function connectQuestions(context, owns) {
  if (context.app.version !== '2.3.0' || !process.env.LOCALAPPDATA) return () => {};
  const directory = join(process.env.LOCALAPPDATA,'VibeIsland','opencode-forms');
  const token = randomBytes(32).toString('hex'), routes = new Map(), pendingForms = new Map();
  let stopped = false;
  const supported = form => {
    if (form.fields?.length !== 1 || form.metadata?.kind !== 'question') return null;
    const field = form.fields[0];
    if (!['string','multiselect'].includes(field.type) || field.hidden || field.when?.length || field.format || field.pattern) return null;
    if (field.options && (!field.options.length || field.options.length > 64)) return null;
    return Object.fromEntries(['key','type','title','description','options','required','custom','minLength','maxLength','minItems','maxItems'].filter(key => field[key] !== undefined).map(key => [key,field[key]]));
  };
  const forget = id => {
    const path = routes.get(id); routes.delete(id); pendingForms.delete(id);
    try { if (JSON.parse(readFileSync(path,'utf8')).token === token) unlinkSync(path); } catch {}
  };
  const rpc = createServer(async (req,res) => {
    const respond = value => { const body=JSON.stringify(value); res.writeHead(200,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}); res.end(body); };
    if (req.method !== 'POST' || req.url !== '/question' || req.headers.origin) { res.writeHead(403); res.end(); return; }
    try {
      let body=''; for await (const chunk of req) { body+=chunk; if (body.length>32768) {res.writeHead(413);res.end();return;} }
      const input=JSON.parse(body);
      if (input.token!==token) {res.writeHead(403);res.end();return;}
      if (stopped || !owns(input.sessionID) || !routes.has(input.formID)) {respond({error:'Question is no longer available in this terminal.'});return;}
      const identity={sessionID:input.sessionID,formID:input.formID};
      const detail=await context.client.session.form.get(identity), field=supported(detail);
      if (!field || detail.sessionID!==input.sessionID || detail.state.status!=='pending') {respond({error:'Question is no longer pending. Open the terminal.'});return;}
      if (!Object.hasOwn(input,'answer')) {respond({requestId:`form:${input.formID}`,field});return;}
      const answer=input.answer;
      const validString=value=>typeof value==='string' && value.trim().length>0 && value.length<=4096;
      const allowed=value=>!field.options || field.custom || field.options.some(option=>option.value===value);
      const valid=field.type==='string'
        ? validString(answer) && allowed(answer) && answer.length>=(field.minLength??0) && answer.length<=(field.maxLength??4096)
        : Array.isArray(answer) && answer.length>=(field.minItems??1) && answer.length<=(field.maxItems??64) && new Set(answer).size===answer.length && answer.every(value=>validString(value)&&allowed(value));
      if (!valid) {respond({error:'Invalid answer. Review the question in OpenCode.'});return;}
      if (sending.has(input.formID)) {respond({error:'A reply is already being sent.'});return;}
      sending.add(input.formID);
      try {
        await context.client.session.form.reply({...identity,answer:{[field.key]:answer}});
        respond({requestId:`form:${input.formID}`,acknowledged:true});
      } catch {respond({error:'OpenCode did not confirm this reply. Check the terminal before retrying.'});}
      finally {sending.delete(input.formID);}
    } catch {if(!res.headersSent)respond({error:'Question delivery is unavailable. Open the terminal.'});}
  });
  const sending=new Set();
  rpc.requestTimeout=5000; rpc.on('error',()=>{});
  mkdirSync(directory,{recursive:true,mode:0o700});
  await new Promise((resolve,reject)=>{rpc.once('error',reject);rpc.listen(0,'127.0.0.1',resolve);});
  const register=form=>{
    if (stopped || !owns(form.sessionID) || !supported(form) || routes.has(form.id)) return;
    const name=createHash('sha256').update(`${form.sessionID}\0${form.id}`).digest('hex');
    const path=join(directory,`${name}.json`), temporary=`${path}.${token}.tmp`;
    writeFileSync(temporary,JSON.stringify({sessionID:form.sessionID,formID:form.id,port:rpc.address().port,token}),{mode:0o600});
    renameSync(temporary,path);routes.set(form.id,path);
    pendingForms.set(form.id,{id:form.id,sessionID:form.sessionID,metadata:{kind:'question'},fields:[supported(form)]});
  };
  const offCreated=context.data.on('form.created',event=>{try{register(event.data.form);}catch{}});
  const offReplied=context.data.on('form.replied',event=>forget(event.data.id));
  const offCancelled=context.data.on('form.cancelled',event=>forget(event.data.id));
  // A new client can discover a question created before it attached.
  const discovered=new Set();
  const sync=async()=>{
    for (const [id,path] of routes) if (!existsSync(path)) {
      routes.delete(id);try{register(pendingForms.get(id));}catch{}
    }
    try {for (const session of context.data.session.list()) if(owns(session.id) && !discovered.has(session.id)) {
      discovered.add(session.id);
      try {for(const form of await context.client.session.form.list({sessionID:session.id})) register(form);}catch{discovered.delete(session.id);}
    }}catch{}
  };
  void sync();
  const timer=setInterval(sync,3000);
  return ()=>{stopped=true;clearInterval(timer);offCreated();offReplied();offCancelled();rpc.close();for(const id of routes.keys())forget(id);};
}
