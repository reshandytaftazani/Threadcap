use serde::Deserialize;
use serde_json::{json, Value};
use std::{path::{Path, PathBuf}, process::Stdio, time::Duration};
use tokio::process::Command;

#[derive(Deserialize)]
#[serde(rename_all="lowercase")]
pub enum Provider { Antigravity, Opencode }

fn profile(provider: &Provider) -> Result<PathBuf,String> {
    let home = std::env::var_os("THREADCAP_CONFIG_ROOT").or_else(||std::env::var_os("USERPROFILE")).map(PathBuf::from).ok_or("User profile is unavailable")?;
    Ok(match provider {
        Provider::Antigravity => home.join(".gemini/config/hooks.json"),
        Provider::Opencode => std::env::var_os("XDG_CONFIG_HOME").map(PathBuf::from).unwrap_or_else(||home.join(".config")).join("opencode/plugins/threadcap-monitor/index.js"),
    })
}

pub fn configure(provider: &Provider, path: &Path, helper: &Path, port: u16) -> Result<(),String> {
    match provider {
        Provider::Antigravity => vibe_island_codex::provider_config::antigravity(path,helper,port).map_err(|e|e.to_string()),
        Provider::Opencode => {
            vibe_island_codex::provider_config::opencode(path,helper,port).map_err(|e|e.to_string())
        }
    }
}

pub async fn execute(provider: Provider, action: crate::codex_setup::Action, port: u16) -> Result<Value,String> {
    let (binary, expected) = match provider { Provider::Antigravity => ("agy.exe","1.5.9"), Provider::Opencode => ("opencode.exe","2.2.7 or 2.3.0") };
    let executable = if matches!(provider,Provider::Opencode) {
        std::env::var_os("APPDATA").map(PathBuf::from).map(|base|base.join("npm/node_modules/@opencode/cli/bin/opencode.exe")).filter(|path|path.is_file()).unwrap_or_else(||PathBuf::from(binary))
    } else { PathBuf::from(binary) };
    let mut command=Command::new(executable);
    command.arg("--version").stdin(Stdio::null()).kill_on_drop(true);
    #[cfg(windows)] command.creation_flags(0x08000000);
    let output=tokio::time::timeout(Duration::from_secs(5),command.output()).await.map_err(|_|"CLI detection timed out")?.map_err(|_|format!("{binary} is unavailable on PATH. Install it and restart Threadcap."))?;
    let version=String::from_utf8_lossy(&output.stdout).trim().to_owned();
    let supported=output.status.success() && version.split_whitespace().last().is_some_and(|v|match provider {Provider::Antigravity=>v.trim_start_matches('v')=="1.5.9",Provider::Opencode=>matches!(v.trim_start_matches('v'),"2.2.7"|"2.3.0")});
    let path=profile(&provider)?;
    if matches!(action,crate::codex_setup::Action::Connect) {
        if !supported { return Err(format!("Detected {version}; this adapter targets {expected}. Configuration was preserved.")); }
        let source=crate::codex_setup::helper()?;
        let directory=vibe_island_codex::state::default_path(port).map_err(|e|e.to_string())?.parent().ok_or("Adapter directory unavailable")?.join("bridge");
        let helper=vibe_island_codex::config::stage_executable(&source,&directory).map_err(|e|e.to_string())?;
        configure(&provider,&path,&helper,port)?;
        if matches!(provider,Provider::Antigravity) {
            let home=std::env::var_os("THREADCAP_CONFIG_ROOT").or_else(||std::env::var_os("USERPROFILE")).map(PathBuf::from).ok_or("User profile unavailable")?;
            vibe_island_codex::agy_usage::install(&home.join(".gemini/antigravity-cli/settings.json"),&helper,port).map_err(|e|e.to_string())?;
        }
    }
    let registered=std::fs::read_to_string(&path).ok().is_some_and(|body|match provider {
        Provider::Antigravity => serde_json::from_str::<Value>(&body).ok().is_some_and(|v|v["threadcap-monitor"]["threadcapOwner"]=="threadcap.monitor.v1" && v["threadcap-monitor"]["enabled"]!=false),
        Provider::Opencode => body.starts_with("// Threadcap OpenCode v2 server plugin."),
    });
    Ok(json!({"cliAvailable":output.status.success(),"version":version,"supported":supported,"registered":registered,"monitoringOnly":true,"requiresReview":true,"canApprove":false,"canAnswer":false,"quota":false}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn connect_is_idempotent_and_preserves_unrelated_hooks_and_plugin_files() {
        let dir=std::env::temp_dir().join(format!("threadcap-setup-{}",uuid::Uuid::new_v4())); std::fs::create_dir_all(&dir).unwrap();
        let path=dir.join("hooks.json"); std::fs::write(&path,r#"{"other":{"enabled":false}}"#).unwrap();
        let helper=PathBuf::from("C:/Program Files/Threadcap/helper.exe");
        configure(&Provider::Antigravity,&path,&helper,37891).unwrap();
        let first=std::fs::read(&path).unwrap();configure(&Provider::Antigravity,&path,&helper,37891).unwrap();
        assert_eq!(first,std::fs::read(&path).unwrap());
        assert_eq!(serde_json::from_slice::<Value>(&first).unwrap()["other"]["enabled"],false);
        std::fs::write(&path,"unrelated plugin").unwrap();assert!(configure(&Provider::Opencode,&path,&helper,37891).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
