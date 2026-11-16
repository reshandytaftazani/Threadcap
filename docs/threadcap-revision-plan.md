# Threadcap revision plan

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Status: approved scope, now implemented for Threadcap 0.8.0 with verification limits. The owner confirmed the visual, navigation, identity, retention, and restart-recovery decisions below. This document preserves the approved plan; [the implementation report](threadcap-implementation.md) records actual behavior, capabilities, evidence, and remaining acceptance. Do not treat a planned outcome as verified merely because it appears here.

The pre-revision baseline was version 0.7.1, branded Vibe Island. Version 0.8.0 uses Threadcap publicly and preserves compatibility identifiers. Visual and interaction authority is [design.md](../design.md#threadcap-revision-approved-planning); earlier implementation reports describe the baseline, not acceptance of this revision.

## Accepted decisions

| Area | Accepted outcome |
| --- | --- |
| Existing interface | Preserve the current island composition. Strengthen faint effects, utilities, and state companions with blocky pixel geometry; a wholesale replacement interface is not requested. |
| Human-tested UX | Archive deletion was difficult to locate, and returning to previous views confused first-time users. These are owner-reported findings; this revision has not rerun human testing. |
| Archive navigation | Provide direct Archive access from Sessions. Show Restore and Delete on each archived row and Delete all above the list. Keep destructive scope and confirmation explicit. |
| Back navigation | Display the destination beside the back glyph, such as Sessions or Agents. Escape goes back one level; native outside dismissal remains available. |
| Identity | Use Threadcap and selected application icon A, Edge signal. The selected original vector is [preserved here](concepts/threadcap-mark-a.svg). It remains separate from provider identities. |
| Provider identities | Keep recognizable Codex, Antigravity, and OpenCode pixel product marks. Make their independent state companions visibly blocky and readable, with provider-specific discrete motion. |
| Completion | Show Done for ten seconds, then Idle in both compact and session rows while the associated terminal pane remains open. Preserve result content in detail. |
| Idle and Offline | A pane that remains open after Codex finishes or exits remains available; completion or CLI exit alone does not make it Offline. Offline requires verified pane closure. Transport/recovery uncertainty is separate. |
| Closed-session clutter | After verified pane closure, automatically move the session to Archive after five minutes. Enable this for new setup, allow the delay to be changed or disabled, and preserve explicit preferences on upgrade. Permanent deletion stays manual. |
| Resuming archived sessions | Reactivate the same canonical record after a fresh verified reopening/resumption of its associated terminal/session. Preserve context and remove it from the Archive view; do not delete/recreate it or produce duplicate entries. A reused pane with a different provider/session identity is a new session. |
| Closed requests | An old request on a verified closed terminal follows the archive grace period. Preserve its contents; do not automatically answer, allow, deny, or permanently delete it. Responses require fresh session/request validation and supported capabilities. |
| Restart recovery | Restore the last task/context immediately with Checking, revalidate terminal and current activity independently, and recover valid navigation without another Connect. Show last-known activity honestly until fresh evidence exists. |
| Connect | Add provider-specific Connect flows for Antigravity and OpenCode, following Codex's detect/configure/verify pattern and using interfaces actually supported by each installed version. |
| Terminal navigation | One explicit action must return to the correct source terminal/pane in Orca. The reported symptom is no visible movement; the owner describes the interface as staying in place. A concrete failure stage has not been verified. |

## 1. Preserve the UI and strengthen its pixel language

Apply the visual rules in design.md across compact, hover, overview, focused detail, utilities, Archive, and Settings. Keep the true-black attached surface, small marks, normal readable UI typography, and flat composition. The user asked for stronger pixel geometry and clearer effects rather than thinner strokes or another broad layout replacement.

Use the actual [Raycast analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md) for hierarchy/control consistency. It is a third-party analysis, much of it about marketing pages; it does not authorize importing hero layouts, gradients, or brand assets. [Boring Notch](https://github.com/TheBoredTeam/boring.notch) is a related product reference, not a source of copied assets. The [Vibe Island demo](https://www.youtube.com/watch?v=_nh_OE5aSwI) remains the requested discrete-motion/art-style reference.

Reinspect the actual demo before claiming a motion match. Existing documentation records an earlier inspection; this planning round has not freshly verified playback. Local application screencasts are not reference-video evidence.

## 2. Make Archive and Back discoverable

Add a visible Archive entry with its count in the Sessions presentation. Keep archive storage controls and optional retention preferences in Settings, but do not require users to discover Behavior before managing archived rows.

| Presentation | Visible return destination |
| --- | --- |
| Focused session | Sessions |
| Settings root/sections | Sessions |
| Provider detail/setup | Agents |
| Archive list | Sessions |
| Archive deletion confirmation | Archive |

Keep the return label consistent with its actual action. A setup step's Previous step is distinct from returning to Agents. Restore prior selection, scroll, drafts, caret, and a valid focus target when navigating back. Closing the island preserves context without committing a request or deletion.

Deletion review stays inside the island and exposes the selected title/count, consequences, Cancel, and Delete without searching or manual scrolling. Prefer a focused review body over appending decisions beneath a long archive list. Preserve the underlying Archive view for Cancel/Back. Keep the implemented revision-bound confirmation, atomic rejection of changed targets, duplicate suppression, cleanup feedback, and deletion barriers.

## 3. Rebrand without losing existing state

Update public identity surfaces during implementation: window/tray labels, application mark, executable/installer metadata, startup entries, and current documentation. Keep historical release evidence clearly identified.

Audit storage directories, application identifiers, WebView preferences, helper registration paths, local transport identity, and terminal-link files separately from display branding. Preserve sessions, archive/deletion guards, preferences, terminal associations, and manual hook-trust requirements. Migration must be idempotent and reversible through backups where migration writes are needed. An empty new profile must not be mistaken for lost old data. Do not use an unreviewed global name replacement.

The selected concept is original project geometry on a 16-unit grid. Launcher/tray/light-background variants and final optical adjustments remain implementation work. Do not substitute Threadcap's mark for provider logos.

## 4. Readable provider state and motion

Represent working, input, approval, sending, Done, Idle, failure, closed terminal, and unavailable observation distinctly. Use strong integer-pixel companion geometry, readable static state cues, and short text where the decision depends on understanding the state. Color alone and a brief animation frame are insufficient.

Compact provider summaries must reflect real activity rather than rendering every provider as visually idle. Multiple sessions from one provider require an honest aggregate cue; the expanded list keeps each session's own state. Preserve product silhouettes and palettes across all frames. Provider marks themselves are not distorted or recolored into generic mascots.

Use the existing surface-motion system, fixed upper-center anchor, independent geometry/content transitions, interrupted-transition retargeting, hidden-loop suspension, finite-animation identity, and runtime reduced motion. Idle remains quieter than working. Exact companion cadence and final stroke/slot dimensions require actual-size visual review; no new timing values are approved by this planning document.

## 5. Separate pane presence, task state, and observer connectivity

The next model needs separate observations for terminal/pane availability, agent process presence, task lifecycle, and observer transport. Current `connectionStatus` cannot safely represent all four.

- A verified open pane remains a valid navigation target when the agent exits. Working, requests, and failures retain their actual lifecycle meaning; successful Done cools to Idle after ten seconds in compact and rows.
- A lost bridge connection, failed terminal query, truncated listing, missing provider label, or changed runtime does not prove that a pane closed. Display checking/reconnecting/unverified observation honestly.
- Pane identity and process/PTY identity need separate validation. User intent is pane continuity; a fresh verified pane match supports terminal navigation but does not prove that the task is still working.
- Preserve provider capability gates and result content. Presentation cooldown never fabricates task completion, process exit, or permission acknowledgment.

## 6. Repair no-op terminal navigation

Reproduce with explicit, owned source terminals before declaring a cause fixed. Trace bounded stages: click handler, native invocation, target resolution, CLI request, navigation acknowledgment, and failure presentation. Diagnostics should avoid prompts, transcript previews, tokens, and unrelated terminal output.

Investigate stale/missing bindings, installed-application CLI resolution, provider-only candidate filtering, first/repeated association writes, second-preflight rejection, timeouts, and feedback suppressed by presentation changes. Previous source inspection identified these possible exits, not a verified root cause. Test first and repeated clicks, app restart, agent exit with a surviving shell, same-project sessions, and split panes.

Validate the source session and actual destination. Do not guess by title or working directory, activate unrelated applications, or claim exact pane focus from an insufficient acknowledgment. Offer a clear Retry or Link terminal action when identity cannot be established; a silent no-op is unacceptable.

## 7. Connect the other primary providers

Read-only discovery found Codex 0.169.0, Antigravity agy 1.5.9, OpenCode CLI 2.2.7, and Orca 1.4.258. Antigravity advertises ACP/streaming/settings/plugin interfaces; OpenCode v2 advertises service/API/server/ACP interfaces. Help output establishes available entry points, not passive attachment, response delivery, or verified adapter support.

Verify version-specific contracts before selecting an adapter. Implement native fixed-action detection, configuration, diagnostics, and fresh-activity verification. Preserve unrelated configuration and explain required restarts/trust review. Connect does not silently launch a new task. Provider support for existing-session attachment, approvals/answers, exact terminal navigation, and quota must be reported separately. Reuse the guided island UI and honest loading/error/retry/unsupported states.

## 8. Remove closed sessions from the main list

Accepted policy: once a terminal pane is confirmed closed, move its session out of the main list and into Archive after five minutes. This is reversible archival. Enable it by default for new setup; expose the delay and an Off option in Behavior. Preserve explicit preferences during upgrades. Keep existing manual Delete/Delete all, confirmation, protected-target checks, and deletion barriers; automatic permanent deletion is not part of this revision.

Requests on confirmed closed terminals may follow this archival policy while preserving their last-known content and lifecycle. Archiving is not a response or a request resolution. Keep stale response controls disabled and preserve existing protections against permanent deletion of protected request context. A terminal that is still open, an observation failure, or transport loss alone cannot start the closure timer. Use authoritative closure time when available; otherwise start from the first fresh verified closure observation, never from an old last-seen timestamp. Do not move decision controls under pointer/keyboard interaction.

This approved closed-pane policy supersedes the old 24-hour confirmed-process-end visibility rule for the next revision. Finishing a task or exiting the agent while its pane remains open does not qualify. The new behavior is planning, not functionality in the 0.7.1 baseline.

### Reactivate an archived session when it resumes

Prefer reactivation over deleting an archived record. Match provider plus stable session identity and freshly verified terminal ownership; a project path, title, provider name, or reused tab alone is insufficient.

- A fresh verified resume/reopen episode for the same session clears its archived presentation atomically, cancels obsolete closure timers, and returns that same canonical record to Sessions. Preserve its context, output, identifiers, and revision high-water marks. It disappears from Archive without losing its data.
- The same terminal can be used for a different CLI session or provider. Create a distinct entry for that new identity; retain the previous archived session separately. Do not merge histories based on the pane alone.
- Reopening the same previously associated terminal may reactivate its record only when the association and ownership can still be verified. An unverified/reused pane requires appropriate verification or relinking.
- Repeated liveness checks, old reconnect snapshots, and cache replay are not resume episodes. Preserve deliberate manual Archive/Restore choices until genuinely new activation/closure evidence or an explicit user action justifies a change.
- Resumption while the application was stopped must still be recoverable. First reconcile cached context, then verify fresh runtime/provider identity before reactivation; do not weaken `Store::recover` or archive/deletion barriers to make a snapshot look live.
- A manually deleted record cannot be undeleted from stale cache. Genuinely new verified activity may create fresh context, continuing above its deletion barrier without resurrecting the purged application history.
- Reactivation must not replay old alerts, approvals, completion celebrations, or a new ten-second completion interval. Restore the currently verified state; preserve last-known state with freshness information when current activity is unavailable.
- If reactivation occurs during Archive interaction or deletion review, reject stale destructive targets, retain a valid focus destination, and avoid moving decisions under the user.

## 9. Recover work and terminal links after app restart

Owner-reported issue: closing the application while an agent works, then reopening, can leave the session appearing Offline with apparently lost context/navigation. Version 0.8.0 implements the recovery policy below; actual verification and remaining real-agent cases are recorded in the implementation report.

Source findings before version 0.8.0:

- The Rust store retains session bodies/lifecycle but marks restored sessions disconnected. Helper snapshots are also disconnected and imported once through `Store::recover`.
- Duplicate/equal-revision cached events cannot prove renewed liveness. A fresh hook reconnects, but no independent recurring terminal-presence recovery is implemented.
- The frontend prioritizes disconnected presentation over retained task state. This can make retained working context look offline during a long hook-free operation.
- Terminal associations are separately persisted. Offline rendering does not itself prove that the association was erased. Actual link failure remains to be diagnosed.

Approved behavior:

1. Restore retained task/project/output context and known terminal association immediately, marked Checking until revalidated. Start compact without replaying old notifications or taking OS/keyboard focus.
2. Independently revalidate the existing pane/runtime and obtain the newest supported provider/cache snapshot. Restore verified navigation without requiring another Connect for unchanged valid identities.
3. Reconcile events collected during downtime by authoritative revision/episode, including completion, input/approval, interruption, and terminal closure. Preserve archive/deletion barriers and source identity.
4. A verified pane permits navigation; Working versus Idle still requires appropriate lifecycle evidence. If fresh task state is unavailable, retain the last-known activity with an explicit freshness cue instead of inventing Offline or a current Working state.
5. Restore elapsed completion/cleanup timing from authoritative evidence rather than restarting timers or celebrating old results. Retained requests remain understandable but are actionable only after fresh validation and supported capabilities.
6. Keep missing/reused/closed pane identities distinct. Provide explicit relinking when fresh evidence cannot validate the old association; never silently choose another terminal.

Source areas to inspect during implementation: [native startup](../src-tauri/src/main.rs), [store/recovery](../crates/island-core/src/store.rs), [helper snapshots](../crates/codex-bridge/src/state.rs), [terminal identity](../crates/codex-bridge/src/terminal.rs), [navigation](../src-tauri/src/navigation.rs), [frontend state](../src/app.js), and [presentation policy](../src/presentation-policy.js).

## Acceptance and implementation boundary

Recommended engineering sequence:

1. Reproduce the no-op navigation and restart reports; establish bounded diagnostics and correct separation of terminal presence, task state, and transport.
2. Implement and verify identity-preserving pane recovery and exact navigation, including CLI exit with a surviving pane. Prefer runtime/native events; any fallback observation must be bounded, shared across sessions, coalesced, and independent of hover. A filtered, truncated, failed, or stale terminal listing is not closure evidence.
3. Implement provider-specific Connect adapters and capability reporting from verified contracts.
4. Apply the approved blocky pixel controls/companions, direct Archive route, explicit Back destinations, Done-to-Idle presentation, and state-preserving Threadcap branding. Implement five-minute closed-pane archival, configurable/default preference behavior, preserved closed-request context, and identity-safe reactivation.
5. Run native interaction/integration and human task checks, then package a production installer. A successful build alone does not close the reported issues.

The closed-session delay/default, restart presentation, and closed-request handling are settled. Automatic reactivation is the chosen interpretation of resuming the same archived session. The owner subsequently authorized implementation; technical evidence and remaining acceptance are tracked in the implementation report.

Required evidence includes first-time Archive discovery and Back navigation with humans; actual-size utility/provider state recognition; screenshots and short native motion recordings; exact terminal navigation in repeated/split/same-project/restart cases; provider-specific Connect verification; disconnect/reconnect, app Quit/restart, app crash/restart, completion during downtime, and reused/closed-pane tests; ordered duplicates/recovery; archive/deletion persistence; reduced motion, keyboard focus, native outside dismissal, hit regions, and supported display scales.

Retention/recovery acceptance must cover the same session resuming in its original or newly verified pane; the original pane starting a different session; resumption while the app is stopped; repeated liveness checks after manual Archive; reactivation during Delete confirmation; stale cached requests and alerts; cancellation of obsolete closure timers; and preservation of explicit Behavior preferences on upgrade. Confirm that no case deletes CLI history or revives purged application history.

Distinguish source inspection, mock/fixture checks, actual native interaction, and real CLI validation. Documentation approval, passing builds, and the earlier implementation reports do not establish that this revision is shipped or that the reported bugs are fixed.
