# Security policy

Threadcap is a preview application. Fixes target the latest development revision and current preview release; there is no long-term support promise for older versions. Users should update to 0.8.4 or a later release when available.

## Reporting a vulnerability

Use **Security > Advisories > Report a vulnerability** on this repository if private vulnerability reporting is enabled. Include the affected version, Windows/CLI versions, impact, and a minimal sanitized reproduction. Do not post credentials, personal session databases, raw prompts, or exploit details in a public issue.

Before public launch, maintainers must enable private vulnerability reporting in GitHub repository settings. If the private reporting button is unavailable, open a public issue asking for a private contact channel, without disclosing the vulnerability itself. No dedicated security email or response-time guarantee has been established.

See [GitHub's private reporting instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

## Relevant boundaries

- Native IPC serves the embedded UI. External producer transport binds to `127.0.0.1:37891`; it is not a remote service.
- The local producer API is not an authenticated boundary against other processes running as the user. Do not expose it through port forwarding or a network proxy. Treat inbound text as untrusted data.
- Generic HTTP approval/answer actions are unsupported. Threadcap does not grant Codex hook trust or change agent permissions.
- User context is stored locally and may contain prompts, paths, commands, and results. Archive hides context; it does not sanitize it or erase CLI history.
- Connect installs local monitoring integrations and backs up managed configuration changes. Review those changes before trusting them.

These describe implementation boundaries, not a security certification. No comprehensive external security audit or exhaustive scan of historical Git commits has been performed.
