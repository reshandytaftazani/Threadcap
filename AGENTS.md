# Agent Instructions

## Project purpose

Build a refined Windows Dynamic Island companion for **Codex CLI, Antigravity CLI, and OpenCode CLI**. Help users monitor concurrent sessions, answer supported requests, approve supported actions, and return to their terminals.

These three integrations are the primary scope. Existing references to other agents are historical or extension ideas; do not let them displace the primary integrations.

## Read first

1. Read [design.md](design.md) before making product, UI, interaction, or motion changes.
2. Inspect the relevant runtime files before changing behavior. Documentation describes intent; source inspection establishes current implementation.
3. Treat `docs/archive/agent-context.md` as historical context. Its old dimensions, shortcuts, status-based mascots, decorative effects, and integration assumptions must not override this file or `design.md`.

Current user instructions take priority. For repository design decisions, use `design.md` as the source of truth and keep this file consistent with it. Do not reintroduce superseded visual rules from historical documents.

Version **0.8.0 is Threadcap**, using the selected **Edge signal concept A** in `docs/design/concepts/threadcap-mark-a.svg`. Read [the revision plan](docs/archive/plans/threadcap-revision.md) and [implementation report](docs/verification/releases/v0.8.0.md) alongside design.md. The revision preserves composition, strengthens pixel utilities/state companions, adds direct Archive/Back routes, and separates native pane availability from observer/task state. The historical 0.8.0 release introduced a five-minute configurable archive delay; 0.8.4 supersedes it with immediate archival after confirmed closure for every provider. Closed-request context remains protected from permanent deletion. Reactivation requires fresh identity/activation evidence; a reused pane alone is insufficient. Restart restores context with Checking and revalidates links without another Connect. Provider Connect is version-gated and monitoring-only; registration and fixture checks do not establish live-agent verification. Retain compatibility storage, executable names, integration tags, application identifier, and NSIS upgrade keys described in the report. Historical 0.7.x behavior below is superseded where this revision conflicts; do not confuse the new icon with historical 0.7.0 candidate A.

## Language and repository documentation

Version 0.8.4 supersedes all earlier closure delays/Off settings: confirmed terminal or CLI-session end immediately archives sessions for all three providers. Preserve task/request context and CLI history. OpenCode uses exact native TUI parent identities, separate from its persistent server; any verified owning client keeps the session visible. Backend events cannot revive closed CLI context without fresh client ownership. Legacy local OpenCode recovery requires a complete zero-client census; unknown observations and external rows never authorize removal. See [client closure](docs/verification/releases/v0.8.4-client-closure.md). Earlier release-specific retention descriptions below are historical.

Version 0.8.1 overrides Antigravity retention: a confirmed CLI process exit or associated-pane closure immediately archives its session, regardless of the general delay/Off setting. Do not interpret the Antigravity Stop hook as CLI exit. Capture the hook's actual ancestor PID/creation time and verify it natively; unknown/access-denied observations never authorize removal. New monitoring requires refreshing the bundled observer through Connect. See [the exit fix](docs/verification/releases/v0.8.1-antigravity-exit.md). This 0.8.1 provider-only rule is historical; 0.8.4 applies immediate confirmed-closure archival to all providers.

- Write new or revised repository documentation, comments, and authored UI copy in clear English.
- Preserve the original language of user prompts, agent output, task titles, commands, paths, and project names.
- Keep checked-in documentation portable: use relative repository links and paths; exclude personal machine paths and private conversation links.
- Distinguish proposed behavior, verified capability, and implemented functionality. Do not describe a roadmap item as shipped.
- Existing historical documents may require separate cleanup; changing this file does not establish that every repository document is publication-ready.

## Visual requirements

- Follow Vibe Island's visual direction: true black surface, small pixel avatars, flat session rows, quiet metadata, compact utility controls, and continuous shape changes.
- Version 0.7.0 implements the softer hierarchy in design.md section 4 across compact, hover, sessions, detail, and Settings through lighter summary emphasis, balanced grouping, and shared control/motion tokens. Preserve black, small marks, contrast, and horizontal-only hover. Derive live counts from verified connected sessions; use saved counts for retained disconnected context and distinguish bridge loss from per-session disconnection. Do not label a mixed group wholly offline or treat retained count as active count. See [the roadmap](docs/development/roadmap.md#approved-refinement-softer-island-and-truthful-summaries).
- Use EchoIsland for relevant Windows architecture and session aggregation ideas.
- Do not restore the superseded single-file prototype as a visual baseline. The refined `src/index.html`, `src/island.css`, `src/avatars.js`, and `src/app.js` implement the approved direction; maintain them against `design.md`.
- Use pixel interpretations of the actual Codex product cloud/prompt, Antigravity arch, and OpenCode rectangular mark. Preserve brand palettes and recognizable silhouettes across every state. Do not invent mascots or use the generic OpenAI Blossom as the Codex product mark.
- Animate separate state companions with provider-specific rhythms for working, input, approval, sending, completion, failure, and offline states. Version 0.7.0 adds occasional idle companion motion with long rest periods; static utility/header marks remain static. Keep product marks stable. Do not deform, recolor, dim, or flash product marks. Stop hidden loops and preserve one-shot animation identity during unrelated updates.
- Follow the decoded demo's discrete pixel motion, adapted to brand-faithful marks rather than faces, horns, hands, thrusters, or shaded metal. Source provenance and the distinction between official assets and project adaptations are recorded in `docs/design/agent-icons.md`.
- Preserve compact, focused-session, and all-session presentations. Explicit strip/hotkey opening shows the Sessions overview with no selected session. Fresh request auto-open may still reveal the relevant detail, subject to interaction protection and the user's preference. Keep `Show all N sessions` in focused detail; opening never grants permission or sends a reply.
- Use icons for familiar utilities, with tooltips, accessible names, visible focus, and consistent targets.
- Keep task context, questions, error explanations, and consequential decisions understandable without hover.
- Approval actions retain short `Allow` and `Deny` labels with clear scope. Do not replace them with unlabeled symbols.
- Reveal agent name, model, terminal, and complete paths in selected detail instead of repeating badges in every row.
- Avoid dashboard layouts, nested cards, large avatars, fake macOS chrome, persistent glow, and decorative motion.
- Keep hover strictly horizontal: widen the compact strip without changing its height or opening a panel. Version 0.6.0 implements Agents, Appearance, and Behavior pages inside the same island surface, preserving navigation and drafts. Do not restore the separate Settings dialog.
- Version 0.7.0 implements attention/retention rules from design.md and docs/development/roadmap.md: auto-open fresh requests defaults on without OS focus theft, protects typing/Settings/current request interaction, and suppresses replay after manual dismissal or reconnect. Completion cools down visually after 10 seconds while preserving completed output. The historical 0.7.0 optional retention policy is superseded by 0.8.4: confirmed closure archives immediately for all providers, preserving pending-request context. Archive metadata and revision barriers persist in Rust; helper-cache recovery must use Store::recover and cannot restore archived rows. Confirmed process end is distinct from losing connectivity; task lifecycle remains unchanged.
- Display real remaining quota by verified provider/account and actual limit window. Shared account quota is not per-session progress. Show unavailable/stale states honestly, never infer access recovery from a reset timer, and do not start collectors on hover. Version 0.6.0 reads Codex account snapshots through separate native IPC; session mapping, push updates, and other providers' quota remain unverified. See design.md sections 9 and 15 and docs/guides/usage.md before extending the protocol.
- Use original or appropriately licensed assets. Do not extract proprietary reference-app assets.
- Version 0.7.1 adds explicitly confirmed Delete/Clear archive in the island. Bind captured IDs and revisions; reject changed or protected targets atomically. Preserve deletion high-water guards across recovery, report cache-cleanup failures honestly, and never delete CLI history or project files. Automatic permanent deletion remains prohibited. See design.md's archive deletion specification.

## Motion and state changes

- Default to attachment at the upper edge with zero gap, square upper corners, no top border, and rounded lower corners. Keep compact, focused, and overview presentations attached while morphing. Floating presentation is an explicit alternative, not the startup default.
- Implement the surface and state transition guidance in **design.md, section 13**. Keep motion tokens centralized rather than scattering durations and easing values.
- Keep the top-center anchor fixed while morphing. Animate surface geometry and content separately; do not scale text or the entire panel.
- Retarget interrupted transitions from current rendered bounds. Rapid toggles settle at the latest requested presentation state.
- Keep session lifecycle, connection state, request delivery, and presentation state separate. Animation callbacks must not send decisions or determine task success.
- Apply authoritative events immediately. Coalesce only noncritical visual progress updates; never drop requests, withdrawals, failures, or acknowledgment.
- Preserve focused inputs, caret position, drafts, request IDs, scroll context, and stable row identity.
- Freeze row ordering during pointer or keyboard interaction. Incoming events must not move decision buttons under the user.
- Respect reduced motion at runtime. Remove geometric motion and avatar loops while preserving state information and interaction.
- Keep shell bounds, visible shape, and click-through regions synchronized throughout transitions.
- Native outside-click dismissal must work without a foreground-focus change. Keep its mouse hook active only while the panel or Settings is open, forward input, and compare native root windows so WebView2 children remain inside. Disarm on compact/hide and preserve close/open ordering. Do not replace this behavior with blur-only handling or permanent cursor polling.

## Integration correctness

- The source-terminal picker also supports explicit Windows Console and Windows Terminal links. Validate the window class, owner process, and process creation time. Where Windows Terminal exposes selectable tabs, validate the tab runtime identity and confirm selection in the foreground window. Label window-only choices as such. Manual Windows links are navigation preferences and never establish CLI lifetime. See [Windows targets](docs/integrations/orca-navigation.md#local-windows-targets).

- The bundled Codex local-client launcher uses `--no-daemon` so the observer can bind a hook to its own local Codex ancestor. Archive only after verified process exit. Unbound and shared-daemon sessions retain their existing SessionEnd and verified Orca paths. See [PowerShell terminal closure](docs/integrations/codex.md#powershell-terminal-closure).

- Unreleased terminal navigation uses live OpenCode TUI-owned Orca identities, separate from the persistent server. Resolve one owner automatically, preserve a verified selected owner among multiple clients, and require selection when ownership is ambiguous. Reject confirmed closed sessions and changed PTY incarnations; revalidate client ownership before switching. Codex and Antigravity hook links retain revision alignment across events without launch variables. See [current navigation verification](docs/verification/provider-navigation.md). Other terminal hosts remain unsupported.

- Unreleased OpenCode direct replies use a separate TUI-owned native connector for simple 2.3.0 question forms. The server plugin remains monitoring-only. Keep generic HTTP actions disabled; producer capabilities cannot grant replies or command approval. See [scope and verification](docs/verification/opencode-replies.md).

- Version 0.8.3 generates encoded Windows launchers after real Codex/Antigravity runners exposed quoted-path failures before observer startup. Do not restore the direct quoted-executable optimization based only on a raw CMD fixture. Keep the reviewed Codex command stable across binary updates. OpenCode Connect supports verified 2.2.7 and 2.3.0 and observes opened/durable lifecycle events; viewing or compatibility-idle events cannot erase authoritative task state. Antigravity quota uses the official status-line payload, preserving existing output and disabled preferences; its separate cache hashes account identity and never infers window duration or session progress. Account-to-session mapping and OpenCode quota remain unavailable. See [provider repair evidence and limits](docs/verification/releases/v0.8.3-provider-monitoring.md).

- Version 0.8.2 automatically refreshes an existing managed observer binary at startup without rewriting provider hooks, retrying locked-file failures. Legacy PID-less local Antigravity cache entries require a complete native zero-running-process census before an ordered exit report; age, disconnection, and a process name in a snapshot are insufficient. Preserve the exclusion of external producer rows and purged cache entries. See [upgrade recovery](docs/verification/releases/v0.8.2-observer-upgrade.md).

- Normalize adapters into a shared session model using stable IDs: `codex`, `antigravity`, and `opencode`.
- Verify each CLI's supported interfaces and installed version. Do not assume common hook names, transcript locations, or response protocols.
- Expose capabilities explicitly. Monitoring support does not imply approval, answers, exact-tab navigation, or usage data.
- Bind responses to both session and request IDs. Deduplicate events and submissions; ignore stale revisions and expired requests.
- Show response success only after actual adapter acknowledgment. Receipt of an approval does not prove that execution succeeded or resumed.
- Keep failed, completed, and disconnected states distinct. A denied request does not automatically imply task failure.
- Preserve context while offline. Validate a fresh snapshot before re-enabling decisions; do not replay old request notifications or sounds.
- Keep preview fixtures behind an explicit `Preview` mode. Never present fabricated sessions, model names, usage, or progress as live data.
- Jump only to targets supported by the adapter. Describe application-level navigation honestly and do not activate unrelated fallback applications.
- Version 0.6.2 adds native local Orca navigation for Codex. Validate runtime, handle, pane, worktree, and PTY incarnation. Use explicit manual selection for unbound sessions; do not infer association from titles or paths. This separate native connector does not enable generic bridge actions. See [navigation](docs/integrations/orca-navigation.md).
- Keep local transport bound to loopback. Treat incoming session text as data, not executable HTML or shell code.

## Current repository map

See [repository layout and naming](docs/development/repository-layout.md). Keep active provider observers in `integrations/`, opt-in native checks in `tests/native/`, and historical Python/Edge code in `legacy/`. Rust integration tests remain in each crate's top-level `tests/`, alongside `src/`.

| Path | Current role |
| --- | --- |
| `src/index.html` | Standalone island structure and explicit preview controls |
| `src/island.css` | Shared visual tokens, surface transitions, and per-agent state animations |
| `src/avatars.js` | Source-derived pixel product marks with independent state companions |
| `src/app.js` | Session UI, measured surface sizing, preview fixtures, and bridge client |
| `src/session-model.js` | Validated snapshots, ordered live events, and independent connection state |
| `src/presentation-policy.js` | Request episode ordering, replay suppression, compact completion cooldown, and truthful session counts |
| `src/desktop.js` | Tauri-only IPC transport and measured native shape synchronization |
| `src/usage.js` | Validated account quota display, freshness, and coalesced native reads |
| `src-tauri/src/usage.rs` | Bounded Codex collector and read-only Antigravity quota IPC |
| `src-tauri/` | Primary Rust/Tauri desktop host, tray, shortcut, permissions, and installer |
| `src-tauri/src/outside_click.rs` | Scoped Windows mouse hook and one-dismissal-per-open lifecycle |
| `src-tauri/src/codex_setup.rs` | Fixed-action native Codex setup and diagnostics through the bundled helper |
| `src-tauri/src/navigation.rs` | Verified local Orca terminal navigation and persistent manual associations |
| `crates/island-core/` | Rust SQLite session store and loopback HTTP/SSE transport |
| `crates/codex-bridge/` | Bundled Windows Codex hook observer, local cache, setup, and diagnostics |
| `crates/codex-bridge/src/terminal.rs` | Safe inherited Orca identity stored with accepted hook revisions |
| `crates/codex-bridge/src/agy_usage.rs` | Official Antigravity status-line quota cache and original-command forwarding |
| `crates/codex-bridge/src/provider_config.rs` | Shared configuration-preserving provider observer registration |
| `docs/integrations/codex.md` | Portable installation, trust review, capability limits, and release instructions |
| `legacy/bridge/antigravity_bridge.py` | Legacy Python HTTP/SSE bridge and optional experimental transcript reader |
| `legacy/bridge/session_store.py` | Durable canonical session state, revisions, deduplication, and atomic subscriptions |
| `legacy/bridge/transport.py` | Loopback HTTP/SSE endpoints and explicit rejection of unsupported actions |
| `integrations/antigravity/watch.ps1` | Antigravity process wrapper |
| `legacy/desktop/launch-island.ps1` | Legacy Edge App Mode preview launcher |
| `legacy/desktop/run_desktop.py` | Legacy Python desktop launcher wrapper |
| `package.json` | Development entry points |
| `design.md` | Approved design, interaction, motion, and acceptance criteria |
| `docs/development/roadmap.md` | Approved future directions, engineering scope, and unresolved behavior decisions; not shipped capabilities |
| `docs/archive/agent-context.md` | Historical context, including superseded design assumptions |

The bridge currently uses `127.0.0.1:37891`. Relevant routes include `GET /api/events`, `GET /api/sessions`, `POST /api/sessions`, `POST /api/notify`, and `POST /api/action`.

Both live bridge implementations start without seeded sessions. They persist canonical state and revision high-water marks in SQLite, restore retained sessions as disconnected after restart, and synchronize the UI through complete snapshots and ordered updates. See [docs/architecture/bridge-protocol.md](docs/architecture/bridge-protocol.md). The Codex Rust helper provides monitoring through 10 official hooks after installation and manual Codex trust review; see [setup](docs/integrations/codex.md) and [verification](docs/verification/codex.md). Never bypass hook trust or assume monitoring permits responses. The Antigravity wrapper reports process start and exit with stable UUID identities and producer revisions. The legacy Python transcript reader requires explicit `--watch-antigravity` opt-in and remains unverified. Generic HTTP actions return 501; producer-supplied capabilities cannot enable unsupported responses or terminal navigation. Version 0.6.2 separately implements validated native local Orca Codex navigation. The OpenCode monitoring adapter and TUI lifetime observer are implemented; see docs/guides/capabilities.md for version-specific evidence. Reliable bidirectional delivery, navigation in other terminal hosts, and broader native desktop validation remain implementation targets.

Tauri v2 with a Rust bridge is the primary desktop implementation. `npm.cmd run dev` runs Tauri development mode; `npm.cmd run build` creates the release installer. The host embeds frontend assets and does not launch Python or Edge App Mode. Both bridge implementations retain protocol version 1 and compatible SQLite state. The Tauri UI uses IPC channels; external producers use the Rust loopback HTTP listener. See [docs/architecture/desktop.md](docs/architecture/desktop.md) for implemented behavior and runtime limits. Do not equate successful builds or mock IPC tests with native click-through, DPI, focus, or real CLI verification.

## Development and verification

Existing entry points:

```powershell
npm.cmd test
npm.cmd run preview
python legacy/bridge/antigravity_bridge.py
npm.cmd run dev
npm.cmd run build
npm.cmd run test:native
npm.cmd run watch:antigravity -- "your task"
```

For the isolated UI preview, run `npm.cmd run preview` and open `http://127.0.0.1:4173/?preview=1`. Preview actions are simulated and never sent to the bridge. The browser shortcut works only while the page has focus. The native host separately attempts global registration and reports its result. Stop the old Python bridge before starting the Tauri host; never run both against the same live database. MSVC Rust and Visual Studio C++ Build Tools are required for native builds; end users do not need the development toolchain or Python.

The final command invokes a real Antigravity task; use it only when a live integration run is appropriate and authorized. Do not launch agents merely to validate documentation or appearance.

- Inspect existing scripts before running them. Prefer targeted, reversible changes and preserve unrelated work.
- Work without subagents, as requested by the maintainer. Validate changes against the current source and a freshly built executable when native checks are needed; an older installed build is not evidence for the current implementation.
- For UI changes, review against `design.md` rather than the legacy screenshot. Capture representative screenshots and short motion recordings when a suitable runtime is available.
- Check keyboard access, accessible names, contrast, reduced motion, focus preservation, and larger text.
- Validate compact and expanded layouts at 1366 x 768 and 1920 x 1080, with 100%, 125%, 150%, and 200% scaling. Include mixed-DPI monitors and different taskbar positions when testing the desktop shell.
- Exercise interrupted opening, rapid toggles, state changes during animation, a new request while typing, disconnect while sending, duplicate events, and reconnect snapshots.
- Test meaningful event ordering and request-delivery behavior when runtime code changes. Documentation-only changes need link, consistency, and formatting checks, not live CLI runs.
- Report what changed, what was verified, and what remains unimplemented. Do not label visual inspection or real CLI integration as tested unless it was actually performed.

## Graphify

When the user invokes `/graphify`, use the installed graphify skill and read its instructions before doing anything else. Resolve the skill from the current environment rather than hardcoding a personal machine path. Prefer an existing graph when the skill's query workflow applies.
