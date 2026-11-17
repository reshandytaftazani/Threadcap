#![cfg(windows)]

use serde_json::json;
use std::{
    os::windows::process::CommandExt,
    path::PathBuf,
    process::{Command, Stdio},
    time::{Duration, Instant},
};
use vibe_island_codex::state;

#[test]
fn forced_client_exit_recovers_once_without_a_session_end_hook() {
    let directory = tempfile::tempdir().unwrap();
    let cache = directory.path().join("cache.sqlite3");
    let binary = directory.path().join("codex.exe");
    std::fs::copy(
        PathBuf::from(std::env::var_os("SystemRoot").unwrap()).join("System32/cmd.exe"),
        &binary,
    ).unwrap();
    let input = directory.path().join("input.json");
    std::fs::write(&input, json!({
        "hook_event_name": "UserPromptSubmit", "session_id": "owned",
        "turn_id": "turn", "cwd": directory.path(), "prompt": "Closure fixture"
    }).to_string()).unwrap();
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
    let port = listener.local_addr().unwrap().port();
    let command = format!(
        "call \"{}\" hook --port {port} --state-file \"{}\" < \"{}\"",
        env!("CARGO_BIN_EXE_vibe-island-codex"), cache.display(), input.display()
    );
    let mut child = Command::new(&binary)
        .args(["/d", "/q", "/s", "/k"])
        .raw_arg(format!("\"{command}\""))
        .env("THREADCAP_CODEX_LOCAL_CLIENT", "1")
        .creation_flags(0x08000000)
        .stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null())
        .spawn().unwrap();
    let deadline = Instant::now() + Duration::from_secs(5);
    let running = loop {
        if let Ok(snapshots) = state::snapshots(&cache) {
            if let Some(report) = snapshots.into_iter().next() { break Some(report); }
        }
        if Instant::now() >= deadline { break None; }
        std::thread::sleep(Duration::from_millis(25));
    };
    let while_running = state::reconcile_clients(&cache);
    child.kill().unwrap();
    child.wait().unwrap();
    let running = running.expect("fixture hook did not arrive");
    assert!(while_running.unwrap().is_empty());
    let reports = state::reconcile_clients(&cache).unwrap();
    assert_eq!(reports.len(), 1);
    assert_eq!(reports[0]["eventKind"], "session_end");
    assert_eq!(reports[0]["connectionStatus"], "disconnected");
    assert_eq!(reports[0]["status"], "running");
    assert_eq!(reports[0]["prompt"], running["prompt"]);
    assert_eq!(reports[0]["sourceRevision"], json!(2));
    assert!(state::reconcile_clients(&cache).unwrap().is_empty());
    assert_eq!(state::snapshots(&cache).unwrap()[0]["eventKind"], "session_end");
}
