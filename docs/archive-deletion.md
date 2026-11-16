# Archive deletion

In Threadcap 0.8.0, open **Archive** directly from Sessions. Use Delete beside one archived session, or Delete all for the currently captured archived set. Review the title/count and confirm inside the island. Cancel receives focus initially. The visible Archive return cancels an unsubmitted review; Sessions returns from the archive list. Escape, page navigation, and outside dismissal also cancel an unsubmitted confirmation. Once submitted, Cancel and duplicate submission are disabled; closing the island does not undo a committed operation. The original deletion guards introduced in 0.7.1 remain.

Confirmation captures exact session IDs and canonical revisions. The native store checks every target before committing an atomic transaction. A restored, changed, protected, or missing target rejects the whole batch. Sessions archived after confirmation are not silently added. A batch supports up to 10000 explicitly selected archives.

## Data scope

Deletion removes canonical saved session bodies and associated event records from the Rust store. The host also clears matching Codex/provider observer-cache content and saved Orca terminal associations. Cached revision and replay identities remain available so a later genuine activation can advance normally. Newer helper data is preserved and reported as incomplete cleanup rather than erased under an older confirmation.

Minimal session ID, source revision, canonical revision, and deletion-time guards prevent recovery snapshots, stale reports, and old timestamped helper retries from restoring deleted context. Genuinely newer prompts or requests may create fresh context; their canonical revision continues above the deletion barrier. This is logical removal, not forensic secure erasure of SQLite storage or external backups.

CLI transcripts/history, project files, account data, hook configuration, and other sessions remain outside deletion scope. Native IPC accepts identities and revisions, never file paths or shell commands. The generic HTTP action route does not gain deletion capability. Legacy Python retention/deletion is unsupported.

## Verification

Checks use temporary profiles, fixture sessions, separate native smoke identity, and separate ports. No model tasks or real user archives were deleted.

- JavaScript: 15 unit checks passed, including ordered removal, duplicate events, malformed removal batches, and existing presentation/session invariants.
- Rust core: 12 protocol and five retention checks passed. New checks cover atomicity, revision validation, protected/restored targets, persisted deletion guards, stale/recovery rejection, and genuine new work after deletion.
- Codex helper: 17 checks passed, including cache purging, monotonic revision continuation, and preservation/reporting of newer cache content. The targeted purge check was rerun after adding assertions for skipped cleanup.
- Native host: eight unit checks passed; the smoke executable compiled the new commands and helper cleanup integration.
- `scripts/check-archive-delete-native.cjs`: 19 native checks passed after the final confirmation adjustment. These include Cancel/default focus, Escape/Back/page navigation, no deletion on opening, visible decisions after scrolling, duplicate prevention, single deletion, captured bulk scope, active-session protection, rejected stale confirmation, outside dismissal, real helper-cache clearing, fresh-prompt recovery, and honest incomplete-cleanup reporting.
- Native regression: 16 refinement checks and nine physical outside-click checks passed. The final confirmation screenshot is `artifacts/archive-delete-confirm.png`.

The initial screenshot exposed decisions below the scroll viewport. Confirmation now scrolls into view and reserves focus-outline space; cancellation restores the previous Settings scroll position. A fractional DPI edge clipping found in the first follow-up was resolved by the confirmation's bottom padding. The final inspected screenshot shows both decisions completely.

The release installer was built successfully with production configuration using `npm.cmd run desktop:build`, separately from debug smoke verification. `npm.cmd run release:stage` staged version 0.7.1 and its SHA-256 checksums; every staged checksum was verified. Broader mixed-DPI/platform coverage remains as documented in the roadmap implementation report. Python is used only by the native test to inspect an isolated SQLite fixture; the application does not require it.

## Antislop delivery gate

This narrow addition retains the [0.7.0 gate](roadmap-implementation.md#antislop-delivery-gate) for unchanged rules and design direction: ENERGY 1 / RHYTHM 1 / MOTION 2. No new assets, fonts, decorative techniques, or navigation pages were introduced. Applicable changed controls pass the following checks:

- R-02 PASS: new copy uses plain punctuation.
- R-03 PASS: archive titles wrap; confirmation scrolls into view; native bounds checks verify visible decisions.
- R-23 PASS: the owner explicitly approved Delete and Clear archive with confirmation; no visual asset was created.
- R-25 PASS: existing verified neutral and error-color tokens are reused on the same black surface.
- R-26 PASS: Delete, Clear archive, confirmation, Cancel, native rejection, and partial cleanup were exercised.
- R-27 PASS: empty archive, submitting, stale selection, cleanup failure, and successful deletion have truthful feedback.
- R-32 PASS: Cancel receives focus; explicit buttons keep existing visible focus; dismissal preserves Settings context and scroll.
- R-33 PASS: UI changes were written directly in source patches.
- R-35 PASS: native click-through, real helper-cache inspection, unit checks, and installer build were run.
- R-36 PASS: logical deletion is distinguished from secure erasure; cleanup failures are not reported as complete removal.
- R-37 PASS: the approved existing visual direction was retained.
- R-38 PASS: test fixtures are isolated; no unverified interactive CLI capability is added.
- R-39 PASS: native named buttons retain hover/focus/pressed/disabled states; existing reduced-motion rules and geometry synchronization apply.
- R-19 PASS: existing content/surface transitions connect inline confirmation; text and controls are not scaled.
- C-1 PASS: flat inline confirmation preserves the island's task context.
- C-2 PASS: destructive actions require acknowledged native results and handle rejection.
- C-3 PASS: every added element supports reviewing, confirming, or canceling deletion.
- C-4 PASS: scroll bounds, native dismissal, changed targets, and duplicate submissions were exercised.
- C-5 PASS: test boundaries and deletion scope are explicit.
- R-15 PASS: Delete, Clear archive, and Cancel name their concrete actions.
- R-31 PASS: grouping, captured scope, and default Cancel focus reduce accidental destructive interaction.
