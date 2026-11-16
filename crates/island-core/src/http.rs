use crate::{Error, Store};
use axum::{
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode},
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use futures_core::Stream;
use serde_json::{json, Value};
use std::{convert::Infallible, sync::Arc, time::Duration};

pub fn router(store: Arc<Store>) -> Router {
    Router::new()
        .route("/api/status", get(status))
        .route("/api/sessions", get(snapshot).post(update))
        .route("/api/notify", post(update))
        .route("/notify", post(update))
        .route("/api/events", get(events))
        .route("/api/action", post(action))
        .layer(DefaultBodyLimit::max(262_144))
        .with_state(store)
}

async fn status(State(store): State<Arc<Store>>) -> Json<Value> {
    Json(
        json!({"status":"ok","version":"0.4.0","protocolVersion":1,"bridgeId":store.snapshot()["bridgeId"],"interactiveDelivery":false,"runtime":"rust"}),
    )
}

async fn snapshot(State(store): State<Arc<Store>>) -> Json<Value> {
    Json(store.snapshot())
}

fn origin_allowed(headers: &HeaderMap) -> bool {
    match headers.get("origin").and_then(|s| s.to_str().ok()) {
        None => true,
        Some(origin) => headers
            .get("host")
            .and_then(|s| s.to_str().ok())
            .is_some_and(|host| origin == format!("http://{host}")),
    }
}

type Reply = (StatusCode, Json<Value>);

fn parse(
    headers: &HeaderMap,
    body: Result<Json<Value>, axum::extract::rejection::JsonRejection>,
) -> Result<Value, Reply> {
    if !origin_allowed(headers) {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({"error":"Cross-origin writes are not allowed"})),
        ));
    }
    body.map(|Json(value)| value).map_err(|error| {
        let code = match error.status() {
            StatusCode::UNSUPPORTED_MEDIA_TYPE => StatusCode::UNSUPPORTED_MEDIA_TYPE,
            StatusCode::PAYLOAD_TOO_LARGE => StatusCode::PAYLOAD_TOO_LARGE,
            _ => StatusCode::BAD_REQUEST,
        };
        (code, Json(json!({"error":error.body_text()})))
    })
}

async fn update(
    State(store): State<Arc<Store>>,
    headers: HeaderMap,
    body: Result<Json<Value>, axum::extract::rejection::JsonRejection>,
) -> Reply {
    let raw = match parse(&headers, body) {
        Ok(raw) => raw,
        Err(reply) => return reply,
    };
    match store.update(&raw) {
        Ok(result) => (StatusCode::OK, Json(result)),
        Err(error) => {
            let status = if matches!(error, Error::Invalid(_)) {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({"error":error.to_string()})))
        }
    }
}

async fn action(
    headers: HeaderMap,
    body: Result<Json<Value>, axum::extract::rejection::JsonRejection>,
) -> Reply {
    match parse(&headers, body) {
        Err(reply) => reply,
        Ok(raw) => (
            StatusCode::NOT_IMPLEMENTED,
            Json(
                json!({"acknowledged":false,"error":"No interactive adapter is registered","sessionId":raw["sessionId"],"requestId":raw["requestId"]}),
            ),
        ),
    }
}

async fn events(
    State(store): State<Arc<Store>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut subscription = store.subscribe();
    let stream = async_stream::stream! {
        let snapshot = subscription.snapshot;
        yield Ok(Event::default().id(snapshot["eventId"].as_str().unwrap()).data(snapshot.to_string()));
        // Lag closes the stream, forcing a complete snapshot instead of dropping requests.
        while let Ok(event) = subscription.events.recv().await {
            yield Ok(Event::default().id(event["eventId"].as_str().unwrap()).data(event.to_string()));
        }
    };
    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("heartbeat"),
    )
}
