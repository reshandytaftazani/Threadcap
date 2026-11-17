# Larger agent state companions

Date: November 17, 2026. Scope: the companion artwork, its sizing, compact aggregation, and associated presentation behavior. This record does not certify every existing application control or provider integration.

## Design and implementation

Reading this as: desktop agent monitoring for developers, in Threadcap's established black and blocky pixel language, ENERGY 1 / RHYTHM 1 / MOTION 2.

- Keep each provider mark at its existing 16 DIP scale and preserve its palette, so identity stays stable while activity changes.
- Redraw companions on a 12 DIP integer grid with thicker filled shapes, so questions, approval, completion, and failure remain visible beside the mark. Do not scale the old 8 DIP paths fractionally.
- Reserve a 32 x 24 DIP avatar slot and a 3 DIP mark-to-companion gap, preserving row alignment and compact height while allowing stepped motion.
- Retain provider-specific activity and cadence; idle remains a quiet four-pixel block with long rest periods.
- Use static provider marks and one shared companion in grouped compact summaries, avoiding several competing animations in the small strip.
- Update shared status text separately from its avatar node, so unrelated activity updates do not restart animation.
- Preserve the existing black surface, Segoe UI typography, state colors, horizontal hover, motion control, and reduced-motion fallback. This revision adds no product routes, accounts, or capabilities.

## Evidence

`npm run test:agent-icons` ran against a newly built smoke executable from the changed source, using private profiles, ports, and synthetic sessions. The script rejects a host older than the relevant frontend source files. The installed application was not used as evidence or replaced.

Smoke executable SHA-256: `70053dc39561a2ab58c5f3fe4bdf8a510bc5980470a6ac0757528f749d9f6e80`.

All 14 native checks passed with process exit code 0:

1. Three synthetic provider sessions reached the current WebView2 build.
2. Grouped compact mode contained three static marks and exactly one shared companion.
3. An unrelated activity update preserved the shared animation node.
4. Hover widened the compact surface without changing its height or opening the body.
5. Compact click opened Sessions.
6. Expanded avatar slots measured 32 DIP; brand drawings remained within 16 DIP.
7. All 27 provider/state combinations and their frames fit the reserved motion bounds.
8. Meaningful symbols had visible filled bounds; product mark geometry stayed identical across states.
9. Reduced motion left one complete pose with no active sprite animation.
10. Settings opened inside the island.
11. Settings Back returned to Sessions.
12. Working companions advanced between discrete poses in WebView2.
13. Native recording captured 42 frames.
14. No JavaScript exceptions or console errors were reported during the native exercise.

The first run completed its visual assertions but exited with a pending screencast acknowledgment timeout. The test now drains frame acknowledgments before closing its host. The rerun above completed successfully; no production transport behavior was changed for that fixture correction.

Local ignored evidence: `artifacts/agent-companions-native.json`, `artifacts/agent-companions-sessions.png`, `artifacts/agent-companions-hover.png`, and `artifacts/agent-companions-motion.html`. The recording has Play and Pause controls.

The current-source comparison page was visually inspected in Orca's browser at its default desktop size, 390 x 844 with touch emulation, and 1920 x 1080 with device scale 2. The 390 and 1920 views reported no document overflow; all 27 state images had accessible names. Pause and Resume worked with clicks, Space, and Enter. The comparison console contained no entries. These are browser emulation observations, not mixed-monitor Windows DPI verification.

The 19 JavaScript model/presentation/quota tests passed. JavaScript syntax, repository publication checks, and whitespace checks passed. No Rust runtime behavior or provider configuration was changed.

After the smoke checks, `npm run build` restored the production application identifier and generated `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe` (2248006 bytes). Installer SHA-256: `D168F406772A583C08D475567347B5E0545E4C6A7006D037C3A5A38021D7A258`. Authenticode reports `NotSigned`. The installer was built but not installed or published.

## Anti Slop delivery gate

The following gate is scoped to this revision. Unchanged product areas are identified rather than presented as newly tested.

### Hard gate

| Rule | Result and evidence |
| --- | --- |
| R-02 | PASS: new authored copy contains no em dash. |
| R-03 | PASS: comparison at 390 DIP reported no horizontal overflow; no interaction targets were reduced. |
| R-17 | PASS: displayed verification counts come from the recorded test results; no invented usage data. |
| R-18 | PASS: no testimonials or people were introduced. |
| R-23 | PASS: the owner explicitly approved the 12 DIP companions for all providers and states. |
| R-24 | PASS: no product navigation items were added. |
| R-25 | PASS: measured companion colors on black are blue 9.94:1, amber 11.84:1, green 12.44:1, rose 9.37:1, gray 6.48:1; existing text colors remain unchanged. |
| R-26 | PASS: compact click, Settings, Back, Pause, and Resume performed their documented actions in the scoped exercise. |
| R-27 | PASS: Idle, Checking, Failed, and Offline have explicit shapes; existing empty/loading/error presentations remain in place. |
| R-28 | PASS: no FAQ was added. |
| R-32 | PASS: no controls or focus rules were replaced; comparison Pause/Resume worked using Space and Enter. |
| R-33 | PASS: changes were made directly in source, with no source-rewriting feature script. |
| R-34 | PASS: no theme or theme toggle was added; existing fixed-black product direction is retained. |
| R-35 | PASS: current source ran in the browser and a freshly built WebView2 host; the control exercise is recorded above. |
| R-36 | PASS: no security, performance, or provider-capability claims were added. |
| R-37 | PASS: approved design direction and explicit dials are recorded above and in design.md. |
| R-38 | PASS: native screenshots and recordings are explicitly synthetic fixtures, separate from live data. |
| R-39 | PASS: each companion exposes its state through an accessible image name; SVG internals are hidden; runtime reduced motion leaves one pose; existing motion controls remain available. |
| R-40 | PASS: new inline SVGs reserve explicit dimensions; no external scripts, media downloads, or unmeasured performance scores were added. |

### Purpose gate

| Rule | Result and evidence |
| --- | --- |
| R-01 | PASS: existing semantic colors communicate state; provider palette bands identify the provider. |
| R-04 | PASS: question, exclamation, check, cross, disconnected corners, and activity blocks have state-specific meanings. |
| R-06 | PASS: existing Segoe UI copy remains readable alongside the pixel artwork; no new typeface. |
| R-07 | PASS: no background pattern added. |
| R-08 | PASS: no decorative button arrows added. |
| R-09 | PASS: no badges added. |
| R-10 | PASS: no blur added. |
| R-12 | PASS: no shadows added. |
| R-13 | PASS: no glow added. |
| R-14 | PASS: no feature cards added. |
| R-19 | PASS: discrete motion distinguishes task activity while stable product marks preserve identity; reduced motion was exercised. |
| R-22 | PASS: no generic illustrations added. |

### Liveliness

| Item | Result and evidence |
| --- | --- |
| Explicit dials | PASS: ENERGY 1 / RHYTHM 1 / MOTION 2. |
| Dial consistency | PASS: compact rows and calm hierarchy remain; only state companions and existing transitions move. |
| Focal point | PASS: task context remains larger than the small identity/status artwork in the inspected Sessions screenshot. |
| Structural whitespace | PASS: fixed avatar slots and a 10 DIP text gap maintain the shared task column. |
| Deliberate accent | PASS: semantic state color accents the companion, preserving the surrounding neutral hierarchy. |
| Identity motif | PASS: stable provider silhouettes and stepped pixel companions remain consistent across presentations. |
| Design Read | PASS: stated before implementation and recorded above. |

### Craftsmanship and quality locks

| Item | Result and evidence |
| --- | --- |
| C-1 | PASS: identity, sizing, spacing, and motion reasons are recorded above. |
| C-2 | PASS: no new interactive element; scoped controls were exercised. |
| C-3 | PASS: no sections or template content added to the product. |
| C-4 | PASS: scoped static state, reduced-motion, compact, expanded, and narrow comparison presentations were checked; platform limits are listed below. |
| C-5 | PASS: no fabricated claims; evidence distinguishes fixtures from live integrations. |
| R-05 | PASS: existing compact/flat-row composition retained. |
| R-11 | PASS: no radius system changes. |
| R-15 | PASS: no CTA copy added. |
| R-16 | PASS: new copy contains no marketing buzzwords. |
| R-20 | PASS: Threadcap's attached black surface and blocky state vocabulary remain recognizable. |
| R-21 | PASS: black follows the approved desktop-companion direction. |
| R-29 | PASS: existing provider palettes and semantic state tokens are reused without adding colors. |
| R-30 | PASS: existing owner-requested Vibe Island direction retained; companion geometry is project-authored. |
| R-31 | PASS: each major changed visual decision has a one-line purpose above. |

## Limits

Physical outside-click behavior, mixed-monitor DPI transitions, the full Windows scaling/taskbar matrix, live CLI sessions, and installer upgrade behavior were not retested. The native checks validate this frontend change in an isolated host. A successful installer build alone does not establish those behaviors. The application still identifies as 0.8.4; this is an unreleased source refinement, not a published new version.
