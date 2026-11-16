use anyhow::{Context, Result};
use rusqlite::params;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{path::Path, time::{SystemTime,UNIX_EPOCH}};

fn now() -> u64 {SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()}

pub fn record(path:&Path, input:&Value) -> Result<()> {
    let email=input["email"].as_str().filter(|s|s.contains('@') && s.len()<=320);
    let account=email.map(|s|format!("{:x}",Sha256::digest(s.trim().to_lowercase().as_bytes()))).unwrap_or_else(||"unknown".into());
    let mut buckets=vec![];
    if let Some(quota)=input["quota"].as_object().filter(|q|q.len()<=32) {
        for (id,reading) in quota {
            if id.is_empty() || id.len()>128 || id.chars().any(char::is_control) {continue;}
            let fraction=reading["remaining_fraction"].as_f64().filter(|v|v.is_finite() && (0.0..=1.0).contains(v));
            let amount=reading["remaining_amount"].as_f64().filter(|v|v.is_finite() && *v>=0.0);
            if fraction.is_none() && amount.is_none() {continue;}
            let reset=reading["reset_time"].as_str().and_then(|s|time::OffsetDateTime::parse(s,&time::format_description::well_known::Rfc3339).ok()).map(|t|t.unix_timestamp()).filter(|t|*t>0);
            buckets.push(json!({"id":id,"name":id,"windows":[{"remainingPercent":fraction.map(|v|v*100.0),"remainingAmount":amount,"resetsAt":reset}],"disabled":reading["disabled"].as_bool()}));
        }
    }
    let available=email.is_some() && !buckets.is_empty();
    let value=json!({"providerId":"antigravity","status":if available {"fresh"}else{"unavailable"},"buckets":if available {buckets}else{vec![]},"observedAt":now(),"receivedAtMs":SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64,"source":"Antigravity CLI status line","scope":"Account observed by Antigravity CLI status line; session mapping is unverified.","sessionMapped":false,"reason":if available {""}else{"Antigravity did not provide a verified account and valid remaining quota."}});
    let db=crate::state::open(path)?;
    db.execute_batch("CREATE TABLE IF NOT EXISTS antigravity_usage(account_key TEXT PRIMARY KEY,body TEXT NOT NULL)")?;
    db.execute("INSERT INTO antigravity_usage VALUES(?,?) ON CONFLICT(account_key) DO UPDATE SET body=excluded.body",params![account,value.to_string()])?;
    Ok(())
}

pub fn snapshot(path:&Path) -> Result<Value> {
    if !path.is_file() {return Ok(unavailable("No Antigravity status-line reading yet. Connect its observer, then restart the CLI."));}
    let db=rusqlite::Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    db.busy_timeout(std::time::Duration::from_millis(100))?;
    if !db.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='antigravity_usage')",[],|r|r.get::<_,bool>(0))? {return Ok(unavailable("No Antigravity status-line reading yet. Connect its observer, then restart the CLI."));}
    let mut statement=db.prepare("SELECT body FROM antigravity_usage ORDER BY COALESCE(json_extract(body,'$.receivedAtMs'),json_extract(body,'$.observedAt')*1000) DESC LIMIT 33")?;
    let rows=statement.query_map([],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    let readings=rows.iter().map(|s|serde_json::from_str::<Value>(s)).collect::<Result<Vec<_>,_>>()?;
    let mut latest=readings.first().cloned().unwrap_or_else(||unavailable("No Antigravity quota reading yet."));
    let fresh=readings.iter().filter(|r|r["status"]=="fresh" && now().saturating_sub(r["observedAt"].as_u64().unwrap_or(0))<=120).count();
    if fresh>1 {return Ok(unavailable("Multiple Antigravity accounts were observed. A single account balance cannot be assigned safely."));}
    if latest["status"]=="fresh" && now().saturating_sub(latest["observedAt"].as_u64().unwrap_or(0))>120 {latest["status"]=json!("stale");latest["reason"]=json!("Last known quota; Antigravity has not sent a recent status-line update.");}
    Ok(latest)
}

pub fn unavailable(reason:&str)->Value {json!({"providerId":"antigravity","status":"unavailable","buckets":[],"reason":reason,"sessionMapped":false,"source":"Antigravity CLI status line"})}

pub fn install(settings:&Path, helper:&Path, port:u16)->Result<bool> {
    let mut config:Value=if settings.is_file(){serde_json::from_slice(&std::fs::read(settings)?)?}else{json!({})};
    anyhow::ensure!(config.is_object(),"Antigravity settings must be an object");
    let previous=config["statusLine"].clone();
    if previous["enabled"]==false {return Ok(false);}
    anyhow::ensure!(previous.is_null() || previous.is_object(),"Existing statusLine must be an object; configuration was preserved");
    anyhow::ensure!(previous["type"].is_null() || previous["type"]=="command","Unsupported existing status-line type; configuration was preserved");
    anyhow::ensure!(previous["command"].is_null() || previous["command"].is_string(),"Existing status-line command must be text; configuration was preserved");
    let literal=helper.to_str().context("Helper path is not Unicode")?;
    anyhow::ensure!(!literal.chars().any(char::is_control),"Unsupported helper path");
    let command=crate::config::native_windows_command(helper,&["agy-statusline".into(),"--port".into(),port.to_string(),"--integration-id".into(),"threadcap.statusline.v1".into()],"threadcap.statusline.v1")?;
    let directory=helper.parent().context("Helper directory unavailable")?;
    let forward=directory.join("antigravity-statusline-forward.json");
    if previous["command"]==command && forward.is_file() {return Ok(true);}
    let owned=previous["command"].as_str().is_some_and(|s|s.contains("agy-statusline --port") || crate::config::encoded_has_tag(s,"threadcap.statusline.v1"));
    std::fs::create_dir_all(directory)?;
    if owned {
        let saved:Value=serde_json::from_slice(&std::fs::read(&forward).context("Original status-line command is unavailable; configuration was preserved")?)?;
        anyhow::ensure!(saved["owner"]=="threadcap.statusline.v1","Original status-line ownership is unavailable");
    } else {
        crate::provider_config::replace(&forward,&serde_json::to_vec(&json!({"command":previous["command"],"owner":"threadcap.statusline.v1"}))?)?;
    }
    let mut status=if previous.is_object(){previous}else{json!({"type":"command"})};
    status["command"]=json!(command);config["statusLine"]=status;
    crate::provider_config::replace(settings,&serde_json::to_vec_pretty(&config)?)?;
    Ok(true)
}

pub fn forward(input:&[u8])->Result<()> {
    use std::io::Write;
    use std::process::{Command,Stdio};
    let executable=std::env::current_exe()?;
    let path=executable.parent().context("Observer directory unavailable")?.join("antigravity-statusline-forward.json");
    let value:Value=serde_json::from_slice(&std::fs::read(path)?)?;
    anyhow::ensure!(value["owner"]=="threadcap.statusline.v1","Unrecognized status-line configuration");
    if let Some(command)=value["command"].as_str().filter(|s|!s.trim().is_empty()) {
        let mut child=Command::new(std::env::var_os("ComSpec").unwrap_or_else(||"cmd.exe".into()));
        #[cfg(windows)] {use std::os::windows::process::CommandExt;child.args(["/D","/S","/C"]).raw_arg(format!("\"{command}\"")).creation_flags(0x08000000);}
        #[cfg(not(windows))] {child.args(["-c",command]);}
        let mut child=child.stdin(Stdio::piped()).stdout(Stdio::inherit()).stderr(Stdio::inherit()).spawn()?;
        child.stdin.take().context("Status-line input unavailable")?.write_all(input)?;
        let status=child.wait()?;anyhow::ensure!(status.success(),"Original status-line command failed");
    } else {
        let value:Value=serde_json::from_slice(input)?;
        let state=value["agent_state"].as_str().unwrap_or("idle");
        println!("Antigravity · {}",state.chars().filter(|c|!c.is_control()).take(32).collect::<String>());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quota_keeps_remaining_units_and_identity_private_and_expires_honestly() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        record(&path,&json!({"agent_state":"initializing","quota":{}})).unwrap();
        assert_eq!(snapshot(&path).unwrap()["status"],"unavailable");
        record(&path,&json!({"email":"private@example.test","quota":{"weekly":{"remaining_fraction":0.42,"reset_time":"2026-12-01T00:00:00Z"},"credits":{"remaining_amount":12},"invalid":{"remaining_fraction":2}}})).unwrap();
        let value=snapshot(&path).unwrap();assert_eq!(value["status"],"fresh");assert_eq!(value["buckets"].as_array().unwrap().len(),2);
        assert!(!value.to_string().contains("private@example"));assert!(!String::from_utf8_lossy(&std::fs::read(&path).unwrap()).contains("private@example"));
        let db=crate::state::open(&path).unwrap();db.execute("UPDATE antigravity_usage SET body=json_set(body,'$.observedAt',1)",[]).unwrap();
        assert_eq!(snapshot(&path).unwrap()["status"],"stale");
        record(&path,&json!({"email":"other@example.test","quota":{"weekly":{"remaining_fraction":0.9}}})).unwrap();
        record(&path,&json!({"email":"private@example.test","quota":{"weekly":{"remaining_fraction":0.4}}})).unwrap();
        assert_eq!(snapshot(&path).unwrap()["status"],"unavailable");
    }
    #[test]
    fn setup_preserves_custom_command_and_disabled_preference() {
        let dir=tempfile::tempdir().unwrap();let settings=dir.path().join("settings.json");let helper=dir.path().join("bridge/helper.exe");
        std::fs::write(&settings,r#"{"other":17,"statusLine":{"command":"custom-script --arg","padding":2}}"#).unwrap();
        assert!(install(&settings,&helper,37891).unwrap());let bytes=std::fs::read(&settings).unwrap();assert!(install(&settings,&helper,37891).unwrap());assert_eq!(bytes,std::fs::read(&settings).unwrap());
        let config:Value=serde_json::from_slice(&bytes).unwrap();assert_eq!(config["other"],17);assert_eq!(config["statusLine"]["padding"],2);
        let forward:Value=serde_json::from_slice(&std::fs::read(helper.parent().unwrap().join("antigravity-statusline-forward.json")).unwrap()).unwrap();assert_eq!(forward["command"],"custom-script --arg");
        std::fs::write(&settings,r#"{"statusLine":{"enabled":false,"command":"disabled"}}"#).unwrap();assert!(!install(&settings,&helper,37891).unwrap());
    }
    #[test]
    fn upgrading_a_managed_wrapper_never_forwards_back_into_itself() {
        let dir=tempfile::tempdir().unwrap();let settings=dir.path().join("settings.json");let helper=dir.path().join("bridge/helper.exe");
        std::fs::write(&settings,r#"{"statusLine":{"command":"original-command"}}"#).unwrap();install(&settings,&helper,37891).unwrap();
        let mut config:Value=serde_json::from_slice(&std::fs::read(&settings).unwrap()).unwrap();config["statusLine"]["command"]=json!("call old-helper agy-statusline --port 37891 --integration-id threadcap.statusline.v1");
        std::fs::write(&settings,config.to_string()).unwrap();install(&settings,&helper,37891).unwrap();
        let forward:Value=serde_json::from_slice(&std::fs::read(helper.parent().unwrap().join("antigravity-statusline-forward.json")).unwrap()).unwrap();assert_eq!(forward["command"],"original-command");
        let updated:Value=serde_json::from_slice(&std::fs::read(&settings).unwrap()).unwrap();assert!(crate::config::encoded_has_tag(updated["statusLine"]["command"].as_str().unwrap(),"threadcap.statusline.v1"));
    }
}
