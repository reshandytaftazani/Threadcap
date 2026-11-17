use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, time::Duration};

pub fn execute(session: &str, request: &str, answer: Option<Value>) -> Result<Value,String> {
    let session_id = session.strip_prefix("opencode:").ok_or("Unsupported provider")?;
    let form_id = request.strip_prefix("form:").ok_or("Unsupported request")?;
    if session_id.is_empty() || form_id.is_empty() || session_id.len() > 256 || form_id.len() > 256 { return Err("Invalid question identity".into()); }
    let root = std::env::var_os("LOCALAPPDATA").map(PathBuf::from).ok_or("Local adapter directory unavailable")?;
    let name = format!("{:x}",Sha256::digest(format!("{session_id}\0{form_id}").as_bytes()));
    let path = root.join(format!("VibeIsland/opencode-forms/{name}.json"));
    if std::fs::metadata(&path).map_err(|_|"Direct replies unavailable. Reconnect OpenCode and reopen its terminal.")?.len() > 4096 {return Err("Invalid question connector".into());}
    let route: Value = serde_json::from_slice(&std::fs::read(path).map_err(|_|"Question connector unavailable")?).map_err(|_|"Invalid question connector")?;
    if route["sessionID"] != session_id || route["formID"] != form_id { return Err("Question identity changed".into()); }
    let rpc_port = route["port"].as_u64().filter(|p| *p > 0 && *p <= 65535).ok_or("Invalid connector port")? as u16;
    let token = route["token"].as_str().filter(|t| t.len() == 64 && t.bytes().all(|c| c.is_ascii_hexdigit())).ok_or("Invalid connector token")?;
    let mut input = json!({"sessionID":session_id,"formID":form_id,"token":token});
    if let Some(answer) = answer { if answer.to_string().len() > 16384 {return Err("Answer is too long".into());} input["answer"] = answer; }
    let result = vibe_island_codex::transport::request_with_timeout(rpc_port,"POST","/question",Some(&input),Duration::from_secs(4)).map_err(|_|"OpenCode did not confirm delivery. Check the terminal before retrying.".to_string())?;
    if let Some(error) = result["error"].as_str() { return Err(error.into()); }
    if result["requestId"] != request { return Err("Question identity changed".into()); }
    Ok(result)
}
