#![cfg(windows)]
use std::{io::Write,process::{Command,Stdio},time::{Duration,Instant}};
use serde_json::json;
use vibe_island_codex::{agent_process::{Identity,Presence,probe},providers};
use std::os::windows::process::CommandExt;

#[test]
fn hook_captures_its_own_ancestor_and_reconciles_exit_without_hiding_a_completed_turn() {
    // A renamed, owned cmd shell is a process-lifetime fixture, not an actual AGY session.
    let directory=tempfile::tempdir().unwrap();let cache=directory.path().join("cache.sqlite3");
    let census_before=vibe_island_codex::agent_process::any_antigravity_running();
    let agy=directory.path().join("agy.exe");
    std::fs::copy(std::path::PathBuf::from(std::env::var_os("SystemRoot").unwrap()).join("System32/cmd.exe"),&agy).unwrap();
    let input=directory.path().join("input.json");
    std::fs::write(&input,json!({"conversationId":"process-fixture","lastUserInput":"Fixture","workspacePaths":[directory.path()],"agentProcess":{"pid":1,"created":"0"}}).to_string()).unwrap();
    let listener=std::net::TcpListener::bind(("127.0.0.1",0)).unwrap();let port=listener.local_addr().unwrap().port();
    let command=format!("call \"{}\" provider-hook --provider antigravity --kind Stop --port {port} --state-file \"{}\" < \"{}\"",env!("CARGO_BIN_EXE_vibe-island-codex"),cache.display(),input.display());
    let mut child=Command::new(&agy).args(["/d","/q","/s","/k"]).raw_arg(format!("\"{command}\"")).creation_flags(0x08000000).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::piped()).spawn().unwrap();
    let report=(|| {
        let deadline=Instant::now()+Duration::from_secs(5);
        loop {
            if let Ok(rows)=providers::snapshots(&cache) {if let Some(row)=rows.first(){return Some(row.clone());}}
            if Instant::now()>deadline{return None;}std::thread::sleep(Duration::from_millis(20));
        }
    })();
    if report.is_none(){let _=child.kill();let output=child.wait_with_output().unwrap();panic!("Hook fixture did not commit its report: {}",String::from_utf8_lossy(&output.stderr));}
    let report=report.unwrap();let identity:Identity=serde_json::from_value(report["agentProcess"].clone()).unwrap();
    assert_eq!(identity.pid,child.id());assert_eq!(probe(&identity),Presence::Running);
    assert_eq!(vibe_island_codex::agent_process::any_antigravity_running(),Some(true));
    assert_eq!(report["status"],"completed");assert!(providers::reconcile_processes(&cache).unwrap().is_empty());
    child.stdin.as_mut().unwrap().write_all(b"exit\r\n").unwrap();child.wait().unwrap();
    if census_before==Some(false) {assert_eq!(vibe_island_codex::agent_process::any_antigravity_running(),Some(false));}
    let ended=providers::reconcile_processes(&cache).unwrap();
    assert_eq!(ended.len(),1);assert_eq!(ended[0]["eventKind"],"session_end");assert_eq!(ended[0]["connectionStatus"],"disconnected");
    assert!(ended[0]["sourceRevision"].as_u64().unwrap()>report["sourceRevision"].as_u64().unwrap());
    assert!(providers::reconcile_processes(&cache).unwrap().is_empty());
}
