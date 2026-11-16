use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Map, Value};
use std::{path::Path, sync::Mutex};
use tokio::sync::broadcast;
use uuid::Uuid;

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Invalid(String),
    #[error("Session storage failed: {0}")]
    Storage(#[from] rusqlite::Error),
    #[error("Stored session JSON is invalid: {0}")]
    Json(#[from] serde_json::Error),
}

fn invalid(message: &str) -> Error {
    Error::Invalid(message.into())
}

pub fn normalize(raw: &Value) -> Result<Map<String, Value>, Error> {
    let raw = raw
        .as_object()
        .ok_or_else(|| invalid("Session must be an object"))?;
    let agent = raw
        .get("agentId")
        .or_else(|| raw.get("agent"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_lowercase();
    let agent = agent.strip_suffix(" cli").unwrap_or(&agent);
    if !["codex", "antigravity", "opencode"].contains(&agent) {
        return Err(invalid("agentId must be codex, antigravity, or opencode"));
    }
    let identity = ["sessionId", "session_id", "id"]
        .iter()
        .find_map(|key| {
            raw.get(*key)
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
        })
        .ok_or_else(|| invalid("A stable sessionId is required"))?;
    if identity.trim().is_empty() || identity.chars().count() > 256 {
        return Err(invalid("sessionId must contain 1 to 256 characters"));
    }
    let prefix = format!("{agent}:");
    let sid = if identity.starts_with(&prefix) {
        identity.to_string()
    } else {
        format!("{prefix}{identity}")
    };
    let status = raw.get("status").and_then(Value::as_str).unwrap_or("");
    let status = if status == "thinking" {
        "running"
    } else {
        status
    };
    if ![
        "idle",
        "running",
        "waiting_input",
        "waiting_approval",
        "completed",
        "failed",
    ]
    .contains(&status)
    {
        return Err(invalid(
            "Invalid lifecycle status; connection state is separate",
        ));
    }
    let connection = raw
        .get("connectionStatus")
        .map_or(Some("connected"), Value::as_str)
        .unwrap_or("");
    if !["connected", "reconnecting", "disconnected"].contains(&connection) {
        return Err(invalid("Invalid connectionStatus"));
    }
    let mut result =
        json!({"sessionId":sid,"agentId":agent,"status":status,"connectionStatus":connection})
            .as_object()
            .unwrap()
            .clone();
    for (field, aliases) in [
        ("projectName", &["projectName", "project"][..]),
        ("taskTitle", &["taskTitle", "title", "message"][..]),
        ("terminalName", &["terminalName", "terminal"][..]),
        ("modelName", &["modelName", "model"][..]),
        (
            "activity",
            &["activity", "current_command", "command", "message"][..],
        ),
        ("elapsed", &["elapsed", "duration"][..]),
    ] {
        if let Some(value) = aliases.iter().find_map(|key| raw.get(*key)) {
            if !value.is_string() {
                return Err(invalid(&format!("{field} must be text")));
            }
            result.insert(field.into(), value.clone());
        }
    }
    for field in [
        "prompt",
        "command",
        "workingDirectory",
        "question",
        "result",
        "error",
        "requestId",
    ] {
        if let Some(value) = raw.get(field) {
            if !value.is_null() && !value.is_string() {
                return Err(invalid(&format!("{field} must be text or null")));
            }
            result.insert(field.into(), value.clone());
        }
    }
    if let Some(options) = raw.get("options") {
        let valid = options.as_array().is_some_and(|items| {
            items.iter().all(|item| {
                item.is_string()
                    || (item.get("label").is_some_and(Value::is_string)
                        && item.get("value").unwrap_or(&item["label"]).is_string())
            })
        });
        if !valid {
            return Err(invalid("Options must be text or labeled values"));
        }
        result.insert("options".into(), options.clone());
    }
    // Producer JSON cannot grant capabilities that no registered adapter delivers.
    result.insert(
        "capabilities".into(),
        json!({"canApprove":false,"canAnswer":false,"canJump":false}),
    );
    result.insert("supportsAcknowledgment".into(), json!(false));
    Ok(result)
}

struct Inner {
    db: Connection,
    sessions: Vec<Value>,
    bridge_id: String,
    sequence: u64,
    auto_archive: bool,
    archive_delay_ms: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

fn protected(session: &Value) -> bool {
    matches!(session["status"].as_str(), Some("waiting_input" | "waiting_approval")) || (session["status"] == "running" && session["endedAt"].as_u64().is_none())
}

pub struct Store {
    inner: Mutex<Inner>,
    events: broadcast::Sender<Value>,
}

pub struct Subscription {
    pub snapshot: Value,
    pub events: broadcast::Receiver<Value>,
}

impl Inner {
    fn envelope(&self, kind: &str, field: &str, value: Value) -> Value {
        let mut envelope = json!({"protocolVersion":1,"bridgeId":self.bridge_id,"sequence":self.sequence,"eventId":format!("{}:{}",self.bridge_id,self.sequence),"type":kind});
        envelope[field] = value;
        envelope
    }

    fn snapshot(&self) -> Value {
        self.envelope("sync", "sessions", json!(self.sessions))
    }
}

impl Store {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, Error> {
        let mut db = Connection::open(path)?;
        db.busy_timeout(std::time::Duration::from_secs(3))?;
        db.execute_batch("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL, source_revision INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS events (session_id TEXT, event_id TEXT, source_revision INTEGER, PRIMARY KEY(session_id, event_id));
            CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS deleted_sessions (id TEXT PRIMARY KEY, source_revision INTEGER NOT NULL, revision INTEGER NOT NULL, deleted_at INTEGER NOT NULL);")?;
        // Existing explicit preferences survive the new default.
        let auto_archive = db.query_row("SELECT value FROM preferences WHERE key='auto_archive'", [], |r| r.get::<_, bool>(0)).optional()?.unwrap_or(true);
        let archive_delay_ms = db.query_row("SELECT value FROM preferences WHERE key='archive_delay_ms'", [], |r| r.get::<_, u64>(0)).optional()?.unwrap_or(300_000);
        let mut sessions = {
            let mut statement = db.prepare("SELECT body FROM sessions ORDER BY rowid")?;
            let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
            let mut sessions = Vec::new();
            for row in rows {
                let mut session: Value = serde_json::from_str(&row?)?;
                session["connectionStatus"] = json!("disconnected");
                session["terminalStatus"] = json!("checking");
                sessions.push(session);
            }
            sessions
        };
        if db.query_row("SELECT value FROM preferences WHERE key='immediate_closure_v084'", [], |r|r.get::<_,bool>(0)).optional()? != Some(true) {
            let tx=db.transaction()?;
            for session in &mut sessions {
                let closure=session["terminalClosedAt"].as_u64().or_else(||session["endedAt"].as_u64()).filter(|time|*time>0);
                if session["archived"] != true && closure.is_some() && session["restoredEndAt"].as_u64() != closure {
                    session["archived"]=json!(true);session["archivedAt"]=json!(now_ms());
                    session["revision"]=json!(session["revision"].as_u64().unwrap_or(0)+1);
                    tx.execute("UPDATE sessions SET body=? WHERE id=?",params![serde_json::to_string(session)?,session["sessionId"].as_str()])?;
                }
            }
            tx.execute("INSERT INTO preferences VALUES('immediate_closure_v084',1) ON CONFLICT(key) DO UPDATE SET value=1",[])?;
            tx.commit()?;
        }
        let (events, _) = broadcast::channel(150);
        Ok(Self {
            inner: Mutex::new(Inner {
                db,
                sessions,
                bridge_id: Uuid::new_v4().to_string(),
                sequence: 0,
                auto_archive,
                archive_delay_ms,
            }),
            events,
        })
    }

    pub fn snapshot(&self) -> Value {
        self.inner
            .lock()
            .expect("session store lock poisoned")
            .snapshot()
    }

    pub fn subscribe(&self) -> Subscription {
        let inner = self.inner.lock().expect("session store lock poisoned");
        // Snapshot and receiver registration share the same lock as committed updates.
        Subscription {
            events: self.events.subscribe(),
            snapshot: inner.snapshot(),
        }
    }

    pub fn update(&self, raw: &Value) -> Result<Value, Error> {
        self.update_internal(raw, false)
    }

    pub fn recover(&self, raw: &Value) -> Result<Value, Error> {
        self.update_internal(raw, true)
    }

    fn update_internal(&self, raw: &Value, recovery: bool) -> Result<Value, Error> {
        let incoming = normalize(raw)?;
        let sid = incoming["sessionId"].as_str().unwrap();
        let event_id = raw
            .get("eventId")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty() && s.chars().count() <= 256)
            .ok_or_else(|| invalid("A stable eventId is required for retries"))?;
        let source_revision = raw
            .get("sourceRevision")
            .and_then(Value::as_u64)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or_else(|| invalid("sourceRevision must be a nonnegative safe integer"))?;
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        let previous = inner
            .sessions
            .iter()
            .find(|s| s["sessionId"] == sid)
            .cloned();
        let deleted: Option<(u64,u64,u64)> = inner.db.query_row("SELECT source_revision,revision,deleted_at FROM deleted_sessions WHERE id=?", [sid], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?;
        if let Some((barrier,_,removed_at)) = deleted {
            let fresh = raw["eventKind"] == "prompt" || (matches!(incoming["status"].as_str(), Some("waiting_input" | "waiting_approval")) && incoming.get("requestId").is_some_and(Value::is_string));
            if recovery || source_revision <= barrier || !fresh || raw["observedAt"].as_u64().is_some_and(|time|time <= removed_at) {
                return Ok(json!({"accepted":false,"reason":"deleted"}));
            }
        }
        let seen: Option<u64> = inner
            .db
            .query_row(
                "SELECT source_revision FROM events WHERE session_id=? AND event_id=?",
                params![sid, event_id],
                |row| row.get(0),
            )
            .optional()?;
        if let Some(revision) = seen {
            if revision != source_revision {
                return Err(invalid("eventId cannot be reused for another revision"));
            }
            return Ok(json!({"accepted":false,"reason":"duplicate","session":previous}));
        }
        let last: Option<u64> = inner
            .db
            .query_row(
                "SELECT source_revision FROM sessions WHERE id=?",
                [sid],
                |row| row.get(0),
            )
            .optional()?;
        if last.is_some_and(|last| source_revision <= last) {
            return Ok(json!({"accepted":false,"reason":"stale","session":previous}));
        }
        let mut merged = previous
            .as_ref()
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        merged.extend(incoming.clone());
        let now = now_ms();
        let kind = raw["eventKind"].as_str().filter(|k| matches!(*k, "prompt" | "request" | "completion" | "activity" | "session_end")).unwrap_or("");
        let observed = raw["observedAt"].as_u64().filter(|t| *t <= now && *t > 0);
        merged.insert("lastSeenAt".into(), json!(if recovery { observed.unwrap_or(0) } else { now }));
        merged.insert("sourceRevision".into(), json!(source_revision));
        merged.insert("eventKind".into(), json!(if recovery { "recovery" } else { kind }));
        if matches!(incoming["status"].as_str(), Some("waiting_input" | "waiting_approval")) {
            if previous.as_ref().is_none_or(|s| incoming.get("requestId").is_some_and(|id| id != &s["requestId"]) || s["status"] != incoming["status"]) {
                merged.insert("requestedAt".into(), json!(if recovery { observed.unwrap_or(0) } else { now }));
            }
        } else { merged.insert("requestedAt".into(), Value::Null); }
        let new_request = matches!(incoming["status"].as_str(), Some("waiting_input" | "waiting_approval")) && incoming.get("requestId").is_some_and(|id| id.is_string() && previous.as_ref().is_none_or(|old|old["requestId"] != *id));
        let closed_opencode=incoming["agentId"]=="opencode" && previous.as_ref().is_some_and(|s|s["terminalStatus"]=="closed" || s["terminalClosedAt"].is_number());
        let activation_after_archive = previous.as_ref().and_then(|s|s["archivedAt"].as_u64()).is_none_or(|archived|observed.is_none_or(|time|time >= archived));
        if recovery && activation_after_archive && (kind == "prompt" || new_request) && observed.is_some() {
            // Cache recovery retains the archive barrier. Fresh native ownership
            // verification must confirm the recovered activation before revealing it.
            merged.insert("recoveredActivationAt".into(),json!(observed));
        }
        if !recovery && !closed_opencode && incoming["connectionStatus"] == "connected" && activation_after_archive && (kind == "prompt" || new_request) {
            merged.insert("archived".into(), json!(false));
            merged.insert("archivedAt".into(), Value::Null);
            merged.insert("terminalStatus".into(), json!("checking"));
            merged.insert("terminalClosedAt".into(), Value::Null);
        }
        if kind == "session_end" && incoming["connectionStatus"] == "disconnected" {
            if let Some(end) = if recovery { observed } else { Some(now) } { merged.insert("endedAt".into(), json!(end)); }
            merged.insert("archived".into(),json!(true));
            merged.insert("archivedAt".into(),json!(if recovery {observed.unwrap_or(now)} else {now}));
            merged.insert("recoveredActivationAt".into(),Value::Null);
        } else if !recovery && incoming["connectionStatus"] == "connected" {
            merged.insert("endedAt".into(), Value::Null);
        }
        if closed_opencode {
            merged.insert("archived".into(),json!(true));
            if merged.get("archivedAt").is_none_or(Value::is_null) {merged.insert("archivedAt".into(),json!(now));}
        }
        if incoming["status"] == "completed" && previous.as_ref().is_none_or(|s| s["status"] != "completed") {
            merged.insert("completedAt".into(), json!(if recovery { observed.unwrap_or(0) } else { now }));
        } else if incoming["status"] != "completed" {
            merged.insert("completedAt".into(), Value::Null);
        }
        if !["waiting_input", "waiting_approval"].contains(&incoming["status"].as_str().unwrap()) {
            merged.insert("requestId".into(), Value::Null);
            merged.insert("question".into(), Value::Null);
            merged.insert("options".into(), json!([]));
        } else if let Some(previous) = &previous {
            if (incoming.contains_key("requestId")
                && incoming["requestId"] != previous["requestId"])
                || incoming["status"] != previous["status"]
            {
                for field in ["requestId", "question", "options", "command"] {
                    if !incoming.contains_key(field) {
                        merged.remove(field);
                    }
                }
            }
        }
        if previous
            .as_ref()
            .is_some_and(|s| s["status"] != incoming["status"])
        {
            for field in ["result", "error"] {
                if !incoming.contains_key(field) {
                    merged.remove(field);
                }
            }
        }
        merged.insert(
            "revision".into(),
            json!(
                previous
                    .as_ref()
                    .and_then(|s| s["revision"].as_u64())
                    .unwrap_or_else(|| deleted.map_or(0, |(_,revision,_)| revision))
                    + 1
            ),
        );
        let session = Value::Object(merged);
        let transaction = inner.db.transaction()?;
        transaction.execute("INSERT INTO sessions (id,body,source_revision) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,source_revision=excluded.source_revision", params![sid,serde_json::to_string(&session)?,source_revision])?;
        transaction.execute(
            "INSERT INTO events VALUES (?,?,?)",
            params![sid, event_id, source_revision],
        )?;
        transaction.execute("DELETE FROM deleted_sessions WHERE id=?", [sid])?;
        if source_revision > 2000 {
            transaction.execute(
                "DELETE FROM events WHERE session_id=? AND source_revision < ?",
                params![sid, source_revision - 2000],
            )?;
        }
        transaction.commit()?;
        if let Some(index) = inner.sessions.iter().position(|s| s["sessionId"] == sid) {
            inner.sessions[index] = session.clone();
        } else {
            inner.sessions.push(session.clone());
        }
        inner.sequence += 1;
        let _ = self
            .events
            .send(inner.envelope("session_update", "session", session.clone()));
        Ok(json!({"accepted":true,"session":session}))
    }

    pub fn archive(&self, sid: &str, archived: bool) -> Result<Value, Error> {
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        let index = inner.sessions.iter().position(|s| s["sessionId"] == sid).ok_or_else(|| invalid("Session no longer exists"))?;
        let mut session = inner.sessions[index].clone();
        if archived && protected(&session) && session["terminalStatus"] != "closed" { return Err(invalid("Running sessions and unresolved requests cannot be archived before verified terminal closure")); }
        if session["archived"].as_bool().unwrap_or(false) == archived { return Ok(session); }
        session["archived"] = json!(archived);
        session["archivedAt"] = if archived { json!(now_ms()) } else { Value::Null };
        if !archived { session["restoredEndAt"] = session["terminalClosedAt"].clone(); }
        session["revision"] = json!(session["revision"].as_u64().unwrap_or(0) + 1);
        inner.db.execute("UPDATE sessions SET body=? WHERE id=?", params![serde_json::to_string(&session)?,sid])?;
        inner.sessions[index] = session.clone();
        inner.sequence += 1;
        let _ = self.events.send(inner.envelope("session_update", "session", session.clone()));
        Ok(session)
    }

    pub fn delete_archived(&self, targets: &[(String,u64)]) -> Result<Vec<Value>, Error> {
        if targets.is_empty() || targets.len() > 10_000 { return Err(invalid("Choose between one and 10000 archived sessions")); }
        let ids: std::collections::HashSet<&str> = targets.iter().map(|(sid,_)|sid.as_str()).collect();
        if ids.len() != targets.len() { return Err(invalid("Duplicate session identity")); }
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        let mut ids = std::collections::HashSet::new();
        let mut deleted = Vec::new();
        for (sid,revision) in targets {
            if !ids.insert(sid.clone()) { return Err(invalid("Duplicate deletion target")); }
            let session = inner.sessions.iter().find(|s| s["sessionId"] == *sid).ok_or_else(|| invalid("The archive changed. Review it and confirm again."))?;
            if session["archived"] != true || protected(session) || session["revision"].as_u64() != Some(*revision) {
                return Err(invalid("The archive changed. Review it and confirm again."));
            }
            let source: u64 = inner.db.query_row("SELECT source_revision FROM sessions WHERE id=?", [sid], |r|r.get(0))?;
            deleted.push(json!({"sessionId":sid,"sourceRevision":source,"revision":revision}));
        }
        let tx = inner.db.transaction()?;
        for entry in &deleted {
            let sid = entry["sessionId"].as_str().unwrap();
            tx.execute("INSERT INTO deleted_sessions VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_revision=excluded.source_revision,revision=excluded.revision,deleted_at=excluded.deleted_at", params![sid,entry["sourceRevision"].as_u64().unwrap(),entry["revision"].as_u64().unwrap(),now_ms()])?;
            tx.execute("DELETE FROM sessions WHERE id=?", [sid])?;
            tx.execute("DELETE FROM events WHERE session_id=?", [sid])?;
        }
        tx.commit()?;
        inner.sessions.retain(|s| !ids.contains(s["sessionId"].as_str().unwrap()));
        inner.sequence += 1;
        let _ = self.events.send(inner.envelope("sessions_removed", "sessionIds", json!(targets.iter().map(|(sid,_)|sid).collect::<Vec<_>>())));
        Ok(deleted)
    }

    pub fn retention(&self, enabled: Option<bool>) -> Result<bool, Error> {
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        if let Some(value) = enabled {
            inner.db.execute("INSERT INTO preferences VALUES('auto_archive',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [value])?;
            inner.auto_archive = value;
        }
        Ok(inner.auto_archive)
    }

    pub fn archive_delay(&self, minutes: Option<u64>) -> Result<u64, Error> {
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        if let Some(minutes) = minutes {
            if !(1..=10080).contains(&minutes) { return Err(invalid("Archive delay must be between 1 minute and 7 days")); }
            inner.db.execute("INSERT INTO preferences VALUES('archive_delay_ms',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [minutes * 60_000])?;
            inner.archive_delay_ms = minutes * 60_000;
        }
        Ok(inner.archive_delay_ms / 60_000)
    }

    /// Only the native terminal observer may supply this evidence. Producer JSON cannot set it.
    pub fn observe_terminal(&self, sid: &str, revision: u64, presence: &str) -> Result<bool, Error> {
        if !["open", "closed", "checking"].contains(&presence) { return Err(invalid("Invalid terminal observation")); }
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        let Some(index) = inner.sessions.iter().position(|s| s["sessionId"] == sid) else { return Ok(false); };
        let mut session = inner.sessions[index].clone();
        let recovered_activation = session["archived"] == true && session["recoveredActivationAt"].as_u64().is_some_and(|time|session["archivedAt"].as_u64().is_some_and(|archived|time > archived));
        if session["revision"].as_u64() != Some(revision) || (session["terminalStatus"] == presence && !(presence == "open" && recovered_activation)) { return Ok(false); }
        let now = now_ms();
        let ended_cli = session["endedAt"].is_number();
        let resumed = presence == "open" && !ended_cli && (session["terminalClosedAt"].is_number() || recovered_activation);
        session["terminalStatus"] = json!(presence);
        if presence == "closed" && session["terminalClosedAt"].is_null() { session["terminalClosedAt"] = json!(now); }
        if presence == "closed" {
            session["archived"]=json!(true);session["archivedAt"]=json!(now);
        }
        if presence == "open" {
            session["terminalClosedAt"] = Value::Null;
            session["recoveredActivationAt"] = Value::Null;
            if resumed { session["archived"] = json!(false); session["archivedAt"] = Value::Null; }
        }
        session["revision"] = json!(revision + 1);
        inner.db.execute("UPDATE sessions SET body=? WHERE id=?", params![serde_json::to_string(&session)?,sid])?;
        inner.sessions[index] = session.clone(); inner.sequence += 1;
        let _ = self.events.send(inner.envelope("session_update", "session", session));
        Ok(true)
    }

    pub fn sweep_archives(&self, now: u64) -> Result<usize, Error> {
        let ids: Vec<String> = {
            let inner = self.inner.lock().expect("session store lock poisoned");
            if !inner.auto_archive { return Ok(0); }
            inner.sessions.iter().filter(|s| s["archived"] != true && s["terminalStatus"] == "closed" && s["restoredEndAt"] != s["terminalClosedAt"] && s["terminalClosedAt"].as_u64().is_some_and(|end| now.saturating_sub(end) >= inner.archive_delay_ms))
                .filter_map(|s| s["sessionId"].as_str().map(str::to_owned)).collect()
        };
        let mut count = 0;
        for id in ids {
            // Eligibility is checked again under the archive lock before committing.
            if self.archive_if_ended(&id, now)? { count += 1; }
        }
        Ok(count)
    }

    fn archive_if_ended(&self, sid: &str, now: u64) -> Result<bool, Error> {
        let mut inner = self.inner.lock().expect("session store lock poisoned");
        let Some(index) = inner.sessions.iter().position(|s| s["sessionId"] == sid) else { return Ok(false); };
        let mut session = inner.sessions[index].clone();
        if !inner.auto_archive || session["archived"] == true || session["terminalStatus"] != "closed" || session["restoredEndAt"] == session["terminalClosedAt"] || !session["terminalClosedAt"].as_u64().is_some_and(|end| now.saturating_sub(end) >= inner.archive_delay_ms) { return Ok(false); }
        session["archived"] = json!(true);
        session["archivedAt"] = json!(now);
        session["revision"] = json!(session["revision"].as_u64().unwrap_or(0) + 1);
        inner.db.execute("UPDATE sessions SET body=? WHERE id=?", params![serde_json::to_string(&session)?,sid])?;
        inner.sessions[index] = session.clone(); inner.sequence += 1;
        let _ = self.events.send(inner.envelope("session_update", "session", session));
        Ok(true)
    }
}
