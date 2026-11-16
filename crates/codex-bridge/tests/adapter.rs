use serde_json::{json, Value};
use std::{fs, path::Path};
use vibe_island_codex::{config, state};

fn event(name: &str) -> Value {
    json!({"session_id":"thread-1","cwd":"C:/Projects/website","hook_event_name":name,"turn_id":"turn-1"})
}
fn record(path: &Path, name: &str) -> Value {
    state::record(path, &event(name)).unwrap().unwrap()
}
fn prompt(path: &Path) {
    let mut raw = event("UserPromptSubmit");
    raw["prompt"] = json!("Update authentication flow");
    state::record(path, &raw).unwrap();
}
fn tool(name: &str, call: &str, command: &str) -> Value {
    let mut raw = event(name);
    raw["tool_name"] = json!("Bash");
    raw["tool_use_id"] = json!(call);
    raw["tool_input"] = json!({"command":command});
    raw
}

#[test]
fn session_turn_permission_and_completion_have_real_distinct_states() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("cache.sqlite3");
    let mut start = event("SessionStart");
    start["model"] = json!("observed-model");
    let first = state::record(&path, &start).unwrap().unwrap();
    assert_eq!(first["status"], "idle");
    assert_eq!(first["modelName"], "observed-model");
    assert!(first.get("terminalName").is_none());
    prompt(&path);
    let work = state::record(&path, &tool("PreToolUse", "call-1", "npm test"))
        .unwrap()
        .unwrap();
    assert_eq!(work["status"], "running");
    let request = state::record(&path, &tool("PermissionRequest", "call-1", "npm test"))
        .unwrap()
        .unwrap();
    assert_eq!(request["status"], "waiting_approval");
    assert_eq!(request["command"], "npm test");
    assert_eq!(request["capabilities"]["canApprove"], false);
    let resumed = state::record(&path, &tool("PostToolUse", "call-1", "npm test"))
        .unwrap()
        .unwrap();
    assert_eq!(resumed["status"], "running");
    assert!(resumed["requestId"].is_null());
    let mut stop = event("Stop");
    stop["last_assistant_message"] = json!("Tests passed.");
    let done = state::record(&path, &stop).unwrap().unwrap();
    assert_eq!(done["status"], "completed");
    assert_eq!(done["result"], "Tests passed.");
    let ended = record(&path, "SessionEnd");
    assert_eq!(ended["status"], "completed");
    assert_eq!(ended["connectionStatus"], "disconnected");
    assert_eq!(ended["sessionId"], "codex:thread-1");
}

#[test]
fn purge_removes_cached_content_and_next_prompt_keeps_its_source_revision() {
    let directory=tempfile::tempdir().unwrap();let path=directory.path().join("cache.sqlite3");
    prompt(&path);let done=record(&path,"Stop");let revision=done["sourceRevision"].as_u64().unwrap();
    assert_eq!(state::purge_cached(&path,&[("codex:thread-1".into(),revision)]).unwrap(),0);
    let cleared=state::snapshots(&path).unwrap().remove(0);
    assert!(cleared.get("prompt").is_none());assert_eq!(cleared["sourceRevision"],revision);
    let mut next=event("UserPromptSubmit");next["turn_id"]=json!("new-turn");next["prompt"]=json!("New task");
    let accepted=state::record(&path,&next).unwrap().unwrap();assert!(accepted["sourceRevision"].as_u64().unwrap()>revision);
    assert_eq!(state::purge_cached(&path,&[("codex:thread-1".into(),revision)]).unwrap(),1);
    assert_eq!(state::snapshots(&path).unwrap()[0]["prompt"],"New task");
}

#[test]
fn parallel_progress_cannot_hide_or_replace_an_unresolved_permission() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let request = state::record(&path, &tool("PermissionRequest", "call-1", "npm test"))
        .unwrap()
        .unwrap();
    for name in ["PreToolUse", "PostToolUse"] {
        let update = state::record(&path, &tool(name, "call-2", "git status"))
            .unwrap()
            .unwrap();
        assert_eq!(update["status"], "waiting_approval");
        assert_eq!(update["command"], "npm test");
        assert_eq!(update["requestId"], request["requestId"]);
    }
}

#[test]
fn duplicates_and_late_events_cannot_resurrect_closed_or_replaced_turns() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let pre = tool("PreToolUse", "call-1", "echo safe");
    state::record(&path, &pre).unwrap();
    assert!(state::record(&path, &pre).unwrap().is_none());
    state::record(&path, &tool("PostToolUse", "call-1", "echo safe")).unwrap();
    assert!(state::record(&path, &pre).unwrap().is_none());
    record(&path, "Stop");
    assert!(state::record(&path, &tool("PostToolUse", "late", "false"))
        .unwrap()
        .is_none());
    assert!(state::record(&path, &event("UserPromptSubmit"))
        .unwrap()
        .is_none());
    let mut next = event("UserPromptSubmit");
    next["turn_id"] = json!("turn-2");
    state::record(&path, &next).unwrap();
    assert!(state::record(&path, &event("Stop")).unwrap().is_none());
    assert_eq!(state::snapshots(&path).unwrap()[0]["status"], "running");
}

#[test]
fn interruption_and_disconnect_do_not_fabricate_task_failure_or_success() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let ended = record(&path, "SessionEnd");
    assert_eq!(ended["status"], "running");
    assert_eq!(ended["connectionStatus"], "disconnected");
    let mut next = event("UserPromptSubmit");
    next["turn_id"] = json!("turn-2");
    state::record(&path, &next).unwrap();
    let mut interrupt = event("Interrupt");
    interrupt["turn_id"] = json!("turn-2");
    let stopped = state::record(&path, &interrupt).unwrap().unwrap();
    assert_eq!(stopped["status"], "idle");
    assert!(stopped["error"].is_null());
}

#[test]
fn compaction_preserves_the_active_turn_and_permission() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let request = state::record(&path, &tool("PermissionRequest", "call", "npm test"))
        .unwrap()
        .unwrap();
    let mut compact = event("SessionStart");
    compact["source"] = json!("compact");
    let result = state::record(&path, &compact).unwrap().unwrap();
    assert_eq!(result["requestId"], request["requestId"]);
    assert_eq!(result["status"], "waiting_approval");
    assert_eq!(
        state::record(&path, &tool("PostToolUse", "call", "npm test"))
            .unwrap()
            .unwrap()["status"],
        "running"
    );
}

#[test]
fn input_requests_are_monitoring_only_and_clear_after_the_matching_tool() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let mut raw = event("PreToolUse");
    raw["tool_name"] = json!("request_user_input");
    raw["tool_use_id"] = json!("input-1");
    raw["tool_input"] = json!({"questions":[{"question":"Which database?"}]});
    let result = state::record(&path, &raw).unwrap().unwrap();
    assert_eq!(result["status"], "waiting_input");
    assert_eq!(result["question"], "Which database?");
    assert_eq!(result["capabilities"]["canAnswer"], false);
    raw["hook_event_name"] = json!("PostToolUse");
    let result = state::record(&path, &raw).unwrap().unwrap();
    assert_eq!(result["status"], "running");
    assert!(result["requestId"].is_null());
}

#[test]
fn state_survives_process_restarts_and_snapshots_restore_only_stale_context() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let first = record(&path, "PreCompact");
    let second = record(&path, "PostCompact");
    assert!(second["sourceRevision"].as_u64().unwrap() > first["sourceRevision"].as_u64().unwrap());
    assert_ne!(second["eventId"], first["eventId"]);
    let recovered = state::snapshots(&path).unwrap();
    assert_eq!(recovered[0]["connectionStatus"], "disconnected");
    assert_eq!(recovered[0]["sourceRevision"], second["sourceRevision"]);
}

#[test]
fn explicit_child_agent_events_and_unknown_hooks_do_not_replace_the_parent() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    prompt(&path);
    let mut child = event("Stop");
    child["agent_id"] = json!("child-1");
    assert!(state::record(&path, &child).unwrap().is_none());
    assert!(state::record(&path, &event("SomeFutureHook"))
        .unwrap()
        .is_none());
    assert_eq!(state::snapshots(&path).unwrap()[0]["status"], "running");
}

#[test]
fn invalid_fields_do_not_create_a_false_live_session() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    for (key, value) in [
        ("session_id", json!(" ")),
        ("cwd", Value::Null),
        ("turn_id", Value::Null),
    ] {
        let mut raw = event("UserPromptSubmit");
        raw[key] = value;
        assert!(state::record(&path, &raw).is_err());
    }
    assert!(state::snapshots(&path).unwrap().is_empty());
}

#[test]
fn concurrent_hook_processes_keep_a_monotonic_source_revision() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("state");
    record(&path, "SessionStart");
    let workers: Vec<_> = (0..12)
        .map(|_| {
            let path = path.clone();
            std::thread::spawn(move || record(&path, "SessionStart"))
        })
        .collect();
    for worker in workers {
        worker.join().unwrap();
    }
    assert_eq!(state::snapshots(&path).unwrap()[0]["sourceRevision"], 13);
}

#[test]
fn brief_cache_write_contention_does_not_drop_a_hook() {
    let temp=tempfile::tempdir().unwrap();let path=temp.path().join("state");
    record(&path,"SessionStart");
    let mut db=rusqlite::Connection::open(&path).unwrap();
    let lock=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).unwrap();
    let ready=std::sync::Arc::new(std::sync::Barrier::new(2));
    let worker_ready=ready.clone();let worker_path=path.clone();
    let worker=std::thread::spawn(move || {worker_ready.wait();record(&worker_path,"SessionStart");});
    ready.wait();std::thread::sleep(std::time::Duration::from_millis(500));lock.commit().unwrap();
    worker.join().unwrap();
    assert_eq!(state::snapshots(&path).unwrap()[0]["sourceRevision"],2);
}

#[test]
fn install_update_and_uninstall_preserve_other_hooks_and_empty_custom_groups() {
    let mut document = json!({"description":"Keep this","extra":{"setting":true},"hooks":{"Stop":[{"matcher":"custom","hooks":[{"type":"command","command":"user-owned-handler"}]}],"SessionEnd":[],"Custom":[{"hooks":[]}]}});
    let original = document.clone();
    let executable = Path::new("C:/Program Files/Islands/bridge.exe");
    config::edit(&mut document, Some(executable), 37891).unwrap();
    let installed = document.clone();
    config::edit(&mut document, Some(executable), 37891).unwrap();
    assert_eq!(document, installed);
    config::edit(&mut document, None, 37891).unwrap();
    assert_eq!(document["description"], original["description"]);
    assert_eq!(document["extra"], original["extra"]);
    for key in ["Stop", "SessionEnd", "Custom"] {
        assert_eq!(document["hooks"][key], original["hooks"][key]);
    }
    assert!(document["hooks"]
        .as_object()
        .unwrap()
        .values()
        .all(
            |groups| groups.as_array().unwrap().iter().all(|group| group["hooks"]
                .as_array()
                .unwrap()
                .iter()
                .all(|handler| !config::owned(handler)))
        ));
    let mut metadata_only = json!({"description":"Unrelated"});
    let original = metadata_only.clone();
    config::edit(&mut metadata_only, None, 37891).unwrap();
    assert_eq!(metadata_only, original);
}

#[test]
fn staging_a_per_user_copy_is_idempotent_and_independent_of_the_download_folder() {
    let temp = tempfile::tempdir().unwrap();
    let source = temp.path().join("download.exe");
    fs::write(&source, b"test executable bytes").unwrap();
    let folder = temp.path().join("persistent-user-directory");
    let target = config::stage_executable(&source, &folder).unwrap();
    assert_eq!(fs::read(&target).unwrap(), b"test executable bytes");
    assert_eq!(config::stage_executable(&target, &folder).unwrap(), target);
    fs::remove_file(source).unwrap();
    assert!(target.exists());
}

#[test]
fn config_writes_are_backed_up_idempotent_and_reject_malformed_files() {
    let temp = tempfile::tempdir().unwrap();
    let file = temp.path().join("hooks.json");
    let bytes = b"{\"hooks\":{},\"description\":\"User hook file\"}";
    fs::write(&file, bytes).unwrap();
    let backup = config::update_file(temp.path(), Some(Path::new("C:/bridge.exe")), 37891)
        .unwrap()
        .unwrap();
    assert_eq!(fs::read(backup).unwrap(), bytes);
    let installed = fs::read(&file).unwrap();
    assert!(
        config::update_file(temp.path(), Some(Path::new("C:/bridge.exe")), 37891)
            .unwrap()
            .is_none()
    );
    assert_eq!(fs::read(&file).unwrap(), installed);
    fs::write(&file, b"{invalid").unwrap();
    assert!(config::update_file(temp.path(), Some(Path::new("C:/bridge.exe")), 37891).is_err());
    assert_eq!(fs::read(&file).unwrap(), b"{invalid");
}

#[test]
fn hook_failure_never_blocks_codex_or_writes_policy_output() {
    use std::{
        io::Write,
        process::{Command, Stdio},
    };
    let mut child = Command::new(env!("CARGO_BIN_EXE_vibe-island-codex"))
        .args(["hook", "--port", "1"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(b"invalid JSON")
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
    let output = Command::new(env!("CARGO_BIN_EXE_vibe-island-codex"))
        .args(["hook", "--unknown-option"])
        .output()
        .unwrap();
    assert!(output.status.success());
    assert!(output.stdout.is_empty());
    assert!(output.stderr.is_empty());
}

#[cfg(windows)]
#[test]
fn official_windows_shell_invocation_preserves_unicode_stdin_and_literal_executable_paths() {
    verify_windows_command(true, false);
    verify_windows_command(false, false);
}

#[test]
#[cfg(windows)]
fn windows_hook_launcher_also_works_when_invoked_from_powershell() {
    verify_windows_command(false, true);
}

#[cfg(windows)]
fn verify_windows_command(unusual_path: bool, powershell: bool) {
    use std::{
        io::{BufRead, BufReader, Read, Write},
        net::TcpListener,
        os::windows::process::CommandExt,
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    let temp = tempfile::tempdir().unwrap();
    let directory = temp.path().join(if unusual_path { "bridge's path %NAME% ü" } else { "bridge's safe path ü" });
    fs::create_dir(&directory).unwrap();
    let binary = directory.join("bridge.exe");
    fs::copy(env!("CARGO_BIN_EXE_vibe-island-codex"), &binary).unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    listener.set_nonblocking(true).unwrap();
    let server = std::thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(30);
        let mut stream = loop {
            match listener.accept() {
                Ok((stream, _)) => break stream,
                Err(_) if Instant::now() < deadline => {
                    std::thread::sleep(Duration::from_millis(10))
                }
                Err(error) => panic!("Hook did not deliver: {error}"),
            }
        };
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .unwrap();
        let mut reader = BufReader::new(&stream);
        let mut length = 0;
        let mut line = String::new();
        reader.read_line(&mut line).unwrap();
        assert!(line.starts_with("POST /api/sessions "));
        loop {
            line.clear();
            reader.read_line(&mut line).unwrap();
            if line == "\r\n" {
                break;
            }
            if let Some(value) = line.strip_prefix("Content-Length: ") {
                length = value.trim().parse::<usize>().unwrap();
            }
        }
        let mut body = vec![0; length];
        reader.read_exact(&mut body).unwrap();
        let report: Value = serde_json::from_slice(&body).unwrap();
        drop(reader);
        let response =
            json!({"accepted":true,"session":{"sessionId":report["sessionId"]}}).to_string();
        write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response}",
            response.len()
        )
        .unwrap();
        report
    });
    let command = config::command(&binary, port).unwrap();
    assert!(command.starts_with("powershell.exe"));
    assert!(config::owned(&json!({"type":"command","command":command})));
    let mut launcher=if powershell {
        let mut launcher=Command::new("powershell.exe");launcher.args(["-NoProfile","-NonInteractive","-Command"]).arg(&command);launcher
    } else {
        let mut launcher=Command::new("cmd.exe");launcher.args(["/C"]).raw_arg(format!("\"{command}\""));launcher
    };
    let mut child = launcher.env("LOCALAPPDATA", temp.path())
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut raw = event("UserPromptSubmit");
    raw["prompt"] = json!("Perbaiki ünicode 日本語 😀; $(throw 'not code')");
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(&raw).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(output.stdout.is_empty());
    let report = server.join().unwrap();
    assert_eq!(report["prompt"], raw["prompt"]);
    assert_eq!(report["sessionId"], "codex:thread-1");
}
