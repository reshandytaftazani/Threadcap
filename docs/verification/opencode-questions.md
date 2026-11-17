# OpenCode interactive form visibility

Date: November 17, 2026. Unreleased source refinement on the 0.8.4 baseline.

## Findings

The installed OpenCode CLI reports 2.3.0. A real isolated server reproduced an adapter defect: `form.created` reached the observer and produced `waiting_input`, but the report contained only the form title and no choices. That test did not prove that every real form reached the user's running application.

The frontend also hid choices whenever `canAnswer` was false, even though monitoring-only requests must remain understandable. Separately, automatic attention required the island to be collapsed, so an already-open Sessions overview could silently suppress a fresh focused request.

The running installed host had a different executable hash from the newly built source. It was read for diagnosis, not used to validate the fix. No live session content, hook configuration, provider settings, or user database was modified during these checks.

## Change

- Preserve visible OpenCode form field titles/descriptions and choice labels/descriptions in the observer's pending-request context. Keep parallel requests ordered and retain choices until the matching form is replied to or cancelled.
- Present observed choices as an ordinary list in monitoring-only detail. Keep the explanation that answers belong in the terminal; do not introduce simulated response buttons or enable unsupported answer capabilities.
- Preserve multi-field questions and their choice context in order. Ignore hidden fields and never collect defaults, answers, or external authentication URLs for this display. Bound the number of fields/options and question text.
- Permit a fresh request to reveal from an unselected Sessions overview when the pointer is outside and session controls do not hold focus. Preserve Settings, selected detail, typing, pointer interaction, dismissal suppression, and snapshot replay rules.

Design direction: ENERGY 1 / RHYTHM 1 / MOTION 2. The existing black island and small pixel identities remain; readable neutral text and semantic list structure explain the choices. No new assets, colors, navigation, or interaction capabilities were introduced. These choices follow [design.md](../../design.md#questions).

The form schema and lifecycle were checked against the [OpenCode 2.3.0 schema](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/schema/src/form.ts), [form service](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/core/src/form.ts), and [server form test](https://github.com/anomalyco/opencode/blob/v2.3.0/packages/server/test/session-form.test.ts). The test creates and cancels owned synthetic forms through the real server API; it does not ask a model to create them.

## Verification

- `npm run test:bridge`: 34 Rust helper tests passed, including new question/choice preservation, hidden/default exclusion, parallel progress, withdrawal, multi-field context, and monitoring-only capability checks.
- JavaScript model/presentation/quota tests: 19 passed.
- `npm run test:opencode-plugin`: real OpenCode 2.3.0 server loaded the observer, reported session creation, preserved the supplied question and two options, and observed session deletion. No model call.
- `npm run test:opencode-questions`: nine end-to-end checks passed in a freshly built WebView2 smoke host; process exited successfully. The script rejects a host older than the relevant source files.
- JavaScript syntax, publication checks, and whitespace checks passed.

Smoke executable SHA-256: `52569506CACDDC9F4D4A7FCEE081A26BAD0C98DA056D02C3A348FD697C120211`.

Native checks:

1. A real OpenCode form automatically opened the corresponding focused request.
2. Monitoring-only detail exposed the field question, both choices, and their descriptions, with no answer buttons or reply input.
3. Replaying the same event did not reopen a dismissed request.
4. Cancelling the owning form withdrew native attention.
5. A fresh form revealed from an unattended unselected overview.
6. A fresh form preserved Settings and exposed View request.
7. View request explicitly opened the deferred question.
8. Disabled Auto-open retained the question without expanding.
9. No native JavaScript exceptions or console errors were reported.

Local ignored evidence: `artifacts/threadcap-opencode-plugin.json`, `artifacts/threadcap-opencode-questions-native.json`, and `artifacts/opencode-question-native.png`. These contain synthetic fixture evidence, not user prompts. The native screenshot was visually inspected for question hierarchy, readable choices, monitoring-only explanation, and the terminal action.

## Scoped Anti Slop delivery gate

This gate covers the new read-only question presentation and attention change, not a re-audit of every existing application route. The unchanged identity and motion system has its separate [companion verification](agent-companions.md).

| Check | Result and evidence |
| --- | --- |
| R-02 | PASS: new authored copy has no em dash; provider text is preserved as supplied. |
| R-03 | PASS: question and option text explicitly wrap inside the existing bounded scroll body; native fixture screenshot has no clipped options. Mobile OS support is outside this Windows desktop scope. |
| R-17 | PASS: counts describe recorded test results only; no invented product metrics. |
| R-18 | PASS: no testimonials or person imagery. |
| R-23 | PASS: no new visual assets or routes. |
| R-24 | PASS: existing Open terminal and View request routes retained. |
| R-25 | PASS: existing primary and secondary text colors on the established inset are retained; no lower-contrast tokens introduced. |
| R-26 | PASS: observed choices are noninteractive list items; View request performed real navigation in the native check. No response control without delivery support. |
| R-27 | PASS: empty or unsupported field content falls back to the supplied form title; pending, withdrawal, and monitoring-only states were exercised. |
| R-28 | PASS: no FAQ introduced. |
| R-32 | PASS: no new controls or focus rules; passive reveal calls showFocused without requesting focus, and Settings retains its explicit navigation. |
| R-33 | PASS: direct source changes; no source-rewriting feature scripts. |
| R-34 | PASS: no theme changes. |
| R-35 | PASS: current helper and native host were built and run; native control checks are listed individually above. |
| R-36 | PASS: real-server forms and synthetic content are distinguished; no live-model, bidirectional, or exhaustive platform claims. |
| R-37 | PASS: existing design direction and explicit dials retained. |
| R-38 | PASS: test questions are labeled synthetic; no fake production session is seeded. |
| R-39 | PASS: choices use ul/li with a meaningful accessible label and selectable text; no action-like styling, media, or new motion loop. |
| R-40 | PASS: no media or third-party scripts added to the product. |
| Purpose R-01/R-04/R-06/R-07/R-08/R-09 | PASS: reuse existing semantic palette, pixel identity, readable UI typography, and actual request context; no decorative patterns, arrows, badges, or icons added. |
| Purpose R-10/R-12/R-13/R-14/R-19/R-22 | PASS: no blur, shadows, glow, cards, illustrations, or new animation style; existing focused-surface transition reveals a real request. |
| Liveliness: dials and consistency | PASS: ENERGY 1 / RHYTHM 1 / MOTION 2; quiet content hierarchy and existing continuous surface motion. |
| Liveliness: focal point and spacing | PASS: question leads, choices follow, terminal action comes last; list spacing supports reading. |
| Liveliness: accent and motif | PASS: existing amber attention and pixel provider identity identify a request without coloring every option. |
| Liveliness: Design Read | PASS: desktop monitoring direction recorded above and retained from design.md. |
| C-1/C-2/C-3 | PASS: each changed element communicates question context; no template sections or dead answer controls. |
| C-4/C-5 | PASS: observed form, cancellation, replay, deferred attention, and disabled preference checks passed; evidence uses real APIs with explicit fixture content. |
| R-05/R-11/R-15/R-16 | PASS: existing flat composition and radii retained; existing specific actions retained; no marketing copy added. |
| R-20/R-21/R-29/R-30 | PASS: approved Threadcap identity, black surface, and palette retained without introducing a new product imitation. |
| R-31 | PASS: reasons for readable choices, noninteractive lists, context preservation, and safe reveal are recorded in Change above. |

## Boundaries

The server and native tests used owned forms without a model turn or real TUI keyboard answer. They establish event transport, content, and attention behavior, not every provider-generated form, physical focus/outside-click path, or mixed-DPI layout. Responses remain in OpenCode. A fresh request deferred by Settings, selected detail, typing, or pointer interaction remains manually reachable; leaving the protected view does not replay its auto-open.

The source refinement requires the updated application and bundled helper. Building an installer does not update an already-running older installation.

After verification, `npm run build` restored the production identifier and generated `src-tauri/target/release/bundle/nsis/Threadcap_0.8.4_x64-setup.exe` (2250032 bytes). SHA-256: `0691C4516457B88AD9EC83DC4F04225E412E334432C37F1DA9556C0C57F9F2E5`. Authenticode reports `NotSigned`. This installer includes the preceding companion-size refinement as well. It has not been published.

## Authorized installation follow-up

The owner subsequently requested installation and replacement of the older build. The installer completed with exit code 0 using the existing upgrade registration and directory. The installed host matches the freshly built executable byte-for-byte except for Tauri's expected three-byte NSIS bundle marker (`NSS` versus `UNK`). Both installed and managed observer copies match the current bundled helper. No provider registration or hook command was rewritten; six configuration-file hashes remained unchanged.

After restart, exactly one installation registration, one installed application process, and one loopback listener were found; the listener belongs to that process. The older executable was replaced in place, with no second installed application directory found. Native SQLite backup verified the actual retained store (eight sessions, including six archived contexts) and observer cache after upgrade. Local-only evidence is recorded in `artifacts/installed-opencode-questions.json`; database backups remain outside the repository. No live test form, model turn, or synthetic session was injected into the user's bridge. This installation check does not establish that a real user-generated form has since been exercised.
