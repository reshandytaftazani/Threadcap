#![cfg(windows)]
use std::{process::{Command,Stdio,Child},path::Path,io::Write,time::{Duration,Instant}};
use std::os::windows::process::CommandExt;
use serde_json::json;
use vibe_island_codex::{client_presence,agent_process::Presence};

fn start(directory:&Path,cache:&Path,name:&str)->Child {
    let input=directory.join(format!("{name}.json"));std::fs::write(&input,json!({"integrationId":"threadcap.opencode-client.v1","sessionIds":["shared"],"pid":1,"created":"forged"}).to_string()).unwrap();
    let command=format!("call \"{}\" opencode-client --state-file \"{}\" < \"{}\"",env!("CARGO_BIN_EXE_vibe-island-codex"),cache.display(),input.display());
    Command::new("cmd.exe").args(["/d","/q","/s","/k"]).raw_arg(format!("\"{command}\"")).creation_flags(0x08000000).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().unwrap()
}
fn stop(child:&mut Child) {child.stdin.as_mut().unwrap().write_all(b"exit\r\n").unwrap();child.wait().unwrap();}

#[test]
fn exact_client_lifetime_survives_recovery_and_only_the_last_exit_closes_a_shared_session() {
    let directory=tempfile::tempdir().unwrap();let cache=directory.path().join("cache.sqlite3");
    let mut first=start(directory.path(),&cache,"first");let mut second=start(directory.path(),&cache,"second");
    let deadline=Instant::now()+Duration::from_secs(5);
    loop {
        let count=if cache.exists(){rusqlite::Connection::open(&cache).ok().and_then(|db|db.query_row("SELECT count(*) FROM opencode_clients",[],|r|r.get::<_,usize>(0)).ok()).unwrap_or(0)}else{0};
        if count==2 {break;}
        if Instant::now()>deadline {let _=first.kill();let _=second.kill();let _=first.wait();let _=second.wait();panic!("Both owned clients must register");}
        std::thread::sleep(Duration::from_millis(20));
    }
    assert_eq!(client_presence::observations(&cache).unwrap().sessions["opencode:shared"],Presence::Running);
    stop(&mut first);assert_eq!(client_presence::observations(&cache).unwrap().sessions["opencode:shared"],Presence::Running);
    stop(&mut second);let ended=client_presence::observations(&cache).unwrap();assert_eq!(ended.sessions["opencode:shared"],Presence::Exited);assert!(!ended.possible_client);
    assert_eq!(client_presence::observations(&cache).unwrap().sessions["opencode:shared"],Presence::Exited);
}
