use serde::Deserialize;
use serde_json::{json, Value};
use std::{path::PathBuf, process::Stdio, time::Duration};
use tokio::process::Command;

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Status,
    Connect,
}

pub(crate) fn helper() -> Result<PathBuf, String> {
    let current = std::env::current_exe().map_err(|e| e.to_string())?;
    let sibling = current.parent().ok_or("Application directory unavailable")?.join("vibe-island-codex.exe");
    if sibling.is_file() { return Ok(sibling); }
    if cfg!(debug_assertions) {
        let development = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries")
            .join(format!("vibe-island-codex-{}.exe", env!("ISLAND_TARGET")));
        if development.is_file() { return Ok(development); }
    }
    Err("The bundled Codex helper is missing. Reinstall Threadcap.".into())
}

pub fn refresh_staged_helper(port:u16) -> Result<(),String> {
    let directory=vibe_island_codex::state::default_path(port).map_err(|e|e.to_string())?.parent().ok_or("Adapter directory unavailable")?.join("bridge");
    if directory.join("vibe-island-codex.exe").is_file() {
        vibe_island_codex::config::stage_executable(&helper()?,&directory).map_err(|e|e.to_string())?;
    }
    Ok(())
}

async fn run(action: &str, port: u16) -> Result<std::process::Output, String> {
    let mut command = Command::new(helper()?);
    command.args([action, "--port", &port.to_string()]).stdin(Stdio::null()).kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    tokio::time::timeout(Duration::from_secs(15), command.output()).await
        .map_err(|_| "Codex setup timed out. Check the CLI installation and try again.".to_string())?
        .map_err(|e| format!("Could not start Codex setup: {e}"))
}

pub fn summarize(diagnostic: &Value) -> Value {
    let registered = vibe_island_codex::EVENTS.iter().all(|event| {
        diagnostic["registeredEvents"].as_array().is_some_and(|events| events.iter().any(|item| item == event))
    });
    json!({
        "registered":registered,
        "cliAvailable":diagnostic["codexVersion"].is_string(),
        "version":diagnostic["codexVersion"],
        "bridgeAvailable":diagnostic["bridge"].is_object(),
        "error":diagnostic["codexError"].as_str().or(diagnostic["bridgeError"].as_str()),
        "trust":"review-in-codex"
    })
}

pub async fn execute(action: Action, port: u16) -> Result<Value, String> {
    if matches!(action, Action::Connect) {
        let output = run("install", port).await?;
        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(if error.trim().is_empty() { "Could not register Codex hooks.".into() } else { error.trim().chars().take(1500).collect() });
        }
    }
    let output = run("doctor", port).await?;
    let diagnostic: Value = serde_json::from_slice(&output.stdout)
        .map_err(|_| "Could not read Codex diagnostics. Reinstall the bundled helper.".to_string())?;
    Ok(summarize(&diagnostic))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn registration_does_not_claim_trust_or_a_live_session() {
        let result = summarize(&json!({"registeredEvents":vibe_island_codex::EVENTS,"codexVersion":"codex-cli 0.169.0","bridge":{}}));
        assert_eq!(result["registered"], true);
        assert_eq!(result["trust"], "review-in-codex");
        assert!(result.get("connected").is_none());
        assert_eq!(summarize(&json!({"registeredEvents":["SessionStart"]}))["registered"], false);
    }
}
