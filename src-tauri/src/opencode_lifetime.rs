use island_core::Store;
use std::{collections::HashSet,path::Path,time::{Duration,Instant},process::Stdio};
use vibe_island_codex::{agent_process::Presence,client_presence};

pub struct Reconciler { census_after:Instant }
impl Default for Reconciler {fn default()->Self {Self{census_after:Instant::now()}}}

async fn no_cli_clients()->Option<bool> {
    // WMI is used only to migrate local legacy rows without TUI ownership.
    // Names and missing heartbeats never establish exit; inaccessible command lines stay unknown.
    const SCRIPT:&str=r#"$ErrorActionPreference='Stop';try{$all=@(Get-CimInstance Win32_Process -Filter "Name='opencode.exe'" -ErrorAction Stop);$unknown=$false;$clients=0;foreach($p in $all){if([string]::IsNullOrWhiteSpace($p.CommandLine)){$unknown=$true;continue};if($p.CommandLine -notmatch '^(?:"[^"]+"|\S+)\s+"?serve"?(?:\s|$)'){$clients++}};if($clients -gt 0){'false'}elseif($unknown){'null'}else{'true'}}catch{'null'}"#;
    let mut command=tokio::process::Command::new("powershell.exe");
    command.args(["-NoProfile","-NonInteractive","-Command",SCRIPT]).stdin(Stdio::null()).stderr(Stdio::null()).kill_on_drop(true);
    #[cfg(windows)] command.creation_flags(0x08000000);
    let result=tokio::time::timeout(Duration::from_secs(4),command.output()).await.ok()?.ok()?;
    if !result.status.success() || result.stdout.len()>64 {return None;}
    match String::from_utf8(result.stdout).ok()?.trim() {"true"=>Some(true),"false"=>Some(false),_=>None}
}

impl Reconciler {
    pub async fn reconcile(&mut self,store:&Store,path:&Path)->Result<(),String> {
        let mut observed=client_presence::observations(path).map_err(|e|e.to_string())?;
        let reports=vibe_island_codex::providers::snapshots(path).unwrap_or_default();
        let owned:HashSet<String>=reports.iter().filter(|r|r["agentId"]=="opencode" && r["eventKind"]!="purged").filter_map(|r|r["sessionId"].as_str().map(str::to_owned)).collect();
        let snapshot=store.snapshot();let rows=snapshot["sessions"].as_array().cloned().unwrap_or_default();
        let legacy:Vec<String>=rows.iter().filter(|r|r["agentId"]=="opencode").filter_map(|r|r["sessionId"].as_str()).filter(|sid|owned.contains(*sid) && !observed.sessions.contains_key(*sid)).map(str::to_owned).collect();
        if !legacy.is_empty() && !observed.possible_client && Instant::now()>=self.census_after {
            self.census_after=Instant::now()+Duration::from_secs(30);
            if no_cli_clients().await==Some(true) {
                observed=client_presence::observations(path).map_err(|e|e.to_string())?;
                if !observed.possible_client {
                    let confirmed:Vec<String>=legacy.into_iter().filter(|sid|!observed.sessions.contains_key(sid)).collect();
                    client_presence::mark_legacy_closed(path,&confirmed).map_err(|e|e.to_string())?;
                    for id in confirmed {observed.sessions.insert(id,Presence::Exited);}
                }
            }
        }
        for row in rows {
            let Some(sid)=row["sessionId"].as_str() else {continue;};
            let Some(presence)=observed.sessions.get(sid) else {continue;};
            let presence=match presence {Presence::Running=>"open",Presence::Exited=>"closed",Presence::Unknown=>"checking"};
            store.observe_terminal(sid,row["revision"].as_u64().unwrap_or(0),presence).map_err(|e|e.to_string())?;
        }
        Ok(())
    }
}
