# Threadcap 0.8.0 implementation and verification

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Threadcap implements the approved revision while preserving the previous application's data and transport identity. This report separates implemented behavior, isolated native checks, and work that still needs real-provider or human acceptance. The approved scope remains in [the revision plan](threadcap-revision-plan.md).

## Runtime changes

| Area | Implemented behavior |
| --- | --- |
| Terminal presence | Native `terminalStatus` (`checking`, `open`, `closed`) is independent of producer `connectionStatus` and task `status`. HTTP producers cannot assert terminal presence. One shared Orca observation runs at five-second intervals, independently of hover. |
| Closure evidence | Only absence from a complete, successful listing of the same runtime can establish closure of a known terminal. Missing agent labels, disconnected/orphaned records, truncated listings, unavailable CLI, changed runtime, and unknown associations remain Checking. |
| Navigation | Local shells remain selectable after an agent label disappears. Saved links retain runtime, handle, pane, worktree, and PTY checks. A successful switch must be followed by a matching active tab/leaf in fresh visual-layout metadata. Errors stay visible; switching foreground focus during navigation no longer discards its result. |
| Hook identity | A Codex hook without inherited Orca variables carries forward an existing association rather than erasing it. A conflicting fresh binding, changed runtime, or reused PTY still requires validation or explicit relinking. |
| Restart | Retained tasks/results and associations restore immediately as Checking. A recurring observer validates the pane; periodic helper-cache reconciliation uses `Store::recover`, preserving archive/deletion barriers. A pane alone does not establish current Working. |
| Idle | Completion presentation cools after ten seconds in compact and rows, retaining the canonical result. A verified open pane whose CLI reported exit remains Idle. Unverified last-known activity remains clearly marked. |
| Retention | New profiles enable reversible Archive five minutes after verified pane closure. Behavior offers an enable switch and a delay of 1 minute to 7 days. Explicit enabled/disabled preferences survive upgrade. Old unanswered requests can archive after closure without being answered or permanently deleted. |
| Resumption | Fresh activation or verified reopening returns the same canonical session to Sessions, without duplicating history. Cache recovery can queue a newer activation but cannot reveal it until fresh terminal ownership is verified. A reused pane alone cannot merge different session IDs. |
| Archive UX | Sessions exposes Archive and its count. Rows offer Restore and scoped Delete; Delete all captures the current list. Protected request/work context has visible guidance and disables its Delete plus bulk deletion, including repeated renders. Confirmation replaces the archive body, focuses Cancel, and offers an explicit Archive return. Existing revision checks, atomic rejection, and deletion guards remain. |
| UI and motion | Filled 16-unit utility geometry replaces thin strokes. Small product marks keep their geometry and palettes. Separate companions have provider-specific movement and timing, including aggregate compact states. Existing attached shape transitions, width-only hover, drafts, focus, and reduced motion remain. |

Unsupported or unbound terminal hosts remain Checking rather than being guessed closed. Confirmed closure time starts from fresh evidence, never an old last-seen timestamp. Permanent deletion remains explicit and protected; no CLI history or project files are deleted.

## Provider connections

Connect is a fixed native action inside Agents, with Detect, Connect, Review, and Verify activity. Registration is distinct from a fresh producer event. Existing tasks are not launched or restarted automatically.

| Provider | Contract and monitoring | Current boundaries |
| --- | --- | --- |
| Codex | Existing official 0.169.0 observer; stable registration identity and helper path retained | Manual hook trust remains in Codex. Existing quota/account-mapping limits remain. |
| Antigravity | Version-gated for agy 1.5.9. Adds an owned definition to the global `hooks.json`, preserving other definitions and backing up changed files. Observes SessionStart, PreInvocation, PostToolUse, and Stop using conversation identity and documented metadata. | No PreToolUse policy handler is installed. Input/approval detection and richer outcome interpretation are not verified; Stop means the turn ended, not a proof of successful tool execution. |
| OpenCode | Version-gated for 2.2.7. Installs an owned local v2 server plugin under the global config's `plugins/` directory without rewriting `opencode.json(c)`. Subscribes to status/idle, permission, and form events. Persistent event IDs deduplicate delivery; matching reply/cancellation withdraws only its request. | Shared server environment does not identify the source terminal. Explicit terminal selection is required unless independently verified. Rich form controls, complete task/output context, and paid live-agent behavior remain unverified. Idle is not fabricated completion. |

All providers retain monitoring-only response capabilities. Generic actions still reject unsupported approvals/answers. Shared request context is bounded; progress cannot hide another unresolved OpenCode request. Provider caches retain revision and replay guards when application context is deleted. OpenCode's plugin registry initializes asynchronously: the first cold API response can be empty. An isolated persistent 2.2.7 server subsequently reported `threadcap.monitor` active using only automatic directory discovery, without writing `opencode.json` or creating a session. This verifies plugin loading, not a live agent turn.

Primary contracts: [Antigravity lifecycle hooks](https://antigravity.google/docs/hooks?tab=cli), [OpenCode plugin discovery](https://opencode.ai/docs/plugins/), [OpenCode v2 server plugin API](https://opencode.ai/docs/build/plugins/server), and [OpenCode event schemas](https://opencode.ai/docs/openapi.json). Installed version/help inspection was performed separately from fixture delivery tests.

## Identity and upgrade compatibility

Public window, tray, application icon, package, and installer identity use Threadcap 0.8.0. The selected Edge signal geometry is adapted into a launcher icon with a dark backing; provider marks remain separate.

The following compatibility identities are deliberately retained:

- Tauri application identifier and WebView origin: `app.vibeisland.windows`.
- Session database, observer caches, terminal links, and preferences under the existing application-data locations.
- `island.preferences` local-storage key, `VIBE_ISLAND_*` environment options, loopback port, and protocol version 1.
- Technical executable/helper names `vibe-island.exe` and `vibe-island-codex.exe`, plus the existing Codex integration tag. Users review changed hook commands normally; rebranding does not grant trust.
- NSIS upgrade registry keys retain the previous product key in the [installer template](../src-tauri/installer.nsi), adapted from the pinned Tauri CLI 2.12.4 template with its [upstream license](../src-tauri/TAURI-TEMPLATE-LICENSE). Only the two upgrade-identity defines differ; review upstream changes when upgrading Tauri. Displayed product/shortcut names use Threadcap. This preserves discovery of an earlier installation without moving user state.

No bulk profile migration or personal configuration rewrite runs at startup. Installer compilation verifies the template is included; an actual end-user upgrade/downgrade and existing startup-entry behavior still require a separate installed-app acceptance run.

For isolated provider-setup tests, `THREADCAP_CONFIG_ROOT` redirects the profile root and `XDG_CONFIG_HOME` redirects OpenCode's config. Tests leave the Windows user profile itself unchanged so WebView2 runtime discovery continues to work. These are process-local overrides, not changes to machine settings.

## Verification evidence

The reproducible entry points are `npm.cmd test`, `npm.cmd run test:codex`, `npm.cmd run test:native`, browser expressions under `tests/`, and `npm.cmd run test:threadcap` against an isolated smoke build. The native harness uses temporary state/configuration, separate ports, and a dedicated WebView profile. It creates and closes only its own harmless Orca shell; no model task is launched.

Completed checks:

- 17 JavaScript model/presentation tests; 12 Rust protocol tests and 8 retention/recovery tests; 19 helper tests; 10 native unit tests. These include ordered events, stale cache/deletion guards, parallel OpenCode requests, downtime activation, preference preservation, and exact-leaf rejection.
- 170 browser checks across general interaction, utility controls, refinements, and the Threadcap additions. These exercise draft/caret/focus retention, interrupted transitions, reduced motion, product-mark stability, state companions, and Settings at 1366 x 768 and 1920 x 1080 logical-size equivalents from 100% through 200% scaling. These are browser layouts, not native mixed-DPI results.
- 30 isolated native checks through WebView2/IPC, including real Orca navigation to an owned shell, inherited hook association, a later hook without inherited environment, forced app restart, saved-link recovery, surviving-pane Idle, actual pane closure, both provider setup flows, a synthetic OpenCode permission event, and automatic archival after a configured one-minute delay. The five-minute default and timing boundary are separately checked in the store tests.
- 8 additional native archive checks verify visible decisions, atomic rejection after a revision change, duplicate-submission prevention, actual single/bulk removal, exclusion of archives created after confirmation, and the final empty/Back state.
- Physical Windows mouse tests confirm outside dismissal without a foreground-focus transition, forwarding the same click/right-click, and keeping inside clicks open. Native region probes confirm top attachment, lower rounding, geometry agreement, and click-through outside the shape on the available display.
- An isolated OpenCode 2.2.7 server loads the installed-layout plugin as active without a prompt/model call. Startup warming is awaited. Lifecycle and permission/form delivery are additionally fixture-tested, not established by this load-only check.

Generated screenshots, the replayable `artifacts/threadcap-motion.html` native recording, and raw test output are local artifacts. They are not evidence of a public release or a completed human usability study. Native tests use temporary profiles and force-stop only their own host; graceful tray Quit remains a separate acceptance case. Retention defers while the island is open to avoid removing controls during interaction, then resumes against the original verified closure time.

The normal production configuration built the 0.8.0 NSIS installer successfully. `release:stage` copies it, the helper, setup guide, and SHA-256 manifest into `dist/`. The production executable is preserved and restored around the separate-identifier smoke checks. The [UI delivery review](threadcap-ui-review.md) records the scoped design gate and its evidence.

The previous reference-video observations remain in design.md. This implementation uses original discrete pixel adaptations; no fresh full-video playback or measured match to the reference footage is claimed.

## Remaining acceptance

- Run paid/live tasks in each provider to verify actual callbacks, request withdrawal, reconnect, and long-running work against supported installed versions. Unit fixtures and successful registration alone cannot establish these behaviors.
- Verify multiple simultaneous sessions, split panes, provider/server restarts, and explicit relinking after PTY or runtime replacement. A post-switch leaf check is implemented; the isolated owned-shell run does not cover every split topology.
- Repeat installed-app upgrade/downgrade and graceful tray Quit on a disposable Windows profile, including hook review and existing startup settings.
- Perform human Archive/Delete/Back discovery tasks and actual-size state recognition. Automated navigation checks do not replace the earlier human-test feedback.
- Validate native mixed-DPI monitors, taskbar positions, high contrast, and OS scaling. Browser logical-size coverage is not native DPI coverage.
