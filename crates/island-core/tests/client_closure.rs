use island_core::Store;
use serde_json::json;
#[test]
fn upgrade_archives_previously_confirmed_ends_without_inferring_disconnected_closure() {
    let dir=tempfile::tempdir().unwrap();let path=dir.path().join("sessions.sqlite3");
    let store=Store::open(&path).unwrap();
    for (id,kind) in [("ended","session_end"),("unknown","completion")] {
        store.update(&json!({"agentId":"codex","sessionId":id,"eventId":id,"sourceRevision":1,"status":"completed","result":"Saved output","connectionStatus":"disconnected","eventKind":kind})).unwrap();
    }
    drop(store);
    let db=rusqlite::Connection::open(&path).unwrap();
    let body:String=db.query_row("SELECT body FROM sessions WHERE id='codex:ended'",[],|r|r.get(0)).unwrap();
    let mut body:serde_json::Value=serde_json::from_str(&body).unwrap();body["archived"]=json!(false);
    db.execute("UPDATE sessions SET body=? WHERE id='codex:ended'",[serde_json::to_string(&body).unwrap()]).unwrap();
    db.execute("DELETE FROM preferences WHERE key='immediate_closure_v084'",[]).unwrap();drop(db);
    let store=Store::open(&path).unwrap();let rows=store.snapshot()["sessions"].as_array().unwrap().clone();
    assert_eq!(rows.iter().find(|s|s["sessionId"]=="codex:ended").unwrap()["archived"],true);
    assert_eq!(rows.iter().find(|s|s["sessionId"]=="codex:ended").unwrap()["result"],"Saved output");
    assert_ne!(rows.iter().find(|s|s["sessionId"]=="codex:unknown").unwrap()["archived"],true);
    store.archive("codex:ended",false).unwrap();drop(store);
    let store=Store::open(&path).unwrap();assert_eq!(store.snapshot()["sessions"].as_array().unwrap().iter().find(|s|s["sessionId"]=="codex:ended").unwrap()["archived"],false);
}
#[test]
fn closure_is_immediate_for_every_provider_and_preserves_pending_decisions() {
    for provider in ["codex","antigravity","opencode"] {
        let store=Store::open(":memory:").unwrap();store.retention(Some(false)).unwrap();
        let sid=format!("{provider}:pending");
        store.update(&json!({"agentId":provider,"sessionId":sid,"eventId":"request","sourceRevision":1,"status":"waiting_approval","requestId":"permission","question":"Review in terminal","connectionStatus":"connected"})).unwrap();
        store.observe_terminal(&sid,1,"checking").unwrap();let current=store.snapshot()["sessions"][0].clone();
        assert_ne!(current["archived"],true);
        store.observe_terminal(&sid,current["revision"].as_u64().unwrap(),"closed").unwrap();
        let current=store.snapshot()["sessions"][0].clone();assert_eq!(current["archived"],true);assert_eq!(current["requestId"],"permission");assert_eq!(current["status"],"waiting_approval");
        assert!(store.delete_archived(&[(sid,current["revision"].as_u64().unwrap())]).is_err());
    }
}
#[test]
fn persistent_server_events_cannot_reopen_closed_cli_context_but_a_live_client_can() {
    let store=Store::open(":memory:").unwrap();
    let mut value=json!({"agentId":"opencode","sessionId":"server-session","eventId":"one","sourceRevision":1,"status":"completed","result":"Retained output","connectionStatus":"connected","eventKind":"completion"});
    store.update(&value).unwrap();store.observe_terminal("opencode:server-session",1,"closed").unwrap();
    value["eventId"]=json!("background");value["sourceRevision"]=json!(2);value["status"]=json!("running");value["eventKind"]=json!("prompt");
    store.update(&value).unwrap();let current=store.snapshot()["sessions"][0].clone();assert_eq!(current["archived"],true);assert_eq!(current["terminalStatus"],"closed");
    store.observe_terminal("opencode:server-session",current["revision"].as_u64().unwrap(),"open").unwrap();
    let current=store.snapshot()["sessions"][0].clone();assert_eq!(current["archived"],false);assert_eq!(current["status"],"running");assert_eq!(current["result"],"Retained output");
}
