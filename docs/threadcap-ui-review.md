# Threadcap UI delivery review

Direction: preserve the approved true-black, top-attached island with small recognizable provider marks, flat session rows, filled pixel utilities, and independent state companions. **ENERGY 1 / RHYTHM 1 / MOTION 2**, as specified in design.md. The selected Threadcap mark and navigation changes were approved before implementation. Motion explains state and surface continuity; it does not determine task or permission outcomes.

This review covers the changed interface and the tested browser/native configurations. Broader native DPI, live-agent, installed-upgrade, and human usability acceptance remain explicitly listed in [the implementation report](threadcap-implementation.md). PASS below does not assert those unperformed checks.

## Hard gate

| Check | Result and evidence |
| --- | --- |
| R-02, authored copy | PASS: new labels and guidance use plain English and no em dash. Original user/session content is preserved. |
| R-03, overflow | PASS: browser layout/interaction checks pass, including logical-size Settings coverage from 100% through 200%; native screenshots keep decisions inside the surface. |
| R-17, statistics | PASS: counts derive from retained sessions and verified availability; no marketing statistics were added. |
| R-18, testimonials | PASS: no testimonials or fictional user identities are part of this interface. |
| R-23, assets | PASS: the approved Edge signal concept supplies the application mark; approved provider marks remain unchanged. New utilities and companions implement the authorized pixel refinement. |
| R-24, navigation targets | PASS: Sessions, Agents, Archive, and Settings actions reach real in-island views. Direct Archive and explicit Back routes are exercised. |
| R-25, contrast | PASS: primary, secondary, muted, semantic, and focus tokens measure 5.30:1 to 15.77:1 against the brightest design surface. Native screenshots were inspected. |
| R-26, functioning controls | PASS: browser tests exercise utilities, setup navigation, response previews, Settings, and Back. Native checks exercise Connect, terminal choice, retention, archive review, and Restore; destructive paths have separate unit/native checks. Unsupported delivery remains capability-gated. |
| R-27, feedback states | PASS: empty Archive/Sessions, busy detection/navigation, unsupported versions, unverified/stale quota, Checking, and request delivery feedback are defined in source and exercised where applicable. |
| R-28, FAQ | PASS: no unrelated FAQ or marketing section exists. |
| R-32, keyboard | PASS: native buttons have names; visible focus, Escape/Back, textarea caret, and draft preservation are checked. Cancel receives initial destructive-review focus. |
| R-33, source implementation | PASS: features are implemented in repository source. Browser expressions are explicit tests of the preview API, not runtime feature patches. |
| R-34, themes | PASS: the approved dark surface and attachment options are preserved; no unsupported theme toggle was introduced. |
| R-35, execution | PASS: the app was built and run in WebView2; browser click-through checks, native IPC, owned-shell navigation, physical outside clicks, screenshots, and a native motion recording provide evidence. |
| R-36, claims | PASS: no new security/performance guarantee is made. Registration, plugin loading, synthetic events, native interaction, and live-provider acceptance are distinguished. |
| R-37, direction | PASS: design.md and the approved revision plan defined the incumbent composition, icon selection, state language, and motion before edits. |
| R-38, content | PASS: production starts without seeded sessions. Preview data remains explicitly simulated; native test fixtures use separate state and configuration. |
| R-39, affordances | PASS: controls use native button/input elements, accessible names, focus treatment, pointer/disabled states, and runtime reduced motion. |
| R-40, performance | PASS: one shared native observer runs independently of hover; geometry measurements are coalesced, hidden loops pause, and no quota collector starts on hover. Surface geometry animation follows the explicitly approved native shape requirements. |

## Purpose gate

| Check | Result and evidence |
| --- | --- |
| R-01, color | PASS: black joins the upper display edge; semantic accents identify work, requests, completion, and errors. Product colors retain identity. |
| R-04, icons | PASS: utility geometry depicts actual actions. Provider-specific companions carry state without deforming logos. |
| R-06, typography | PASS: Segoe UI follows the Windows companion brief; monospace is reserved for commands and paths. |
| R-07, background patterns | PASS: no decorative grid or wallpaper was introduced. |
| R-08, arrows | PASS: arrows identify Back, terminal navigation, send, or disclosure; no decorative arrow pattern was added. |
| R-09, badges | PASS: no promotional badges. Preview, request counts, and session counts have operational meanings. |
| R-10, glass | PASS: no decorative glass layer or backdrop blur. |
| R-12, shadows | PASS: the existing surface separation is retained; the native frame has no additional decorative shadow layer. |
| R-13, glow | PASS: no persistent glow is used. |
| R-14, repeated cards | PASS: sessions remain flat rows; Archive uses the same compact row/control language. |
| R-19, motion | PASS: surface geometry and content move separately; discrete companion rhythms identify provider/state. Hidden loops pause, interrupted transitions settle, and reduced motion preserves a complete pose. |
| R-22, illustrations | PASS: no unrelated stock illustration or mascot was added. |

## Liveliness

| Check | Result and evidence |
| --- | --- |
| Dials and design read | PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 is inherited explicitly from design.md. |
| Focal point | PASS: task/request context leads Sessions; setup guidance leads provider detail; deletion scope and decisions lead review. |
| Spacing | PASS: grouped metadata and utilities keep the small surface readable. Deletion review replaces a potentially long list rather than appending decisions below it. |
| Accent | PASS: state companions provide semantic accents; the chosen app mark adds its approved single blue signal. |
| Identity motif | PASS: stable pixel product marks, filled pixel utilities, and continuous top-anchored shape changes recur across views. |

## Craft and consistency

| Check | Result and evidence |
| --- | --- |
| C-1, intentionality | PASS: geometry, labels, and state distinctions resolve the reported thinness, ambiguous Back, hidden Archive, and false Offline symptoms. |
| C-2, completeness | PASS: implemented controls have handlers and visible busy/error states; unsupported capabilities remain explicit. |
| C-3, content | PASS: no dashboard, fabricated progress, generic landing sections, or nested decorative cards. |
| C-4, resilience | PASS within tested scope: focus/drafts, rapid transitions, recovery ordering, stale requests, keyboard access, and reduced motion pass. Remaining native display/human cases are documented separately. |
| C-5, evidence | PASS: the implementation report names actual checks and distinguishes fixtures from live-provider behavior. |
| R-05, structure | PASS: the product remains an attached operating surface rather than a marketing template. |
| R-11, shapes | PASS: the outer island, flat rows, compact rectangular controls, and focused inset have distinct roles. |
| R-15, calls to action | PASS: Connect, Restore, Delete, Cancel, and return destinations describe actual outcomes; consequential decisions retain labels and scope. |
| R-16, copy | PASS: short English operational guidance replaces vague connection assumptions; no marketing buzzwords were introduced. |
| R-20, identity | PASS: the selected Threadcap mark, product-derived pixel identities, and shared Windows typography remain coherent across presentations. |
| R-21, dark mode | PASS: true black is the approved product surface; readable inset, semantic, and focus tokens support it without generic navy decoration. |
| R-29, palette | PASS: shared foreground, surface, state, and focus tokens preserve contrast and restrict accents to meaningful state/identity. |
| R-30, references | PASS: approved references guide compact hierarchy and discrete motion. Artwork is original or appropriately sourced; proprietary reference-app assets were not extracted. |
| R-31, rationale | PASS: design.md, the revision plan, and the implementation report explain the geometry, typography, navigation, state, and motion decisions. |

Evidence: [implementation report](threadcap-implementation.md), `tests/ui.browser.js`, `tests/icon-controls.browser.js`, `tests/refinements.browser.js`, `tests/threadcap.browser.js`, `scripts/check-threadcap-native.cjs`, `scripts/check-threadcap-archive.cjs`, and `scripts/record-threadcap-motion.cjs`. Raw results and captures are generated locally under `artifacts/`.
