use anyhow::{bail, Context, Result};
use rusqlite::{params, Connection, OpenFlags, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use uuid::Uuid;

#[derive(Clone, Default, Deserialize, Serialize)]
struct Session {
    report: Value,
    active_turn: Option<String>,
    closed_turns: Vec<String>,
    seen_tools: Vec<String>,
    #[serde(default)]
    waiting_for: Option<String>,
}

pub fn default_path(port: u16) -> Result<PathBuf> {
    let directory = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("USERPROFILE").map(|home| PathBuf::from(home).join(".local/share"))
        })
        .context("LOCALAPPDATA or USERPROFILE is required; alternatively supply --state-file")?;
    Ok(directory
        .join("VibeIsland")
        .join(format!("codex-hooks-{port}.sqlite3")))
}

pub(crate) fn open(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
        std::fs::create_dir_all(parent)?;
    }
    let db = Connection::open(path)?;
    db.busy_timeout(Duration::from_millis(250))?;
    db.execute_batch("CREATE TABLE IF NOT EXISTS codex_sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS codex_events (session_id TEXT, event_key TEXT, revision INTEGER NOT NULL, PRIMARY KEY(session_id,event_key));")?;
    Ok(db)
}

fn text<'a>(event: &'a Value, key: &str) -> Option<&'a str> {
    event
        .get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
}
fn limited(value: &str, limit: usize) -> String {
    let mut chars = value.chars();
    let prefix: String = chars.by_ref().take(limit).collect();
    if chars.next().is_some() {
        prefix + "… [truncated; see Codex]"
    } else {
        prefix
    }
}
fn close_turn(session: &mut Session) {
    if let Some(turn) = session.active_turn.take() {
        session.closed_turns.push(turn);
        if session.closed_turns.len() > 256 {
            session.closed_turns.remove(0);
        }
    }
    session.seen_tools.clear();
    session.waiting_for = None;
}

fn operation(event: &Value) -> String {
    let mut digest = Sha256::new();
    digest.update(event["tool_name"].to_string().as_bytes());
    digest.update(event["tool_input"].to_string().as_bytes());
    format!("{:x}", digest.finalize())
}

/// Commit a complete, ordered producer snapshot before attempting optional local delivery.
pub fn record(path: &Path, event: &Value) -> Result<Option<Value>> {
    record_internal(path,event,None)
}

pub fn record_with_terminal(path:&Path,event:&Value,binding:Option<&crate::terminal::Binding>) -> Result<Option<Value>> {
    record_internal(path,event,Some(binding))
}

fn record_internal(path:&Path,event:&Value,terminal:Option<Option<&crate::terminal::Binding>>) -> Result<Option<Value>> {
    let name = text(event, "hook_event_name").context("Missing hook_event_name")?;
    if !crate::EVENTS.contains(&name) {
        return Ok(None);
    }
    // Explicit child-agent events must not complete or replace their parent's session.
    if text(event, "agent_id").is_some() {
        return Ok(None);
    }
    let id = text(event, "session_id")
        .filter(|id| id.len() <= 256)
        .context("Missing or invalid session_id")?;
    let cwd = text(event, "cwd").context("Missing cwd")?;
    if cwd.len() > 131_072 || id.trim().is_empty() {
        bail!("Invalid session identity or working directory");
    }
    for field in ["turn_id", "tool_use_id"] {
        if text(event, field).is_some_and(|value| value.len() > 256) {
            bail!("{field} exceeds limit");
        }
    }
    let sid = format!("codex:{id}");
    let mut db = open(path)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let previous: Option<String> = tx
        .query_row(
            "SELECT body FROM codex_sessions WHERE id=?",
            [&sid],
            |row| row.get(0),
        )
        .optional()?;
    let mut session: Session = previous
        .map(|s| serde_json::from_str(&s))
        .transpose()?
        .unwrap_or_default();
    if session.report.is_null() {
        session.report = json!({"agentId":"codex","sessionId":sid,"status":"idle","taskTitle":"Codex session","capabilities":{"canApprove":false,"canAnswer":false,"canJump":false},"supportsAcknowledgment":false,"sourceRevision":0});
    }
    let turn = text(event, "turn_id");
    let turn_scoped = !matches!(name, "SessionStart" | "SessionEnd");
    if turn_scoped && turn.is_none() {
        bail!("Missing turn_id for {name}");
    }
    if let Some(turn) = turn.filter(|_| turn_scoped) {
        if session.closed_turns.iter().any(|closed| closed == turn) {
            return Ok(None);
        }
        if name != "UserPromptSubmit" && turn_scoped && session.active_turn.as_deref() != Some(turn)
        {
            return Ok(None);
        }
    }
    let key = if matches!(name, "UserPromptSubmit" | "Stop" | "Interrupt") {
        Some(format!("{name}:{}", turn.unwrap()))
    } else if matches!(name, "PreToolUse" | "PostToolUse") {
        text(event, "tool_use_id").map(|tool| format!("{name}:{}:{tool}", turn.unwrap()))
    } else {
        None
    };
    if let Some(key) = &key {
        if tx
            .query_row(
                "SELECT 1 FROM codex_events WHERE session_id=? AND event_key=?",
                params![&sid, key],
                |row| row.get::<_, u8>(0),
            )
            .optional()?
            .is_some()
        {
            return Ok(None);
        }
    }
    session.report["connectionStatus"] = json!("connected");
    session.report["workingDirectory"] = json!(cwd);
    session.report["projectName"] = json!(Path::new(cwd)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(cwd));
    if let Some(model) = text(event, "model") {
        session.report["modelName"] = json!(limited(model, 128));
    }
    match name {
        "SessionStart" if text(event, "source") == Some("compact") => {}
        "SessionStart" => {
            close_turn(&mut session);
            session.report["status"] = json!("idle");
            session.report["activity"] = json!("Ready in Codex");
        }
        "UserPromptSubmit" => {
            if session.active_turn.as_deref() != turn {
                close_turn(&mut session);
            }
            session.active_turn = turn.map(str::to_owned);
            let prompt = text(event, "prompt").unwrap_or("Codex task");
            session.report["taskTitle"] =
                json!(limited(prompt.lines().next().unwrap_or(prompt), 90));
            session.report["prompt"] = json!(limited(prompt, 16_000));
            session.report["result"] = Value::Null;
            session.report["error"] = Value::Null;
            session.report["status"] = json!("running");
            session.report["activity"] = json!("Working in Codex");
        }
        "PermissionRequest" => {
            session.waiting_for = Some(operation(event));
            let tool = text(event, "tool_name").unwrap_or("tool");
            session.report["status"] = json!("waiting_approval");
            session.report["activity"] =
                json!(format!("Permission requested: {}", limited(tool, 100)));
            session.report["question"] = json!(format!(
                "Codex requests permission for {}. Review and respond in Codex.",
                limited(tool, 100)
            ));
            session.report["requestId"] =
                json!(format!("{}:permission:{}", turn.unwrap(), Uuid::new_v4()));
        }
        "PreToolUse" | "PostToolUse" => {
            let tool = text(event, "tool_name").unwrap_or("tool");
            if let Some(tool_id) = text(event, "tool_use_id") {
                let key = format!("{}:{tool_id}", turn.unwrap());
                if name == "PreToolUse" && session.seen_tools.contains(&key) {
                    return Ok(None);
                }
                if name == "PostToolUse" {
                    session.seen_tools.push(key);
                    if session.seen_tools.len() > 4096 {
                        session.seen_tools.remove(0);
                    }
                }
            }
            let still_waiting = session.waiting_for.is_some()
                && !(name == "PostToolUse"
                    && session.waiting_for.as_deref() == Some(operation(event).as_str()));
            if !still_waiting {
                session.waiting_for = None;
                session.report["status"] = json!("running");
                session.report["activity"] = json!(format!(
                    "{} {}",
                    if name == "PreToolUse" {
                        "Using"
                    } else {
                        "Finished"
                    },
                    limited(tool, 100)
                ));
            }
            if name == "PreToolUse" && tool == "request_user_input" {
                session.waiting_for = Some(operation(event));
                session.report["status"] = json!("waiting_input");
                session.report["requestId"] = json!(format!(
                    "{}:input:{}",
                    turn.unwrap(),
                    text(event, "tool_use_id")
                        .map(str::to_owned)
                        .unwrap_or_else(|| Uuid::new_v4().to_string())
                ));
                session.report["question"] = event
                    .pointer("/tool_input/questions/0/question")
                    .and_then(Value::as_str)
                    .map(|s| json!(limited(s, 8000)))
                    .unwrap_or_else(|| json!("Codex needs input. Respond in Codex."));
            }
        }
        "PreCompact" | "PostCompact" if session.waiting_for.is_none() => {
            session.report["activity"] = json!(if name == "PreCompact" {
                "Compacting context"
            } else {
                "Context compacted"
            });
        }
        "Stop" => {
            session.report["status"] = json!("completed");
            session.report["activity"] = json!("Response finished");
            session.report["result"] = event
                .get("last_assistant_message")
                .and_then(Value::as_str)
                .map(|s| json!(limited(s, 16_000)))
                .unwrap_or(Value::Null);
            close_turn(&mut session);
        }
        "Interrupt" => {
            session.report["status"] = json!("idle");
            session.report["activity"] = json!("Turn interrupted in Codex");
            close_turn(&mut session);
        }
        "SessionEnd" => {
            session.report["connectionStatus"] = json!("disconnected");
            close_turn(&mut session);
        }
        _ => {}
    }
    if matches!(name, "PreToolUse" | "PermissionRequest")
        && (session.waiting_for.is_none()
            || session.waiting_for.as_deref() == Some(operation(event).as_str()))
    {
        let command = event.pointer("/tool_input/command").and_then(Value::as_str);
        session.report["command"] = if text(event, "tool_name") == Some("Bash") {
            command
                .filter(|s| s.len() <= 16_384)
                .map(|s| json!(s))
                .unwrap_or(Value::Null)
        } else {
            Value::Null
        };
    }
    if session.report["status"] != "waiting_approval" && session.report["status"] != "waiting_input"
    {
        session.report["question"] = Value::Null;
        session.report["requestId"] = Value::Null;
        session.report["options"] = json!([]);
    }
    let revision = session.report["sourceRevision"].as_u64().unwrap_or(0) + 1;
    session.report["eventKind"] = json!(match name {
        "UserPromptSubmit" => "prompt",
        "PermissionRequest" | "Notification" if session.report["requestId"].is_string() => "request",
        "Stop" => "completion",
        "SessionEnd" => "session_end",
        _ => "activity",
    });
    session.report["observedAt"] = json!(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64);
    session.report["sourceRevision"] = json!(revision);
    session.report["eventId"] = json!(Uuid::new_v4().to_string());
    tx.execute(
        "INSERT INTO codex_sessions VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
        params![&sid, serde_json::to_string(&session)?],
    )?;
    if let Some(key) = key {
        tx.execute(
            "INSERT INTO codex_events VALUES (?,?,?)",
            params![&sid, key, revision],
        )?;
    }
    if revision > 2000 {
        tx.execute(
            "DELETE FROM codex_events WHERE session_id=? AND revision<?",
            params![&sid, revision - 2000],
        )?;
    }
    if let Some(binding)=terminal {
        // Commit launch identity with the report; no extra per-hook database transaction is needed.
        if let Some(binding)=binding { crate::terminal::save_in_transaction(&tx,&sid,revision,Some(binding))?; }
        else { crate::terminal::carry_forward(&tx,&sid,revision)?; }
    }
    tx.commit()?;
    Ok(Some(session.report))
}

/// Clear observer-owned cached context while preserving source revision identity.
pub fn purge_cached(path: &Path, targets: &[(String,u64)]) -> Result<usize> {
    if !path.is_file() { return Ok(0); }
    let mut db = open(path)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let has_links: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='orca_terminal_links')", [], |r|r.get(0))?;
    let mut skipped = 0;
    for (sid, barrier) in targets {
        let body: Option<String> = tx.query_row("SELECT body FROM codex_sessions WHERE id=?", [sid], |r|r.get(0)).optional()?;
        let Some(body) = body else { continue; };
        let cached: Session = serde_json::from_str(&body)?;
        let revision = cached.report["sourceRevision"].as_u64().unwrap_or(0);
        if revision > *barrier { skipped += 1; continue; }
        // Preserve only revision identity so the next genuine prompt can advance past deletion.
        let cleared = Session { report: json!({"agentId":"codex","sessionId":sid,"sourceRevision":revision,"status":"idle","connectionStatus":"disconnected","eventKind":"purged","eventId":Uuid::new_v4().to_string(),"capabilities":{"canApprove":false,"canAnswer":false,"canJump":false},"supportsAcknowledgment":false}), ..Session::default() };
        tx.execute("UPDATE codex_sessions SET body=? WHERE id=?", params![serde_json::to_string(&cleared)?,sid])?;
        tx.execute("DELETE FROM codex_events WHERE session_id=?", [sid])?;
        if has_links { tx.execute("DELETE FROM orca_terminal_links WHERE session_id=?", [sid])?; }
    }
    tx.commit()?;
    Ok(skipped)
}

/// Startup recovery restores context as stale; only a fresh hook proves a live producer.
pub fn snapshots(path: &Path) -> Result<Vec<Value>> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    db.busy_timeout(Duration::from_millis(250))?;
    let mut query = db.prepare("SELECT body FROM codex_sessions ORDER BY rowid")?;
    let rows = query.query_map([], |row| row.get::<_, String>(0))?;
    let mut reports = Vec::new();
    for row in rows {
        let session: Session = serde_json::from_str(&row?)?;
        let mut report = session.report;
        report["connectionStatus"] = json!("disconnected");
        reports.push(report);
    }
    Ok(reports)
}
