// Uses owned console and Windows Terminal fixtures. No provider or model is launched.
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {startNative}=require('./native-harness.cjs');

async function main(){
 const token='ThreadcapVerify-'+randomUUID().slice(0,8);
 const consoleTitle=token+'-console', firstTab=token+'-first', secondTab=token+'-second';
 const encode=body=>Buffer.from(body,'utf16le').toString('base64');
 const ps=(body,extra={})=>execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encode("$ProgressPreference='SilentlyContinue'\n"+body)],{
  encoding:'utf8',windowsHide:true,timeout:10000,env:{...process.env,...extra},stdio:['ignore','pipe','pipe']
 });
 const consoleLaunch="Start-Process -FilePath conhost.exe -WindowStyle Normal -ArgumentList 'powershell.exe','-NoProfile','-NoExit','-EncodedCommand',$env:THREADCAP_FIXTURE_COMMAND";
 const terminal=(title)=>ps("Start-Process -FilePath wt.exe -ArgumentList '-w',$env:THREADCAP_FIXTURE_WINDOW,'new-tab','--title',$env:THREADCAP_FIXTURE_TITLE,'--suppressApplicationTitle','powershell.exe','-NoProfile','-NoExit'",{
  THREADCAP_FIXTURE_WINDOW:token, THREADCAP_FIXTURE_TITLE:title
 });
 let h;
 const checks=[];
 const check=(name,pass)=>{checks.push({name,passed:!!pass});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)throw Error(name);};
 const view=async(sid,action,choice=null)=>h.evaluate(`IslandDesktop.orcaTerminal(${JSON.stringify(sid)},${JSON.stringify(action)},${JSON.stringify(choice)}).catch(e=>({error:String(e)}))`);
 const record=(sid)=>h.inject({agentId:'codex',sessionId:sid,sourceRevision:1,eventId:sid,status:'idle',connectionStatus:'connected'});
 const click=async(sid,label,capture=false)=>{
  await h.until(`IslandPreview.snapshot().sessions.some(s=>s.sessionId===${JSON.stringify(sid)})`);
  await h.evaluate(`IslandPreview.showOverview();document.querySelector('[data-session="${sid}"] .jump-button').click()`);
  await h.until("IslandPreview.snapshot().settingsOpen && !document.getElementById('terminal-picker').hidden");
  await h.wait(450);
  if(capture){
   const clip=await h.evaluate("(()=>{const r=document.getElementById('island-surface').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
   const screenshot=await h.send('Page.captureScreenshot',{format:'png',clip});
   fs.writeFileSync('artifacts/windows-terminal-picker.png',Buffer.from(screenshot.data,'base64'));
  }
  const target=JSON.stringify(label);
  const rect=await h.evaluate(`(()=>{const button=[...document.querySelectorAll('.terminal-choice')].find(b=>b.querySelector('strong').textContent===${target});if(!button)return null;button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect();return {x:(r.x+r.width/2)*devicePixelRatio,y:(r.y+r.height/2)*devicePixelRatio};})()`);
  if(!rect)throw Error('Owned terminal choice missing');
  const script=path.join(__dirname,'native-test-click.ps1');
  const run=(...args)=>execFileSync('powershell.exe',['-NoProfile','-File',script,'-ExpectedProcessId',String(h.app.pid),...args],{windowsHide:true,encoding:'utf8',timeout:10000});
  const position=JSON.parse(run('-Locate'));
  run('-X',String(Math.round(rect.x+position.x)),'-Y',String(Math.round(rect.y+position.y)));
  return h.until('!IslandPreview.snapshot().expanded');
 };
 const selection=(choice)=>ps(`
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$parts=$env:THREADCAP_TEST_HANDLE.Split(':',2)
$window=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr][long]$parts[0])
$condition=[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::TabItem)
foreach($item in $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,$condition)){
 if(($item.GetRuntimeId() -join ':') -eq $parts[1]){
  $item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected
 }
}`,{THREADCAP_TEST_HANDLE:choice.handle}).trim()==='True';
 try {
  ps(consoleLaunch,{THREADCAP_FIXTURE_COMMAND:encode(`$Host.UI.RawUI.WindowTitle = '${consoleTitle}'`)});
  terminal(firstTab);
  await new Promise(resolve=>setTimeout(resolve,1800));
  terminal(secondTab);
  h=await startNative('windows-terminal-navigation');
  const sid='codex:windows-navigation';
  await record(sid);
  let list;
  for (let i=0;i<8;i++){
   list=await view(sid,'list');
   if(list.terminals?.some(t=>t.label.includes(consoleTitle)) && list.terminals?.some(t=>t.label.includes(firstTab) && t.path==='Windows Terminal tab'))break;
   await h.wait(350);
  }
  const consoleTarget=list.terminals?.find(t=>t.label.includes(consoleTitle) && t.path==='Windows Console');
  const tab=list.terminals?.find(t=>t.label.includes(firstTab) && t.path==='Windows Terminal tab');
  const other=list.terminals?.find(t=>t.label.includes(secondTab) && t.path==='Windows Terminal tab');
  const windowTarget=list.terminals?.find(t=>t.path==='Windows Terminal window' && t.label.includes(secondTab));
  if(!consoleTarget || !tab || !other){
   console.log(JSON.stringify({error:list.error,kinds:list.terminals?.map(t=>t.path?.startsWith('Windows')?t.path:'Orca'),owned:list.terminals?.filter(t=>t.label.startsWith(token)).map(t=>({label:t.label,path:t.path}))}));
  }
  check('The picker discovers the standalone PowerShell console',consoleTarget);
  check('Windows Terminal reports both distinct tabs and its window',tab && other && windowTarget && tab.choice.handle!==other.choice.handle);
  check('The first Windows Terminal tab starts unselected',!selection(tab.choice) && selection(other.choice));
  check('Selecting the first Windows Terminal tab confirms focus and selection',await click(sid,tab.label,true) && selection(tab.choice));
  const bad=await view(sid,'choose',{...tab.choice,incarnation:'0:0'});
  check('A stale process identity cannot be selected',bad.error?.includes('changed or closed'));
  const consoleSid='codex:windows-console-navigation';
  await record(consoleSid);
  check('The standalone PowerShell console is brought to the foreground',await click(consoleSid,consoleTarget.label));
  check('The selected Windows console is reused on the next open',(await view(consoleSid,'open')).state==='opened');
  const saved=JSON.parse(fs.readFileSync(path.join(h.temp,'VibeIsland',`windows-terminal-links-${h.port}.json`),'utf8'));
  check('The saved selection identifies the console process and window',saved[consoleSid]?.kind==='console' && String(saved[consoleSid].hwnd)===consoleTarget.choice.handle.split(':')[0]);
 } finally {
  await h?.close();
  ps(`
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$root=[System.Windows.Automation.AutomationElement]::RootElement
$pattern=[System.Windows.Automation.WindowPattern]::Pattern
$invoke=[System.Windows.Automation.InvokePattern]::Pattern
$confirm=[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty,'Close all')
foreach($window in $root.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)){
 try {
  if($window.Current.Name -like ('*'+$env:THREADCAP_FIXTURE_TITLE+'*')){
   $close=$null
   if($window.TryGetCurrentPattern($pattern,[ref]$close)){ $close.Close() }
   Start-Sleep -Milliseconds 250
   $button=$window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$confirm)
   if($button){ $button.GetCurrentPattern($invoke).Invoke() }
  }
 } catch {}
}`,{THREADCAP_FIXTURE_TITLE:token});
  fs.writeFileSync('artifacts/windows-terminal-navigation-native.json',JSON.stringify({checks},null,2));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
