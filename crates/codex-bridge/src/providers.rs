use anyhow::{Context, Result};
use rusqlite::{params, OptionalExtension, TransactionBehavior};
use serde_json::{json, Value};
use std::path::Path;

fn text(value: &Value, key: &str) -> String {
    value[key].as_str().unwrap_or("").chars().take(4096).collect()
}

fn form_context(form: &Value) -> (String, Value) {
    let fields = form["fields"].as_array().map(Vec::as_slice).unwrap_or(&[]);
    let visible: Vec<_> = fields.iter().filter(|field| field["hidden"] != true).take(32).collect();
    let mut sections = Vec::new();
    let mut choices = Vec::new();
    for field in &visible {
        let title = text(field, "title");
        let description = text(field, "description");
        let mut section = if description.is_empty() { title } else if title.is_empty() { description } else { format!("{title}\n{description}") };
        if field["type"] == "multiselect" { section.push_str("\nMultiple choices allowed. Respond in OpenCode."); }
        let options: Vec<_> = field["options"].as_array().map(Vec::as_slice).unwrap_or(&[]).iter().take(64).filter_map(|option| {
            let label = text(option, "label");
            if label.is_empty() { return None; }
            let value = option["value"].as_str().unwrap_or(&label).chars().take(4096).collect::<String>();
            Some(json!({"label":label,"value":value,"description":text(option,"description")}))
        }).collect();
        if visible.len() == 1 { choices = options; }
        else {
            for option in options {
                section.push_str(&format!("\n- {}", option["label"].as_str().unwrap_or_default()));
                if let Some(description) = option["description"].as_str().filter(|s| !s.is_empty()) { section.push_str(&format!(": {description}")); }
            }
        }
        if !section.trim().is_empty() { sections.push(section); }
    }
    // Observe the questions, never defaults, answers, hidden fields, or authentication URLs.
    let question = if sections.is_empty() { text(form, "title") } else { sections.join("\n\n") };
    (question.chars().take(16000).collect(), json!(choices))
}

/// Monitoring only: never writes a decision into the provider's output stream.
pub fn record(path: &Path, provider: &str, event: &Value, kind: Option<&str>) -> Result<Option<Value>> {
    let (identity, status, activity, request, event_kind) = match provider {
        "antigravity" => {
            let identity = text(event, "conversationId");
            let (status, activity) = match kind.unwrap_or("") {
                "SessionStart" => ("idle", "Session started"),
                "PreInvocation" => ("running", "Working"),
                "PostToolUse" => ("running", "Tool finished"),
                "Stop" => ("completed", "Turn ended; see terminal for result"),
                _ => return Ok(None),
            };
            (identity, status, activity, Value::Null, if kind == Some("Stop") { "completion" } else if kind == Some("SessionStart") { "prompt" } else { "activity" })
        }
        "opencode" => {
            let identity = if event["type"]=="form.created" {text(&event["data"]["form"], "sessionID")} else {text(&event["data"], "sessionID")};
            let (status, activity) = match event["type"].as_str().unwrap_or("") {
                "session.created" | "session.viewed" => ("idle","Session opened"),
                "session.execution.started" => ("running","Working"),
                "session.execution.succeeded" => ("completed","Turn ended; see terminal for result"),
                "session.execution.failed" => ("failed","Execution failed; see terminal"),
                "session.execution.interrupted" => ("idle","Execution interrupted"),
                "session.deleted" => ("idle","Session removed in OpenCode"),
                "session.status" => match event["data"]["status"]["type"].as_str().unwrap_or("") {
                    "busy" | "retry" => ("running", "Working"),
                    "idle" => ("idle", "Ready for the next task"),
                    _ => return Ok(None),
                },
                "session.idle" => ("idle", "Ready for the next task"),
                "permission.asked" | "form.created" => ("idle", "Respond in the provider terminal"),
                "permission.replied" | "form.replied" | "form.cancelled" => ("idle", "Request closed in the terminal; waiting for activity"),
                _ => return Ok(None),
            };
            (identity, status, activity, Value::Null, "activity")
        }
        _ => anyhow::bail!("Unsupported provider"),
    };
    anyhow::ensure!(!identity.is_empty() && identity.len() <= 256 && !identity.chars().any(char::is_control), "Invalid provider session identity");
    let sid = format!("{provider}:{identity}");
    let mut db = crate::state::open(path)?;
    db.execute_batch("CREATE TABLE IF NOT EXISTS provider_sessions(id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS provider_events(session_id TEXT, event_id TEXT, PRIMARY KEY(session_id,event_id));")?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    // OpenCode supplies an event ID. Antigravity does not promise one, so do not
    // mistake identical repeated model/tool calls for the same lifecycle episode.
    let event_id = event["id"].as_str().filter(|_| provider == "opencode").map(str::to_owned).unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let duplicate: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM provider_events WHERE session_id=? AND event_id=?)",params![sid,event_id],|r|r.get(0))?;
    let old: Option<String> = tx.query_row("SELECT body FROM provider_sessions WHERE id=?",[&sid],|r|r.get(0)).optional()?;
    let mut report: Value = old.map(|body|serde_json::from_str(&body)).transpose()?.unwrap_or_else(||json!({"agentId":provider,"sessionId":sid,"taskTitle":format!("{} session",if provider=="opencode" {"OpenCode"} else {"Antigravity"})}));
    if duplicate { return Ok(Some(report)); }
    if provider == "opencode" {
        anyhow::ensure!(event["id"].as_str().is_some_and(|id| !id.is_empty() && id.len()<=256),"OpenCode event ID is required");
        if let (Some(incoming),Some(previous))=(event["created"].as_f64(),report["providerCreatedAt"].as_f64()) { if incoming < previous { return Ok(None); } }
        if event["created"].is_number() { report["providerCreatedAt"]=event["created"].clone(); }
    }
    let revision = report["sourceRevision"].as_u64().unwrap_or(0) + 1;
    let was_idle = matches!(report["status"].as_str(), None | Some("idle" | "completed" | "failed"));
    let preserve_task=provider=="opencode" && (event["type"]=="session.viewed" || (report["status"]=="completed" && (event["type"]=="session.idle" || (event["type"]=="session.status" && status=="idle"))));
    if !preserve_task || report["status"].is_null() {report["status"] = json!(status); report["activity"] = json!(activity);}
    report["connectionStatus"] = json!("connected"); report["eventKind"] = json!(event_kind);
    if provider=="opencode" && event["type"]=="session.deleted" {report["connectionStatus"]=json!("disconnected");report["eventKind"]=json!("session_end");}
    if provider=="opencode" && matches!(event["type"].as_str(),Some("session.created"|"session.viewed")) {report["eventKind"]=json!("prompt");}
    if provider=="opencode" && event["type"]=="session.execution.succeeded" {report["eventKind"]=json!("completion");}
    report["sourceRevision"] = json!(revision); report["eventId"] = json!(event_id);
    report["observedAt"] = json!(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_millis() as u64);
    if status == "running" && was_idle { report["eventKind"] = json!("prompt"); }
    report["requestId"] = request; report["supportsAcknowledgment"] = json!(false);
    report["capabilities"] = json!({"canApprove":false,"canAnswer":false,"canJump":false});
    if provider=="opencode" {
        let mut requests=report["pendingRequests"].as_array().cloned().unwrap_or_default();
        let name=event["type"].as_str().unwrap_or("");
        if let Some(directory)=event["data"]["location"]["directory"].as_str() {
            report["workingDirectory"]=json!(directory.chars().take(131072).collect::<String>());
            report["projectName"]=json!(Path::new(directory).file_name().unwrap_or_default().to_string_lossy());
        }
        if let Some(title)=event["data"]["title"].as_str() {report["taskTitle"]=json!(title.chars().take(140).collect::<String>());}
        if name=="permission.asked" || name=="form.created" {
            let data=if name=="form.created" {&event["data"]["form"]} else {&event["data"]};
            let id=text(data,"id"); anyhow::ensure!(!id.is_empty() && id.len()<=256,"Request identity is required");
            let key=format!("{}:{id}",if name=="form.created" {"form"} else {"permission"});
            if !requests.iter().any(|request|request["requestId"]==key) {
                anyhow::ensure!(requests.len()<32,"Too many unresolved requests");
                let (question,options)=if name=="form.created" {form_context(data)} else {(text(data,"message"),json!([]))};
                requests.push(json!({"requestId":key,"status":if name=="form.created" {"waiting_input"} else {"waiting_approval"},"question":question,"options":options,"command":text(data,"action")}));
            }
            report["eventKind"]=json!("request");
        } else if matches!(name,"permission.replied"|"form.replied"|"form.cancelled") {
            let key=if name=="permission.replied" {format!("permission:{}",text(&event["data"],"requestID"))} else {format!("form:{}",text(&event["data"],"id"))};
            requests.retain(|request|request["requestId"]!=key);
        }
        report["pendingRequests"]=json!(requests);
        if let Some(request)=requests.first() {
            for key in ["requestId","status","question","command"] {report[key]=request[key].clone();}
            report["options"]=request.get("options").cloned().unwrap_or_else(||json!([]));
            report["activity"]=json!("Respond in the provider terminal");
        } else { report["question"]=Value::Null; report["command"]=Value::Null; report["options"]=json!([]); }
    }
    if provider == "antigravity" {
        report["agentProcess"]=crate::agent_process::capture().map(serde_json::to_value).transpose()?.unwrap_or(Value::Null);
        let prompt = text(event,"lastUserInput");
        if !prompt.is_empty() && report["prompt"] != prompt { report["prompt"] = json!(prompt); report["taskTitle"] = json!(prompt.chars().take(140).collect::<String>()); report["eventKind"] = json!("prompt"); }
        if let Some(directory) = event["workspacePaths"][0].as_str() { report["workingDirectory"] = json!(directory); report["projectName"] = json!(Path::new(directory).file_name().unwrap_or_default().to_string_lossy()); }
        let model = text(event,"modelName"); if !model.is_empty() { report["modelName"] = json!(model); }
        if let Some(binding) = crate::terminal::Binding::from_lookup(|key|std::env::var(key).ok()) { crate::terminal::save_in_transaction(&tx,&sid,revision,Some(&binding))?; }
    }
    tx.execute("INSERT INTO provider_sessions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",params![sid,serde_json::to_string(&report)?])?;
    tx.execute("INSERT INTO provider_events VALUES(?,?)",params![sid,event_id])?;
    tx.commit()?;
    Ok(Some(report))
}

pub fn snapshots(path: &Path) -> Result<Vec<Value>> {
    read_reports(path,"SELECT body FROM provider_sessions")
}

fn read_reports(path: &Path, query: &str) -> Result<Vec<Value>> {
    if !path.is_file() { return Ok(vec![]); }
    let db = rusqlite::Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    db.busy_timeout(std::time::Duration::from_millis(250))?;
    let exists: bool = db.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='provider_sessions')",[],|r|r.get(0))?;
    if !exists { return Ok(vec![]); }
    let mut query = db.prepare(query)?;
    let mut result = vec![];
    for body in query.query_map([],|r|r.get::<_,String>(0))? {
        let mut value: Value = serde_json::from_str(&body?).context("Invalid provider snapshot")?;
        value["connectionStatus"] = json!("disconnected"); result.push(value);
    }
    Ok(result)
}

/// Confirm the lifetime of the exact process that invoked an Antigravity hook.
/// Missing permissions or missing identity never authorize session removal.
pub fn reconcile_processes(path: &Path) -> Result<Vec<Value>> {
    reconcile_with_presence(path,crate::agent_process::any_antigravity_running)
}

fn reconcile_with_presence(path:&Path, observe_legacy:impl FnOnce()->Option<bool>) -> Result<Vec<Value>> {
    let candidates=read_reports(path,"SELECT body FROM provider_sessions WHERE json_extract(body,'$.agentId')='antigravity' AND json_extract(body,'$.eventKind') NOT IN ('session_end','purged')")?;
    let any_agy=if candidates.iter().any(|r|r["agentProcess"].is_null()) {observe_legacy()} else {None};
    let mut checked=std::collections::HashMap::new();let mut result=vec![];
    for candidate in candidates {
        let identity=serde_json::from_value::<crate::agent_process::Identity>(candidate["agentProcess"].clone()).ok();
        let presence=if let Some(identity)=identity {
            *checked.entry(identity.clone()).or_insert_with(||crate::agent_process::probe(&identity))
        } else if candidate["agentProcess"].is_null() && any_agy==Some(false) {
            // Legacy records were created by this local Windows hook observer.
            // No such CLI can own them when a complete native census finds zero AGY processes.
            crate::agent_process::Presence::Exited
        } else {crate::agent_process::Presence::Unknown};
        if presence!=crate::agent_process::Presence::Exited {continue;}
        let mut db=crate::state::open(path)?;let tx=db.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let body:Option<String>=tx.query_row("SELECT body FROM provider_sessions WHERE id=?",[candidate["sessionId"].as_str().unwrap()],|r|r.get(0)).optional()?;
        let Some(body)=body else {continue;};let mut latest:Value=serde_json::from_str(&body)?;
        if latest["agentProcess"]!=candidate["agentProcess"] || latest["sourceRevision"]!=candidate["sourceRevision"] || latest["eventKind"]=="session_end" {continue;}
        latest["sourceRevision"]=json!(latest["sourceRevision"].as_u64().context("Missing provider revision")?+1);
        latest["eventId"]=json!(uuid::Uuid::new_v4().to_string());latest["eventKind"]=json!("session_end");
        latest["connectionStatus"]=json!("disconnected");latest["activity"]=json!("Antigravity CLI exited");
        latest["observedAt"]=json!(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_millis() as u64);
        tx.execute("UPDATE provider_sessions SET body=? WHERE id=?",params![serde_json::to_string(&latest)?,latest["sessionId"].as_str().unwrap()])?;
        tx.commit()?;result.push(latest);
    }
    Ok(result)
}

pub fn purge_cached(path: &Path, targets: &[(String,u64)]) -> Result<usize> {
    if !path.is_file() { return Ok(0); }
    let mut db=crate::state::open(path)?;
    let exists: bool=db.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='provider_sessions')",[],|r|r.get(0))?;
    if !exists { return Ok(0); }
    let tx=db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let has_links: bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name='orca_terminal_links')",[],|r|r.get(0))?;
    let mut skipped=0;
    for (sid,barrier) in targets {
        let body: Option<String>=tx.query_row("SELECT body FROM provider_sessions WHERE id=?",[sid],|r|r.get(0)).optional()?;
        let Some(body)=body else {continue;}; let cached:Value=serde_json::from_str(&body)?;
        let revision=cached["sourceRevision"].as_u64().unwrap_or(0);
        if revision > *barrier { skipped+=1; continue; }
        let cleared=json!({"sessionId":sid,"agentId":cached["agentId"],"sourceRevision":revision,"eventId":uuid::Uuid::new_v4().to_string(),"status":"idle","connectionStatus":"disconnected","eventKind":"purged"});
        tx.execute("UPDATE provider_sessions SET body=? WHERE id=?",params![serde_json::to_string(&cleared)?,sid])?;
        if has_links { tx.execute("DELETE FROM orca_terminal_links WHERE session_id=?",[sid])?; }
    }
    tx.commit()?; Ok(skipped)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn opencode_view_events_and_idle_compatibility_events_preserve_authoritative_task_state() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        let event=|id,kind|json!({"id":id,"type":kind,"data":{"sessionID":"session-state"}});
        assert_eq!(record(&path,"opencode",&event("start","session.execution.started"),None).unwrap().unwrap()["status"],"running");
        assert_eq!(record(&path,"opencode",&event("view","session.viewed"),None).unwrap().unwrap()["status"],"running");
        assert_eq!(record(&path,"opencode",&event("end","session.execution.succeeded"),None).unwrap().unwrap()["status"],"completed");
        assert_eq!(record(&path,"opencode",&event("idle","session.idle"),None).unwrap().unwrap()["status"],"completed");
        assert_eq!(record(&path,"opencode",&event("again","session.execution.started"),None).unwrap().unwrap()["status"],"running");
    }
    #[test]
    fn legacy_sessions_require_a_complete_zero_process_census_not_age_or_lost_connectivity() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        record(&path,"antigravity",&json!({"conversationId":"legacy"}),Some("Stop")).unwrap();
        let db=crate::state::open(&path).unwrap();
        db.execute("UPDATE provider_sessions SET body=json_set(body,'$.agentProcess',NULL,'$.observedAt',1)",[]).unwrap();drop(db);
        assert!(reconcile_with_presence(&path,||None).unwrap().is_empty());
        assert!(reconcile_with_presence(&path,||Some(true)).unwrap().is_empty());
        let ended=reconcile_with_presence(&path,||Some(false)).unwrap();
        assert_eq!(ended.len(),1);assert_eq!(ended[0]["eventKind"],"session_end");
        assert!(reconcile_with_presence(&path,||Some(false)).unwrap().is_empty());
    }
    #[test]
    fn providers_keep_identity_order_deduplication_and_recovery_separate_from_actions() {
        let dir=tempfile::tempdir().unwrap(); let path=dir.path().join("cache.sqlite3");
        let busy=json!({"id":"one","type":"session.status","data":{"sessionID":"session-one","status":{"type":"busy"}}});
        let first=record(&path,"opencode",&busy,None).unwrap().unwrap();
        assert_eq!(first["sessionId"],"opencode:session-one");assert_eq!(first["status"],"running");assert_eq!(first["capabilities"]["canAnswer"],false);
        assert_eq!(record(&path,"opencode",&busy,None).unwrap().unwrap()["sourceRevision"],1);
        let idle=json!({"id":"two","type":"session.idle","data":{"sessionID":"session-one"}});
        assert_eq!(record(&path,"opencode",&idle,None).unwrap().unwrap()["status"],"idle");
        assert_eq!(snapshots(&path).unwrap()[0]["connectionStatus"],"disconnected");
        purge_cached(&path,&[("opencode:session-one".into(),2)]).unwrap();
        assert_eq!(record(&path,"opencode",&busy,None).unwrap().unwrap()["eventKind"],"purged");
        let agy=json!({"conversationId":"conversation-one","lastUserInput":"Review this code","workspacePaths":["C:/work"],"modelName":"observed-model"});
        let report=record(&path,"antigravity",&agy,Some("PreInvocation")).unwrap().unwrap();
        assert_eq!(report["agentId"],"antigravity");assert_eq!(report["status"],"running");
        assert!(record(&path,"antigravity",&agy,Some("UnknownHook")).unwrap().is_none());
        assert_eq!(record(&path,"antigravity",&agy,Some("Stop")).unwrap().unwrap()["status"],"completed");
    }
    #[test]
    fn forms_preserve_visible_questions_and_choices_without_enabling_answers() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        let form=json!({"id":"created","type":"form.created","data":{"form":{"id":"frm_question","sessionID":"test","title":"Questions","fields":[
            {"key":"token","type":"string","title":"Private field","hidden":true,"default":"private default"},
            {"key":"q0","type":"string","title":"Which database?","description":"Choose local storage.","options":[{"value":"sqlite","label":"SQLite","description":"Local database"},{"value":"postgres","label":"PostgreSQL"}]}
        ]}}});
        let question=record(&path,"opencode",&form,None).unwrap().unwrap();
        assert_eq!(question["eventKind"],"request");assert_eq!(question["status"],"waiting_input");
        assert_eq!(question["question"],"Which database?\nChoose local storage.");
        assert_eq!(question["options"][0]["label"],"SQLite");assert_eq!(question["options"][0]["description"],"Local database");
        assert_eq!(question["options"].as_array().unwrap().len(),2);assert_eq!(question["capabilities"]["canAnswer"],false);
        assert!(!question.to_string().contains("private default"));assert!(!question.to_string().contains("Private field"));
        let progress=json!({"id":"progress","type":"session.status","data":{"sessionID":"test","status":{"type":"busy"}}});
        assert_eq!(record(&path,"opencode",&progress,None).unwrap().unwrap()["options"],question["options"]);
        let cancel=json!({"id":"cancel","type":"form.cancelled","data":{"sessionID":"test","id":"frm_question"}});
        let closed=record(&path,"opencode",&cancel,None).unwrap().unwrap();assert!(closed["options"].as_array().unwrap().is_empty());assert!(closed["requestId"].is_null());
    }
    #[test]
    fn multiple_form_fields_keep_question_context_and_choice_descriptions() {
        let (question,options)=form_context(&json!({"title":"Questions","fields":[
            {"type":"string","title":"Storage?","options":[{"label":"SQLite","value":"sqlite","description":"Local"}]},
            {"type":"multiselect","title":"Platforms?","options":[{"label":"Windows","value":"windows"}]}
        ]}));
        assert!(question.contains("Storage?\n- SQLite: Local"));assert!(question.contains("Platforms?\nMultiple choices allowed."));assert!(question.contains("- Windows"));
        assert!(options.as_array().unwrap().is_empty());
    }
    #[test]
    fn parallel_requests_survive_progress_and_only_matching_resolution_withdraws_them() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        let event=|id:&str,kind:&str,data:Value|json!({"id":id,"type":kind,"data":data});
        let permission=event("one","permission.asked",json!({"sessionID":"test","id":"approval","action":"shell","message":"Run tests?","resources":[]}));
        assert_eq!(record(&path,"opencode",&permission,None).unwrap().unwrap()["status"],"waiting_approval");
        let form=event("two","form.created",json!({"form":{"sessionID":"test","id":"question","title":"Choose a database","fields":[]}}));
        assert_eq!(record(&path,"opencode",&form,None).unwrap().unwrap()["requestId"],"permission:approval");
        let progress=event("three","session.status",json!({"sessionID":"test","status":{"type":"busy"}}));
        assert_eq!(record(&path,"opencode",&progress,None).unwrap().unwrap()["status"],"waiting_approval");
        let reply=event("four","permission.replied",json!({"sessionID":"test","requestID":"approval","reply":"once"}));
        let question=record(&path,"opencode",&reply,None).unwrap().unwrap();
        assert_eq!(question["status"],"waiting_input");assert_eq!(question["question"],"Choose a database");
        let cancel=event("five","form.cancelled",json!({"sessionID":"test","id":"question"}));
        let closed=record(&path,"opencode",&cancel,None).unwrap().unwrap();
        assert_eq!(closed["status"],"idle");assert_eq!(closed["requestId"],Value::Null);
    }
}
