# Version 0.6.0 verification

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](../guides/capabilities.md) and [changelog](../../CHANGELOG.md).

Verified on Windows on November 16, 2026 with Codex CLI 0.169.0, MSVC Rust 1.100.0, and Node.js 24. Native smoke builds used the separate application identifier from `tauri.smoke.conf.json`, an in-memory bridge, temporary application data, and separate ports. The installed application was left running. The installer uses the normal production identifier.

## Evidence

| Check | Result |
| --- | --- |
| JavaScript session model and Rust core | 10 + 12 tests passed |
| Rust Codex hook adapter | 15 tests passed |
| Native unit tests | 6 passed, including quota validation and remaining-percentage semantics |
| Mocked native IPC browser checks | 27 passed; hover geometry tested with reduced motion because the embedded iframe animation clock did not advance reliably |
| Refinement browser checks | 49 passed, including drafts/caret, quota attribution, stale/invalid data, provider navigation, sound-state synchronization, logical monitor/scaling sizes, and 320px preview overflow |
| Existing preview and control checks | 69 + 16 passed |
| Actual native refinements | 16 passed; real WebView2 hover animation reached 440 DIP from a 186 DIP source, staying 42 DIP tall and attached throughout sampled bounds |
| Physical Windows outside-click checks | 9 passed, using an owned receiver and SendInput; click forwarding, Settings dismissal, and rapid reopening remained correct |
| Native Connect regression | 10 passed, using a temporary Codex profile; unrelated hooks/backups preserved, errors retryable, registration not mistaken for trust |
| Authenticated Codex quota read | Returned `fresh`, one quota bucket, source `Codex app-server`; visible in the native account overview |
| Authored token contrast | All 18 checked foreground/background combinations passed 4.5:1 |
| Release | Production x64 installer built and staged with helper, guide, and checksums |

No model threads or turns were created. The account read used Codex's own existing sign-in; no credential file was read by the adapter. Synthetic session tests disabled quota collection and never wrote to the normal session database. Actual account quota was tested separately, without injecting sessions.

The logical layout matrix covers 1366×768 and 1920×1080 at 100%, 125%, 150%, and 200% equivalents. Native screenshots and OS-input checks used the current Windows scaling. This is not verification of every physical DPI configuration, mixed-monitor arrangement, screen reader, or full-screen application. Those remain broader release-acceptance work.

Local evidence is under ignored `artifacts/`: `refinements-native.json`, `refinements-outside-click.json`, `codex-connect-results.json`, `quota-account-read.json`, `hover-motion-samples.json`, screenshots prefixed `refinement-native-`, and `quota-native-account.png`. The 59-frame WebView2 screencast was encoded as `island-transitions.webp`, with a consistent cropped canvas for changing capture dimensions. It records the island, not other desktop applications. Do not commit account screenshots without reviewing their contents.

## Control walkthrough

| Interaction | Observed behavior |
| --- | --- |
| Pointer enter/exit | Width-only reveal, grace period, return to compact, no automatic panel opening |
| Keyboard focus and main opener | Same contextual reveal; explicit opening remains separate |
| Gear, Back, Escape | In-island Settings; return through provider detail and prior session context |
| Agents / Appearance / Behavior | Real page navigation with a visible current-section marker |
| Provider names and usage rows | Open that provider's in-island connection/quota detail |
| Connect / Reconnect | Real bundled setup; duplicate clicks disabled; malformed configuration preserved with retryable error |
| Reduced motion | Stops surface interpolation while preserving information |
| Bezel switch | Changes attached/floating surface geometry |
| Sound switch and header sound control | Toggle the same audio setting; native sound audibility was not manually assessed |
| New request during Settings | Keeps the current page and shows explicit View request navigation |
| Return to a reply | Mounted draft, caret selection, focus, and selected session restored |
| Outside click | Dismisses Settings and collapses without consuming the target click |
| Rapid toggles | Settle on the latest compact/expanded request |
| Live quota | Current Codex profile account, remaining labels, actual durations; not attributed to an unverified session |
| Stale / unavailable / invalid quota | Clear freshness or diagnostic state; invalid snapshots cannot replace valid data |
| Preview controls | Provider/state selection, replay, tour, reduced motion, and attachment controls retained their existing checks |

## Antislop delivery gate

The gate applies to this change's authored UI and supported Windows scope. Existing approved pixel marks and utility icons were reused. Design Read: a compact Windows agent companion for developers, black attached surface with brand-faithful pixel marks; ENERGY 1 / RHYTHM 1 / MOTION 2.

### Hard gate

- R-02 PASS: new authored UI copy contains no em dash.
- R-03 PASS: logical layout matrix and 320px preview checks found no horizontal overflow; coarse-pointer controls retain 44px minimum targets.
- R-17 PASS: live quota came from an authenticated Codex read; synthetic numbers exist only in isolated test fixtures.
- R-18 PASS: no testimonials or invented people were added.
- R-23 PASS: existing approved marks were reused; navigation follows the confirmed three-section design.
- R-24 PASS: every Settings section and provider destination has a mounted, reachable view.
- R-25 PASS: computed contrast passed for all 18 authored text/background token pairs.
- R-26 PASS: the walkthrough above records real actions; no decorative Connect buttons were added for unsupported providers.
- R-27 PASS: idle, loading, unavailable, stale, invalid-response, and setup-error states were exercised.
- R-28 PASS: no FAQ was added.
- R-32 PASS: native keyboard reveal/Escape and browser draft/caret/focus restoration checks passed; visible focus styling remains.
- R-33 PASS: UI changes were written directly in source through patches, with no source-rewriting helper scripts.
- R-34 PASS: only the approved black theme is shipped; no incomplete theme switch was introduced.
- R-35 PASS: native runtime, physical click checks, browser walkthrough, and release build were run; native JavaScript errors were absent.
- R-36 PASS: no unmeasured performance, compliance, or security claims were added.
- R-37 PASS: the approved design and explicit ENERGY/RHYTHM/MOTION direction preceded implementation.
- R-38 PASS: account/session mapping is explicitly unverified, other quotas unavailable, and all synthetic fixtures isolated.
- R-39 PASS: new actions use named native buttons, preference fields use visible labels, and reduced motion removes the new spatial transitions.
- R-40 PASS: the reused application mark has a fixed 16px slot; no media, render-blocking third-party dependency, or unmeasured performance score was added to the product.

### Purpose gate

- R-01 PASS: approved brand colors remain on marks; no decorative gradient was added.
- R-04 PASS: existing gear, collapse, and back glyphs represent their actual actions; provider marks identify providers.
- R-06 PASS: existing Segoe UI tokens maintain Windows readability; no display typography was added.
- R-07 PASS: no background grid or decorative texture was added.
- R-08 PASS: the back chevron navigates back; no ornamental action arrows were added.
- R-09 PASS: registration and attention labels report actual integration/request state, without decorative capsules.
- R-10 PASS: no glass or backdrop blur was introduced.
- R-12 PASS: the existing surface separation remains; Settings has no separate shadowed panel.
- R-13 PASS: no glow was added; blue focus and current-section cues identify interaction.
- R-14 PASS: Settings and quota use flat functional rows, not repeated feature cards.
- R-19 PASS: horizontal reveal communicates additional context, page morphs connect navigation, and geometry samples plus the screencast verify the motion.
- R-22 PASS: no decorative illustration was introduced.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 are declared and retained.
- Consistency PASS: quiet rows and coordinated shape/content motion match the approved density and motion level.
- Focal point PASS: task/request content leads sessions; the active section leads configuration.
- Whitespace PASS: the shared header, navigation baseline, and row spacing separate functional groups.
- Accent PASS: restrained blue identifies focus/current navigation; semantic request colors retain their established role.
- Identity PASS: small provider pixel marks and the attached morphing black surface remain the repeated motif.
- Design Read PASS: the direction was declared before implementation and recorded above.

### Craftsmanship and quality locks

- C-1 / R-31 PASS: black and Segoe UI retain the approved Windows companion identity; flat rows conserve space; page partitions constrain height; motion preserves context.
- C-2 PASS: the control walkthrough records every new navigation and setup action.
- C-3 PASS: sections contain actual agent setup, appearance, or behavior controls; no template content was added.
- C-4 PASS: tested logical sizes, keyboard routes, reduced motion, and error states retain working controls; broader physical-monitor limits are stated above.
- C-5 PASS: quota provenance and verification boundaries are explicit.
- R-05 PASS: composition follows the island's task/configuration hierarchy, without dashboard cards or marketing sections.
- R-11 PASS: the outer surface keeps its approved radius; buttons and inset controls use smaller existing radii.
- R-15 PASS: Connect, Reconnect, View request, Back, and the section labels name their specific actions.
- R-16 PASS: no marketing superlatives or AI buzzwords were added.
- R-20 PASS: the native top-edge shape and provider pixel identity remain specific to this companion.
- R-21 PASS: black is the user-approved island direction; no unrelated theme work was deferred.
- R-29 PASS: the neutral UI and established semantic/focus tokens were retained.
- R-30 PASS: the user explicitly requested Vibe Island's direction; reference-app assets were not extracted or copied.

The gate does not certify unimplemented push updates, per-session account mapping, other providers' quota, or production readiness across untested Windows configurations.

## Version 0.6.1 frame-border follow-up

A user screenshot showed bright vertical edge pixels outside the island's subtle CSS rim. Pixel inspection found approximately RGB 199/213/227 at the outer line, versus RGB 25/25/25 at the CSS rim. The precise original appearance was not reproduced in the isolated host, so this is not a confirmed before/after reproduction of that user's desktop condition.

The native host now requests a dark non-client frame and suppresses the additional DWM border using `DWMWA_BORDER_COLOR = DWMWA_COLOR_NONE`, before showing the window and on focus/theme changes. Unsupported attributes do not fail startup. CSS borders, keyboard focus, window regions, and click-through behavior remain intact.

The Windows setter accepted the no-border policy. `tests/native/check-native-edge.cjs` captured the owned test window with margins outside its clipped region and found no bright sampled edge pixels. The probe records whether Windows accepted foreground activation rather than assuming focus was granted. DWM border color is a setter attribute; querying it with `DwmGetWindowAttribute` is not a valid readback test and was removed from the probe.

Six native unit tests, 16 native runtime checks, and nine physical outside-click checks passed after the change. The native tests used the separate smoke identifier; the 0.6.1 installer uses the production configuration. This follow-up changes native frame policy rather than removing accessibility focus indicators or the approved CSS rim. The earlier Antislop gate remains applicable to the unchanged UI.
