# Agent icon revision: verification and Anti Slop delivery gate

Release record: this document preserves evidence and decisions for its named revision. For current behavior and superseding changes, use [the capability matrix](capabilities.md) and [changelog](../CHANGELOG.md).

Date: November 15, 2026. Mode: DURING, explicitly selected in this conversation.

Scope: brand-based pixel marks, their separate state companions, icon sizing in the island, the icon-comparison page, and relevant regression behavior. This is not a certification of the legacy bridge, real CLI adapters, native Windows shell behavior, or untested operating-system/DPI combinations.

## Compact-size follow-up

User feedback identified that the 24px marks outweighed adjacent text and utility assets. Marks were redrawn on a native 16px grid, rather than downscaled through CSS. OpenCode now uses a proportional 12 x 15 compact rendition. Header marks render at 16 x 16; a row's mark-plus-companion artwork is 28 x 16 inside a 28 x 24 slot. The avatar-to-text gap is 10px. Measured task/detail alignment differs by only 1 CSS pixel.

The 64 regression checks and 16 control checks passed again after this change. Desktop and 390px-wide layouts were inspected; the narrow layout reported no horizontal overflow, the header mark measured 16px wide, and the preview console contained no entries. The source references, brand palettes, and companion animation behavior were preserved. The enlarged comparison uses a 64px drawing for an accurate 4x view of the native 16px asset.

## Evidence

- Top-edge attachment follow-up: 69 regression checks and 16 control checks passed. Compact and expanded surfaces both measured `top: 0`; upper corner radius and top border measured `0px`; the anchor is fixed and the attachment setting starts enabled. Both presentations were visually inspected, and the preview console was empty. This verifies viewport attachment, not OS-level frameless window behavior.

- Aggregate compact follow-up: 68 regression checks and 16 control checks passed. Multi-session compact uses three static provider marks with 5px gaps, a 264px shell, and one aggregate state cue. Per-provider companions and a representative session's elapsed time are absent from this summary. The shared cue is preserved across unchanged renders to avoid animation restarts. Browser console was empty; the final aggregate screenshot was inspected.

- `tests/ui.browser.js`: 64 checks passed, including unchanged mark geometry, unchanged palette/opacity in all seven tested states for each agent, OpenCode's compact 12 x 15 geometry, request acknowledgment, input preservation, interrupted morphs, and reduced motion.
- `tests/icon-controls.browser.js`: 16 click-through checks passed. The sequence and results are listed below.
- Comparison page: all three source images loaded; pause/resume changed actual animation behavior; Space activated pause and Enter resumed it. The stylesheet explicitly specifies a solid 2px focus boundary. The embedded browser reported `document.hasFocus() === false`, so the OS-focused appearance was code-inspected rather than visually verified.
- Source links were activated and navigated to the Codex community reference, official Antigravity press page, and official OpenCode brand page. The preview link navigated back to the working local island.
- Desktop overview was inspected at 1366 x 768. Comparison and focused request were inspected at 390 x 844 with mobile input emulation. No horizontal document overflow was reported. The comparison pause target and focused-view Show all target both measured 44px high under coarse input.
- Local preview console contained no entries when checked. JavaScript syntax, SVG parsing, local document links, authored em-dash scan, and code fences passed.
- Contrast calculations: secondary copy `#A8A8B3` on `#0C0D10` = 8.25:1; muted copy `#8E8E99` on `#141519` = 5.63:1. Working, attention, success, and error companions on black = 9.94:1, 11.84:1, 12.44:1, and 9.37:1 respectively. Source logo inks are preserved as identity artwork; status never depends on a low-contrast internal logo detail.
- Native CLI delivery, physical-device touch, native click-through, screen-reader output, all Windows DPI combinations, Lighthouse, and field Web Vitals were not measured in this revision.

## Recorded click-through

| Element | Observed result |
| --- | --- |
| Codex picker | Codex became the selected preview agent |
| Antigravity picker | Antigravity became the selected preview agent |
| OpenCode picker | OpenCode became the selected preview agent |
| State selector | Selected integration changed to the chosen request state |
| Replay | Selected companion animation was restarted |
| View control | Expanded island collapsed |
| Compact strip | Relevant pending session opened in focused mode |
| Show all | All four preview sessions became visible |
| Motion control | Actual reduced-motion state toggled |
| Bezel control | Anchor treatment changed and restored |
| Settings | Dialog opened with all three product marks |
| Settings motion switch | Actual motion setting changed and restored |
| Close settings | Dialog closed |
| Play | Simulated state sequence started |
| Stop | Simulated sequence stopped |
| Collapse | Compact strip became visible and keyboard-operable |
| Comparison pause/resume | Companion animation stopped/resumed, logo colors unchanged |
| Comparison keyboard | Space paused; Enter resumed; explicit solid focus rule inspected |
| Three source links | Navigated to their recorded source URLs |
| Open island preview | Navigated to the working local Preview route |

## Hard Gate

- R-02 PASS: newly authored comparison copy, icon source, and provenance document contain no em dash.
- R-03 PASS: comparison and focused request showed no horizontal overflow at 390px; modified coarse-input controls measured at least 44px high.
- R-17 PASS: no invented metrics were added; fixture counts remain explicitly labeled Preview/local simulation.
- R-18 PASS: no testimonials or human identities were added.
- R-23 PASS: the user explicitly requested original-brand pixel assets and confirmed geometry, color, and animation decisions before creation.
- R-24 PASS: comparison links point to existing source pages and the working Preview route; destinations were activated.
- R-25 PASS: changed text and semantic companions have computed contrast evidence above the required ratios; source brand palettes remain identity artwork.
- R-26 PASS: pause/resume, navigation, and preview controls produced the recorded actions.
- R-27 PASS: comparison loading, unavailable-artwork, and empty-source paths are explicitly represented in HTML/JavaScript and were inspected; successful loading was exercised.
- R-28 PASS: no FAQ was added.
- R-32 PASS: native Space/Enter operation was exercised; explicit `:focus` and `:focus-visible` rules provide a solid 2px boundary. The host's unfocused-window limitation is recorded above, with no claim of OS-level focus verification.
- R-33 PASS: this revision changes behavior directly in source; the export command only generates standalone SVG assets from shared geometry.
- R-34 PASS: no theme toggle was added; the established black island and comparison surfaces were tested.
- R-35 PASS: local pages were run, console checked, 64 regressions passed, and changed controls/navigation were exercised as recorded above.
- R-36 PASS: no unmeasured performance, security, endorsement, or compliance claim was added.
- R-37 PASS: the approved logo direction and ENERGY 1 / RHYTHM 1 / MOTION 2 were declared before generation and recorded in design.md.
- R-38 PASS: source identities, asset provenance, and the distinction between community reference and first-party assets are explicit.
- R-39 PASS: changed controls use native elements, accessible names, pointer/disabled states, visible focus, and motion controls; SVG identities have image roles/names; reference images have alt text.
- R-40 PASS: comparison images reserve 96 x 96 space; rendered SVGs declare dimensions; scripts are local and deferred; no unmeasured Web Vitals result is claimed.

## Purpose Gate

- R-01 PASS: Codex color bands and Antigravity color regions preserve source identity; semantic color is confined to state companions.
- R-04 PASS: integration marks match actual products; the Preview heading uses the motion symbol rather than a decorative sparkle.
- R-06 PASS: existing Segoe UI typography serves Windows utility readability; monospace remains for commands/paths.
- R-07 PASS: no background grid or decorative pattern was introduced.
- R-08 PASS: no decorative arrows were added; terminal jump and actual navigation retain their action meaning.
- R-09 PASS: Preview labels distinguish simulation from real sessions; no promotional badges were added.
- R-10 PASS: no glass or backdrop filter was added.
- R-12 PASS: source marks have no added shadow; existing island elevation separates it from the desktop.
- R-13 PASS: source marks and companions have no added glow.
- R-14 PASS: comparison rows align the same three real pieces of evidence: source, adaptation, states; no feature-card grid was added.
- R-19 PASS: only companions carry stepped state motion; idle is static, finite states settle, and pause/reduced motion retain meaning.
- R-22 PASS: each graphic identifies an actual integration, with source provenance; no generic illustration was added.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 are explicit in design.md.
- Consistency PASS: restrained identity marks and consistent comparison rows match those dials.
- Focal point PASS: the active island task remains primary; the comparison is organized by one provider per row.
- Whitespace PASS: fixed logo slots preserve alignment; comparison spacing separates source, adaptation, and state evidence.
- Accent PASS: one semantic companion color applies to each session state while source brand inks identify the provider.
- Identity PASS: cloud/prompt, open arch, and 4:5 rectangular mark remain visually distinct.
- Design Read PASS: declared before generating the replacement marks and persisted in design.md.

## Craftsmanship and Quality Locks

- C-1 PASS: each major choice has a written recognition, readability, or state-feedback purpose in design.md and agent-icons.md.
- C-2 PASS: the changed controls and navigation have the recorded real behavior.
- C-3 PASS: comparison content exists to assess source fidelity and small-size readability.
- C-4 PASS: state stability, reduced motion, keyboard operation, mobile layout, and source-loading fallbacks were tested or explicitly inspected as identified above.
- C-5 PASS: no testimonials, metrics, first-party Codex download, CLI validation, or official pixel-variant approval was fabricated.
- R-05 PASS: flat source/adaptation/state rows serve the comparison task; the island's existing task layout remains intact.
- R-11 PASS: source marks have no added container treatment in the island; comparison sample boundaries and controls use the established radius hierarchy.
- R-15 PASS: actions say Open island preview, View source, Pause animation, and Resume animation.
- R-16 PASS: new copy describes actual identities, sources, and interaction rather than promotional claims.
- R-20 PASS: the three source-derived symbols and stepped companions replace anonymous mascot identities.
- R-21 PASS: dark surfaces follow the explicitly approved desktop island direction; no additional theme is claimed.
- R-29 PASS: UI neutrals and semantic accents remain unchanged; multiple logo colors have the explicit purpose of preserving original brand palettes.
- R-30 PASS: Vibe Island is the user's explicit pixel-motion reference; product identity assets are individually sourced and attributed.
- R-31 PASS: geometry, pixel density, color, composition, and motion each have a one-line rationale in design.md.

## Permission choices follow-up — November 16, 2026

The supplied permission-panel reference informed the decision row: equal-width neutral `Deny` and soft-white `Allow Once` buttons below the command inset. The visible single-request scope stays above the buttons. Short question options also share available width and wrap when needed. No persistent-permission or bypass protocol was added.

Scoped delivery gate: PASS. The approved direction remains ENERGY 1 / RHYTHM 1 / MOTION 2. Neutral surfaces distinguish alternatives; white emphasizes the single-request action. Native buttons retain explicit labels, existing keyboard focus rules, disabled submission handling, and the established motion system. No assets or decorative effects were added.

Verification:

- `node --check src/app.js` passed.
- Browser UI suite: 69 checks passed on the clean repeat at 1366 x 768. The initial run passed 68 with one interrupted-transition timing failure in the background webview; no runtime timing changes were made to hide it.
- Control suite: 16 checks passed, including preview controls, settings, and collapse behavior.
- Visual screenshots inspected at 1366 x 768 and 390 x 844. The narrow layout retained two balanced horizontal decisions without page overflow.
- Six narrow-layout assertions passed: equal widths, shared baseline, placement below the command inset, explicit decision labels, at least 44-pixel touch height, and no horizontal page overflow.
- Submission tests still verified duplicate prevention, disabled decisions during sending, and acknowledgment before simulated resume. These are preview checks; no real CLI delivery was exercised.

Native desktop scaling, mixed-DPI monitors, and live adapter permission scopes remain outside this UI-only verification.
