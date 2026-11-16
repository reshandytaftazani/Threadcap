use island_core::Store;
use serde_json::{json,Value};
fn event(revision:u64,kind:&str,connection:&str)->Value {
    json!({"sessionId":"antigravity:conversation","agentId":"antigravity","status":"completed","result":"Retained output","sourceRevision":revision,"eventId":format!("event-{revision}"),"eventKind":kind,"connectionStatus":connection})
}
#[test]
fn only_confirmed_exit_removes_antigravity_from_the_main_list_without_retention_delay() {
    let store=Store::open(":memory:").unwrap();store.retention(Some(false)).unwrap();
    store.update(&event(1,"completion","connected")).unwrap();
    assert_ne!(store.snapshot()["sessions"][0]["archived"],true);
    store.update(&event(2,"activity","disconnected")).unwrap();
    assert_ne!(store.snapshot()["sessions"][0]["archived"],true);
    store.update(&event(3,"session_end","disconnected")).unwrap();
    let closed=store.snapshot()["sessions"][0].clone();
    assert_eq!(closed["archived"],true);assert_eq!(closed["result"],"Retained output");
    store.observe_terminal("antigravity:conversation",closed["revision"].as_u64().unwrap(),"open").unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    let mut resumed=event(4,"prompt","connected");resumed["status"]=json!("idle");store.update(&resumed).unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],false);
    assert_eq!(store.snapshot()["sessions"].as_array().unwrap().len(),1);
}
#[test]
fn native_pane_closure_hides_antigravity_immediately_and_keeps_request_context() {
    let store=Store::open(":memory:").unwrap();store.retention(Some(false)).unwrap();
    let mut request=event(1,"request","connected");request["status"]=json!("waiting_input");request["requestId"]=json!("question");
    store.update(&request).unwrap();store.observe_terminal("antigravity:conversation",1,"checking").unwrap();
    assert_ne!(store.snapshot()["sessions"][0]["archived"],true);
    let revision=store.snapshot()["sessions"][0]["revision"].as_u64().unwrap();
    store.observe_terminal("antigravity:conversation",revision,"closed").unwrap();
    let closed=store.snapshot()["sessions"][0].clone();assert_eq!(closed["archived"],true);assert_eq!(closed["requestId"],"question");
    assert!(store.delete_archived(&[("antigravity:conversation".into(),closed["revision"].as_u64().unwrap())]).is_err());
}
#[test]
fn downtime_exit_recovery_and_codex_confirmed_exit_are_archived_immediately() {
    let store=Store::open(":memory:").unwrap();store.recover(&event(1,"session_end","disconnected")).unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    let mut codex=event(1,"session_end","disconnected");codex["agentId"]=json!("codex");codex["sessionId"]=json!("codex:conversation");
    store.update(&codex).unwrap();assert_eq!(store.snapshot()["sessions"][1]["archived"],true);
}
