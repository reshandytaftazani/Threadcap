# Antigravity exit removal

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Version 0.8.2 fixes the update path and legacy reports missed by 0.8.1. See [observer upgrade recovery](antigravity-upgrade-recovery.md) for the actual installation diagnosis and current verification.

The owner requested that Antigravity sessions leave the main list when `/exit` closes the CLI or its terminal is closed. They now move immediately into Archive after confirmed exit/closure, preserving application context and CLI history. This provider-specific rule bypasses the general archive delay and Off setting. Codex and OpenCode retain their existing behavior.

## Cause and implementation

The original observer only monitored turn hooks and terminal presence. The documented [Antigravity Stop hook](https://antigravity.google/docs/hooks?tab=cli) concerns the execution loop; it cannot establish that the interactive CLI has exited. A terminal tab may also remain open after `/exit`. The old five-minute retention rule therefore left these sessions in Sessions.

The refreshed bundled hook observer captures its actual `agy.exe` ancestor's PID and process creation time using Windows APIs. It does not trust a process identity supplied in hook JSON, match arbitrary window titles, or read transcripts. A shared native lifetime check runs every 500 ms for captured Antigravity processes. A signaled process handle, a definitively absent PID, or a reused PID with a different creation time confirms that the captured process ended. Access denied and unavailable identity remain unknown.

Exit commits a new monotonically ordered `session_end` report to the helper cache before updating the canonical store. The store immediately archives that Antigravity record without inventing task success or answering a request. An open shell does not reactivate an ended CLI. A genuine fresh SessionStart resumes the same canonical session; stale cache replay and deletion guards remain intact. Startup reconciles exits that occurred while the host was stopped, and periodic cache recovery repairs an interrupted cache-to-store handoff.

Verified associated-pane closure also archives immediately. Fresh process evidence typically reaches the store within one 500 ms check plus scheduling/storage time; this is not a zero-latency guarantee. Terminal-only fallback remains subject to the existing shared Orca observation interval. Missing identities, failed queries, transport loss, and unsupported terminal hosts do not justify guessing that a session exited.

## Update existing monitoring

Install and start version 0.8.2 or later. Startup refreshes an existing managed observer without requiring Connect again or rewriting hook settings. First-time setup still uses **Settings > Agents > Antigravity CLI > Detect CLI > Connect** and the provider's normal trust review. Old registrations keep their compatible paths. Fresh hooks establish process ownership; PID-less local reports can be recovered only after a complete native census confirms that no Antigravity CLI is running. See the recovery guide for conservative fallback limits.

## Version 0.8.1 verification (historical)

Core regression tests cover immediate exit/pane archival with automatic retention disabled, preservation of completed output and unresolved requests, unchanged Codex behavior, recovery after downtime, and fresh-session reactivation. Windows helper tests use an explicitly owned process fixture to verify ancestor capture, ignore forged payload identity, keep a completed turn visible while the process runs, and produce exactly one ordered exit report after the process ends. This fixture is not a live Antigravity model task or an interactive `/exit` acceptance run.

Eight native WebView2/IPC checks passed with owned Windows process fixtures: completed-turn retention, orderly/forced exit removal, preserved archived context, bounded delivery, same-session resumption, downtime exit recovery, and rejection of unverified producer PID/transport loss. The final measured fixture exit-to-removal interval was 423 ms on the available machine; this is not a latency guarantee. No model calls or real interactive Antigravity `/exit` run occurred. Personal provider configuration was not changed by these tests.

The complete regression run passed 17 JavaScript tests, 23 core tests, 21 helper tests, and 10 native unit tests. Version 0.8.1 is packaged separately from the smoke identifier used by `scripts/check-antigravity-exit-native.cjs`; the normal release retains the existing application/storage identity.
