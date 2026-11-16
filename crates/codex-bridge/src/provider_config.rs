use anyhow::{Context,Result};
use std::path::Path;

pub fn antigravity(path:&Path,helper:&Path,port:u16)->Result<()> {
    use serde_json::{json,Value};
    let mut config:Value=if path.is_file(){serde_json::from_slice(&std::fs::read(path)?)?}else{json!({})};
    let map=config.as_object_mut().context("Antigravity hooks must be an object")?;
    anyhow::ensure!(!map.get("threadcap-monitor").is_some_and(|v|v["threadcapOwner"]!="threadcap.monitor.v1"),"An unrelated hook occupies threadcap-monitor; configuration was preserved");
    let enabled=map.get("threadcap-monitor").and_then(|v|v.get("enabled")).cloned();
    let mut hooks=json!({"threadcapOwner":"threadcap.monitor.v1"});
    if let Some(enabled)=enabled {hooks["enabled"]=enabled;}
    for kind in ["SessionStart","PreInvocation","PostToolUse","Stop"] {
        let command=crate::config::native_windows_command(helper,&["provider-hook".into(),"--provider".into(),"antigravity".into(),"--kind".into(),kind.into(),"--port".into(),port.to_string()],"threadcap.antigravity.v1")?;
        let handler=json!({"type":"command","command":command,"timeout":3});
        hooks[kind]=if kind=="PostToolUse" {json!([{"matcher":".*","hooks":[handler]}])}else{json!([handler])};
    }
    map.insert("threadcap-monitor".into(),hooks);
    replace(path,&serde_json::to_vec_pretty(&config)?)
}

pub fn replace(path:&Path,bytes:&[u8])->Result<()> {
    use std::io::Write;
    let parent=path.parent().context("Configuration directory unavailable")?;std::fs::create_dir_all(parent)?;
    if let Ok(old)=std::fs::read(path) {if old==bytes {return Ok(());}std::fs::write(parent.join(format!("threadcap-backup-{}.json",uuid::Uuid::new_v4())),old)?;}
    let temporary=parent.join(format!(".threadcap-{}.tmp",uuid::Uuid::new_v4()));
    let result=(||->std::io::Result<()>{let mut file=std::fs::OpenOptions::new().create_new(true).write(true).open(&temporary)?;file.write_all(bytes)?;file.sync_all()?;drop(file);std::fs::rename(&temporary,path)})();
    if result.is_err(){let _=std::fs::remove_file(temporary);}result?;Ok(())
}

pub fn opencode(path:&Path,helper:&Path,port:u16)->Result<()> {
    let content=include_str!("../../../integrations/opencode/server.js").replace("__THREADCAP_HELPER__",&serde_json::to_string(helper)?).replace("__THREADCAP_PORT__",&port.to_string());
    anyhow::ensure!(!std::fs::read_to_string(path).ok().is_some_and(|old|!old.starts_with("// Threadcap OpenCode v2 server plugin.")),"An unrelated plugin occupies the Threadcap path");
    let directory=path.parent().context("Plugin directory unavailable")?;
    let tui_path=directory.join("tui.js");
    anyhow::ensure!(!std::fs::read_to_string(&tui_path).ok().is_some_and(|old|!old.starts_with("// Threadcap OpenCode TUI lifetime observer.")),"An unrelated TUI plugin occupies the Threadcap path");
    let cli_path=directory.parent().and_then(Path::parent).context("OpenCode configuration directory unavailable")?.join("cli.json");
    let mut cli:serde_json::Value=if cli_path.is_file(){
        let bytes=std::fs::read(&cli_path)?;
        serde_json::from_slice(bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(&bytes))?
    }else{serde_json::json!({})};
    let map=cli.as_object_mut().context("OpenCode cli.json must be an object")?;
    let plugins=map.entry("plugins").or_insert_with(||serde_json::json!([])).as_array_mut().context("OpenCode CLI plugins must be an array")?;
    let target="./plugins/threadcap-monitor";
    if !plugins.iter().any(|entry|entry.as_str()==Some(target) || entry["package"].as_str()==Some(target)) {plugins.push(serde_json::json!(target));}
    let tui=include_str!("../../../integrations/opencode/tui.js").replace("__THREADCAP_HELPER__",&serde_json::to_string(helper)?).replace("__THREADCAP_PORT__",&port.to_string());
    replace(path,content.as_bytes())?;replace(&tui_path,tui.as_bytes())?;replace(&cli_path,&serde_json::to_vec_pretty(&cli)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tui_registration_preserves_existing_cli_plugins_and_preferences() {
        let root=tempfile::tempdir().unwrap();let config=root.path().join("opencode");std::fs::create_dir_all(&config).unwrap();
        let cli=config.join("cli.json");std::fs::write(&cli,"\u{feff}{\"plugins\":[\"existing-plugin\"],\"theme\":\"existing-theme\"}").unwrap();
        let plugin=config.join("plugins/threadcap-monitor/index.js");let helper=root.path().join("helper.exe");
        opencode(&plugin,&helper,37891).unwrap();let first=std::fs::read(&cli).unwrap();opencode(&plugin,&helper,37891).unwrap();assert_eq!(first,std::fs::read(&cli).unwrap());
        let value:serde_json::Value=serde_json::from_slice(&first).unwrap();assert_eq!(value["theme"],"existing-theme");assert_eq!(value["plugins"].as_array().unwrap().len(),2);assert_eq!(value["plugins"][0],"existing-plugin");
        let tui=plugin.parent().unwrap().join("tui.js");assert!(std::fs::read_to_string(&tui).unwrap().starts_with("// Threadcap OpenCode TUI lifetime observer."));
        std::fs::write(&tui,"unrelated plugin").unwrap();assert!(opencode(&plugin,&helper,37891).is_err());assert_eq!(first,std::fs::read(&cli).unwrap());
    }
}
