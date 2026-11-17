# Design Specification - Threadcap

Approved refinement (November 17, 2026): explicit strip and hotkey opening shows the Sessions overview without selecting a session, including pending-request and completed summaries. Fresh questions/approvals retain automatic focused reveal under the existing preference and interaction protections. This supersedes historical request/result-first descriptions for manual opening below. See [verification](docs/verification/session-opening.md).

Version 0.8.4 closure rule: a confirmed agent/session end or confirmed terminal closure removes that session from the main list immediately into Archive, retaining task state, output, unresolved requests, and CLI history. A completed turn, lost bridge, expired heartbeat, or unknown observation is not closure. OpenCode's persistent server is separate from the TUI clients: native process identity from a local TUI observer establishes client lifetime. Keep a session visible while any verified client owns it; remove it after the last verified client exits. Background server events cannot revive closed CLI context without fresh client ownership. Legacy local OpenCode observer rows may be archived after a complete native census confirms that no CLI client remains; unowned external rows remain unverified.

Version 0.8.3 adds provider-monitoring repairs and Antigravity account quota from its official CLI status-line payload. Show remaining percentages and amounts separately, preserve provider bucket names, label unreported windows, and expose stale/unavailable readings. Keep account-to-session mapping unverified and quota separate from task progress. Preserve the user's status-line command and disabled preference. OpenCode quota remains unavailable. See [implementation and verification boundaries](docs/verification/releases/v0.8.3-provider-monitoring.md); this supersedes earlier Antigravity-quota unavailability notes below without changing the island's composition or motion.

Historical baseline: Threadcap 0.8.2 builds on the 0.8.0 revision, adding the [Antigravity exit override](docs/verification/releases/v0.8.1-antigravity-exit.md) and [observer upgrade recovery](docs/verification/releases/v0.8.2-observer-upgrade.md). Recovery removes confirmed ended sessions from the main list into Archive without deleting CLI history; a session's age alone is not exit evidence. Capability and verification limits for the foundation are recorded in [the implementation report](docs/verification/releases/v0.8.0.md). Version 0.7.1 descriptions are historical baseline evidence. See [the revision plan](docs/archive/plans/threadcap-revision.md) for the accepted scope; implementation does not establish complete live-provider, installer-upgrade, or human acceptance.

Version 0.7.0 implements the approved roadmap additions in the native host: reversible archiving, softer shared hierarchy and live/saved summaries, a measured Codex hook-launch optimization, an original application mark, occasional idle companion motion, guided Codex setup, fresh-request reveal, and completion cooldown. Supported integration capabilities remain unchanged. Engineering scope, verification, and remaining reference/platform limits are recorded in [the development roadmap](docs/development/roadmap.md) and [implementation report](docs/verification/releases/v0.7.0.md).

Approved refinement (November 16, 2026): hover widens the compact strip horizontally without opening content below it. Click opens session details. Settings is a paged view inside the same island, and real remaining quota appears in the widened strip and opened views. Version 0.6.0 implements these presentations and a native Codex account-quota reader. Account-to-session mapping remains unverified, so focused sessions do not claim an account balance. Antigravity/OpenCode quota and push updates remain unsupported. See [usage architecture](docs/guides/usage.md) and [refinement verification](docs/verification/refinements.md) for implemented boundaries.

Implementation note (November 16, 2026): the shared session foundation provides durable bridge state, producer-event deduplication, monotonic revisions, ordered SSE, validated reconnect snapshots, and in-page draft/focus preservation. Live mode has no seeded fixtures. Version 0.5.0 bundles a Codex hook observer verified against the 0.169.0 configuration contract, with isolated native transport checks. Registration and manual Codex trust review are required; see [the Codex guide](docs/integrations/codex.md). Version 0.6.2 adds verified local Orca Codex terminal navigation through separate native IPC, described in section 12. OpenCode integration, approval/reply acknowledgment, other terminal hosts, and broader native validation remain separate work. See [the bridge protocol](docs/architecture/bridge-protocol.md).

Runtime decision: the primary desktop host now uses **Tauri 2 + Rust**, retaining this frontend and visual direction. Rust owns session storage, loopback producer transport, and native window lifecycle; the embedded UI uses IPC channels. Transparent window regions track measured surface geometry. The legacy Python/Edge launch path is retained only for development comparison. Native runtime validation and CLI adapters remain distinct from implementing or compiling this shell; see [native desktop notes](docs/architecture/desktop.md).

## Threadcap revision: approved planning

Version 0.8.1 override: confirmed Antigravity CLI exit (including `/exit`) or verified closure of its associated pane removes the session from Sessions immediately, through reversible Archive. This ignores the general archive delay/Off preference for that provider only. A completed turn, a lost bridge, or an unverified process does not establish exit. The native observer checks the exact hook-owning PID and creation time; PID reuse cannot keep an old session alive. Preserve context, requests, deletion guards, and CLI history. See [Antigravity exit behavior](docs/verification/releases/v0.8.1-antigravity-exit.md).

The owner selected the name Threadcap and the original **Edge signal, concept A** application mark in [this vector](docs/design/concepts/threadcap-mark-a.svg). This is distinct from candidate A in the historical 0.7.0 icon study. Version 0.8.0 applies this public identity while retaining compatibility identifiers and storage; see the implementation report for upgrade boundaries.

These rules supersede conflicting earlier visual/interaction targets for the next revision, while historical release descriptions remain evidence of the baseline:

- Preserve the existing island composition and true-black attached surface. Make utilities and state companions visibly blocky/pixellated rather than faint thin-line glyphs. Use coherent filled integer-grid geometry, clear hover/pressed/selected states, and normal readable UI text. Product mark silhouettes and palettes stay recognizable.
- Give working, input, approval, sending, Done, Idle, failure, and terminal/observer availability readable static cues plus provider-specific discrete motion. State must remain understandable when motion is paused. Compact provider summaries reflect actual aggregated state; expanded rows retain their individual session states. Final optical sizes and cadence require visual verification.
- Keep hover horizontal at unchanged height, geometry separate from final-size text, native hit regions synchronized, and reduced motion available. Reinspect the actual referenced demo before claiming visual/motion fidelity; local app recordings are not demo footage.
- Expose Archive directly from Sessions with a count. Archive rows expose Restore and Delete; the bulk action is labeled Delete all. Destructive scope, captured IDs/revisions, confirmation, and cleanup feedback remain explicit.
- Back shows its actual destination: Sessions from Archive/Settings/focused session, Agents from provider detail, and Archive from deletion review. Escape moves one level. Preserve the underlying route, scroll, drafts, selection, and valid focus target. Keep deletion review and both decisions visible inside the island, using a focused review body rather than requiring a search below a long list.
- After ten seconds, successful Done becomes Idle in both compact and rows while the associated pane remains open; result content and canonical lifecycle remain available. Working, unresolved requests, and failure retain their actual meaning.
- Pane presence, agent-process presence, task lifecycle, and observer connectivity are separate. A surviving pane remains available after the CLI finishes/exits. Offline requires verified pane closure; failed queries and bridge/recovery uncertainty use checking/reconnecting/unverified cues.
- After verified terminal-pane closure, move the session to Archive after five minutes. Enable this for new setup, with a configurable delay and Off option in Behavior; preserve explicit preferences on upgrade. Retain unanswered request content without automatically answering or resolving it. Automatic permanent deletion is prohibited; manual deletion remains scoped to application context, preserving CLI history/project files and deletion guards.
- A freshly verified resumption of the same provider/session reactivates its existing record, preserves context, cancels obsolete closure timers, and removes it from Archive without duplication or deletion. Reusing the same pane for a different session creates a separate entry. Old snapshots and repeated liveness checks cannot override a deliberate archive or deletion; validate identity and fresh activation evidence first. Do not replay old request alerts or completion animations.
- Add native Antigravity and OpenCode Connect flows using verified provider/version contracts, following detect/configure/review/verify semantics. Registration, actual activity, terminal navigation, quota, and response capabilities remain distinct.
- After app restart, immediately restore retained context and known terminal associations with Checking. Independently revalidate pane identity and current activity, restoring valid navigation without another Connect. Until fresh evidence exists, distinguish last-known activity from current state; pane existence alone cannot prove Working. Reconcile downtime events and elapsed timers without replaying old alerts or weakening archive/deletion barriers.

The full accepted scope, reported UX/navigation failures, source findings, and technical validation requirements are in [the revision plan](docs/archive/plans/threadcap-revision.md). The retention and restart policy questions are settled. Version 0.8.0 implementation and observed results are tracked separately in [the report](docs/verification/releases/v0.8.0.md); earlier planning statements below do not supersede this revision.

## 1. Product direction

Build a Windows desktop companion for **Codex CLI, Antigravity CLI, and OpenCode CLI**. Monitor concurrent sessions, respond to supported requests, and return to the relevant terminal through a compact island at the top center of the display. Give all three agents equal visual quality and navigation support.

**Vibe Island is the primary visual reference:** a black surface, small pixel avatars, compact session rows, restrained metadata, and smooth changes of shape. EchoIsland informs Windows session aggregation and adapter architecture.

The superseded single-file prototype is not a visual reference. The refined implementation now lives in `src/index.html`, `src/island.css`, `src/avatars.js`, and `src/app.js`. Maintain that implementation against this specification; do not restore the old layout, decorative effects, or interaction styling. Existing runtime code may be evaluated separately for reuse.

Documentation and authored UI copy use English. Preserve user prompts, project names, commands, paths, and agent output in their original language. Do not translate session content automatically.

The approved decisions are:

- Small, distinct pixel avatars identify Codex, Antigravity, and OpenCode.
- Familiar utility actions use icons with tooltips and accessible names.
- Task context and consequential decisions retain short, explicit text.
- Secondary information appears on demand.
- Motion connects surfaces and explains state changes without competing with work.

## 2. References and scope

References reviewed on November 15, 2026:

| Source | Purpose |
| --- | --- |
| [Vibe Island repository](https://github.com/vibeislandapp/vibe-island) | Product context; the public repository is a community home rather than the application UI source |
| [Vibe Island website](https://vibeisland.app/) | Session awareness, responses, and terminal navigation |
| [Official Vibe Island preview](https://vibeisland.app/images/og.jpg) | Visually inspected reference: black panel, small pixel characters, compact rows, quiet metadata, utility header, rounded lower corners |
| [Official Vibe Island demo video](https://www.youtube.com/watch?v=_nh_OE5aSwI) | Primary motion reference; the actual 29.9-second video was decoded and inspected across the full timeline, including close samples around state changes and panel transitions |
| [EchoIsland repository](https://github.com/FunplayAI/EchoIsland) | Windows desktop aggregation, adapters, and session recovery |

Dimensions, tokens, avatar concepts, and motion timings below are project design decisions, not measurements or copies of Vibe Island internals. Use original assets or appropriately licensed official assets.

### Video observations and adaptation

The video is the authority for motion character and pixel-art treatment. The following observations are distinct from the implementation timings proposed later:

| Approximate video interval | Observed behavior | Adaptation for this project |
| --- | --- | --- |
| 00:00-00:03 | A narrow black strip remains attached to the upper edge; a small blue pixel character accompanies working text | Stable top-center anchor; compact working summary; optional Windows bezel attachment |
| 00:03-00:07 | Close-ups show blue working, amber question, purple compacting, and green completion treatments with tiny pixel companions | Preserve the tiny stepped companion language; the latest approved revision keeps product mark colors fixed and moves semantic color into the companion |
| 00:14-00:17 | The strip reveals a focused permission surface with task context, operation preview, and decisions | Add a focused request presentation; grow the same outer surface downward before revealing the complete content |
| 00:17-00:19 | The request surface returns to the compact strip after the decision | Faster collapse; keep the current task and avatar continuous |
| 00:19-00:22 | A focused completion surface shows the latest result and a route to all sessions | Support a focused result using real session output; avoid opening the entire list for every event |
| 00:24-00:28 | The session overview expands, a session becomes selected, and the surface returns to compact | Separate focused-session and all-session presentations, with measured height changes and stable row identity |

The video's camera zooms, terminal switching, browser scrolling, and final window transition are editing/context, not island UI animations to reproduce. It demonstrates providers outside this project's initial three-agent scope. Do not claim that it defines official Codex, Antigravity, or OpenCode mascot artwork. Exact easing values and durations cannot be recovered from the edited footage; the values in section 13 are our implementation targets.

The video includes permission scopes beyond a single request. This project uses `Deny` and `Allow Once` with explicit scope; persistent permission or bypass controls require separately verified adapter support.

Local context reviewed: `README.md`, `AGENTS.md`, `docs/archive/agent-context.md`, `package.json`, the Python bridge, the Antigravity wrapper, and the desktop launcher. Their existing implementation describes a prototype, not the quality target.

## 3. Information hierarchy

The island should answer, at a glance:

1. Which sessions are active?
2. What task and project does each session belong to?
3. Which session needs a response?
4. How do I return to it?

| Level | Visible information |
| --- | --- |
| Compact | Agent avatar or avatar group, short task or session count, status glyph, optional elapsed time |
| Widened compact strip | Same-height summary with more task context and the represented provider's real remaining quota, when available |
| Focused session | One session's task, request or result, agent identity, and a short route to all sessions |
| Expanded list | Avatar, project and task, one activity line, elapsed time, terminal jump icon |
| Selected detail | Full agent name, terminal, model if available, complete prompt, request, command, path, or result |
| Settings | Agents, Appearance, and Behavior pages inside the same island surface |

Settings replaces the island's body through an explicit navigation action. It shares the outer surface, top-center anchor, and motion system with sessions. Large branding, statistics cards, charts, full chat history, and decorative chrome do not belong in the island.

## 4. Visual system

### Archive deletion, version 0.7.1

The owner approved manual permanent deletion of Vibe Island's archived context. In Settings > Behavior > View archive, each row offers Restore and Delete. Clear archive captures the currently listed archived sessions. Both destructive actions require an inline confirmation in the same island; no separate OS dialog or window is used. Show the session title or captured count, explain that CLI history/project files are unchanged and deletion cannot be undone, and focus Cancel by default. Escape, Back, page navigation, and outside dismissal cancel an unsubmitted confirmation.

Confirmation binds exact session identities and canonical revisions. Do not include sessions archived afterward; reject the entire batch if a target changed, was restored, or became protected. Disable duplicate submissions and preserve surrounding Settings context. Acknowledged removal updates the archive through ordered events without replaying unrelated request/completion animation. Retain short textual destructive labels, visible focus, error/retry feedback, wrapping context, and existing reduced-motion/surface transitions.

Delete saved session bodies, observer-owned cached context, and saved terminal associations where available. Preserve minimal identity/revision/deletion-time guards to prevent old snapshots or cache replay from recreating deleted context. A genuinely newer prompt or request may create fresh context. Surface incomplete local cleanup honestly; deletion is logical removal, not forensic secure erasure. No CLI transcript, agent history, project file, account, or hook configuration is deleted. Native deletion is limited to 10000 explicitly confirmed archives per batch.

### Approved refinement: softer hierarchy across the island

Status: implemented for version 0.7.0; see the implementation report for verified coverage. This refinement applies to compact, width-only hover, focused detail, session overview, and every Settings page. Retain Vibe Island as the primary direction. The reviewed [Raycast analysis in awesome-design-md](https://github.com/voltagent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md) is a secondary reference for quiet typography, subtle surface separation, and coherent control grouping. It is an analysis of a reference product, not an official Raycast specification. Do not import its marketing layout, typography scale, gradients, or assets.

Keep ENERGY 1 / RHYTHM 1 / MOTION 2. Preserve true black, top-edge attachment, small brand-faithful pixel marks, flat rows, readable contrast, and restrained focus/status accents. Make the composition softer through hierarchy, spacing, and continuity rather than lowering legibility or adding decoration.

- Reduce compact summary emphasis toward medium weight, with task/request content retaining precedence over counts and utilities. Reuse shared typography tokens across compact, session, and Settings views.
- Group the provider mark and summary closely. Keep connection status and the chevron a quiet utility group. Replace disproportionate flexible space with balanced, content-aware spacing; allow task text to truncate before collapsing controls or reducing their targets.
- Keep the established tiny provider marks at their intended optical scale. Do not enlarge, dim, or recolor marks to compensate for weak composition.
- Use shared spacing, control radii, hover/pressed treatment, and visible keyboard focus throughout all presentations. Prefer subtle inset separation where content needs grouping; avoid additional cards, persistent glow, blur, and heavy shadows.
- Preserve the same top-center anchor and continuous outer surface. Follow section 13 for geometry and content transitions, with text at its final size and interrupted motion retargeted from rendered bounds. Hover only widens the strip; its height remains unchanged and no body opens.

#### Truthful live and saved session summaries

Separate live session connectivity, retained context, and current task activity. A connected idle or completed session is not necessarily working; a disconnected retained session is not necessarily ended, archived, or safe to delete. `Saved` describes retained context only.

| Available evidence | Planned compact summary | Hover and opened explanation |
| --- | --- | --- |
| No retained sessions | Application mark and `Idle` | Connection/setup context when relevant |
| All retained sessions are disconnected | Provider mark/group and `N saved`, with a quiet disconnected indicator | Explain that these are retained sessions and no live session is connected |
| Connected and disconnected sessions coexist | Lead with `N live` using the connected count | Show connected and saved counts separately; distinguish working, idle, and completed activity |
| All sessions are connected | Lead with the live count or the relevant task | Show actual activity and provider context |
| Bridge transport is disconnected | Retained summary with a distinct connection-loss cue | State that live status cannot currently be verified; show last-known context without claiming any session is live |

Requests and failures keep their existing higher-priority, understandable cues. A quiet connection indicator must remain distinguishable without color and have an accessible name; hover is supplemental, not the only way to understand an actionable problem. Do not show one unqualified `Offline` label for a mixed group merely because one retained session is disconnected. Never derive live counts from total stored rows or equate a connected bridge with connected agent sessions.

Pending verification: compare all presentations as one system, including zero/one/many sessions, all-saved, mixed connectivity, global transport loss, long titles, requests, and errors. Capture actual-size screenshots and short transition recordings. Check keyboard focus, larger text, reduced motion, native hit regions, and outside-click dismissal. No new dimensions or runtime behavior are established by this planning update. Engineering tasks are tracked in [the roadmap](docs/development/roadmap.md#approved-refinement-softer-island-and-truthful-summaries).

### Surface and shape

- Use a true black `#000000` island with a subtle white rim.
- The native Windows host must suppress the operating system's additional frame border; the subtle rim belongs to the webview surface only. Reapply the native border policy after focus and theme changes. Do not remove keyboard focus indicators to hide frame artifacts.
- Use flat session rows. A selected request may reveal one inset surface.
- Compact mode is a capsule. Floating expanded mode has 16 DIP upper corners and 24 DIP lower corners.
- Default bezel mode has square upper corners, no top border, and rounded lower corners: 18 DIP in compact mode and 24 DIP when expanded. It joins the display's upper edge without a gap. Floating mode remains an explicit settings alternative. Windows displays do not need a simulated hardware notch.
- Use shadow only to separate the island from the desktop.
- Avoid persistent glow, decorative gradients, grain, neon outlines, and full-screen backdrop blur.
- Concentrate visual character in the small avatars and the island's shape transition.

### Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `surface.island` | `#000000` | Main surface |
| `surface.inset` | `#111113` | Request detail and inputs |
| `surface.hover` | `#1B1B1F` | Hover and selected rows |
| `text.primary` | `#F5F5F7` | Tasks, questions, decisions |
| `text.secondary` | `#A8A8B3` | Supporting context |
| `text.muted` | `#8E8E99` | Tertiary metadata |
| `border.subtle` | `rgba(255,255,255,0.10)` | Rim and occasional dividers |
| `state.working` | `#83B4FF` | Running activity |
| `state.attention` | `#F2B86B` | Questions and permissions |
| `state.success` | `#68DDA0` | Completion and acknowledgment |
| `state.error` | `#FF8B94` | Failure |
| `focus.ring` | `#B8D2FF` | Keyboard focus |

Apply status colors to small indicators and related content, not the whole panel. Keep disabled content legible. Verify final text contrast at 4.5:1 minimum and meaningful non-text indicators and focus boundaries at 3:1 minimum. High contrast mode uses system colors.

### Typography

- UI: `Segoe UI Variable`, `Segoe UI`, `sans-serif`.
- Commands, detailed paths, and diffs: `Cascadia Code`, `Consolas`, `monospace`.
- Task: 13 DIP / 18 DIP line height, weight 600.
- Activity and prompt: 12 DIP / 17 DIP, weight 400-500.
- Metadata: 11 DIP / 16 DIP. No essential information below 11 DIP.
- Detail heading: 14 DIP / 20 DIP, weight 600.
- Use tabular numerals for timers and counts.
- Left-align content and use sentence case. Pixel styling belongs to avatars, not UI text.

### Spacing and targets

Use spacing values `4, 6, 8, 12, 16, 20, 24` DIP. Panel padding is 16 DIP; avatar-to-content spacing is 10 DIP; column gaps are 8 DIP. DIP means device-independent pixel. Do not size the interface in physical pixels without accounting for monitor scaling.

Utility glyphs are 14-16 DIP within targets at least 28 x 28 DIP. Touch mode increases targets to 44 DIP. Give hover, focus, pressed, and disabled states consistent treatment.

## 5. Minimal controls and copy

Minimalism removes repetition and visual noise while preserving meaning. Do not invent cryptic abbreviations or turn every action into an unlabeled symbol.

| Element | Default appearance | Tooltip or expanded meaning |
| --- | --- | --- |
| Settings | Gear icon | Settings |
| Sound | Speaker or muted speaker | Mute / Unmute, matching the next action |
| Terminal jump | Window-arrow icon | Open session terminal, or the known app name |
| Expand / collapse | Chevron | Expand / Collapse |
| Copy | Copy icon beside copyable content | Copy command / Copy path |
| Running | Small activity indicator | Working; current activity remains available |
| Question | Small question glyph | Needs input |
| Permission | Small permission glyph | Needs approval |
| Completed | Check glyph | Done |
| Failed | Error glyph | Failed; reason is visible in detail |
| Disconnected | Disconnected glyph | Offline; last update time is in detail |
| Multiple sessions | Avatar group and a number | Full session count and agent names |
| Usage | Provider avatar, period, remaining percentage | Account scope, quota bucket, reset time, and data freshness in inline detail |
| Approval decisions | `Deny` and `Allow` text buttons | Allow applies to this request only |
| Free-text response | `Reply` field and send icon | Send reply; shortcut when available |
| Multi-select response | Checkbox rows and `Send` button | Send selected answers |

Use one consistent vector icon family for utilities, with matched stroke weight. Text characters in wireframes are notation only, not production icon assets. An upward arrow, exit icon, and external-link icon are not interchangeable terminal jump affordances.

Tooltips appear after 350 ms of hover and on keyboard focus. Do not depend on hover for essential content. Screen readers receive action names and toggle states. Keep a visible or programmatically associated label for every input; placeholder text is supplementary.

Keep task titles readable. Do not repeat the full agent name beside a recognizable avatar on every row; expose it through tooltip and selected detail. Keep full names visible in integration settings and whenever an unfamiliar agent needs identification.

Approval details must explain what is being allowed and its scope. Do not replace `Allow` and `Deny` with check and cross icons alone. Error explanations, command text, and question choices are meaningful content and must not be abbreviated to save space.

## 6. Agent avatar system

**Use recognizable product marks, not invented mascots.** The approved revision replaces the robot, floating creature, and terminal face with pixel interpretations of the actual Codex, Antigravity, and OpenCode identities. The mark's geometry and brand palette remain stable across every session state. Only the small companion carries blue/amber/green status color.

Use a hand-tuned native 16-pixel grid so agent marks match the optical scale of the 14-16 DIP utility icons and 13 DIP task text. The mark and its separate 12-pixel companion occupy a fixed 32 x 24 DIP slot. Header/settings marks use a 16 DIP drawing area. Keep integer-pixel geometry rather than shrinking the previous 24-pixel artwork with CSS. Codex retains its cloud and readable terminal prompt; Antigravity retains its open arch and source color arrangement. The compact OpenCode project interpretation is 12 x 15 DIP with integer 3-pixel strokes, preserving its 4:5 proportion. This compact adaptation is smaller than the original brand guide's minimum; keep the unmodified full-size source available and do not describe the adaptation as an official supplied variant.

| Agent ID | Display name | Original avatar concept | Identity accent |
| --- | --- | --- | --- |
| `codex` | Codex | Product cloud silhouette with a readable white `>_` prompt | Original lavender-to-blue palette, expressed as discrete pixel bands |
| `antigravity` | Antigravity | Open arch with tapered legs and a clear negative-space center | Original yellow/red/green crown and blue lower legs, expressed as pixel color regions |
| `opencode` | OpenCode | Original 4:5 rectangular mark and lower inset | Official dark-background light ink and gray inset |

These are project-rendered pixel adaptations and must not be described as official variants or endorsements. The reference source files remain unchanged in `src/assets/agents/sources/`. Downloaded first-party assets, community reference geometry, and our derived artwork are identified separately in `docs/design/agent-icons.md`. The community Codex reference carries its own license notice; that license does not transfer ownership of the Codex brand. OpenCode's proportional geometry and two-tone treatment are retained in the compact rendition.

Verified sources: [Antigravity press assets](https://antigravity.google/press), [OpenCode brand assets](https://opencode.ai/brand), [Codex product page](https://openai.com/codex/), and the [Codex community SVG reference](https://github.com/lobehub/lobe-icons/blob/master/packages/static-svg/icons/codex-color.svg). The Codex product symbol was cross-checked against the separately labeled icon in an [official OpenAI guide](https://cdn.openai.com/pdf/5386d3f8-5342-4aae-a390-b9bff026a487/board-directors-guide-to-cybersecurity-in-the-age-of-ai.pdf). Do not substitute the generic OpenAI Blossom or imply a CLI-specific official mark was found.

- Each logo must remain recognizable in grayscale by silhouette and negative space.
- Reuse the same identity in compact mode, rows, detail, and settings.
- Use a redrawn 12 x 12 DIP companion grid beside the unchanged 16 DIP provider mark, separated by 3 DIP. Reserve a 32 x 24 DIP avatar slot, including room for discrete one-pixel movement. Use filled two- or three-pixel strokes for meaningful symbols; the quiet idle cue is a four-pixel block. Do not fractionally scale the old 8 DIP artwork. Shape, tooltip, accessible text, and detail copy supplement color.
- Keep the logo itself unchanged in every frame. Use a distinct provider-specific rhythm in the companion: terminal activity for Codex, a small lift sequence for Antigravity, and rectangular step activity for OpenCode. No eyes, hands, horns, thrusters, facial expressions, or added decorations on the original mark.
- Stop hidden and offscreen loops. Alternate integer-grid companion frames using stepped visibility. Do not rotate, stretch, tint, erase, or flash the logo to communicate state.
- Do not blink pending requests repeatedly.
- Subagents inherit their provider avatar with a small branch marker. `Subagent` is not a fourth provider.
- Unknown providers use a neutral character and their supplied name.

Static fallback assets live in `src/assets/agents/codex.svg`, `antigravity.svg`, `opencode.svg`, and `unknown.svg`. Stateful avatars use the matching inline parts in `src/avatars.js`.

### Per-agent animation vocabulary

Use one persistent logo group and a separate set of inline SVG companion frames from `src/avatars.js`, animated by `src/island.css`. Static SVG files provide fallback artwork. The logo always keeps its brand colors. Working/sending companions are blue, pending response companions amber, completion green, failure rose, and offline muted gray. The video's purple compacting treatment remains a future state; do not invent an event the adapter does not supply.

| State | Codex | Antigravity | OpenCode |
| --- | --- | --- | --- |
| Idle | Stable logo; quiet terminal dot | Stable logo; quiet lift dot | Stable logo; quiet rectangular dot |
| Working | Advancing terminal pixels | One-pixel upward activity sequence | Advancing rectangular step sequence |
| Needs input | Pixel question with a small step | Pixel question with a small lift | Pixel question with a brief cursor step |
| Needs approval | Pixel exclamation; restrained terminal rhythm | Pixel exclamation; restrained lift rhythm | Pixel exclamation; restrained block rhythm |
| Sending | Faster terminal companion | Faster lift companion | Faster rectangular companion |
| Completed | Companion resolves into a check once | Companion lifts into a check once | Companion resolves into a check once |
| Failed | Companion settles into a cross once | Companion settles into a cross once | Companion settles into a cross once |
| Offline | Stable logo; muted disconnected companion | Stable logo; muted disconnected companion | Stable logo; muted disconnected companion |

Companion sequences use discrete frames and provider-specific periods. Completion/failure entrance sequences last approximately 480-660 ms and hold the final symbol. Version 0.7.0 adds occasional low-intensity idle companion motion with substantial rest periods: Codex 11 seconds, Antigravity 13 seconds, and OpenCode 9 seconds per cycle, with movement confined to a short interval near the end. The product mark stays stable. Idle must remain visually distinct from active work and must not imply that tools are running. A question/exclamation companion changes by at most one pixel and never flashes repeatedly. Routine updates must not restart finite sequences. Recovered terminal states hold a settled pose instead of replaying an entrance. Reduced motion shows one final companion with the identical logo. The motion control pauses all nonessential icon animation and remains available for longer-running sequences.

### Application mark and composition refinement, planned

Redesign the application's own icon as an original abstract island silhouette with distinctive negative space and strong small-size contrast. Evaluate several candidates in monochrome at 16px tray scale and in launcher/installer sizes before choosing one. Keep the application identity distinct from the three provider marks. This direction does not authorize replacing provider logos with a new mascot.

Refine idle and expanded layouts around actual information density: task/activity hierarchy, connection state, recent useful context, and verified quota. Reduce excess whitespace and measure the surface against its content. Keep flat rows and the current black/pixel visual language; do not add decorative cards, fake statistics, large avatars, or persistent glow to fill space.

Add reversible `Archive` for eligible retained sessions and a route to inspect/restore archived context. Keep archive actions apart from approval decisions. Running work and unresolved requests remain protected. Optional automatic archiving is disabled by default; it applies only to confirmed-ended sessions aged at least 24 hours with no pending request. A valid fresh prompt or new request restores the archived session, while old snapshots/cache replay do not. Preserve results and CLI history; a purely disconnected state never authorizes automatic removal. These are approved targets, not implemented behavior.

### Anti Slop design rationale

Reading this as: desktop agent identity icons for developers, in a brand-faithful pixel language, dial ENERGY 1 / RHYTHM 1 / MOTION 2.

- Logo geometry: actual product symbols make provider recognition immediate; invented robot silhouettes do not.
- Pixel density: native 16-pixel marks balance the surrounding controls and task text while retaining the prompt and open arch.
- Color: source palettes identify providers; a separate semantic companion communicates session state without recoloring marks.
- Composition: a fixed 32 x 24 DIP mark-plus-companion slot keeps task alignment stable across state changes; the 12 DIP companion makes state readable beside a 16 DIP mark without enlarging the mark or island height.
- Shared status: multi-session compact summaries retain static provider marks and one 12 DIP companion in a 14 x 16 DIP motion slot on the right, keeping status readable without multiplying animated symbols. Single-session compact and expanded rows use the same companion artwork and provider-specific cadence.
- Motion: stepped companion frames explain activity while the product logo remains a stable anchor.
- Scope: preserve the approved island layout, typography, and surface transitions; this revision changes identity icons and their supporting behavior.

## 7. Island geometry

Default to the top center with zero vertical inset. The black surface meets the upper edge in compact, focused, and overview presentations, with no top rim or rounded upper corners. Floating mode uses an 8 DIP inset when explicitly selected. Native desktop placement must account for monitor coordinates and taskbar position; the existing browser preview demonstrates attachment to its viewport edge, while seamless OS-level behavior still depends on the desktop shell.

| Mode | Target width | Target height | Content |
| --- | --- | --- | --- |
| Idle | 186 DIP | 42 DIP | Small application mark, `Idle`, expand affordance |
| Single running session | 312 DIP | 42 DIP | Avatar, short task, activity indicator, optional time |
| Multiple live sessions | 248 DIP | 42 DIP | Up to three static provider marks, live count, one aggregate status |
| Saved sessions | 208 DIP | 42 DIP | Static provider marks, retained count, quiet connection indicator |
| Compact attention | 352 DIP | 42 DIP | Requesting agent, short task context, request glyph, queue count |
| Completed | 312 DIP | 42 DIP | Agent avatar, check, concise result; quiet idle after cooldown |
| Expanded | 560 DIP | Content-dependent | Utility header, session list, optional inline detail |
| Focused session | 560 DIP | Selected content only | Header, one selected task, request/result, and `Show all N sessions` |
| Widened compact strip | 440 DIP initial target | Exactly the current compact height | More context and one provider's quota; no panel body |
| Settings | Up to 560 DIP | Measured for the current page | Shared header, section navigation, current controls |

Expanded width is `min(560 DIP, workAreaWidth - 32 DIP)`. Maximum height is `min(560 DIP, workAreaHeight - 32 DIP)`. Add internal scrolling when content exceeds that height. Collapse optional metadata before shortening action labels or cutting off controls.

These dimensions are initial targets to validate at 100%, 125%, 150%, and 200% scaling, not rigid bounds that override accessibility.

The widened strip is at least as wide as its compact source and at most `min(480 DIP, workAreaWidth - 32 DIP)`. If the work area or larger text leaves insufficient room, omit secondary context or the second quota window before truncating essential labels. Do not wrap content into a second row or increase height as a consequence of hover. Accessibility may change the base compact height; widened mode inherits that height exactly.

## 8. Compact composition

In the multi-session summary, show only static 16px provider marks with 5px gaps. Do not attach an animated companion to every mark. Use one shared status on the right, derived from all sessions: working count, failure count, or a done/offline/idle cue. Never show one session's elapsed time beside the total session count. Keep the complete summary accessible through its label and tooltip. Per-agent companions remain in single-session compact mode and the expanded list.

```text
Working
+--------------------------------------------------+
| [C] Fix authentication              [activity] 2m |
+--------------------------------------------------+

Multiple sessions
+--------------------------------------------------+
| [C][A][O] 3                      [permission] 1   |
+--------------------------------------------------+

Attention
+--------------------------------------------------+
| [O] website / Update auth         [permission] >  |
+--------------------------------------------------+
```

`[C]`, `[A]`, and `[O]` stand for pixel avatars. Bracketed descriptions stand for icons. Wireframes describe information order, not final pixel spacing.

Clicking the main strip or invoking its hotkey opens the Sessions overview without selecting a session. This November 17 refinement supersedes earlier request/result-first behavior for explicit opening. Fresh-request auto-open still reveals the relevant detail under the existing preference and interaction protections. Explicit utility controls retain their own actions. Hover only widens the strip horizontally; it never opens the panel, session rows, request details, or Settings, and never activates the window. Clicking a compact request never grants permission.

### Idle and horizontal hover reveal

- With no active sessions, show the application mark and `Idle`. Do not truncate `No active sessions` into `No active s…`, or use a provider mark to imply that an agent is active. Retained offline sessions remain available through explicit opening.
- After `motion.hoverIntent`, widen the existing strip around its fixed top-center anchor. Preserve its current height, attached upper edge, logo size, and text size. Reveal information through available horizontal space, not a dropdown or another surface.
- Keep the current representative session stable while the pointer or keyboard focus is within the strip. Show its provider identity, more task context, and up to two real quota windows. For a multi-session summary, retain the total count and attention cue while identifying the provider whose quota is shown. Never rotate providers automatically during inspection.
- Example format: `[Codex] task context · 5h 65% · 7d 40%`. Percentages mean remaining quota. The example is notation, not a fixture for live mode; period labels come from actual data. Meaning remains available in the accessible description and opened view.
- Without a represented session, use the most recently explicitly selected connected provider; if none exists, show connection context and an explicit `Connect` action instead of choosing an arbitrary provider. Real account quota may remain available even with no active tasks.
- Show `Usage unavailable` when the relevant provider has no verified quota reading. Do not substitute a made-up percentage or silently show a different provider's allowance. At narrow widths, keep the session/connection meaning first and expose quota status in the opened view.
- After pointer exit, wait `motion.hoverExit` before returning to the latest compact width. Cancel that timer on re-entry. Growing or shrinking hit regions must not create repeated enter/leave loops. Quota updates and timer ticks must not repeatedly trigger widening.
- Keyboard focus within the compact strip reveals the same information without opening the panel. Pointer exit must not collapse the reveal while a child control retains focus. Enter/Space on the main opener performs explicit opening; touch users can open the same information without hover.
- Clicking during widening retargets the current surface directly into the focused or overview destination. Do not shrink first, restart from the original compact width, or briefly flash another view.

Explicit opening always shows the session overview, including when compact represents a pending request or completion. Select a row to read its detail. A fresh request may automatically reveal its focused presentation, while a focused footer action, `Show all N sessions`, opens the full list. Opening and closing the island does not resolve, dismiss, or approve a request. Start in compact mode, as in the video; preview controls may explicitly open the overview.

## 9. Expanded composition

```text
+----------------------------------------------------------------+
| [agents] 3                                  [speaker] [gear]  |
| [C] 5h 65% remaining · 7d 40% remaining              [detail] |
|                                                                |
| [O] website / Update authentication                  48s [jump] |
|     [permission] npm test                                      |
|     +------------------------------------------------------+   |
|     | OpenCode / Windows Terminal                          |   |
|     | npm test                                             |   |
|     | C:\Projects\website                                  |   |
|     | Applies to this request only.                        |   |
|     | [Deny]                                 [Allow Once] |   |
|     +------------------------------------------------------+   |
|                                                                |
| [C] backend / Fix token validation                    2m [jump] |
|     [activity] Reading src/auth.ts                             |
|                                                                |
| [A] desktop / Refine settings                         4m [jump] |
|     [check] 3 files updated                                    |
+----------------------------------------------------------------+
```

The header is 36 DIP high. Use a numeric session count with an accessible description and compact utility icons. A flat usage band below it shows one quiet row per connected provider/account, including quota unavailable states. Keep this band within the island; quota detail is an inline view, not a detached popup. Do not repeat account quota on every session row. In a focused session view, show its matching account's quota and keep other providers in the overview. Quota must not push a pending request or its decisions below the visible area: reduce secondary metadata and scroll the body when necessary.

### Remaining quota and provenance

Quota is account- and bucket-scoped information, separate from session lifecycle, request delivery, and bridge connectivity. Multiple sessions using the same account share one allowance; never add, average, or duplicate their percentages as independent balances. Do not combine providers into a single percentage. If the session-to-account mapping cannot be verified, label the reading as account-level in the overview and do not attribute it to that session.

| State | Widened strip | Opened usage detail |
| --- | --- | --- |
| Fresh supported reading | Provider, actual period, remaining percentage | Periods, remaining percentages, reset times, source, and freshness |
| Supported, awaiting first reading | `Checking usage…` if space permits | Loading state without a placeholder number |
| Unsupported, unauthenticated, failed, or ambiguous source | `Usage unavailable` | Reason and a route to the provider's Agents page |
| Last known reading after refresh failure or disconnect | Keep it explicitly stale; omit the number if freshness cannot fit | Last known values and `Updated … ago`; never style them as live |
| Account or quota bucket changes | Clear the previous attribution | Validate a fresh snapshot before displaying a new account's values |

- Display **remaining**, not used, quota. For a source that reports `usedPercent`, derive `remainingPercent = 100 - usedPercent` only after validating a finite value in the source's documented range. Reject malformed data rather than inventing a valid reading. Explain remaining semantics in accessible labels.
- Show primary and secondary windows only when actually supplied. Derive labels from their reported durations; do not assume every provider uses five-hour and weekly limits. More buckets belong in inline quota detail, with their actual names and units. Credits or balances with different units must not be converted into a percentage without an authoritative limit.
- Show local reset times with the relevant date when needed. A countdown reaching zero is not proof that access has resumed; refresh and respect authoritative availability before changing a blocked indication. Quota depletion does not mark a session failed.
- Retain data timestamps and account/bucket identity internally. Do not expose raw account IDs, email addresses, or credentials in the main strip. Account switches invalidate cached attribution; a provider logo alone is insufficient to prove a match.
- Subscribe to supported updates while the host is active. An explicit opening may request a coalesced refresh when cached data is stale; hover must not launch a new process or network request on every pointer entry. One collector owns each account/bucket source. Stop subscriptions on host shutdown and use bounded retry/backoff on errors.
- Quota refreshes do not steal focus, reorder sessions, replace Settings, restart avatar one-shots, or animate the shell for every percentage change. Do not announce every countdown tick to screen readers.

**Verified interface and initial implementation:** installed Codex CLI 0.169.0 exposes `account/rateLimits/read` and `account/rateLimits/updated` in its generated app-server schema. The [official app-server documentation](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt) describes account rate-limit reads. The local app-server command labels the overall surface experimental. Version 0.6.0 successfully read an authenticated account snapshot without a model task. It polls validated complete snapshots through a separate native IPC cache, with freshness and bounded retry. Push subscriptions and account-to-session mapping are still future work; do not imply that a successful account read proves every session uses that account.

For a future Codex collector, use Codex's managed interface rather than scraping transcripts or reading credential files. Validate the initial snapshot and merge sparse bucket updates, or refetch when continuity is uncertain. Respect a supplied authoritative availability flag; do not infer access recovery from percentages or reset timestamps. Passive reads must not opt into reserve/experiment exposure (`supportsLunaReserve` stays omitted or false). Additional credit-detail requests are unnecessary for the initial percentage view. Verify compatibility against the installed CLI before enabling `canReadUsage`.

Antigravity and OpenCode quota interfaces remain unverified. Show their unavailable state and diagnostics until a supported collector is implemented; visual parity does not justify fabricated data. Preview quota fixtures must be explicitly labeled and isolated from live accounts.

Each session row has a fixed avatar column, flexible task/activity content, stable time column, and right-aligned jump target. Base rows are approximately 60-72 DIP high. Selected detail adds its own height. Show up to five base rows before scrolling; keep the header visible.

Open only one session detail at a time. Reveal terminal, model, full agent name, and complete paths there. Task titles truncate to one line in the list and expand fully in detail. A short activity line should describe actual work rather than repeat the state name.

Initial order: pending requests, recent failures, running sessions, completed sessions. Pending requests are oldest first; other groups use most recent update first. While the pointer or keyboard focus is in the list, freeze row positions. Surface new attention without moving a button under the pointer. Reconcile ordering after interaction ends.

Group subagents under their parent with a branch icon and count. Reveal indented rows when expanded; avoid nested cards.

## 10. Session state and attention

Keep session state, connection state, request-delivery state, and presentation state separate. A session may be running while the bridge is offline, but the UI must mark its information as stale. Opening a panel never changes agent state.

| Session state | Primary cue | Detail copy when needed |
| --- | --- | --- |
| `idle` | Quiet neutral cue | No active sessions |
| `running` | Activity indicator | Working, or the actual current activity |
| `waiting_input` | Question glyph | Needs input |
| `waiting_approval` | Permission glyph | Needs approval |
| `completed` | Check | Done, plus a real result summary |
| `failed` | Error glyph | Failed, plus reason |

`connectionStatus` independently records `connected`, `reconnecting`, or `disconnected`. Offline presentation overlays the last known session state; it does not falsely complete the task.

Compact attention priority is unresolved requests, recent failures, running work, completion, then idle. Request count remains visible while other sessions report progress. Closing the panel neither answers nor rejects anything.

Approved next behavior: completion may occupy compact mode for 10 seconds without a fresh prompt or authoritative activity in that session, then yield to active work or idle. This supersedes the former four-second target. Preserve the authoritative completed state and result in detail/history; only the compact presentation cools down. Never close an opened result because this timer elapsed. Pending requests, running sessions, failures, and offline state keep their appropriate cues. Recent failure remains the compact representative until inspected or displaced by a pending request; the failed row remains available afterward. The cooldown is planned, not implemented.

Never invent completion percentages, models, quotas, file counts, diffs, or elapsed time. Omit absent data or explain the limitation in detail.

## 11. Requests and acknowledgment

### Approval

Show the agent, project, requested command or file change, working directory, and supplied permission scope. Commands are selectable and copyable, with horizontal scrolling. Limit long diff areas to 180 DIP high with internal scrolling.

Use a full-width horizontal decision row below the command or file preview, outside its inset surface. Give buttons equal widths, a 6 DIP gap, subtle 6 DIP corners, and at least 30 DIP height (44 DIP for touch). Use `Deny` on neutral charcoal and `Allow Once` on soft white with dark text. Keep the scope line `Applies to this request only.` immediately above the row. This follows the reference's quiet, balanced choices without introducing unsupported scopes. Show `Allow All` or `Bypass` only when the adapter explicitly supports and explains those distinct actions; never map them to a single-request decision. Opening the panel and pressing Enter must not implicitly approve a request.

Delivery follows `pending -> sending -> acknowledged`, with a separate failure outcome. Disable duplicate submissions while sending. Keep the button footprint fixed; replace its content with a small progress indicator and accessible `Sending` status.

Show `Allowed`, `Denied`, or `Sent` only after adapter acknowledgment. Acknowledgment confirms receipt of the decision, not execution success. Do not infer `running` from acknowledgment alone: wait for the next authoritative session event. If sending fails, retain the request and offer `Retry`. Disable decisions when a request expires or is withdrawn; show `Request expired` or `Request withdrawn` in detail.

### Questions

Approved OpenCode direct replies (November 17, 2026): keep the existing question surface, quiet option descriptions, and stable provider mark. Reading this as a compact request utility for CLI users in Threadcap's black/pixel visual language, with ENERGY 1 / RHYTHM 1 / MOTION 2. Native radio buttons and checkboxes communicate selection without introducing decorative icons. A white `Send` button is the single primary action because submitting is a deliberate, consequential step; `Open terminal` remains secondary.

For a verified OpenCode 2.3.0 question form with one supported visible field, show single-choice radios, multi-choice checkboxes, or a labeled short-text editor. Nothing is preselected and selecting never sends. Preserve custom-answer support when supplied by OpenCode. Keep choices and drafts per session/request through collapse and Settings. Only explicit `Send` or Ctrl+Enter in the editor submits. Disable duplicate submissions and show `Sending...`; show `Sent` only after OpenCode's form reply API acknowledges. This acknowledgment does not establish execution or task success.

Revalidate exact session/form ownership and pending state before delivery. Never use terminal keystrokes or enable command approval through this connector. Complex, conditional, hidden, external/authentication, unsupported-version, or unavailable forms retain the observed question and terminal route. After an ambiguous transport failure, retain the draft, explain the missing confirmation, and direct the user to the terminal rather than offering a potentially duplicate automatic retry. Registration and successful builds alone do not verify real answer delivery. See [direct-reply verification](docs/verification/opencode-replies.md).

Show the complete question in detail. Use balanced horizontal buttons for short single-choice answers, wrapping into rows for long labels or narrow widths. Preserve full option text and use neutral surfaces; do not imply that a recommended option has already been selected. Use checkboxes with `Send` for multiple choices, and a labeled two-to-four-line reply field for free text. Preserve drafts per session and request when switching or collapsing.

For monitoring-only adapters, show the request with a terminal jump icon and visible short action `Open terminal`. Explain in detail that replies must be entered there. Never show functional-looking response controls that only change local display state.

OpenCode v2 forms must retain visible field questions, choice labels, and supplied choice descriptions. Display observed choices as a readable list when reply delivery is unsupported, never as disabled or simulated answer buttons. Multi-field forms preserve each question and its choices in order. Do not collect hidden fields, defaults, answers, or authentication URLs for this presentation.

## 12. Focus and keyboard

- Passive events update the island without activating it or stealing editor focus.
- Clicking the island or using its hotkey explicitly enters panel interaction. Clicking a text field transfers focus into it.
- Proposed global shortcut: `Ctrl+Alt+Space`. Make it configurable, detect conflicts, and show only a successfully registered shortcut.
- `Esc` closes detail, then the panel, preserving drafts and pending requests.
- `Tab` and `Shift+Tab` follow visual control order. Arrow keys navigate sessions when the session list has focus.
- `Enter` opens the selected session detail. `Ctrl+Enter` sends a reply when its editor has focus.
- Optional `Alt+Y` / `Alt+N` approval shortcuts work only for the active request detail, outside text entry.
- Numeric answer shortcuts work only inside the focused choice group.
- Clicking outside collapses the panel. A sending request may keep the panel stable until delivery resolves; do not trap focus indefinitely on a failed connection.
- On Windows, outside-click dismissal must also work when the island never acquired foreground focus. Detect native button-down events only while the panel or Settings is open, pass every click onward, and dismiss Settings together with the panel when clicking another application or the desktop. Do not depend solely on blur or run an idle cursor-polling loop.
- Use Windows shortcut notation throughout.
- Transition animations must not remove the focused control, reset the caret, or re-create the reply field.

Terminal jump uses the actual target known by the adapter. If only the application is known, say `Open Windows Terminal`; do not promise the exact tab. If the target is gone, show `Terminal not found` with a copyable project path. Do not activate unrelated applications as a fallback.

### Codex terminals in local Orca, version 0.6.2

The native host can return to a verified local Orca Codex terminal. This is a separate native connector, not permission to approve or answer through monitoring hooks. Generic bridge capabilities remain unchanged.

- Capture the safe Orca launch identity alongside accepted Codex hook events. Validate runtime, worktree, terminal handle, pane, and current PTY incarnation before navigation. Never guess from a project path, title, or the only available candidate.
- For an old session without a binding, open a flat terminal picker inside the existing island Settings surface. Show the selected session, terminal title, project path, and `Link and open`. Linking is an explicit user assertion of association, not automatic proof that a terminal owns a Codex session.
- Revalidate a choice before switching. Persist the association and verify it again after restart. Expired identities return to selection; never silently activate an unrelated terminal.
- Use `Open or link Codex terminal in Orca` for the native Codex jump tooltip. Other unavailable integrations explain that terminal navigation is unavailable rather than reporting a broken monitoring connection.
- Disable duplicate submissions, preserve the selected session, and show loading, empty, and retry states. Dismissal invalidates late UI results. Collapse only after a matching positive navigation acknowledgment, or ordinary outside-click dismissal.
- Reuse section 13 geometry/content transitions, focus styles, and reduced-motion behavior. Terminal choices are flat, wrapping native buttons with at least 44 DIP height. Do not add a dialog or separate window.

See [setup and limits](docs/integrations/orca-navigation.md) and [verification](docs/verification/orca-navigation.md). Other terminal hosts, remote Orca environments, and other providers remain outside this implementation.

## 13. Motion system

### Purpose and tokens

Motion makes the compact island, session list, and request detail feel like one continuous surface. It must reveal where content comes from, keep controls stable, and acknowledge changes once.

| Token | Value | Purpose |
| --- | --- | --- |
| `motion.fast` | 120 ms | Hover, press, small indicator changes |
| `motion.content` | 160 ms | Text or glyph replacement |
| `motion.detail` | 200 ms | Inline detail reveal or collapse |
| `motion.close` | 240 ms | Expanded to compact |
| `motion.open` | 320 ms | Compact to expanded |
| `motion.resize` | 260 ms | Compact width or content-height changes |
| `motion.hoverIntent` | 180 ms | Confirm pointer intent before horizontal widening |
| `motion.hoverExit` | 220 ms | Grace period before restoring compact width |
| `motion.peekWidth` | 220 ms | Width-only reveal and return |
| `motion.page` | 260 ms | Sessions-to-Settings and Settings-page geometry |
| `motion.easeMorph` | `cubic-bezier(0.16, 1, 0.3, 1)` | Surface geometry |
| `motion.easeContent` | `cubic-bezier(0.2, 0, 0, 1)` | Content and opacity |

The morph curve is an easing approximation, not a physics simulation. Keep geometry bounded by its source and destination: no elastic overshoot or repeated bounce. Do not animate every property with a universal `transition: all` rule.

### Surface transitions

| Transition | Geometry | Content choreography |
| --- | --- | --- |
| Compact -> expanded | Keep top-center fixed; interpolate bounds and corner radii over 320 ms | Fade compact content out within 80 ms; fade expanded content in over 160 ms starting around 100 ms; maximum content offset 4 DIP downward |
| Compact -> widened strip | After the 180 ms intent delay, change width only over 220 ms; height and upper-edge attachment remain unchanged | Retain shared mark and status; fade newly revealed horizontal context over 120 ms as room becomes available; no panel body |
| Widened strip -> compact | After the 220 ms exit grace period, restore current compact width over 220 ms | Fade extra context within 80 ms; no vertical motion or focus loss |
| Widened strip -> explicit open | Retarget current rendered bounds into the selected focused/overview target using the open token | Reveal the requested body directly; do not first collapse or treat hover as an open event |
| Compact -> focused request/result | Same anchored 320 ms shell growth, targeting only the selected content height | Keep the requesting avatar's identity; reveal one session and its detail, rather than briefly flashing the full list |
| Focused -> all sessions | Resize the same surface to the measured overview height over 260 ms | Clear the single-session filter and reveal the flat list with a 160 ms crossfade; never scale text |
| All sessions -> focused | Resize to the chosen session height over 260 ms | Keep its row and detail mounted; conceal other rows without changing session state |
| Expanded -> compact | Return to the latest compact target over 240 ms | Fade outgoing content within 80 ms; reveal compact content during the final 120 ms |
| Compact mode -> another compact mode | Resize from current bounds over 260 ms | Crossfade changing content over 160 ms; keep shared avatar and timer aligned |
| Session detail opens | Measure destination height; reveal the inline region over 200 ms | Fade detail in over 140 ms with at most 4 DIP vertical offset; keep the row header anchored |
| Session detail closes | Collapse measured detail height over 200 ms | Fade content out within 100 ms; preserve draft and selection |
| Switch selected session | One coordinated height transition to the new measured size over 200 ms | Crossfade only the detail area; keep list rows stable and restore that request's draft |
| Subagent group expands | Reveal measured group height over 200 ms | Fade child rows together; no staggered cascade |
| Sessions -> Settings | Morph the same surface to the measured Settings page bounds over 260 ms; preserve top-center attachment | Fade the outgoing body within 80 ms; begin the 160 ms destination fade around 100 ms when controls fit; text never scales |
| Settings section -> another section | Retarget measured page height over 260 ms without changing the outer anchor | Crossfade page content over 160 ms with at most 4 DIP offset; keep shared navigation stable |
| Settings -> prior session view | Restore saved presentation and measured bounds over 260 ms | Restore selected session, draft, caret, focus, and scroll as applicable; never replay request notifications |
| Settings -> outside-click collapse | Collapse the same surface over 240 ms and disarm expanded hit regions | Preserve Settings route and in-progress input; no separate window remains on screen |

Animate the visible shell and hit-test region coherently with the surface. Prevent clipped edges, invisible click-blocking rectangles, and a second shell resize that causes a final jump. Preserve the top-center anchor while clamping to the selected monitor's work area.

Do not scale the entire panel or text. Measure the target layout, interpolate the outer surface and clipping bounds, and render text at its final size. Preserve shared elements by stable session IDs. Prefer opacity and transforms for content; if bounds require layout work, limit it to the single surface and measure before starting, not on every frame.

### State-to-state transitions

This table describes presentation of authoritative events, not a mandate to simulate missing lifecycle events.

| Event | Visual transition | Timing and persistence |
| --- | --- | --- |
| Idle -> running | Reveal the agent avatar and task; widen the capsule; introduce one activity indicator | 260 ms geometry, 160 ms content; no automatic expansion |
| Running -> running, new activity | Replace only the activity line; keep avatar and time fixed | 120-160 ms crossfade; no resize when the line fits |
| Running -> needs input / approval | Replace activity glyph with question or permission glyph and update queue count | 160 ms cue change, up to 260 ms compact resize; a single subtle emphasis, no repeated pulse |
| Input <-> approval | Replace request glyph and content using the new request identity | 160 ms; preserve unrelated drafts and requests |
| Pending -> sending | Keep decision buttons in place and disable duplicate submission; show a small progress cue | 120 ms; remain until acknowledgment or delivery failure |
| Sending -> acknowledged | Replace progress cue with a check and `Allowed`, `Denied`, or `Sent` | 160 ms; keep acknowledgment visible for about 700 ms unless superseded by authoritative state |
| Sending -> delivery failure | Replace progress cue with an error and `Retry`; retain the request | 160 ms; no panel shake or success flash |
| Waiting -> running | Update request detail after an authoritative resume event; preserve the row identity | 160 ms cue change; if the user is still interacting, do not collapse detail underneath them |
| Any active state -> completed | Stop activity, show a check and real result; keep agent identity | 160 ms; approved next compact cooldown is 10 seconds without new session activity; preserve result/detail and higher-priority attention |
| Any active state -> failed | Stop activity and show error context | 160 ms; never pass through a success state |
| Any state -> connection lost | Stop activity animation, show a disconnected cue, and retain last known content | 160 ms; no fake completion, shrinking, or disappearing rows |
| Disconnected -> synchronized | Apply a validated snapshot; crossfade into its actual state | 160 ms; no replay of old requests, completion effects, or notification sounds |
| Request -> expired / withdrawn | Disable response controls immediately; replace the detail status | 160 ms; preserve explanatory context |
| Completed -> idle / another active session | Return to the current summary after the display interval | 260 ms geometry; unresolved requests always take priority |
| New session appears | Insert at its valid list position when ordering is not frozen | 160 ms opacity, optional 200 ms list-height change; no scale pop |
| Session is removed | Remove only after explicit dismissal or the retention policy | 160 ms fade and 200 ms layout change; never delete pending requests because of animation timers |

A denial acknowledgment does not by itself mean that the session failed. A connection failure does not by itself mean that the agent process stopped. Present each event at its own level.

### Interruptions, bursts, and layout stability

- Keep one active geometry transition per island. Retarget from the current rendered bounds when another event arrives; do not queue obsolete animations or jump back to their start.
- Session and request state updates apply immediately. Motion is presentation and must never delay state validation or permission checks.
- Coalesce noncritical activity previews into at most one visible update per 150 ms. Never drop a request, request withdrawal, failure, or acknowledgment.
- A new request updates the queue indicator immediately but does not replace the detail the user is editing. Preserve drafts and selected request IDs.
- During pointer or keyboard interaction, freeze list order and avoid moving active controls. Show new attention through a stable count or cue.
- A completion event during opening retargets the destination content; do not close and reopen the island.
- Closing during opening reverses from current geometry. Rapid toggles must settle at the last requested presentation state.
- Pointer entry/exit may change only the width-reveal target after their intent/grace delays. Repeated hover events, quota refreshes, and timer ticks never restart a settled or running transition. Reserve numeric width and keep digit positions stable.
- Read new state immediately through accessible semantics. Do not announce decorative frames, every timer tick, or intermediate morph states.
- Keep progress updates away from focused inputs. Motion completion callbacks must not change domain state or send decisions.

### Reduced motion and sound

Respect the OS or webview reduced-motion preference and an application override. Remove geometry interpolation, translation, spring overshoot, avatar animation, and animated activity loops. Update bounds directly with an optional opacity transition of at most 80 ms. Preserve all state cues, acknowledgment, focus behavior, and request information. Respond to preference changes at runtime.

Sound is optional and off by default. Use one short cue for a request and another for completion; ordinary progress is silent. Coalesce event bursts, honor mute and presentation preferences, and never replay sounds from a reconnect snapshot.

## 14. Settings and empty states

### Guided setup, planned

Use a short setup sequence inside the same island: Detect CLI, Connect, Review hooks, Verify activity. Reuse section 13's anchored geometry and separate content transitions; never scale text or animate fake progress. Back and Retry preserve completed setup information and expose actual failures. Successful registration must not imply hook trust, and quota access must not imply that a session is connected. The final verification requires a fresh supported session event.

Lumi is an approved reference to inspect for setup motion. Its local installation has been identified, but its onboarding animation has not yet been visually reviewed. Do not describe an inferred Lumi transition as observed or copy its proprietary assets. Add specific motion observations and original adaptations only after review.

### Approved automatic attention and completion behavior, planned

Add `Auto-open requests` to Behavior, enabled by default on initial setup and persisted thereafter. A fresh, connected question or approval request automatically opens its focused island surface without taking OS or keyboard focus. Never route passive reveal through a native action that activates the window. Opening never grants permission, sends a reply, or adds unsupported interaction capabilities. When disabled, retain manual opening and visible attention cues.

Fresh attention can also reveal from an already-open, unselected Sessions overview when the pointer is outside the island and no session control or text field holds focus. Keep a selected detail, Settings, terminal selection, typing, and pointer interaction in place. Remaining in overview must not silently suppress an otherwise safe request reveal.

During typing, another request interaction, or Settings, preserve the current view, input, caret, and scroll. Show a stable attention indicator and explicit `View request` action instead of replacing content. Queue new requests oldest-first and retain the current request's controls in place. Deferred requests remain explicitly navigable; leaving a protected view must not cause a surprise automatic page switch.

Manual collapse/outside-click dismissal suppresses further automatic reveals for that same request while keeping its attention indicator visible. A genuinely new request can reveal again when safe. Deduplicate accepted attention episodes by session and request identity; repeated progress, stale events, reconnect snapshots, and turning the preference back on do not replay old reveals. Use section 13's anchored focused-surface opening; reduced motion removes spatial interpolation while preserving the request.

The approved completed-response cooldown is 10 seconds with no fresh prompt/activity in that session. It changes only compact presentation, retaining completed rows and output. Do not close a result being read or replace another session's running/pending/failure/offline cue with idle. Track the completion episode independently of unrelated revisions, cancel obsolete timers when new work arrives, and do not restart the interval or celebration on snapshot recovery. User activity means supported session events, not arbitrary keyboard or machine monitoring.

Auto-open, cooldown, and optional archiving above remain future runtime work. The current implementation still uses explicit opening and retains completed presentation. See [the roadmap](docs/development/roadmap.md) for engineering scope and verification requirements.

Settings is a presentation of the island itself, not another tab, modal dialog, utility window, detached panel, or full-screen overlay. Gear navigation replaces the current island body while its outer surface morphs continuously. Keep the black surface, small marks, compact type, quiet dividers, and upper-edge attachment.

### Sections and navigation

Use three short section labels in one compact navigation row below a shared header. They divide configuration by purpose rather than putting every control into a long page:

| Section | Content |
| --- | --- |
| `Agents` | Codex, Antigravity, OpenCode; connection status, supported Connect/Reconnect actions, provider detail, quota availability, and diagnostics |
| `Appearance` | Reduced motion and attached/floating presentation; show further controls only when implemented |
| `Behavior` | Supported sound/notification preferences and shortcut status; never present planned native features as working toggles |

The header contains a back action, `Settings`, and the standard collapse control. Section labels remain visible and keyboard-accessible; do not replace unfamiliar destinations with unexplained glyphs. Selecting a provider opens its detail inside the same body. Back returns from provider detail to `Agents`, then from Settings to the previous session presentation. Escape follows that same hierarchy, then collapses the session presentation. A collapsed strip ignores Escape rather than changing agent state.

Preserve the prior presentation mode, selected session and request, scroll position, unsent reply, caret, and focus target. Restore them on return when those targets still exist. If the selected session/request disappears, fall back to the current overview with an explanation and retain any recoverable draft. Never restore a withdrawn request as actionable.

Default to `Agents` on the first Settings visit and remember the selected section during the app session. Outside click collapses the island but retains the Settings route and edits for the next explicit Settings visit. Reopening sessions still follows the normal request/result priority; it does not force the user back into Settings.

Use the existing 560 DIP maximum width and work-area-clamped height. Fit one section at a time, keep header/navigation visible, and scroll only the content body if necessary. On narrow layouts or larger text, allow section labels to scroll horizontally rather than crop controls or create a second detached surface. Larger text must not hide the back action or consequential decisions.

### Attention and configuration state

An incoming request while Settings is open updates a stable attention indicator and an explicit `View request` action in the shared header. It does not replace the page, erase input, move controls under the pointer, or steal focus. Selecting that action preserves the Settings state and explicitly opens the relevant request. Several requests share a count and follow the existing request priority when opened.

Keep configuration state separate from presentation state. Existing switches apply explicitly and report persistence failures inline; a failed write must not silently claim the setting was saved. Preserve in-progress text on navigation or collapse. Do not add an unrelated global Save button for controls that already apply immediately.

Native Connect/Reconnect may finish after the user leaves Settings. Retain its result in integration state and show it on return; do not reopen the page, claim hook trust, cancel a completed registration, or start a duplicate setup operation because of an animation callback. Error explanations and trust instructions stay inside the current island body. Avoid a detached confirmation dialog for ordinary configuration.

Each primary integration has its avatar, full name, connection state, capability mode, and connection action. Modes are `Not connected`, `Monitor`, and `Interactive`. Expose adapter diagnostics inside integration detail rather than the main session UI.

The native Codex row offers `Connect` to install the bundled observer and preserve existing hook configuration with backups. Show a disabled `Checking…` action during setup, `Registered` when definitions exist, and a short instruction to restart Codex and review `/hooks`. Registration is separate from trust and live connection. Only a fresh connected session earns `Monitor`. A registered adapter offers `Reconnect` to refresh the stable helper and registration; opening Settings checks diagnostics without changing configuration. Keep errors readable below the row and preserve keyboard focus while status changes. Browser Preview must never invoke native setup. Use the existing button feedback and settings motion tokens; do not add decorative loading loops.

| Condition | Copy and action |
| --- | --- |
| No active sessions | Compact: application mark and `Idle`; widened/opened: connection context and `Connect` |
| CLI not detected | `Codex CLI not detected` / `Connection guide` |
| Bridge disconnected | `Connection lost. Reconnecting...` / `Retry` |
| Monitoring only | `Respond in your terminal` / `Open terminal` |
| Unsupported usage | `Usage unavailable`; explain the limitation in Agents detail, with no fabricated percentage |
| Stale data | `Updated 2m ago` in detail; no misleading live indicator |
| Preview | Persistent `Preview` label; never mix simulated and live sessions |

Preserve last known context and drafts while offline. Revalidate both connectivity and request identity before enabling responses. Restored snapshots do not prove that a task is still running or a request is still pending.

## 15. Shared integration contract

Normalize adapters into one session model. Equal visual support does not mean every CLI has equal technical capabilities. UI affordances reflect verified capabilities.

| Group | Target fields |
| --- | --- |
| Identity | `sessionId`, `agentId`, `parentSessionId`, `projectName`, `taskTitle` |
| Context | `workingDirectory`, `terminalName`, `terminalTarget`, `modelName?` |
| State | `status`, `lastActivity`, `startedAt?`, `updatedAt`, `connectionStatus` |
| Requests | `requestId`, `requestType`, `prompt`, `options?`, `command?`, `diff?`, `expiresAt?` |
| Capabilities | `canApprove`, `canAnswer`, `canJump`, `canJumpExact`, `canReadUsage` |
| Account usage, proposed separate model | `providerId`, internal account key, quota bucket ID, windows with actual duration/used percentage/reset timestamp, availability when supplied, source, freshness timestamp, and read status |
| Ordering | `eventId`, `revision` |

Stable agent IDs are `codex`, `antigravity`, and `opencode`. Obtain model names from real session data. Derive elapsed time from timestamps where possible. Legacy formatted duration strings may be used as a fallback without pretending they are a live clock.

The usage model is not part of the implemented protocol version 1 session payload. Version 0.6.0 uses a separate in-memory native cache, monotonic usage revisions, validated complete reads, and `read_usage` IPC; the legacy browser HTTP/SSE transport does not carry quota. Future shared-store or push support must retain independent ordering, source/account scope, and reconnect validation; a session revision must not overwrite another account's usage. Keep presentation modes (`compact`, `widened`, `focused`, `overview`, `settings`) separate from Settings route and provider collection state. Hover timers and animation callbacks cannot change integration capability or publish fabricated usage.

Bind responses to both `sessionId` and `requestId`. Deduplicate events, ignore old revisions, and validate a synchronized snapshot after reconnect. Keep request delivery, session lifecycle, and panel animation in separate state machines. Do not assume the three CLIs share hooks, transcript formats, or response protocols.

### Prototype constraints

These are historical observations from the initial prototype review. The session foundation now replaces the old in-memory bridge, fake local response handling, seeded live sessions, and fallback window activation. It separates failure from completion, stores normalized identities and revisions, and supports snapshot recovery. The table records the original findings; [the bridge protocol](docs/architecture/bridge-protocol.md) describes current implemented behavior and remaining limitations.

| Existing component | Implication |
| --- | --- |
| Python bridge on `127.0.0.1:37891`, using SSE and HTTP actions | Potential development transport; needs normalized adapters and request identity |
| `agy_watch.ps1` wrapper | Reports process start and exit; does not establish live tool progress or bidirectional requests |
| Prepopulated bridge sessions | Move fixtures behind explicit preview mode |
| Approval handler changes local status; replies are stored in a dictionary | Add actual CLI delivery and acknowledgment before exposing interactive controls |
| `failed` maps to the `done` presentation | Separate failure and completion |
| Window-name jump with fallback applications | Does not establish precise session or tab targeting |
| Edge App Mode launcher | Preview shell; native transparency, hit testing, tray, and activation behavior need a suitable desktop shell |
| No separate Codex or OpenCode adapters | Both are implementation targets rather than completed integrations |

The historical Antigravity transcript-reading plan is an integration hypothesis. Verify supported interfaces and the installed CLI version before relying on any hook or file path. Tauri v2 with Rust is the selected desktop runtime. Keep the existing island UI; the runtime change does not introduce a dashboard, large framework, or a separate Python process into the installed app.

## 16. Desktop behavior and accessibility

- Provide tray actions for visibility, monitor selection, settings, and exit.
- Support always-on-top as a preference and hide-on-fullscreen or presentation behavior.
- Transparent regions outside the visible island must pass clicks through. Keep interactive bounds synchronized with visible geometry during transitions.
- Passive updates do not activate the window; explicit interaction enables input.
- Save the chosen monitor and position mode. Fall back to the primary monitor when necessary.
- Validate white, black, and visually busy wallpapers, taskbars on different edges, and mixed-DPI monitors.
- Use accessible names and toggle states for all icon controls. Do not rely on color, hover, or motion alone.
- Announce new requests and failures once. Avoid announcing every progress update or timer tick.
- Keep focus rings visible inside rounded surfaces, support keyboard scrolling, and preserve caret position during updates.
- Larger text may increase panel height and reduce secondary metadata; never crop questions or decisions.

## 17. Avoid

- Taking visual direction from the legacy local UI.
- Sidebars, statistics cards, nested card systems, or full chat history in the island.
- Fake macOS chrome or a simulated hardware notch.
- Large avatars, generic robot emoji, or provider identities distinguished only by color.
- Different mascots for the same agent's running and completed states.
- Repeated provider, terminal, and model badges on every row.
- Icon-only approval decisions, cryptic abbreviations, and tooltip-only error explanations.
- Persistent glow, repeated attention pulses, row entrance cascades, and bouncing text.
- Fake quotas, estimated progress presented as real data, and success before acknowledgment.
- New events stealing focus, replacing an active draft, or moving a button during interaction.

## 18. Implementation sequence

1. Build tokens, the three original avatars, compact mode, session rows, and expanded mode in an isolated preview. Clearly label fixtures.
2. Refine spacing, hierarchy, minimal controls, and shape continuity on a Windows laptop before expanding feature scope.
3. Implement presentation and state transitions from section 13, including interrupted morphs, rapid toggles, event bursts, and reduced motion.
4. Normalize bridge events and separate live data, fixtures, delivery, failures, and connection state.
5. Build verified Codex, Antigravity, and OpenCode adapters. Enable interaction only after bidirectional delivery is proven.
6. Add tray, hotkey, DPI, multi-monitor placement, activation rules, and transparent-region hit testing.
7. Validate requests, reconnect, settings, and motion against real sessions.
8. Implement the approved width-only hover reveal and compact idle refinement; synchronize native hit regions and validate pointer re-entry and keyboard equivalents.
9. Replace the current Settings dialog with island-contained Agents, Appearance, and Behavior routes. Verify back/escape navigation, outside-click collapse, background setup completion, and request arrival while editing.
10. Add a verified account-scoped quota collector and separate usage transport, starting with the supported Codex interface. Validate authentication, account matching, snapshots, sparse updates, stale data, and reset semantics before enabling live quota displays. Other providers remain explicitly unavailable until verified.

## 19. Acceptance criteria

- [ ] Compact and expanded modes read as one continuous surface.
- [ ] Idle uses the application mark and `Idle`; no truncated empty-state sentence or false provider activity appears.
- [ ] Hover widens only the strip: height is unchanged and no session body, dropdown, or Settings opens.
- [ ] Pointer intent, exit grace, re-entry, keyboard focus, and clicks during widening settle at the latest valid presentation without flicker or focus theft.
- [ ] Vibe Island informs the visual quality: black surface, small pixel avatars, flat rows, quiet metadata, restrained utility controls.
- [ ] The legacy local UI is not used as the visual baseline.
- [ ] English documentation and UI copy preserve user-authored session content unchanged.
- [ ] Codex, Antigravity, and OpenCode retain distinct avatars across every state and surface.
- [ ] Provider identities and multiple sessions remain distinguishable without color.
- [ ] Familiar utilities use consistent icons with tooltips, focus states, and accessible names.
- [ ] Tasks, questions, failures, and decisions remain understandable without hovering.
- [ ] Approval uses explicit `Allow Once` and `Deny` labels with visible scope and balanced horizontal buttons.
- [ ] Running, input, approval, completed, failed, and offline presentations are distinct.
- [ ] Long commands and questions are fully readable in detail.
- [ ] Requests remain until answered, rejected, withdrawn, or expired.
- [ ] Planned Auto-open requests defaults to enabled on initial setup, preserves an explicitly disabled preference, and reveals only fresh requests without taking OS/keyboard focus.
- [ ] Typing, Settings, and another request interaction retain their view/draft/caret; deferred requests remain accessible through stable attention and explicit navigation.
- [ ] Manual dismissal, duplicate progress, stale events, and reconnect snapshots cannot repeatedly auto-open the same request; queued requests remain oldest-first.
- [ ] Planned 10-second completion cooldown affects compact presentation only; new activity invalidates old timers and completed output remains available.
- [ ] Planned automatic archiving defaults to disabled and requires a confirmed session end aged at least 24 hours with no unresolved request.
- [ ] Archive markers survive restart/cache recovery; fresh valid prompts or new requests restore sessions without losing results, revisions, or CLI history.
- [ ] Delivery success appears only after acknowledgment; repeated clicks cannot send duplicate decisions.
- [ ] Monitoring-only integrations provide terminal navigation without false interactive controls.
- [ ] Real remaining quota appears for the represented provider in the widened strip and by provider/account in opened views; shared account limits are not duplicated per session.
- [ ] Quota periods, source, reset time, and freshness are truthful; unavailable data has an explicit state rather than a fabricated percentage.
- [ ] Account changes, sparse updates, invalid data, stale readings, and refresh failures cannot present another account's balance as current.
- [ ] Reset countdowns do not claim that access has recovered without authoritative data; quota exhaustion never fabricates task failure.
- [ ] Hover does not repeatedly spawn quota collectors or network requests; refreshes preserve geometry, focus, and session ordering.
- [ ] Jump-back describes only the precision actually supported.
- [ ] Preview sessions do not appear during normal live startup.
- [ ] Passive events preserve focus, drafts, list stability, and active inputs.
- [ ] Opening, closing, inline detail, and compact-state transitions follow the timing and anchor rules.
- [ ] All Settings sections and provider diagnostics stay inside the same island; no separate dialog, tab, or window opens.
- [ ] Settings transitions preserve the top-center anchor and final-size text, with no elastic bounce or scaled controls.
- [ ] Back/Escape restores the prior route or session context, scroll, draft, caret, and valid focus target.
- [ ] Requests arriving during configuration expose a stable attention cue and explicit navigation without replacing edits.
- [ ] Outside-click collapse and background Connect/Reconnect completion preserve configuration state without reopening the island.
- [ ] Rapid toggle reversal, completion during opening, new request during typing, and offline during sending settle correctly.
- [ ] Reconnect does not replay historical animations, sounds, or resolved requests.
- [ ] Reduced motion removes geometric animation while preserving all information and controls.
- [ ] Transparent hit regions remain correct throughout morphs.
- [ ] Layout works at 1366 x 768 and 1920 x 1080 with 100%, 125%, 150%, and 200% scaling.
- [ ] Keyboard navigation, screen readers, larger text, high contrast, mixed-DPI monitors, and fullscreen behavior are verified.

Implementation review artifacts: screenshots of idle, width-only hover, multi-agent working, expanded sessions with fresh/unavailable/stale quota, approval, questions, failure/offline, and all three Settings sections; short recordings of hover entry/exit, clicking during widening, session-to-Settings navigation, section changes, back/escape, request arrival while editing, interrupted morphs, and reduced motion. Compare shape, density, hierarchy, and continuity against the official Vibe Island reference, not the legacy prototype. Documentation approval does not establish that these runtime checks have passed.
