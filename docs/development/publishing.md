# Publishing Threadcap

The repository name is **Threadcap**. The first upload is private so that GitHub Actions can be tested before public visibility. Changing visibility and publishing a release are separate maintainer actions.

## Source review

1. Run `npm.cmd run check:publication`. This checks the Git source inventory, local Markdown links, relative module imports, Rust embedded-source paths, HTML resources, command entry points, metadata, excluded paths, and selected sensitive-content patterns. It also requires the observer's integration tests at their Cargo-standard locations. It is not a comprehensive secret scan or legal review.
2. Inspect `git status --short` and `git diff --cached`. Keep personal data, environment files, `artifacts/`, `dist/`, databases, dependencies, and native build output out of commits.
3. Check [LICENSE](../../LICENSE), [third-party notices](../../THIRD_PARTY_NOTICES.md), and asset provenance. Review notices required by the locked dependency graph before redistributing binaries.
4. Use synthetic screenshot content. The README screenshot is an isolated native verification fixture, not a user's real sessions.

## Clean-source build

Use a fresh clone of the reviewed commit. A Git archive can also supply clean source; initialize an empty Git repository inside the extracted directory before running the publication inventory check, which uses Git's ignore rules. Do not copy `node_modules`, compiled helpers, Cargo targets, ignored local scripts, or local databases into it. From that directory, with Windows build prerequisites installed, run:

```powershell
npm.cmd ci
npm.cmd run check:publication
npm.cmd test
npm.cmd run test:bridge
npm.cmd run test:native
npm.cmd run desktop:build
npm.cmd run release:stage
```

A compiler/dependency download cache may be reused; generated application files must be rebuilt. Native runtime checks are separate from this source/build check. Use the smoke identity/configuration and private data/ports when exercising native fixtures; never seed the live user bridge.

## Private repository and CI

After reviewing and committing the source, an authenticated maintainer can create the private repository:

```powershell
gh repo create Threadcap --private --source . --remote origin --push
gh run list --limit 5
```

If the repository already exists, inspect it and use its remote. The Windows workflow runs publication checks, JavaScript/Rust/helper/native unit tests, and an installer build. Maintainer pushes and manual runs also stage and upload release artifacts. Actions are pinned to reviewed commit SHAs. Release publication and signing remain separate steps.

Inspect the actual GitHub run and download/check its artifact. Local success does not prove GitHub Actions passed. Record the run result in [publication verification](../verification/publication.md).

## Public launch checklist

- Keep `main` updates limited to the repository owner. Contributors submit pull requests for the owner's review. The ruleset requires code-owner approval, the GitHub Actions `windows` check, and resolved review conversations. A changed diff invalidates stale approvals. The owner's account can push directly. Keep force pushes and branch deletion blocked through branch protection.
- Keep workflow tokens read-only and require a maintainer to approve workflow runs from external forks when the repository goes public.
- Run a private installer preview with first-time users. Confirm they can use Connect all, complete any provider-required step, and see their first session without guidance. Use the provider versions advertised for the release.
- At public launch, enable private vulnerability reporting and verify that the reporting route in [SECURITY.md](../../SECURITY.md) is available. It may not be available while the repository is private. See [GitHub's instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
- Enable applicable GitHub secret-scanning/push-protection features and review repository settings. Do not claim these settings are enabled merely because this file exists.
- Confirm license/notices and dependency redistribution requirements, the capability matrix, sanitization, and CI results.
- Confirm that the maintainer intends public visibility. Do not change visibility automatically as part of the build.

## Release

Use a version/tag matching `package.json` and the desktop configuration. Attach the files from `dist/release/<version>/`, including the installer, helper, local Codex launcher, guides, notices, and `SHA256SUMS.txt`. This version-specific folder keeps historical installers outside the upload. Describe the release as a Windows x64 preview, list verified CLI versions, and link the changelog and capability limits. Check downloaded artifact hashes against the manifest and verify upgrade behavior separately. State that the installer is unsigned when no signature is present.

Compatibility executable names, storage paths, integration tags, and NSIS upgrade keys remain unchanged for existing users. Documentation-only publication preparation does not require reinstalling the user's application.
