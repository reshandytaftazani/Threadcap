const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');

module.exports=async({h,request,id,form,check,root})=>{
  const base=`/api/session/${id}/form`;
  const detail=async formID=>{const value=await request('GET',`${base}/${formID}`);return value.data||value;};
  const create=async fields=>{
    const value=await request('POST',base,{title:'Owned reply check',metadata:{kind:'question'},fields}),form=value.data||value;
    if(!await h.until(`IslandPreview.snapshot().sessions.some(s=>s.requestId===${JSON.stringify('form:'+form.id)})`))throw Error('Native question did not synchronize');
    return form;
  };
  const shown=async selector=>check(`Current native host renders ${selector}`,await h.until(`Boolean(document.querySelector(${JSON.stringify(selector)}))`));
  const input=async(selector,value)=>h.evaluate(`{const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  const choose=async index=>h.evaluate(`document.querySelectorAll('.opencode-form input')[${index}].click()`);
  const send=async()=>h.evaluate("document.querySelector('.opencode-form').requestSubmit()");
  const answered=async formID=>{for(let i=0;i<100;i++){const value=await detail(formID);if(value.state.status==='answered')return value;await h.wait(50);}throw Error('OpenCode did not acknowledge the answer');};
  if (!await h.until("Boolean(document.querySelector('.answer-send'))")) {
    const diagnostic=await h.evaluate(`IslandOpenCode.question(${JSON.stringify('opencode:'+id)},${JSON.stringify('form:'+form.id)}).then(value=>({field:value.field}),error=>({error:String(error)}))`);
    throw Error('Direct reply discovery failed: '+JSON.stringify(diagnostic));
  }
  check('Current native host renders explicit Send',true);
  const routePath=formID=>path.join(h.temp,'VibeIsland/opencode-forms',crypto.createHash('sha256').update(`${id}\0${formID}`).digest('hex')+'.json');
  const route=JSON.parse(fs.readFileSync(routePath(form.id),'utf8'));
  const rpc=async(body,headers={})=>fetch(`http://127.0.0.1:${route.port}/question`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({token:route.token,sessionID:id,formID:form.id,...body})});
  check('Reply connector rejects a missing secret',(await rpc({token:''})).status===403);
  check('Reply connector rejects browser-origin submissions',(await rpc({},{Origin:'https://example.invalid'})).status===403);
  check('Reply connector rejects another session identity',Boolean((await(await rpc({sessionID:'another-session',answer:'sqlite'})).json()).error));
  check('Invalid option values cannot answer the form',Boolean((await(await rpc({answer:'unlisted'})).json()).error) && (await detail(form.id)).state.status==='pending');
  await send();
  check('Empty Send validates without answering', (await detail(form.id)).state.status==='pending' && await h.evaluate("document.querySelector('.delivery-note').textContent.includes('Choose an answer')"));
  await choose(0);
  check('Selecting a radio preserves the pending form until Send',(await detail(form.id)).state.status==='pending');
  await h.evaluate("document.querySelector('.opencode-form input').focus()");
  check('Choice has visible keyboard focus',await h.evaluate("document.activeElement.matches('.opencode-form input') && getComputedStyle(document.activeElement).outlineStyle!=='none'"));
  await h.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await h.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  check('Keyboard choice navigation does not submit',(await detail(form.id)).state.status==='pending');
  await choose(0);
  const screenshot=await h.send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(root,'artifacts/opencode-reply-native.png'),Buffer.from(screenshot.data,'base64'));
  await h.evaluate("document.querySelector('.opencode-form').requestSubmit();document.querySelector('.opencode-form').requestSubmit()");
  check('Single choice reaches the exact OpenCode field after explicit Send',(await answered(form.id)).state.answer.q0==='sqlite');
  check('Acknowledgment does not manufacture Working',await h.until("IslandPreview.snapshot().sessions.every(s=>s.status!=='running')"));

  const multiple=await create([{key:'tools',type:'multiselect',title:'Choose tools',options:[{label:'Rust',value:'rust'},{label:'JavaScript',value:'js'}],minItems:1}]);
  await shown('.opencode-form input[type=checkbox]');await choose(0);await choose(1);
  check('Checkbox selections wait for Send',(await detail(multiple.id)).state.status==='pending');
  await send();
  check('Multiple choices arrive as an array',JSON.stringify((await answered(multiple.id)).state.answer.tools)===JSON.stringify(['rust','js']));

  const custom=await create([{key:'q0',type:'string',title:'Choose or write',custom:true,options:[{label:'SQLite',value:'sqlite'}]}]);
  await shown('.opencode-text');await input('.opencode-text','Use a local file');
  await h.evaluate("document.getElementById('settings-button').click();document.getElementById('settings-back').click()");
  check('Settings navigation preserves the custom reply draft',await h.until("document.querySelector('.opencode-text')?.value==='Use a local file'"));
  await send();
  check('Custom short text reaches OpenCode',(await answered(custom.id)).state.answer.q0==='Use a local file');

  const text=await create([{key:'reply',type:'string',title:'A short reply',minLength:2,maxLength:80}]);
  await shown('.opencode-text');await input('.opencode-text','Ready');await send();
  check('Plain text answers reach their original field',(await answered(text.id)).state.answer.reply==='Ready');

  const withdrawn=await create([{key:'q0',type:'string',title:'Withdraw this question'}]);
  await shown('.opencode-text');await request('DELETE',`${base}/${withdrawn.id}`);
  check('Withdrawal removes interactive answer controls',await h.until("!document.querySelector('.opencode-form')"));
  const rejected=await h.evaluate(`IslandOpenCode.question(${JSON.stringify('opencode:'+id)},${JSON.stringify('form:'+withdrawn.id)},'late').then(()=>false,()=>true)`);
  check('Native IPC rejects a withdrawn request',rejected);

  const unavailable=await create([{key:'reply',type:'string',title:'Keep this draft'}]);
  await shown('.opencode-text');await input('.opencode-text','Keep my draft');
  const savedRoute=fs.readFileSync(routePath(unavailable.id),'utf8');
  const closedPort=await new Promise(resolve=>{const server=require('node:net').createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  fs.writeFileSync(routePath(unavailable.id),JSON.stringify({...JSON.parse(savedRoute),port:closedPort}));
  await send();
  check('Connector loss retains the draft, blocks duplicate Send and explains missing confirmation',await h.until("document.querySelector('.opencode-text')?.value==='Keep my draft' && document.querySelector('.answer-send')?.disabled && document.querySelector('.delivery-note')?.textContent.includes('did not confirm')"));
  check('Connector loss does not claim success or answer OpenCode',(await detail(unavailable.id)).state.status==='pending');
  fs.writeFileSync(routePath(unavailable.id),savedRoute);
  await request('DELETE',`${base}/${unavailable.id}`);

  const complex=await create([{key:'first',type:'string',title:'First question'},{key:'second',type:'boolean',title:'Second question'}]);
  check('Complex forms retain terminal fallback without answer controls',await h.until("IslandPreview.snapshot().sessions.some(s=>s.status==='waiting_input') && document.querySelector('.request-surface')?.textContent.includes('Monitoring only') && !document.querySelector('.opencode-form')"));
  await request('DELETE',`${base}/${complex.id}`);
};
