use anyhow::{Context,Result};
use rusqlite::params;
use serde_json::Value;
use std::{collections::BTreeMap,path::Path};
use crate::agent_process::{Identity,Presence};

fn schema(db:&rusqlite::Connection)->Result<()> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS opencode_clients(id TEXT PRIMARY KEY,identity TEXT NOT NULL,sessions TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS opencode_legacy_closed(session_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS opencode_client_terminals(id TEXT PRIMARY KEY,binding TEXT NOT NULL)")?;Ok(())
}

pub fn record(path:&Path,input:&Value)->Result<()> {
    anyhow::ensure!(input["integrationId"]=="threadcap.opencode-client.v1","Unknown client observer");
    let identity=crate::agent_process::capture_parent().context("Client process identity unavailable")?;
    let binding=crate::terminal::Binding::from_lookup(|key|std::env::var(key).ok());
    record_identity(path,input,&identity,binding.as_ref())
}

fn record_identity(path:&Path,input:&Value,identity:&Identity,binding:Option<&crate::terminal::Binding>)->Result<()> {
    let incoming=input["sessionIds"].as_array().filter(|ids|ids.len()<=256).context("Invalid client session list")?;
    let mut db=crate::state::open(path)?;schema(&db)?;
    let tx=db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
    let key=format!("{}:{}",identity.pid,identity.created);
    let mut sessions=std::collections::BTreeSet::new();
    use rusqlite::OptionalExtension;
    let old:Option<String>=tx.query_row("SELECT sessions FROM opencode_clients WHERE id=?",[&key],|r|r.get(0)).optional()?;
    if let Some(old)=old {sessions=serde_json::from_str(&old)?;}
    for value in incoming {
        let sid=value.as_str().filter(|s|!s.is_empty() && s.len()<=256 && !s.chars().any(char::is_control)).context("Invalid client session identity")?;
        sessions.insert(format!("opencode:{sid}"));
    }
    anyhow::ensure!(sessions.len()<=512,"Too many sessions owned by one client");
    tx.execute("INSERT INTO opencode_clients VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET sessions=excluded.sessions",params![key,serde_json::to_string(identity)?,serde_json::to_string(&sessions)?])?;
    if let Some(binding)=binding {
        anyhow::ensure!(binding.valid(),"Invalid client terminal identity");
        tx.execute("INSERT INTO opencode_client_terminals VALUES(?,?) ON CONFLICT(id) DO UPDATE SET binding=excluded.binding",params![key,serde_json::to_string(binding)?])?;
    }
    tx.commit()?;Ok(())
}

pub fn terminal_bindings(path:&Path,session:&str)->Result<Vec<crate::terminal::Binding>> {
    let mut result=Vec::new();
    if !path.is_file(){return Ok(result);}
    let db=crate::state::open(path)?;schema(&db)?;
    let mut statement=db.prepare("SELECT c.identity,c.sessions,t.binding FROM opencode_clients c JOIN opencode_client_terminals t ON t.id=c.id ORDER BY c.id")?;
    for row in statement.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?)))? {
        let (identity,sessions,binding)=row?;
        let identity:Identity=serde_json::from_str(&identity)?;
        let sessions:Vec<String>=serde_json::from_str(&sessions)?;
        if !sessions.iter().any(|id|id==session) || crate::agent_process::probe(&identity)!=Presence::Running {continue;}
        let binding:crate::terminal::Binding=serde_json::from_str(&binding)?;
        anyhow::ensure!(binding.valid(),"Invalid saved client terminal identity");
        if !result.contains(&binding){result.push(binding);}
    }
    Ok(result)
}

pub struct Observations {pub sessions:BTreeMap<String,Presence>,pub possible_client:bool}

pub fn observations(path:&Path)->Result<Observations> {
    let mut result=Observations{sessions:BTreeMap::new(),possible_client:false};
    if !path.is_file(){return Ok(result);}
    let db=crate::state::open(path)?;schema(&db)?;
    let mut statement=db.prepare("SELECT identity,sessions FROM opencode_clients")?;
    for row in statement.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))? {
        let (identity,sessions)=row?;let identity:Identity=serde_json::from_str(&identity)?;
        let presence=crate::agent_process::probe(&identity);
        result.possible_client|=presence!=Presence::Exited;
        for sid in serde_json::from_str::<Vec<String>>(&sessions)? {
            result.sessions.entry(sid).and_modify(|old|*old=combine(*old,presence)).or_insert(presence);
        }
    }
    let mut statement=db.prepare("SELECT session_id FROM opencode_legacy_closed")?;
    for row in statement.query_map([],|r|r.get::<_,String>(0))? {result.sessions.entry(row?).or_insert(Presence::Exited);}
    Ok(result)
}

fn combine(a:Presence,b:Presence)->Presence {
    if a==Presence::Running || b==Presence::Running {Presence::Running} else if a==Presence::Unknown || b==Presence::Unknown {Presence::Unknown} else {Presence::Exited}
}

pub fn mark_legacy_closed(path:&Path,ids:&[String])->Result<()> {
    let mut db=crate::state::open(path)?;schema(&db)?;let tx=db.transaction()?;
    for sid in ids {tx.execute("INSERT OR IGNORE INTO opencode_legacy_closed VALUES(?)",[sid])?;}
    tx.commit()?;Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn one_live_client_outweighs_other_exits_and_unknown_does_not_establish_closure() {
        assert_eq!(combine(Presence::Exited,Presence::Running),Presence::Running);
        assert_eq!(combine(Presence::Unknown,Presence::Exited),Presence::Unknown);
        assert_eq!(combine(Presence::Exited,Presence::Exited),Presence::Exited);
    }
    #[test]
    fn client_ids_are_validated_and_supplied_process_identity_is_ignored() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("cache.sqlite3");
        let identity=Identity{pid:0,created:"0".into()};
        let value=json!({"sessionIds":["one"],"pid":999,"created":"forged"});
        record_identity(&path,&value,&identity,None).unwrap();
        record_identity(&path,&json!({"sessionIds":["two"]}),&identity,None).unwrap();
        let rows=observations(&path).unwrap();assert_eq!(rows.sessions.len(),2);assert!(rows.possible_client);
        assert_eq!(rows.sessions["opencode:one"],Presence::Unknown);
        assert!(record_identity(&path,&json!({"sessionIds":["bad\nvalue"]}),&identity,None).is_err());
        assert!(terminal_bindings(&path,"opencode:one").unwrap().is_empty());
    }
}
