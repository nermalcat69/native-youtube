use adblock::{
    engine::Engine,
    lists::{FilterSet, ParseOptions},
    request::Request,
};
use anyhow::Result;
use once_cell::sync::OnceCell;
use reqwest::Client;
use std::sync::Mutex;
use tracing::{info, warn};

// Safety: Engine uses Rc internally but we always access it behind a Mutex,
// guaranteeing single-threaded access at any point in time.
struct SendEngine(Engine);
unsafe impl Send for SendEngine {}

static ENGINE: OnceCell<Mutex<SendEngine>> = OnceCell::new();

const FILTER_URLS: &[(&str, &str)] = &[
    ("easylist", "https://easylist.to/easylist/easylist.txt"),
    (
        "easyprivacy",
        "https://easylist.to/easylist/easyprivacy.txt",
    ),
    (
        "fanboy-annoyances",
        "https://easylist.to/easylist/fanboy-annoyance.txt",
    ),
    (
        "ublock-filters",
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
    ),
];

// Extra YouTube-specific rules to catch what generic lists miss
const YOUTUBE_RULES: &[&str] = &[
    "||youtube.com/api/stats/ads",
    "||youtube.com/pagead/",
    "||youtube.com/ptracking",
    "||youtube.com/youtubei/v1/log_event",
    "||doubleclick.net^",
    "||googleadservices.com^",
    "||google-analytics.com^",
    "||googlesyndication.com^",
    "||imasdk.googleapis.com^",
    "||static.doubleclick.net^",
    "||securepubads.g.doubleclick.net^",
];

pub async fn init() -> Result<()> {
    let client = Client::builder().use_rustls_tls().build()?;
    let mut filter_set = FilterSet::new(true);

    filter_set.add_filters(
        &YOUTUBE_RULES
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>(),
        ParseOptions::default(),
    );

    for (name, url) in FILTER_URLS {
        match fetch_filter_list(&client, url).await {
            Ok(rules) => {
                let lines: Vec<String> = rules.lines().map(|l| l.to_string()).collect();
                filter_set.add_filters(&lines, ParseOptions::default());
                info!("Loaded filter list: {}", name);
            }
            Err(e) => {
                warn!("Failed to fetch filter list {}: {}", name, e);
            }
        }
    }

    let engine = Engine::from_filter_set(filter_set, true);

    // Replace existing engine if already initialized
    if let Some(mutex) = ENGINE.get() {
        if let Ok(mut guard) = mutex.lock() {
            *guard = SendEngine(engine);
            return Ok(());
        }
    }

    ENGINE
        .set(Mutex::new(SendEngine(engine)))
        .map_err(|_| anyhow::anyhow!("adblock engine set race"))?;

    info!("Adblock engine initialized");
    Ok(())
}

async fn fetch_filter_list(client: &Client, url: &str) -> Result<String> {
    let response = client.get(url).send().await?.error_for_status()?;
    Ok(response.text().await?)
}

pub fn should_block(request_url: &str, source_url: &str, request_type: &str) -> bool {
    let engine = match ENGINE.get() {
        Some(e) => e,
        None => return false,
    };

    let request = match Request::new(request_url, source_url, request_type) {
        Ok(r) => r,
        Err(_) => return false,
    };

    let lock = match engine.lock() {
        Ok(l) => l,
        Err(_) => return false,
    };

    lock.0.check_network_request(&request).matched
}

#[tauri::command]
pub async fn check_url(url: String, source: String, resource_type: String) -> bool {
    should_block(&url, &source, &resource_type)
}

#[tauri::command]
pub async fn reload_filters() -> Result<(), String> {
    init().await.map_err(|e| e.to_string())
}
