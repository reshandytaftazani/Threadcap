use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use island_core::{http, Store};
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt;

fn event(revision: u64) -> Value {
    json!({"agentId":"codex","sessionId":"terminal-1","status":"running","eventId":format!("event-{revision}"),"sourceRevision":revision})
}

#[test]
fn stable_provider_identity_and_no_fabricated_metadata() {
    let store = Store::open(":memory:").unwrap();
    let first = store.update(&event(1)).unwrap();
    assert_eq!(first["session"]["sessionId"], "codex:terminal-1");
    let mut next = event(2);
    next["sessionId"] = json!("codex:terminal-1");
    assert_eq!(
        store.update(&next).unwrap()["session"]["sessionId"],
        first["session"]["sessionId"]
    );
    next["agentId"] = json!("opencode");
    next["sessionId"] = json!("terminal-1");
    store.update(&next).unwrap();
    assert_eq!(store.snapshot()["sessions"].as_array().unwrap().len(), 2);
    assert!(first["session"].get("modelName").is_none());
    assert!(first["session"].get("elapsed").is_none());
}

#[test]
fn duplicates_stale_revisions_and_reused_ids_do_not_mutate_state() {
    let store = Store::open(":memory:").unwrap();
    store.update(&event(5)).unwrap();
    assert_eq!(store.update(&event(5)).unwrap()["reason"], "duplicate");
    assert_eq!(store.update(&event(3)).unwrap()["reason"], "stale");
    let mut reused = event(6);
    reused["eventId"] = json!("event-5");
    assert!(store.update(&reused).is_err());
    assert_eq!(store.snapshot()["sequence"], 1);
}

#[test]
fn malformed_inputs_and_unverified_capabilities_are_rejected_or_stripped() {
    let store = Store::open(":memory:").unwrap();
    for (field, value) in [
        ("sessionId", json!("")),
        ("agentId", json!("claude")),
        ("status", json!("disconnected")),
        ("status", json!([])),
        ("sourceRevision", json!(true)),
        ("sourceRevision", json!(-1)),
        ("sourceRevision", json!(9_007_199_254_740_992_u64)),
        ("eventId", json!("")),
        ("options", json!([42])),
    ] {
        let mut raw = event(1);
        raw[field] = value;
        assert!(store.update(&raw).is_err(), "{field}");
    }
    let mut raw = event(1);
    raw["capabilities"] = json!({"canApprove":true,"canAnswer":true,"canJump":true});
    raw["supportsAcknowledgment"] = json!(true);
    let result = store.update(&raw).unwrap();
    assert_eq!(
        result["session"]["capabilities"],
        json!({"canApprove":false,"canAnswer":false,"canJump":false})
    );
    assert_eq!(result["session"]["supportsAcknowledgment"], false);
}

#[test]
fn request_context_survives_progress_but_not_replacement_or_withdrawal() {
    let store = Store::open(":memory:").unwrap();
    let mut first = event(1);
    first["status"] = json!("waiting_input");
    first["requestId"] = json!("r1");
    first["question"] = json!("Choose?");
    first["options"] = json!(["A"]);
    store.update(&first).unwrap();
    let mut progress = event(2);
    progress["status"] = json!("waiting_input");
    let result = store.update(&progress).unwrap();
    assert_eq!(result["session"]["requestId"], "r1");
    assert_eq!(result["session"]["options"], json!(["A"]));
    let mut replacement = event(3);
    replacement["status"] = json!("waiting_input");
    replacement["requestId"] = json!("r2");
    assert!(store.update(&replacement).unwrap()["session"]
        .get("options")
        .is_none());
    let result = store.update(&event(4)).unwrap();
    assert!(result["session"]["requestId"].is_null());
    assert_eq!(result["session"]["options"], json!([]));
}

#[test]
fn lifecycle_and_connection_are_independent() {
    let store = Store::open(":memory:").unwrap();
    let mut raw = event(1);
    raw["status"] = json!("failed");
    raw["connectionStatus"] = json!("disconnected");
    raw["error"] = json!("Exit 1");
    let result = store.update(&raw).unwrap();
    assert_eq!(result["session"]["status"], "failed");
    assert_eq!(result["session"]["connectionStatus"], "disconnected");
    assert!(store.update(&event(2)).unwrap()["session"]
        .get("error")
        .is_none());
}

#[test]
fn durable_restart_preserves_context_revision_and_dedupe() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("sessions.sqlite3");
    let store = Store::open(&path).unwrap();
    let mut raw = event(1);
    raw["taskTitle"] = json!("Preserve me");
    store.update(&raw).unwrap();
    let old_id = store.snapshot()["bridgeId"].clone();
    drop(store);
    let store = Store::open(&path).unwrap();
    let snapshot = store.snapshot();
    assert_ne!(snapshot["bridgeId"], old_id);
    assert_eq!(snapshot["sessions"][0]["taskTitle"], "Preserve me");
    assert_eq!(snapshot["sessions"][0]["connectionStatus"], "disconnected");
    assert_eq!(store.update(&raw).unwrap()["reason"], "duplicate");
    let resumed = store.update(&event(2)).unwrap();
    assert_eq!(resumed["session"]["revision"], 2);
    assert_eq!(resumed["session"]["connectionStatus"], "connected");
}

#[test]
fn opens_existing_python_schema_and_revisions() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("python.sqlite3");
    let db = rusqlite::Connection::open(&path).unwrap();
    db.execute_batch("CREATE TABLE sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL, source_revision INTEGER NOT NULL); CREATE TABLE events (session_id TEXT,event_id TEXT,source_revision INTEGER,PRIMARY KEY(session_id,event_id));").unwrap();
    let body = json!({"sessionId":"codex:terminal-1","agentId":"codex","status":"running","connectionStatus":"connected","revision":9,"taskTitle":"Python context"});
    db.execute(
        "INSERT INTO sessions VALUES (?1,?2,?3)",
        rusqlite::params!["codex:terminal-1", body.to_string(), 19],
    )
    .unwrap();
    drop(db);
    let store = Store::open(&path).unwrap();
    assert_eq!(store.update(&event(18)).unwrap()["reason"], "stale");
    let result = store.update(&event(20)).unwrap();
    assert_eq!(result["session"]["revision"], 10);
    assert_eq!(result["session"]["taskTitle"], "Python context");
}

#[tokio::test]
async fn snapshot_to_stream_handoff_has_no_gap_and_duplicates_do_not_publish() {
    let store = Store::open(":memory:").unwrap();
    store.update(&event(1)).unwrap();
    let mut subscription = store.subscribe();
    store.update(&event(2)).unwrap();
    let update = subscription.events.recv().await.unwrap();
    assert_eq!(
        update["sequence"].as_u64().unwrap(),
        subscription.snapshot["sequence"].as_u64().unwrap() + 1
    );
    assert_eq!(subscription.snapshot["sessions"][0]["revision"], 1);
    store.update(&event(2)).unwrap();
    assert!(matches!(
        subscription.events.try_recv(),
        Err(tokio::sync::broadcast::error::TryRecvError::Empty)
    ));
}

#[tokio::test]
async fn slow_subscriber_reports_lag_instead_of_silently_losing_requests() {
    let store = Store::open(":memory:").unwrap();
    let mut subscription = store.subscribe();
    for revision in 1..=300 {
        store.update(&event(revision)).unwrap();
    }
    assert!(matches!(
        subscription.events.recv().await,
        Err(tokio::sync::broadcast::error::RecvError::Lagged(_))
    ));
    assert_eq!(store.subscribe().snapshot["sessions"][0]["revision"], 300);
}

#[test]
fn concurrent_reports_converge_to_highest_source_revision() {
    let store = Arc::new(Store::open(":memory:").unwrap());
    let workers: Vec<_> = (1..=20)
        .rev()
        .map(|revision| {
            let store = store.clone();
            std::thread::spawn(move || store.update(&event(revision)).unwrap())
        })
        .collect();
    for worker in workers {
        worker.join().unwrap();
    }
    assert_eq!(store.update(&event(20)).unwrap()["accepted"], false);
    assert_eq!(store.update(&event(19)).unwrap()["accepted"], false);
}

#[tokio::test]
async fn http_routes_ingest_retry_snapshot_and_reject_actions() {
    let store = Arc::new(Store::open(":memory:").unwrap());
    let app = http::router(store.clone());
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/sessions")
                .header("content-type", "application/json")
                .body(Body::from(event(1).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let response = app
        .clone()
        .oneshot(
            Request::post("/api/action")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"action":"allow","sessionId":"codex:terminal-1","requestId":"r1"})
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_IMPLEMENTED);
    let body: Value =
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(body["acknowledged"], false);
    assert_eq!(store.snapshot()["sequence"], 1);
    let response = app
        .oneshot(Request::get("/api/sessions").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let body: Value =
        serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(body["type"], "sync");
}

#[tokio::test]
async fn http_rejects_cross_origin_invalid_json_and_oversized_reports() {
    let app = http::router(Arc::new(Store::open(":memory:").unwrap()));
    for (body, origin, expected) in [
        (
            event(1).to_string(),
            Some("https://example.com"),
            StatusCode::FORBIDDEN,
        ),
        ("{".into(), None, StatusCode::BAD_REQUEST),
        ("x".repeat(262_145), None, StatusCode::PAYLOAD_TOO_LARGE),
    ] {
        let mut request = Request::post("/api/sessions")
            .header("content-type", "application/json")
            .header("host", "127.0.0.1:37891");
        if let Some(origin) = origin {
            request = request.header("origin", origin);
        }
        assert_eq!(
            app.clone()
                .oneshot(request.body(Body::from(body)).unwrap())
                .await
                .unwrap()
                .status(),
            expected
        );
    }
}
