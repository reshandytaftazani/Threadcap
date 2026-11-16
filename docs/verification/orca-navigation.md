# Orca navigation verification, version 0.6.2

## Scope and results

The connector was exercised against local Orca 1.4.258 on Windows. The native smoke host uses a separate application identifier, temporary application data and Codex profiles, an in-memory session store, and a separate bridge port. Fixtures never enter the user's session database. No model calls, terminal input, or agent launches were used. Real switching was limited to the already-running terminal owned by the implementing agent.

- `tests/native/check-orca-navigation-native.cjs`: 16 checks passed. These cover inherited identity, exact real Orca navigation, PTY pinning, rejected reused PTYs, clearing absent launch identity, rejected producer capability injection, explicit old-session selection, safe chooser metadata, visible painted content, positive acknowledgment, persistent manual selection across restart, stale runtime/choice rejection, and unknown session rejection.
- `tests/native/check-refinements-native.cjs`: 16 runtime checks and nine physical outside-click checks passed after the final helper transaction change. Width-only hover, Settings, reduced motion, attention context, interrupted transitions, and JavaScript errors were included.
- `tests/browser/orca-navigation.browser.js`: 11 checks passed with mocked native IPC. These cover routing, duplicate suppression, escaped labels, acknowledgment failures, empty/error/retry states, dismissal of late results, and keyboard interaction. These are frontend checks, not evidence of OS switching.
- Existing browser suites passed: desktop 27, refinements 49, icon controls 16, and UI 69. The UI suite initially encountered delayed animation painting while native switching changed foreground focus; its interrupted-transition assertion now waits for a bounded rendered settlement. The isolated rerun passed without product geometry changes.
- Unit suites passed: JavaScript session model 10, Rust core 12, Codex helper 16, and native host eight. Terminal unit tests cover the safe environment allowlist, revision ordering, invalidation, exact identity matching, and acknowledgment rejection.

The native picker screenshot, `artifacts/orca-terminal-picker.png`, was inspected after its transition finished: the flat choices, full terminal identity, wrapped context, and Refresh action are visible inside the island. It is an isolated fixture screenshot, not live product data.

The production NSIS installer was built successfully, separately from the smoke configuration, using `npm.cmd run desktop:build`. `npm.cmd run release:stage` staged the 0.6.2 installer, standalone helper, guide, and SHA-256 checksums in `dist/`; the checksums and revised documentation links were verified. A successful installer build does not establish a completed end-user upgrade or hook trust review.

## Remaining coverage

Only local Orca Codex navigation is implemented. Remote environments, other terminal hosts, and other provider navigation remain unsupported. Mixed-DPI monitor movement, all taskbar positions, fullscreen behavior, larger accessibility scaling, and every Windows foreground policy are not certified by these checks. Manual linking remains a user assertion rather than proof of session ownership.

## Antislop delivery gate

This is an incremental gate for the new terminal chooser. The unchanged surface retains the [existing gate and contrast evidence](refinements.md). The approved Design Read remains ENERGY 1 / RHYTHM 1 / MOTION 2: true black, small provider marks, flat rows, restrained blue focus, and contextual geometry/content transitions.

### Hard gate

- R-02 PASS: new authored chooser copy contains no em dash.
- R-03 PASS: labels and paths wrap inside the island; the native painted screenshot contains the complete chooser without horizontal clipping.
- R-17 PASS: no product statistics were added; test counts above refer to recorded checks.
- R-18 PASS: no testimonials were added.
- R-23 PASS: no new visual assets or navigation hierarchy were created; the approved existing Agents detail hosts the picker.
- R-24 PASS: no navbar or ghost links were added; documentation links resolve within the repository.
- R-25 PASS: picker text reuses the existing verified text tokens on black; no new text color was introduced.
- R-26 PASS: real native opening, manual selection, Refresh, and failure retry were exercised.
- R-27 PASS: pending, empty, unbound, stale, and error states are implemented and checked.
- R-28 PASS: no FAQ was added.
- R-32 PASS: choices are native buttons with existing visible focus; the browser suite exercises keyboard selection and Escape.
- R-33 PASS: implementation was written directly in source through patches.
- R-34 PASS: the approved black theme remains; no theme toggle was added.
- R-35 PASS: native click-through and real Orca switching were run, with no JavaScript errors in the native refinement checks; production build is a separate release step.
- R-36 PASS: no unmeasured security or performance guarantees are claimed.
- R-37 PASS: the approved island design and declared dials preceded the chooser.
- R-38 PASS: fixtures are isolated; unsupported navigation and manual-association limits are explicit.
- R-39 PASS: choices use named native buttons, at least 44 DIP high; loading disables duplicate actions; existing reduced-motion and focus behavior remain active.
- R-40 PASS: no media, third-party scripts, or performance claims were added.

### Purpose gate

- R-01 PASS: no new gradients or glows.
- R-04 PASS: the existing terminal utility icon opens or links a terminal; no decorative icon was added.
- R-06 PASS: existing Windows-readable typography remains.
- R-07 PASS: no background pattern was added.
- R-08 PASS: no decorative arrows were added.
- R-09 PASS: no capsule badges were added.
- R-10 PASS: no glass effects were added.
- R-12 PASS: choices are flat rows within the existing surface, without independent shadows.
- R-13 PASS: focus uses the established restrained accent; no glow was introduced.
- R-14 PASS: rows represent actual terminal candidates, with wrapping context rather than feature cards.
- R-19 PASS: existing section transitions communicate chooser navigation; no decorative motion was added.
- R-22 PASS: no illustration was added.

### Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 are retained explicitly.
- Consistency PASS: quiet flat choices reuse the island's contextual transitions.
- Focal point PASS: the selected session and Choose Codex terminal heading establish the current task.
- Whitespace PASS: context, choices, and Refresh are separated by functional grouping.
- Accent PASS: established blue identifies keyboard focus and the active Agents section.
- Identity PASS: the attached black surface and small provider marks remain the repeated motif.
- Design Read PASS: the approved design direction preceded implementation.

### Craftsmanship and quality locks

- C-1 PASS: the existing surface conserves space and keeps terminal selection within its session context.
- C-2 PASS: native selection, refresh, retry, and acknowledgment have exercised behavior.
- C-3 PASS: every chooser element supports identifying or opening a real terminal.
- C-4 PASS: tested pending, empty, stale, keyboard, and dismissed states preserve usable navigation; broader desktop limits are listed above.
- C-5 PASS: real switching and mocked tests are distinguished explicitly.
- R-05 PASS: no marketing or dashboard template was added.
- R-11 PASS: choices retain the existing small control radii within the rounded surface.
- R-15 PASS: Link and open and Refresh terminals name concrete actions.
- R-16 PASS: no marketing buzzwords were added.
- R-20 PASS: the attached morphing surface retains the project's established identity.
- R-21 PASS: black remains the user-approved direction.
- R-29 PASS: existing neutral, focus, and semantic tokens are reused.
- R-30 PASS: reference direction is user-requested; no reference-app assets were extracted.
- R-31 PASS: flat choices conserve space, wrapping text preserves identity, and reused transitions preserve navigation context.
