#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod outside_click;
mod region;
mod codex_setup;
mod usage;
mod frame;
mod navigation;
mod provider_setup;
mod opencode_lifetime;
mod opencode_questions;

use island_core::Store;
use serde_json::{json, Value};
use std::{
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{
    ipc::Channel,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewWindow,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct DesktopState {
    store: Arc<Store>,
    connection: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    shortcut: bool,
    outside_click: outside_click::OutsideClickMonitor,
    port: u16,
    setup_lock: tokio::sync::Mutex<()>,
    codex_cache: Option<PathBuf>,
    retention_pause: Arc<std::sync::atomic::AtomicBool>,
}

#[tauri::command]
async fn opencode_question(state: State<'_, DesktopState>, session_id: String, request_id: String, answer: Option<Value>) -> Result<Value,String> {
    let snapshot = state.store.snapshot();
    let session = snapshot["sessions"].as_array().and_then(|rows| rows.iter().find(|s| s["sessionId"] == session_id)).ok_or("Session no longer exists")?;
    if session["requestId"] != request_id || session["status"] != "waiting_input" || session["connectionStatus"] != "connected" || session["archived"] == true || session["terminalStatus"] == "closed" { return Err("Question is no longer available. Open the terminal.".into()); }
    tauri::async_runtime::spawn_blocking(move || opencode_questions::execute(&session_id,&request_id,answer)).await.map_err(|e|e.to_string())?
}

#[tauri::command]
async fn delete_archived(state: State<'_, DesktopState>, navigation: State<'_, navigation::NavigationState>, targets: Vec<Value>) -> Result<Value,String> {
    if targets.is_empty() || targets.len() > 10000 { return Err("Choose between one and 10000 archived sessions".into()); }
    let expected: Vec<(String,u64)> = targets.iter().map(|t| Ok((t["sessionId"].as_str().ok_or("Invalid session identity")?.to_owned(),t["revision"].as_u64().ok_or("Invalid session revision")?))).collect::<Result<_,String>>()?;
    let _guard = navigation.0.lock().await;
    let store=state.store.clone(); let cache=state.codex_cache.clone(); let port=state.port;
    tauri::async_runtime::spawn_blocking(move || {
        let deleted = store.delete_archived(&expected).map_err(|e|e.to_string())?;
        let ids: Vec<String> = deleted.iter().map(|s|s["sessionId"].as_str().unwrap().to_owned()).collect();
        let mut cleanup_incomplete = navigation::forget_sessions(port,&ids).is_err();
        if let Some(cache) = cache {
            let codex = deleted.iter().filter(|s|s["sessionId"].as_str().unwrap().starts_with("codex:")).map(|s|(s["sessionId"].as_str().unwrap().to_owned(),s["sourceRevision"].as_u64().unwrap())).collect::<Vec<_>>();
            if !codex.is_empty() {
                match vibe_island_codex::state::purge_cached(&cache,&codex) { Ok(0) => {}, _ => cleanup_incomplete=true }
            }
                let providers=deleted.iter().filter(|s|!s["sessionId"].as_str().unwrap().starts_with("codex:")).map(|s|(s["sessionId"].as_str().unwrap().to_owned(),s["sourceRevision"].as_u64().unwrap())).collect::<Vec<_>>();
                if !providers.is_empty() { match vibe_island_codex::providers::purge_cached(&cache,&providers) { Ok(0)=>{}, _=>cleanup_incomplete=true } }
        }
        Ok(json!({"deleted":ids,"cleanupIncomplete":cleanup_incomplete}))
    }).await.map_err(|e|e.to_string())?
}

#[tauri::command]
async fn archive_session(state: State<'_, DesktopState>, session_id: String, archived: bool) -> Result<Value, String> {
    state.store.archive(&session_id, archived).map_err(|e| e.to_string())
}

#[tauri::command]
async fn retention_settings(state: State<'_, DesktopState>, enabled: Option<bool>) -> Result<bool, String> {
    state.store.retention(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
async fn archive_delay(state: State<'_, DesktopState>, minutes: Option<u64>) -> Result<u64, String> {
    state.store.archive_delay(minutes).map_err(|e| e.to_string())
}

#[tauri::command]
async fn orca_terminal(state: State<'_, DesktopState>, navigation: State<'_, navigation::NavigationState>, session_id:String, action:navigation::Action, choice:Option<navigation::Choice>) -> Result<Value,String> {
    let _guard=navigation.0.lock().await;
    let snapshot=state.store.snapshot();
    let session=snapshot["sessions"].as_array().and_then(|rows|rows.iter().find(|s|s["sessionId"]==session_id));
    if session.is_none(){return Err("Session no longer exists. Refresh the island.".into());}
    navigation::execute(&session_id,action,choice,state.port,state.codex_cache.clone()).await
}

#[tauri::command]
async fn codex_integration(state: State<'_, DesktopState>, action: codex_setup::Action) -> Result<Value, String> {
    let _guard = state.setup_lock.lock().await;
    codex_setup::execute(action, state.port).await
}

#[tauri::command]
async fn provider_integration(state: State<'_, DesktopState>, provider: provider_setup::Provider, action: codex_setup::Action) -> Result<Value,String> {
    let _guard=state.setup_lock.lock().await;
    provider_setup::execute(provider,action,state.port).await
}

#[tauri::command]
async fn watch_outside_clicks(state: State<'_, DesktopState>, active: bool) -> Result<(), String> {
    state.retention_pause.store(active, std::sync::atomic::Ordering::Relaxed);
    state.outside_click.set_active(active)
}

#[tauri::command]
async fn connect_sessions(
    state: State<'_, DesktopState>,
    channel: Channel<Value>,
) -> Result<(), String> {
    let mut active = state.connection.lock().map_err(|e| e.to_string())?;
    if let Some(previous) = active.take() {
        previous.abort();
    }
    let mut subscription = state.store.subscribe();
    channel
        .send(subscription.snapshot)
        .map_err(|e| e.to_string())?;
    *active = Some(tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! {
                event = subscription.events.recv() => match event {
                    Ok(event) => if channel.send(event).is_err() { break; },
                    Err(_) => { let _=channel.send(json!({"transportError":true})); break; }
                },
                // An infrequent IPC heartbeat detects a destroyed webview and releases its subscription.
                _ = tokio::time::sleep(Duration::from_secs(30)) => {
                    if channel.send(json!({"heartbeat":true})).is_err() { break; }
                }
            }
        }
    }));
    Ok(())
}

#[tauri::command]
async fn disconnect_sessions(state: State<'_, DesktopState>) -> Result<(), String> {
    if let Some(active) = state.connection.lock().map_err(|e| e.to_string())?.take() {
        active.abort();
    }
    Ok(())
}

#[tauri::command]
async fn update_region(
    window: WebviewWindow,
    rects: Vec<region::SurfaceRect>,
) -> Result<(), String> {
    region::apply(&window, &rects)
}

#[tauri::command]
async fn desktop_ready(
    window: WebviewWindow,
    state: State<'_, DesktopState>,
) -> Result<Value, String> {
    window.set_focusable(false).map_err(|e| e.to_string())?;
    let frame_border_suppressed = frame::suppress_border(&window);
    window.show().map_err(|e| e.to_string())?;
    window.set_focusable(true).map_err(|e| e.to_string())?;
    Ok(json!({"globalShortcut":state.shortcut,"runtime":"tauri-rust","frameBorderSuppressed":frame_border_suppressed}))
}

fn place(window: &WebviewWindow) -> tauri::Result<()> {
    if let Some(monitor) = window.current_monitor()?.or(window.primary_monitor()?) {
        let scale = monitor.scale_factor();
        let width = (592.0 * scale).round().min(monitor.size().width as f64) as u32;
        window.set_size(PhysicalSize::new(width, monitor.size().height))?;
        window.set_position(PhysicalPosition::new(
            monitor.position().x + ((monitor.size().width - width) / 2) as i32,
            monitor.position().y,
        ))?;
    }
    Ok(())
}

fn show(app: &tauri::AppHandle, action: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("desktop-action", action);
    }
}

fn state_path() -> PathBuf {
    if let Some(path) = std::env::var_os("VIBE_ISLAND_STATE_FILE") {
        return PathBuf::from(path);
    }
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            std::env::var_os("USERPROFILE")
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".local/share")
        })
        .join("VibeIsland/sessions.sqlite3")
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,_,_|show(app,"show")))
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app,_,event| {
            if event.state()==ShortcutState::Pressed { show(app,"toggle"); }
        }).build())
        .manage(usage::UsageState::default())
        .manage(navigation::NavigationState::default())
        .invoke_handler(tauri::generate_handler![connect_sessions,disconnect_sessions,update_region,desktop_ready,watch_outside_clicks,codex_integration,provider_integration,usage::read_usage,orca_terminal,opencode_question,archive_session,retention_settings,archive_delay,delete_archived])
        .setup(|app| {
            // Bind before opening the shared database; an old Python bridge must not run alongside this writer.
            let port = std::env::var("VIBE_ISLAND_PORT").ok().map(|value|value.parse::<u16>()).transpose()?.unwrap_or(37891);
            let listener=TcpListener::bind(("127.0.0.1",port)).map_err(|e|format!("Port {port} is unavailable. Close any previous bridge or island instance first: {e}"))?;
            listener.set_nonblocking(true)?;
            let path=state_path();
            if let Some(parent)=path.parent().filter(|parent|!parent.as_os_str().is_empty()) { std::fs::create_dir_all(parent)?; }
            let store=Arc::new(Store::open(path)?);
            // Existing hook commands retain their stable path; upgrade only the owned staged binary.
            let refresh_pending=if let Err(error)=codex_setup::refresh_staged_helper(port) {eprintln!("Could not refresh the staged observer: {error}");true} else {false};
            let codex_cache=std::env::var_os("VIBE_ISLAND_CODEX_STATE_FILE").map(PathBuf::from)
                .or_else(||if std::env::var("VIBE_ISLAND_STATE_FILE").ok().as_deref()==Some(":memory:") { None } else { vibe_island_codex::state::default_path(port).ok() });
            if let Some(cache)=codex_cache.as_ref() {
                let _=vibe_island_codex::providers::reconcile_processes(cache);
                match vibe_island_codex::state::snapshots(&cache) {
                    Ok(reports)=>for report in reports.into_iter().chain(vibe_island_codex::providers::snapshots(cache).unwrap_or_default()) { if let Err(error)=store.recover(&report) { eprintln!("Could not restore agent context: {error}"); } },
                    Err(error)=>eprintln!("Could not read Codex context: {error}"),
                }
            }
            let http_store=store.clone();
            let retention_store = store.clone();
            let retention_pause = Arc::new(std::sync::atomic::AtomicBool::new(false));
            let retention_gate = retention_pause.clone();
            let observation_store = store.clone();
            let observation_cache = codex_cache.clone();
            let observation_app = app.handle().clone();
            let process_store=store.clone();let process_cache=codex_cache.clone();
            tauri::async_runtime::spawn(async move {
                let mut refresh_pending=refresh_pending;let mut refresh_ticks=0u32;
                let mut opencode=opencode_lifetime::Reconciler::default();
                loop {
                    if refresh_pending && refresh_ticks%10==0 {refresh_pending=codex_setup::refresh_staged_helper(port).is_err();}
                    refresh_ticks=refresh_ticks.wrapping_add(1);
                    if let Some(cache)=process_cache.as_ref() {
                        if let Ok(reports)=vibe_island_codex::providers::reconcile_processes(cache) {
                            for report in reports { let _=process_store.update(&report); }
                        }
                        if let Err(error)=opencode.reconcile(&process_store,cache).await {eprintln!("Could not observe OpenCode clients: {error}");}
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            });
            tauri::async_runtime::spawn(async move {
                loop {
                    if let Some(navigation) = observation_app.try_state::<navigation::NavigationState>() {
                        if let Ok(_guard) = navigation.0.try_lock() {
                            if let Some(cache) = observation_cache.as_ref() {
                                let reports=vibe_island_codex::state::snapshots(cache).unwrap_or_default().into_iter().chain(vibe_island_codex::providers::snapshots(cache).unwrap_or_default());
                                for report in reports { let _=observation_store.recover(&report); }
                            }
                            if navigation::reconcile(&observation_store, port, observation_cache.as_ref()).await.is_err() {
                                if let Some(rows)=observation_store.snapshot()["sessions"].as_array() {
                                    for session in rows { if let (Some(sid),Some(revision))=(session["sessionId"].as_str(),session["revision"].as_u64()) { let _=observation_store.observe_terminal(sid,revision,"checking"); } }
                                }
                            }
                        }
                    }
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            });
            tauri::async_runtime::spawn(async move {
                loop {
                    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                    if !retention_gate.load(std::sync::atomic::Ordering::Relaxed) {
                        if let Err(error) = retention_store.sweep_archives(now) { eprintln!("Could not archive ended sessions: {error}"); }
                    }
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            });
            tauri::async_runtime::spawn(async move {
                match tokio::net::TcpListener::from_std(listener) {
                    Ok(listener) => if let Err(error)=axum::serve(listener,island_core::http::router(http_store)).await { eprintln!("Local bridge stopped: {error}"); },
                    Err(error) => eprintln!("Local bridge failed: {error}"),
                }
            });
            let shortcut=app.global_shortcut().register("Ctrl+Alt+Space").is_ok();
            let outside_click=outside_click::OutsideClickMonitor::new(app.handle().clone())?;
            app.manage(DesktopState{store,connection:Mutex::new(None),shortcut,outside_click,port,setup_lock:tokio::sync::Mutex::new(()),codex_cache,retention_pause});
            let window=app.get_webview_window("main").ok_or("Main island window missing")?;
            frame::suppress_border(&window);
            place(&window)?;
            let show_item=MenuItem::with_id(app,"show","Show island",true,None::<&str>)?;
            let settings_item=MenuItem::with_id(app,"settings","Settings",true,None::<&str>)?;
            let quit_item=MenuItem::with_id(app,"quit","Quit",true,None::<&str>)?;
            let menu=Menu::with_items(app,&[&show_item,&settings_item,&quit_item])?;
            let mut tray=TrayIconBuilder::new().tooltip("Threadcap").menu(&menu).on_menu_event(|app,event|match event.id.as_ref() {
                "show"=>show(app,"show"),"settings"=>show(app,"settings"),"quit"=>app.exit(0),_=>{}
            });
            if let Some(icon)=app.default_window_icon() { tray=tray.icon(icon.clone()); }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window,event|match event {
            tauri::WindowEvent::CloseRequested{api,..} => {
                api.prevent_close();
                if let Some(state)=window.try_state::<DesktopState>() { let _=state.outside_click.set_active(false); }
                let _=window.emit("desktop-action","outside-click");
                let _=window.hide();
            },
            tauri::WindowEvent::ScaleFactorChanged{..} => { if let Some(window)=window.app_handle().get_webview_window("main") { let _=place(&window); let _=window.emit("desktop-action","geometry"); } },
            tauri::WindowEvent::Focused(focused) => {
                if let Some(window)=window.app_handle().get_webview_window("main") { frame::suppress_border(&window); }
                if !focused { let _=window.emit("desktop-action","blur"); }
            },
            tauri::WindowEvent::ThemeChanged(_) => { if let Some(window)=window.app_handle().get_webview_window("main") { frame::suppress_border(&window); } },
            _=>{}
        })
        .run(tauri::generate_context!())
        .expect("Could not start Threadcap");
}
