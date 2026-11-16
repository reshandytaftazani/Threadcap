# Session foundation verification

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Verified November 16, 2026. Scope: canonical session storage, producer ingestion, SSE ordering and recovery, and integration with the existing UI. No installed CLI was invoked and no user transcript database was read.

## Results

| Check | Result |
| --- | --- |
| `npm.cmd test` | 15 Python store/HTTP/SSE tests and 10 Node model tests passed |
| JavaScript syntax | `node --check` passed for `src/app.js` and `src/session-model.js` |
| Python syntax | `py_compile` passed for all three bridge modules |
| CLI entry point | `--help` returned the monitoring-only options successfully |
| `tests/live-sync.browser.js` | 13 checks passed against the actual UI with an isolated fake EventSource |
| `tests/ui.browser.js` | 69 preview checks passed |
| `tests/icon-controls.browser.js` | 16 preview control checks passed |
| Real local HTTP → SSE → browser smoke test | Empty live startup, protocol version, producer acceptance, canonical identity arrival, blocked unsupported capabilities, and running state all verified |

The real transport smoke test used a separate in-memory bridge on a test port and explicitly named synthetic test data. It did not validate a Codex, Antigravity, or OpenCode integration.

The browser recovery test initially exposed focus loss when disabling a textarea on disconnect. The UI now keeps the same textarea read-only while response buttons are disabled. The subsequent check verified document focus, selection, draft, and row identity across disconnect, reconnect, and unrelated progress.

A later clean-page repeat exposed a startup race: the deferred initial collapse could run after a focused request was opened before the first rendered frame. Initialization now sets the compact presentation synchronously before connecting to events. The final clean-page run passed all 13 synchronization, 69 preview, and 16 control checks.

## Behavior covered

- Stable provider-prefixed identities, producer retries, reused event IDs, stale revisions, and concurrent out-of-order reports.
- Independent lifecycle/connection state, pending request context during progress, clearing replaced requests, and immediate authoritative withdrawal.
- Transactional persistence and restart recovery with a new bridge identity, retained source revisions, duplicate rejection, and disconnected retained sessions.
- Atomic snapshot/subscription handoff, bounded queue overflow disconnect, and ordered real HTTP/SSE frames.
- Invalid payload rejection, loopback-only binding, cross-origin write rejection, and HTTP 501 without session mutation for unsupported interactive actions.
- Frontend startup without fixtures, atomic snapshot validation, duplicate suppression, stream gaps, bridge lifetime changes, silent reconnect, draft/caret preservation, and monitoring-only guidance.

## Scoped UI delivery gate

PASS for the changed behavior and copy. The established ENERGY 1 / RHYTHM 1 / MOTION 2 direction and branded avatars remain unchanged. Native controls retain accessible names and focus rules. Unsupported actions are explained rather than rendered as working decisions. Pending forms stay mounted during transport changes; reduced-motion and preview suites continue to pass. No new graphical assets or decorative effects were introduced.

## Remaining work

Real CLI adapters, reliable decision delivery and acknowledgment, exact terminal navigation, producer liveness detection, native desktop behavior, and mixed-DPI verification remain unimplemented or unverified. Drafts survive in-page reconnects; browser reload persistence is not implemented. This verification does not establish production CLI compatibility or native Windows focus behavior.
