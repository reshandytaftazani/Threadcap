use island_core::Store;
use serde_json::{json, Value};
fn event(rev: u64, status: &str, kind: &str) -> Value {
    json!({"agentId":"codex","sessionId":"retention","sourceRevision":rev,"eventId":format!("event-{rev}"),"status":status,"eventKind":kind})
}
#[test]
fn archive_survives_restart_recovery_and_stale_reports_but_fresh_prompt_restores() {
    let dir = tempfile::tempdir().unwrap(); let path = dir.path().join("sessions.sqlite3");
    let store = Store::open(&path).unwrap();
    store.update(&event(1,"completed","completion")).unwrap();
    store.archive("codex:retention",true).unwrap();
    assert_eq!(store.update(&event(1,"completed","completion")).unwrap()["accepted"],false);
    drop(store);
    let store = Store::open(&path).unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    store.recover(&event(2,"running","prompt")).unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    store.update(&event(3,"running","prompt")).unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],false);
    assert!(store.archive("codex:retention",true).is_err());
    let mut request=event(4,"waiting_input","request");request["requestId"]=json!("question-1");
    store.update(&request).unwrap();
    assert!(store.archive("codex:retention",true).is_err());
}
#[test]
fn confirmed_end_archives_immediately_without_changing_saved_delay_preferences() {
    let store=Store::open(":memory:").unwrap();
    let mut end=event(1,"completed","session_end");end["connectionStatus"]=json!("disconnected");
    store.retention(Some(false)).unwrap();store.archive_delay(Some(15)).unwrap();
    store.update(&end).unwrap();assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    let revision=store.snapshot()["sessions"][0]["revision"].as_u64().unwrap();
    assert!(!store.retention(None).unwrap());assert_eq!(store.archive_delay(None).unwrap(),15);
    assert_eq!(store.sweep_archives(u64::MAX).unwrap(),0);
    store.observe_terminal("codex:retention",revision,"closed").unwrap();
    let ended=store.snapshot()["sessions"][0]["terminalClosedAt"].as_u64().unwrap();
    assert_eq!(store.sweep_archives(ended+1000).unwrap(),0);
    assert_eq!(store.sweep_archives(ended+299_999).unwrap(),0);
    assert_eq!(store.sweep_archives(ended+300_001).unwrap(),0);
    store.archive("codex:retention",false).unwrap();
    assert_eq!(store.sweep_archives(ended+86_400_002).unwrap(),0);
    let revision=store.snapshot()["sessions"][0]["revision"].as_u64().unwrap();
    store.observe_terminal("codex:retention",revision,"open").unwrap();
    assert_eq!(store.sweep_archives(ended+172_800_000).unwrap(),0);
}

#[test]
fn closed_requests_can_archive_but_cannot_be_automatically_resolved_or_deleted() {
    let store=Store::open(":memory:").unwrap();
    let mut request=event(1,"waiting_approval","request"); request["requestId"]=json!("request-one");
    store.update(&request).unwrap();
    assert!(!store.observe_terminal("codex:retention",999,"closed").unwrap());
    store.observe_terminal("codex:retention",1,"closed").unwrap();
    let closed=store.snapshot()["sessions"][0]["terminalClosedAt"].as_u64().unwrap();
    assert_eq!(store.sweep_archives(closed+300_000).unwrap(),0);
    let archived=store.snapshot()["sessions"][0].clone();
    assert_eq!(archived["requestId"],"request-one"); assert_eq!(archived["status"],"waiting_approval");
    assert!(store.delete_archived(&[("codex:retention".into(),archived["revision"].as_u64().unwrap())]).is_err());
    request["sourceRevision"]=json!(2); request["eventId"]=json!("old-request-progress");request["eventKind"]=json!("activity");
    store.update(&request).unwrap();assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    let revision=store.snapshot()["sessions"][0]["revision"].as_u64().unwrap();
    store.observe_terminal("codex:retention",revision,"open").unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],false);
    assert_eq!(store.snapshot()["sessions"].as_array().unwrap().len(),1);
}

#[test]
fn restart_rechecks_presence_and_preserves_preferences_and_manual_archival() {
    let dir=tempfile::tempdir().unwrap(); let path=dir.path().join("state.sqlite3");
    let store=Store::open(&path).unwrap(); store.retention(Some(false)).unwrap(); store.archive_delay(Some(15)).unwrap();
    store.update(&event(1,"completed","completion")).unwrap(); store.archive("codex:retention",true).unwrap();
    let revision=store.snapshot()["sessions"][0]["revision"].as_u64().unwrap();
    store.observe_terminal("codex:retention",revision,"open").unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],true);
    drop(store); let store=Store::open(path).unwrap();
    assert!(!store.retention(None).unwrap()); assert_eq!(store.archive_delay(None).unwrap(),15);
    assert_eq!(store.snapshot()["sessions"][0]["terminalStatus"],"checking");
    assert_eq!(store.sweep_archives(u64::MAX).unwrap(),0);
}

#[test]
fn downtime_resume_stays_archived_until_fresh_terminal_ownership_is_verified() {
    let store=Store::open(":memory:").unwrap();store.update(&event(1,"completed","completion")).unwrap();
    store.archive("codex:retention",true).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(2));
    let mut resumed=event(2,"running","prompt");resumed["connectionStatus"]=json!("disconnected");
    resumed["observedAt"]=json!(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64);
    store.recover(&resumed).unwrap();let retained=store.snapshot()["sessions"][0].clone();
    assert_eq!(retained["archived"],true);
    store.observe_terminal("codex:retention",retained["revision"].as_u64().unwrap(),"open").unwrap();
    assert_eq!(store.snapshot()["sessions"][0]["archived"],false);
}

#[test]
fn confirmed_process_end_is_distinct_from_lost_connection_and_unanswered_request() {
    let store=Store::open(":memory:").unwrap();
    let mut disconnected=event(1,"running","activity"); disconnected["connectionStatus"]=json!("disconnected");
    store.update(&disconnected).unwrap(); assert!(store.archive("codex:retention",true).is_err());
    let mut end=event(2,"running","session_end"); end["connectionStatus"]=json!("disconnected");
    store.update(&end).unwrap(); assert!(store.archive("codex:retention",true).is_ok());
    let mut request=event(3,"waiting_input","request"); request["requestId"]=json!("new-question");
    store.update(&request).unwrap();assert_eq!(store.snapshot()["sessions"][0]["archived"],false);
    request["sourceRevision"]=json!(4);request["eventId"]=json!("ended-with-request");request["eventKind"]=json!("session_end");request["connectionStatus"]=json!("disconnected");
    store.update(&request).unwrap();assert!(store.archive("codex:retention",true).is_err());
}

#[test]
fn deletion_is_revision_bound_and_old_cache_cannot_resurrect_it_after_restart() {
    let directory=tempfile::tempdir().unwrap();let path=directory.path().join("state.sqlite3");
    let store=Store::open(&path).unwrap();
    store.update(&event(1,"completed","completion")).unwrap();
    let archived=store.archive("codex:retention",true).unwrap();let revision=archived["revision"].as_u64().unwrap();
    assert!(store.delete_archived(&[("codex:retention".into(),revision-1)]).is_err());
    let mut subscription=store.subscribe();
    assert_eq!(store.delete_archived(&[("codex:retention".into(),revision)]).unwrap().len(),1);
    assert_eq!(subscription.events.try_recv().unwrap()["type"],"sessions_removed");
    assert!(store.snapshot()["sessions"].as_array().unwrap().is_empty());drop(store);
    let store=Store::open(&path).unwrap();
    assert_eq!(store.recover(&event(5,"running","prompt")).unwrap()["accepted"],false);
    assert_eq!(store.update(&event(2,"idle","activity")).unwrap()["accepted"],false);
    let mut stale=event(3,"running","prompt");stale["observedAt"]=json!(1);
    assert_eq!(store.update(&stale).unwrap()["accepted"],false);
    let restored=store.update(&event(6,"running","prompt")).unwrap();
    assert_eq!(restored["accepted"],true);assert!(restored["session"]["revision"].as_u64().unwrap()>revision);
}

#[test]
fn bulk_deletion_is_atomic_and_does_not_include_new_archives() {
    let store=Store::open(":memory:").unwrap();
    store.update(&event(1,"completed","completion")).unwrap();
    let archived=store.archive("codex:retention",true).unwrap();
    let revision=archived["revision"].as_u64().unwrap();
    assert!(store.delete_archived(&[("codex:retention".into(),revision),("codex:missing".into(),1)]).is_err());
    assert_eq!(store.snapshot()["sessions"].as_array().unwrap().len(),1);
    assert!(store.delete_archived(&[("codex:retention".into(),revision),("codex:retention".into(),revision)]).is_err());
    store.archive("codex:retention",false).unwrap();
    assert!(store.delete_archived(&[("codex:retention".into(),revision)]).is_err());
}
