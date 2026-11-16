# Session bridge protocol

Version 0.7.1 adds an ordered `sessions_removed` envelope with a nonempty unique `sessionIds` array for native confirmed archive deletion. It advances stream sequence without a reconnect snapshot or unrelated request/completion replay. Old clients that do not recognize this event must resynchronize. The Rust store retains minimal deletion barriers across restart; recovery cannot recreate deleted rows. See [deletion scope](../guides/archive.md).

The 0.7.0 Rust store adds server-owned `archived`, `archivedAt`, `restoredEndAt`, `lastSeenAt`, `requestedAt`, `endedAt`, `completedAt`, and `sourceRevision` metadata to canonical snapshots/updates. Producers cannot set archive state. Archive/restore uses separate native IPC, increments canonical revision and stream sequence, and preserves producer revision/deduplication barriers. Manual restoration suppresses automatic archiving for that same confirmed end episode. Request timestamps support oldest-first navigation without reordering session rows. The legacy Python host does not implement native retention actions.

Optional producer `eventKind` is recognized as `prompt`, `request`, `completion`, `activity`, or `session_end`; other values are ignored. `session_end` plus disconnected status supplies explicit process-end evidence. `observedAt` may carry an original Unix-millisecond observation for helper-cache recovery; missing/invalid/future values cannot establish an old end time during recovery. A fresh accepted prompt or identified pending request restores archived context; disconnected activity or completed turns alone do not. Generic actions remain unsupported.

Version 0.6.2 provides [local Orca Codex navigation](../integrations/orca-navigation.md) through separate native IPC. The HTTP capabilities and action rejection described below remain unchanged; producer-supplied terminal targets are not trusted.

Implemented foundation, protocol version 1. This bridge monitors producer reports; it does not yet deliver approvals, answers, or terminal navigation to a CLI. The primary desktop implementation now uses the compatible Rust store in `crates/island-core/` and a Tauri host; the Python server remains a legacy development option. The embedded Tauri UI uses IPC channels, while external producers retain the HTTP/SSE contract below. See [native desktop notes](desktop.md).

Version 0.6.0 account quota uses a separate native `read_usage` cache and revision, not these session routes. Do not submit usage values as lifecycle progress or infer a per-session allowance. See [usage semantics](../guides/usage.md).

## Run and verify

```powershell
npm.cmd run legacy:bridge
npm.cmd test
```

For the Python browser-development path, open `http://127.0.0.1:37891/`. For the native app, run `npm.cmd run desktop` instead and close any Python listener first; Rust serves API routes only on loopback and Tauri serves embedded frontend assets separately. A new installation starts with no sessions. Explicit browser fixtures remain at `?preview=1` and never submit live actions.

The default SQLite file is `VibeIsland/sessions.sqlite3` under the operating system's local application data directory (or `.local/share` under the home directory when that environment variable is unavailable). It retains session context, bridge revisions, producer revisions, and recent event identities. Keep this runtime file outside the repository. To use a different file or isolate a test:

```powershell
python legacy/bridge/antigravity_bridge.py --state-file ./local-sessions.sqlite3
python legacy/bridge/antigravity_bridge.py --port 37897 --state-file :memory:
```

The retained data is last-known context, not proof that a CLI is still running. On bridge restart, each retained session is presented as disconnected until a newer producer report arrives. The optional legacy transcript reader requires `--watch-antigravity`; its file formats and inferred events remain unverified. It is disabled by default and has no interactive capabilities. Global Windows shortcuts are not registered by this bridge.

## Producer updates

The bundled [Codex hook observer](../integrations/codex.md) is a concrete producer for this contract. It commits per-session revisions locally before delivery; the native host can recover its latest offline reports as disconnected startup context. Registration and Codex hook trust review are required. It does not enable the action endpoint.

`POST /api/sessions` and `POST /api/notify` accept the same JSON object. `/notify` remains a compatibility route. Use `Content-Type: application/json`; cross-origin browser writes are rejected. The server binds only to `127.0.0.1`. Request bodies are limited to 256 KiB.

Example producer report (illustrative data, not a verified Codex adapter):

```json
{
  "agentId": "codex",
  "sessionId": "terminal-session-42",
  "eventId": "producer-event-17",
  "sourceRevision": 17,
  "status": "waiting_approval",
  "connectionStatus": "connected",
  "taskTitle": "Update authentication flow",
  "projectName": "website",
  "activity": "npm test",
  "command": "npm test",
  "requestId": "permission-4"
}
```

- `agentId`: `codex`, `antigravity`, or `opencode`.
- `sessionId`: nonempty stable producer identity, up to 256 characters. The bridge adds the provider prefix exactly once, giving `codex:terminal-session-42`. Reuse it throughout that session; a new independent process can use a UUID. Provider prefixes prevent collisions across integrations.
- `eventId`: stable producer event identity, up to 256 characters. Reuse the same identity and payload when retrying a report. Do not reuse it for another revision.
- `sourceRevision`: nonnegative JavaScript-safe integer, strictly increasing per session. The producer must preserve its counter when resuming an existing session after restart. Use a new session identity for a new lifecycle with a reset counter.
- `status`: required lifecycle state: `idle`, `running`, `waiting_input`, `waiting_approval`, `completed`, or `failed`. Legacy `thinking` maps to `running`. An offline connection is not a lifecycle status.
- `connectionStatus`: `connected` (default), `reconnecting`, or `disconnected`.
- Optional context: `projectName`, `taskTitle`, `prompt`, `activity`, `terminalName`, `modelName`, `elapsed`, `workingDirectory`, `command`, `question`, `options`, `requestId`, `result`, and `error`. Omitted information is not fabricated. Options are strings or objects with a string `label` and optional string `value`.

Legacy identity aliases `id`/`session_id`, provider display names, and metadata such as `title`, `message`, `project`, `current_command`, and `duration` are normalized at ingestion. Legacy producers must still supply stable event identities and source revisions. The checked-in Antigravity process wrapper now supplies both; it still reports only process start and exit.

Reports are partial updates of context, with a required lifecycle status. Progress for the same pending request preserves its request identity and options when omitted. A different request identity or lifecycle clears omitted request-specific fields. Leaving a pending state clears its request identity, question, and options. A lifecycle change also clears an omitted old result or error.

The response includes `accepted` and the canonical `session`. Repeated events return `accepted: false, reason: duplicate`; older or equal source revisions return `reason: stale`. Neither changes storage revisions nor broadcasts another update. Invalid inputs return HTTP 400. Recent event identities are bounded to roughly 2,000 source revisions per session; older retries remain rejected by the durable revision high-water mark.

Capabilities are assigned by bridge adapters, not trusted from producer JSON. This version forces `canApprove`, `canAnswer`, and `canJump` to false and `supportsAcknowledgment` to false. `POST /api/action` returns HTTP 501 with `acknowledged: false` and never changes lifecycle state. A future real adapter must implement delivery and identity-bound acknowledgment before these capabilities can be enabled.

## Snapshots and SSE

`GET /api/status` reports the bridge version, protocol version, bridge identity, and whether interactive delivery exists. `GET /api/sessions` returns a complete `sync` envelope. `GET /api/events` begins with that same snapshot schema, followed by `session_update` envelopes:

```json
{
  "protocolVersion": 1,
  "bridgeId": "unique-bridge-process-id",
  "sequence": 18,
  "eventId": "unique-bridge-process-id:18",
  "type": "session_update",
  "session": {
    "sessionId": "codex:terminal-session-42",
    "agentId": "codex",
    "revision": 8,
    "status": "running",
    "connectionStatus": "connected",
    "capabilities": { "canApprove": false, "canAnswer": false, "canJump": false },
    "supportsAcknowledgment": false
  }
}
```

A `sync` contains `sessions: [...]` instead of `session`. There are three separate counters/identities:

| Field | Meaning |
| --- | --- |
| Producer `sourceRevision` and submitted `eventId` | Reject retried or reordered reports for one session |
| Canonical session `revision` | Monotonic accepted state version, retained across bridge restarts |
| Envelope `bridgeId`, `sequence`, and SSE `eventId` | Identify one bridge lifetime and the ordered stream shared by all sessions |

Subscription registration and initial snapshot capture share the same store lock as accepted updates. Events queued during snapshot delivery follow its high-water sequence, so there is no subscription handoff gap. State is committed before publication. Each subscriber has a bounded queue. If it overflows, the server closes that subscriber rather than silently skipping a request; reconnect obtains a fresh snapshot. Idle streams emit a comment heartbeat every 15 seconds.

Every reconnect starts with a complete snapshot, including when `Last-Event-ID` is supplied. Historical events, notifications, and sounds are not replayed. This is snapshot recovery, not an event-history API.

## Frontend recovery

`src/session-model.js` validates complete snapshots before replacing state. It rejects duplicate session identities, malformed sessions, backward revisions, stale stream updates, and unsupported envelopes. A missing stream sequence, a different bridge lifetime without a snapshot, or invalid data retains the last-known context, blocks responses, and opens a fresh stream. The UI becomes connected only after a valid snapshot.

Session rows and drafts remain keyed by session and request identities. Connection changes do not rebuild a pending form. During a connection loss, response buttons are disabled and the textarea becomes read-only to preserve focus, selection, and draft. A reconnect snapshot restores state silently; it does not announce old requests as newly arrived. Explicit authoritative request withdrawal removes the old controls immediately.

This foundation does not establish CLI hook support, agent heartbeat/timeout detection, persistent browser drafts across a page reload, an event history, automatic session pruning, exact terminal targeting, or native Windows behavior. Those require separate implementation. Session context survives bridge restart; browser drafts survive in-page reconnects and presentation changes.

## Verification

Run `npm.cmd test` for Rust store/HTTP tests and Node session-model tests. Run `npm.cmd run test:legacy` for the Python store/real HTTP/SSE tests. They cover producer retries, out-of-order revisions, concurrent updates, snapshot handoff, queue overflow, durable restart recovery, malformed data, capability restrictions, and epoch/sequence handling.

With a local UI server open in Orca, evaluate `tests/browser/live-sync.browser.js` to test the actual UI against an isolated fake EventSource. It verifies live startup without fixtures, offline request blocking, focus/caret/draft preservation, silent reconnect, duplicate/gap handling, withdrawal, and monitoring-only controls. It does not contact an installed CLI. The existing `tests/browser/ui.browser.js` and `tests/browser/icon-controls.browser.js` cover preview behavior separately.
