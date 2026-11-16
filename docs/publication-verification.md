# Publication verification

This report covers repository preparation for Threadcap 0.8.4. It does not add provider or native UI capability. Existing runtime evidence remains in [the capability matrix](capabilities.md) and linked implementation reports.

## Prepared

- MIT license for original contributions, with separate provider/third-party notices.
- User-oriented README, synthetic native screenshot, setup/troubleshooting/removal guide, capability matrix, changelog, and documentation index.
- Contributor/security guidance and GitHub issue/PR templates.
- Removed private conversation references and a personal workspace path from historical agent context. Runtime compatibility identifiers remain intact.
- Publication inventory/link/pattern checks and a Windows workflow with pinned action revisions and release notice staging.

## Verification status

- The local source inventory check passed for 164 files, including Markdown link targets, matching release/license metadata, selected sensitive-content patterns, and exclusion of local/generated files. No session databases, `artifacts/`, `dist/`, `node_modules/`, or Cargo target directories were tracked.
- A clean local clone completed `npm ci`, the publication inventory check, 19 JavaScript tests, and 26 core Rust tests. Compiler/dependency downloads were reused; no generated application files were copied into the clone.
- The local helper suite passed 32 tests, including a half-second held-write-lock regression and twelve competing cache writers.
- The first private GitHub run exposed the cache's short SQLite lock wait. The next run also exposed a cold-shell fixture deadline under concurrent process-test load. The write wait is now bounded at one second; process/configuration fixtures run individually while the twelve-writer test remains concurrent. Shell startup receives a separate 30-second fixture acceptance window; production network timeouts and Codex trust requirements are unchanged.
- GitHub detected the repository license as MIT, and repository visibility was verified as private.

## Private GitHub result

[Windows checks and installer run 43967550746](https://github.com/reshandytaftazani/Threadcap/actions/runs/43967550746) completed successfully for runtime commit `0b2e94634764df67e986c0c9ad73527d55a8437b` in the private [Threadcap repository](https://github.com/reshandytaftazani/Threadcap).

The clean Windows runner passed publication checks, 19 JavaScript tests, 26 core Rust tests, 32 helper tests, and 10 native unit tests. It built the production NSIS installer, staged release guides/notices/checksums, and uploaded `threadcap-windows-main` as a workflow artifact. This is not a published GitHub release.

The artifact was downloaded separately. All 11 files listed in `SHA256SUMS.txt` matched; the standalone helper reported 0.8.4. The installer was present and its Authenticode status was `NotSigned`. This CI installer was not installed on the user's machine during documentation preparation; previous installed/native behavior checks remain separate evidence.

GitHub rendered the README with its heading, two capability/setup tables, and synthetic screenshot. A final documentation, repository-metadata, and publication-checker cleanup leaves the tested runtime/dependency graph unchanged; it receives local inventory/link/format checks rather than another full native build.

During final review, the three integration-test files had been accidentally moved under `crates/codex-bridge/src/tests/`. Their contents matched the tested commit. They were restored to `crates/codex-bridge/tests/`, and Cargo metadata again listed `adapter`, `antigravity_process`, and `client_process` as integration targets. No content changes were needed.

Public visibility and a GitHub release remain separate owner decisions. No comprehensive security audit, Git-history secret audit, dependency legal review, or additional native display acceptance is implied.
