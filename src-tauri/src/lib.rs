mod adblock;
mod downloads;
mod profiles;
mod settings;
mod sponsorblock;
mod updater;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tracing::info;

// ---------------------------------------------------------------------------
// Cosmetic ad filter — injected into the YouTube webview on every page load.
// Uses a MutationObserver so the rules survive YouTube's SPA DOM updates.
// ---------------------------------------------------------------------------
const COSMETIC_CSS: &str = "
.ytp-ad-module,
.ytp-ad-player-overlay,
.ytp-ad-player-overlay-instream-info,
.ytp-ad-image-overlay,
.ytp-ad-text-overlay,
#ad-text,
.ad-showing .ytp-chrome-bottom,
.ytp-ad-skip-button-container,
ytd-banner-promo-renderer,
ytd-statement-banner-renderer,
ytd-ad-slot-renderer,
ytd-in-feed-ad-layout-renderer,
tp-yt-paper-dialog:has(ytd-ad-slot-renderer),
#masthead-ad,
.ytd-display-ad-renderer,
.video-ads { display: none !important; }
";

fn cosmetic_script() -> String {
    format!(
        r#"(function(){{
    const ID='youtube-cosmetic';
    function inject(){{
        if(document.getElementById(ID))return;
        const s=document.createElement('style');
        s.id=ID;
        s.textContent=`{css}`;
        (document.head||document.documentElement).appendChild(s);
    }}
    inject();
    new MutationObserver(inject)
        .observe(document.documentElement,{{childList:true,subtree:true}});
}})();"#,
        css = COSMETIC_CSS
    )
}

// ---------------------------------------------------------------------------
// SponsorBlock — polls the video time and skips flagged segments.
// Hooks history.pushState so it survives YouTube's SPA navigation.
// ---------------------------------------------------------------------------
const SPONSORBLOCK_SCRIPT: &str = r#"(function(){
    if(window.__gt_sb)return;
    window.__gt_sb=true;
    let lastId=null,segs=[];
    const CATS=JSON.stringify(['sponsor','selfpromo','interaction','intro','outro']);

    async function load(id){
        try{
            const r=await fetch(
                'https://sponsor.ajay.app/api/skipSegments?videoID='+id+'&categories='+encodeURIComponent(CATS)
            );
            if(r.status===404){segs=[];return;}
            if(r.ok)segs=await r.json();
        }catch{segs=[];}
    }

    async function onNav(){
        const id=new URLSearchParams(location.search).get('v');
        if(!id||id===lastId)return;
        lastId=id;
        await load(id);
    }

    function tick(){
        const v=document.querySelector('video');
        if(!v||v.paused)return;
        const t=v.currentTime;
        for(const s of segs){
            if(t>=s.segment[0]&&t<s.segment[1]-0.3){
                v.currentTime=s.segment[1];
                return;
            }
        }
    }

    const _push=history.pushState.bind(history);
    history.pushState=function(...a){_push(...a);onNav();};
    const _rep=history.replaceState.bind(history);
    history.replaceState=function(...a){_rep(...a);onNav();};
    window.addEventListener('popstate',onNav);

    setInterval(tick,500);
    onNav();
})();"#;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    build_settings_window(&app).map_err(|e| e.to_string())?;
    Ok(())
}

fn build_settings_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    // In dev Tauri automatically routes App URLs to the Vite dev server.
    let url = WebviewUrl::App("index.html".into());
    WebviewWindowBuilder::new(app, "settings", url)
        .title("Youtube — Settings")
        .inner_size(480.0, 700.0)
        .resizable(true)
        .build()?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // ── Persistent storage ──────────────────────────────────────────
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir)?;

            settings::init(&data_dir).expect("failed to init settings");
            profiles::init(&data_dir).expect("failed to init profiles");
            downloads::init(&data_dir).expect("failed to init downloads db");

            let s = settings::current();

            // ── Injection script for the YouTube webview ─────────────────
            let mut init_script = String::new();
            if s.cosmetic_filtering_enabled {
                init_script.push_str(&cosmetic_script());
            }
            if s.sponsorblock_enabled {
                init_script.push_str(SPONSORBLOCK_SCRIPT);
            }

            // ── YouTube window ────────────────────────────────────────────
            // Spoof a real Chrome user-agent so YouTube enables all features:
            // live chat, fullscreen, Keychain autofill, and modern UI. Without
            // this YouTube detects the WKWebView token and disables them.
            let user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
                AppleWebKit/537.36 (KHTML, like Gecko) \
                Chrome/136.0.0.0 Safari/537.36";

            let _yt_win = WebviewWindowBuilder::new(
                app,
                "youtube",
                WebviewUrl::External("https://www.youtube.com".parse().unwrap()),
            )
            .title("Youtube")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .initialization_script(&init_script)
            .user_agent(user_agent)
            .build()?;

            // On macOS hide to tray instead of quitting when the window is closed.
            #[cfg(target_os = "macos")]
            {
                let handle = app.handle().clone();
                _yt_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = handle.get_webview_window("youtube") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            // ── Tray icon ─────────────────────────────────────────────────
            let show_yt = MenuItem::with_id(app, "show", "Show Youtube", true, None::<&str>)?;
            let settings =
                MenuItem::with_id(app, "settings", "Settings & Downloads", true, None::<&str>)?;
            let sep = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Youtube", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_yt, &settings, &sep, &quit])?;

            let handle2 = app.handle().clone();
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |_tray, event| match event.id.as_ref() {
                    "quit" => handle2.exit(0),
                    "settings" => {
                        let _ = open_settings(handle2.clone());
                    }
                    "show" => {
                        if let Some(w) = handle2.get_webview_window("youtube") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("youtube") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Adblock filter lists (background) ─────────────────────────
            tauri::async_runtime::spawn(async move {
                if let Err(e) = adblock::init().await {
                    tracing::warn!("Adblock init failed (retry via Settings): {}", e);
                }
            });

            info!("Youtube initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_settings,
            adblock::check_url,
            adblock::reload_filters,
            sponsorblock::fetch_sponsor_segments,
            downloads::download_video,
            downloads::get_downloads,
            profiles::get_profiles,
            profiles::get_active_profile,
            profiles::set_active_profile,
            profiles::create_profile,
            settings::get_settings,
            settings::update_settings,
            updater::check_for_update,
            updater::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Youtube");
}
