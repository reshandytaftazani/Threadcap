# Development roadmap

Publication preparation targets a private repository named **Threadcap**, with a user-oriented README, MIT licensing/notices, contribution and security guidance, issue/PR templates, and clean-source CI verification. Public visibility and release publication remain separate steps; see [publishing](publishing.md).

Version 0.8.4 implements the approved immediate Archive rule for confirmed terminal/session closure across Codex, Antigravity, and OpenCode, replacing the delay/Off policy described by historical releases below. OpenCode now tracks native TUI ownership independently of its persistent server. Context remains protected, unknown observations do not imply closure, and fresh verified client ownership permits resumption. See [implementation, real-client checks, and remaining limits](client-closure.md).

Version 0.8.3 addresses the reported cross-folder Codex monitoring failure, OpenCode 2.3.0 registration gap, and absent Antigravity quota collector. It preserves user configuration, custom status-line output, and manual Codex trust review. Real-provider checks and isolated fixtures are distinguished in [the repair report](provider-monitoring-repair.md); unrelated native display and UX acceptance remain outstanding.

Version 0.8.2 fixes the observer upgrade gap that left legacy Antigravity sessions visible. Startup refreshes an existing managed binary without rewriting hooks; a complete native zero-process census can end PID-less local cache records, with unknown/live observations blocking that fallback. Two actual retained sessions were repaired through the live transport. Isolated upgrade and lifetime checks remain distinct from a real interactive CLI acceptance run. See [recovery evidence and limits](antigravity-upgrade-recovery.md).

Version 0.8.1 changes Antigravity exit retention at the owner's request: confirmed `/exit`/process end or pane closure immediately removes its row from Sessions into Archive. Other providers retain their delay settings. [Implementation and verification](antigravity-exit.md) distinguish native process-lifetime checks from real AGY interactive acceptance.

Status: Threadcap 0.8.0 implements the latest revision, with evidence and remaining acceptance tracked in [the implementation report](threadcap-implementation.md). The accepted scope remains in [the revision plan](threadcap-revision-plan.md): stronger pixel UI, clearer Archive/Back navigation, the selected new name/icon, terminal-based availability, provider Connect flows, main-list cleanup, terminal navigation, and recovery after restarting during work. Versions 0.7.0-0.7.1 below are historical implementation evidence. Real-provider, installer-upgrade, human UX, and broader native display acceptance remain distinct from compilation or isolated checks.

Historical 0.8.0 retention archived sessions five minutes after verified pane closure with configurable delay/Off. Version 0.8.4 replaces this with immediate archival after confirmed terminal or CLI-session closure for all providers. Unanswered request content and deletion guards are preserved. Fresh verified resumption reactivates the same session record without duplicates; reusing a pane for a different session creates a separate entry. Restart immediately restores context with Checking, then revalidates terminal links and activity without another Connect for valid bindings. These rules supersede conflicting historical retention targets below; implementation evidence for earlier releases remains historical.

The sections below retain the previous release scope and acceptance history. Baseline validation is recorded in [the implementation report](roadmap-implementation.md) and [archive deletion notes](archive-deletion.md). New visual and interaction decisions belong in [design.md](../design.md#threadcap-revision-approved-planning).

## Approved directions

### 1. Session archiving and optional cleanup

Add reversible manual `Archive` before destructive cleanup. Keep session history in the originating CLI intact. Protect running sessions and unresolved requests. An idle CLI, completed response, or disconnected bridge alone does not prove that the session is disposable.

Automatic archiving is an optional preference, disabled by default. When enabled, it may archive a session only after a confirmed session end has aged at least 24 hours and no unanswered request remains. A completed turn, idle state, or lost connection alone is insufficient. Measure age from authoritative end evidence, not the last UI repaint or application restart.

Archived sessions remain inspectable and restorable. A valid fresh prompt or new input/approval request automatically returns the session to the active list. Duplicate events, stale revisions, old reconnect snapshots, and helper-cache replay must not undo an archive. Automatic permanent deletion and CLI-history deletion remain prohibited. The owner subsequently approved manual Delete and Clear archive with inline confirmation; version 0.7.1 implements the scope in [design.md](../design.md#archive-deletion-version-071).

Version 0.7.0 implements these actions in the native host. Automatic sweeps pause while the island panel or Settings is open, and manually restored end episodes are exempt from immediate automatic re-archiving. A confirmed process end can make a last-known running record eligible without fabricating task completion; an unresolved request remains protected.

Engineering work:

- Define session last-seen timestamps separately from task/turn lifecycle and bridge connectivity.
- Persist archive/dismiss markers and revision high-water protection so helper-cache recovery cannot resurrect dismissed rows.
- Coordinate the central store, Codex helper cache, snapshots, and UI filtering. Deleting only a central database row is insufficient.
- Implement fresh-prompt/request restoration while retaining archive markers across reconnect, cache recovery, late/duplicate events, and restart.
- Keep permanent deletion separate from reversible hiding; never delete CLI files as part of UI cleanup.

### 2. A denser, more purposeful interface

This direction includes the entire [approved softer-island refinement](#approved-refinement-softer-island-and-truthful-summaries): compact, horizontal-only hover, session overview, focused detail, terminal selection, and all Settings pages form one system. Live/saved counts and honest mixed/offline summaries are part of this work, not an optional later redesign.

Refine idle and expanded presentations first. Reduce excess empty space, strengthen task/activity hierarchy, and show useful connection, recent-activity, and supported quota context. Fit the surface to content while keeping the approved top-center anchor and readable controls.

Retain black surfaces, flat rows, small provider marks, and restrained utilities. Do not fill the island with fabricated sessions, progress, statistics, or decorative cards. Validate empty, one-session, multi-session, pending, error, and offline compositions.

### 3. Faster session appearance based on measurement

The host and core bridge already use Rust; normal session delivery is event driven. Measure latency and delivery failures before choosing an optimization.

Trace fixture process launch, PowerShell forwarding, helper commit, HTTP acceptance/core commit, IPC receipt, DOM update, and first rendered frame. Compare direct helper invocation with the generated wrapper, cold/warm starts, concurrent reporters, and retained-session counts. Use isolated ports/profiles and no model tasks for the first benchmark. Record p50/p95 separately from dropped or retried events; configured timeouts are not measured latency.

Investigate PowerShell startup, SQLite contention, retry/recovery behavior, and representative-session selection. A new session hidden behind old pending rows can look delayed even when delivery is prompt. Do not promise a latency target until a baseline exists, or remove ordering/durability guarantees merely to improve a benchmark.

### 4. A stronger application icon

Explore an original abstract island silhouette with distinctive negative space and high contrast. Compare several candidates at actual 16px tray scale as well as launcher/installer sizes. The application mark remains separate from Codex, Antigravity, and OpenCode product identities. Version 0.7.0 selects candidate A after comparing three original geometric candidates at 16, 32, 64, and 128 pixels; see [the icon study](../src/app-icon-study.html).

### 5. Richer provider-state animation

The scope is the three provider icons, with stable brand marks and separately animated pixel companions. Add occasional subtle idle companion motion, revising the former static-idle target. Working, input, approval, sending, completion, failure, and offline remain distinguishable with provider-specific rhythms.

Utility icons receive hover/press/toggle feedback rather than agent lifecycle loops. Stop hidden animation, respect reduced motion, and preserve one-shot identity during unrelated updates. Version 0.7.0 uses long idle rests with discrete companion motion: Codex 11 seconds, Antigravity 13 seconds, OpenCode nine seconds per cycle. Brand marks remain unchanged; motion occupies only a small fraction of each idle cycle.

### 6. Guided setup inside the island

Plan a short progressive flow: Detect CLI, Connect, Review hooks, Verify activity. Animate one continuous surface, preserve context on Back/Retry, and represent actual progress. Registration is not trust; a fresh quota reading is not proof of a live agent session. Mark verified connection only after a fresh supported session event. Preserve unsupported-provider explanations.

Use Lumi as a motion reference after visual inspection. Local discovery found Lumi 1.0.3 installed, but its setup animation has not been observed. No assets were extracted or copied, and no existing onboarding state was reset. Record actual observations separately from proposed adaptations.

## Approved refinement: softer island and truthful summaries

Status: implemented for version 0.7.0; validation is recorded separately. The owner approved the softer hierarchy, live-versus-saved distinction, and consistent treatment across compact, hover, sessions, detail, and Settings. The design rules and reference provenance are in [design.md, section 4](../design.md#approved-refinement-softer-hierarchy-across-the-island).

The source audit found that the compact summary counts all stored sessions, including disconnected retained records. Its aggregate `Offline` state can also represent a mixed group. The current title's flexible fill separates the summary and status with a large empty gap. These observations explain the refinement; they are not measured performance defects or proof of a broken monitoring connection.

Implementation tasks:

1. Derive separate retained, connected, disconnected, and working counts from the validated session model. Treat global bridge connectivity separately; stale last-known snapshots cannot establish live counts.
2. Implement the design's compact state table. Use `N saved` only when all represented sessions are disconnected; use connected counts for `N live` in mixed groups and disclose the retained remainder in hover and opened views. Preserve request/failure priority, honest connection-loss explanation, and the existing empty state.
3. Centralize the softer typography and grouping adjustments. Balance mark/summary and status/utility spacing, keeping readable metadata, brand mark scale, accessible targets, and constrained long-text behavior.
4. Apply the same hierarchy, spacing, control feedback, and surface separation to focused detail, overview, quota context, terminal selection, and Agents/Appearance/Behavior pages. Preserve drafts, focus, scroll, stable rows, and supported integration behavior.
5. Reuse existing motion tokens and interruption handling. Keep hover horizontal at unchanged height; synchronize native regions throughout transitions. Preserve reduced motion and native outside-click dismissal.

Acceptance and evidence:

- Test zero, one, and many retained sessions; all-disconnected, mixed connected/disconnected, all-connected idle/completed, and running combinations. Verify that counts never imply working activity without evidence.
- Test transport loss/reconnect independently from per-session disconnection. Do not mark all sessions live simply because the bridge is reachable; stale snapshots must not restore live claims.
- Check requests and failures alongside saved sessions, account quota availability, and terminal-link errors without changing adapter capabilities.
- Capture compact, hover, overview, detail, and Settings at actual size; review them together for consistent hierarchy and spacing. Record hover, opening, section changes, rapid reversal, and reconnect updates.
- Verify long labels, keyboard and accessible names, readable contrast, larger text, reduced motion, focus/draft preservation, and native outside-click/hit-region behavior at the display configurations required by AGENTS.md.

Documentation checks establish planning consistency only. Runtime checks and release packaging are recorded in the implementation report. The archive, automatic request reveal, and completion cooldown features have their own implementation and verification requirements.

## Approved attention and completion behavior

### Automatic reveal for questions and approvals

Automatically reveal a fresh, connected question or permission request in the island's focused presentation when it is safe to do so. Expose `Auto-open requests` in Behavior, enabled by default on initial setup. Persist the user's choice and preserve an explicitly disabled preference across restarts/upgrades. Version 0.7.0 implements this policy.

- Reveal the same anchored island surface without taking OS/keyboard focus from the terminal or current application. Never answer, approve, or imply new adapter capabilities by opening it.
- Protect active typing, another request being handled, and Settings. In those contexts, retain the current view/draft/caret and show a stable attention count with `View request`; do not switch pages or move decision buttons.
- Queue simultaneous requests oldest-first. Keep the currently handled request stable, with a count of other pending requests. Use explicit navigation for requests deferred during protected interaction rather than a surprise delayed page switch.
- Once a request has been manually closed, its attention indicator remains, but the same request does not reopen automatically. A genuinely new request may trigger reveal again.
- Trigger only from accepted fresh request events. Deduplicate by session/request and attention episode, not every progress revision. Reconnect, replay, duplicate events, and re-enabling the preference do not replay old automatic reveals.
- Keep native outside-click dismissal and explicit collapse available. Closing is presentation dismissal only and does not resolve or deny the request.
- With the setting disabled, retain the compact attention cue and manual opening behavior. Reduced motion changes animation, not access to the request.

### Completion cooldown to idle

After a completed response has no fresh prompt or authoritative activity for 10 seconds in that session, let its compact presentation settle into idle. Keep its authoritative completed state, result, and detail/history intact. Version 0.7.0 implements this display cooldown without synthesizing a lifecycle event.

- Anchor the timer to a distinct completion episode, not every revision or UI refresh. A later disconnect retaining the completed state is not a new completion.
- New supported prompt/activity/request events cancel obsolete cooldown work and present their actual state. Do not monitor arbitrary terminal keystrokes or whole-machine inactivity.
- Do not close an opened result while the user reads it, remove the completed row, erase output, archive the session, or imply process exit.
- Idle applies to the quiet compact summary only when no other active work or higher-priority attention exists. Pending requests, running work, failures, and offline state retain their appropriate cues.
- A reconnect snapshot restores context silently and must not restart a completion celebration or a fresh 10-second display interval. Expired or unrelated timers cannot change a newer turn's presentation.

## Remaining review tasks

- Observe Lumi's actual onboarding if a non-destructive route becomes available; only its compact surface was observed, without resetting setup.
- Broaden latency measurements beyond the recorded small isolated sample and modest retained-session counts. No universal latency guarantee is established.
- Validate the selected icon and 11/13/9-second idle companion rhythms with the owner during normal use.
- Extend physical mixed-DPI, taskbar, accessibility scaling, and fullscreen coverage. Completed checks and remaining limits are recorded in [the implementation report](roadmap-implementation.md).

## Acceptance and evidence

Before shipping, exercise archive/restart/reconnect behavior, stale and duplicate events, new requests during typing/Settings, auto-reveal toggling, manual dismissal, overlapping requests, completion followed immediately by a new prompt, reduced motion, and native outside-click behavior. Retain measurable latency traces, actual-size icon comparisons, representative screenshots, and short motion recordings. Documentation approval is not evidence of implementation or runtime verification.
