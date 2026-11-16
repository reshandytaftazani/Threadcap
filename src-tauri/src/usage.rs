use serde_json::{json, Value};
use std::{process::Stdio, time::{Duration, SystemTime, UNIX_EPOCH}};
use tokio::{io::{AsyncBufReadExt, AsyncWriteExt, BufReader}, process::Command, sync::Mutex};

pub struct UsageState(pub Mutex<Cache>);
pub struct Cache { value: Value, attempted: u64, revision: u64, failures: u32 }
impl Default for UsageState {
    fn default() -> Self { Self(Mutex::new(Cache { value:json!({"status":"unavailable","windows":[],"reason":"No quota reading yet."}), attempted:0, revision:0, failures:0 })) }
}
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }

pub fn normalize(result: &Value) -> Result<Value, String> {
    let mut buckets = Vec::new();
    let sources: Vec<(&str, &Value)> = if let Some(map) = result["rateLimitsByLimitId"].as_object().filter(|m| !m.is_empty()) {
        map.iter().map(|(id, value)|(id.as_str(),value)).collect()
    } else { vec![("codex", &result["rateLimits"])] };
    for (id, snapshot) in sources.into_iter().take(32) {
        let mut windows=Vec::new();
        for field in ["primary","secondary"] {
            let w=&snapshot[field];
            if w.is_null() { continue; }
            let used=w["usedPercent"].as_f64().filter(|n| n.is_finite() && (0.0..=100.0).contains(n)).ok_or("Invalid quota percentage")?;
            let minutes=w["windowDurationMins"].as_u64().filter(|n| *n>0).ok_or("Missing quota period")?;
            windows.push(json!({"remainingPercent":100.0-used,"windowMinutes":minutes,"resetsAt":w["resetsAt"].as_u64()}));
        }
        if !windows.is_empty() {
            buckets.push(json!({"id":id.chars().take(128).collect::<String>(),"name":snapshot["limitName"].as_str().unwrap_or(id).chars().take(128).collect::<String>(),"windows":windows,"ordinaryUsageAllowed":result["ordinaryUsageAllowed"].as_bool().or(snapshot["ordinaryUsageAllowed"].as_bool())}));
        }
    }
    if buckets.is_empty() { return Err("Codex did not provide percentage-based limits for this account.".into()); }
    Ok(json!({"providerId":"codex","status":"fresh","buckets":buckets,"observedAt":now(),"scope":"Current Codex profile account; session mapping is unverified.","source":"Codex app-server","sessionMapped":false}))
}

async fn read() -> Result<Value, String> {
    if std::env::var("VIBE_ISLAND_USAGE_DISABLED").ok().as_deref()==Some("1") || std::env::var("VIBE_ISLAND_CODEX_USAGE_DISABLED").ok().as_deref()==Some("1") { return Err("Quota collection is disabled for this isolated run.".into()); }
    let mut command=Command::new("codex.exe");
    command.args(["app-server","--listen","stdio://"]).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child=command.spawn().map_err(|_|"Codex CLI is unavailable on PATH.".to_string())?;
    let mut stdin=child.stdin.take().ok_or("Codex input unavailable")?;
    let mut output=BufReader::new(child.stdout.take().ok_or("Codex output unavailable")?);
    let result=tokio::time::timeout(Duration::from_secs(12),async {
        stdin.write_all(b"{\"id\":1,\"method\":\"initialize\",\"params\":{\"clientInfo\":{\"name\":\"vibe_island_usage\",\"version\":\"0.6.0\"}}}\n").await.map_err(|_|"Could not initialize Codex")?;
        let mut initialized=false;
        loop {
            // Bound lines before parsing; never forward raw account/error payloads into the UI.
            let mut bytes=Vec::new();
            use tokio::io::AsyncReadExt;
            let count=(&mut output).take(1_048_577).read_until(b'\n',&mut bytes).await.map_err(|_|"Could not read Codex")?;
            if count==0 || bytes.len()>1_048_576 { return Err("Codex usage response ended or exceeded its limit".to_string()); }
            let message:Value=serde_json::from_slice(&bytes).map_err(|_|"Invalid Codex usage response")?;
            if message["id"]==1 && !initialized {
                if message.get("error").is_some() { return Err("This Codex version does not support the usage handshake.".into()); }
                stdin.write_all(b"{\"method\":\"initialized\"}\n{\"id\":2,\"method\":\"account/rateLimits/read\",\"params\":{\"supportsLunaReserve\":false,\"excludeResetCreditDetails\":true}}\n").await.map_err(|_|"Could not request Codex usage")?;
                initialized=true;
            } else if message["id"]==2 && initialized {
                if message.get("error").is_some() { return Err("Codex quota could not be read. Check sign-in and CLI compatibility in Codex.".into()); }
                return normalize(&message["result"]);
            }
        }
    }).await.unwrap_or_else(|_|Err("Codex quota read timed out.".into()));
    let _=child.kill().await;
    result
}

#[tauri::command]
pub async fn read_usage(state: tauri::State<'_,UsageState>, provider:Option<String>) -> Result<Value,String> {
    if provider.as_deref()==Some("antigravity") {
        let mut reading=if std::env::var("VIBE_ISLAND_USAGE_DISABLED").ok().as_deref()==Some("1") {
            vibe_island_codex::agy_usage::unavailable("Quota collection is disabled for this isolated run.")
        } else {
            let port=std::env::var("VIBE_ISLAND_PORT").ok().and_then(|p|p.parse().ok()).unwrap_or(37891);
            vibe_island_codex::state::default_path(port).map_err(|e|e.to_string()).and_then(|path|vibe_island_codex::agy_usage::snapshot(&path).map_err(|_|"Could not read the local Antigravity quota cache.".to_string())).unwrap_or_else(|reason|vibe_island_codex::agy_usage::unavailable(&reason))
        };
        reading["revision"]=json!(SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64);
        return Ok(reading);
    }
    if provider.as_deref().is_some_and(|p|p!="codex") {return Err("Quota provider is unsupported.".into());}
    let mut cache=state.0.lock().await;
    let cooldown=(60u64 << cache.failures.min(3)).min(300);
    if now().saturating_sub(cache.attempted)<cooldown { return Ok(cache.value.clone()); }
    cache.attempted=now();
    cache.revision+=1;
    cache.value=match read().await {
        Ok(value)=>{cache.failures=0;value},
        Err(reason)=>{
            cache.failures=(cache.failures+1).min(3);
            let mut value=cache.value.clone();
            value["status"]=json!(if value["observedAt"].is_number(){"stale"}else{"unavailable"});
            value["reason"]=json!(reason);
            value["scope"]=json!("Last known account reading; current account has not been revalidated.");
            value
        }
    };
    cache.value["revision"]=json!(cache.revision);
    Ok(cache.value.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quota_is_remaining_and_preserves_period_and_explicit_availability() {
        let value=normalize(&json!({"rateLimits":{"primary":{"usedPercent":25.5,"windowDurationMins":300,"resetsAt":123}},"ordinaryUsageAllowed":false,"accountId":"private"})).unwrap();
        assert_eq!(value["buckets"][0]["windows"][0]["remainingPercent"],74.5);
        assert_eq!(value["buckets"][0]["ordinaryUsageAllowed"],false);
        assert!(!value.to_string().contains("private"));
        assert_eq!(value["sessionMapped"],false);
    }
    #[test]
    fn missing_or_invalid_readings_do_not_fabricate_quota() {
        assert!(normalize(&json!({})).is_err());
        assert!(normalize(&json!({"rateLimits":{"primary":{"usedPercent":101,"windowDurationMins":300}}})).is_err());
        assert!(normalize(&json!({"rateLimits":{"primary":{"usedPercent":20}}})).is_err());
    }
}
