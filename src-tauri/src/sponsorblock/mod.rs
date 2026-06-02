use anyhow::Result;
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

static CACHE: Lazy<Mutex<HashMap<String, Vec<Segment>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

const API_BASE: &str = "https://sponsor.ajay.app/api";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Segment {
    pub segment: [f64; 2],
    pub category: String,
    #[serde(rename = "actionType")]
    pub action_type: String,
    pub uuid: String,
    pub votes: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SponsorBlockResponse {
    pub segments: Vec<Segment>,
    #[serde(rename = "videoID")]
    pub video_id: String,
}

pub async fn get_segments(video_id: &str, categories: &[&str]) -> Result<Vec<Segment>> {
    if let Some(cached) = CACHE.lock().unwrap().get(video_id) {
        return Ok(cached.clone());
    }

    let client = Client::builder().use_rustls_tls().build()?;
    let cats = categories.join(",");

    let url = format!(
        "{}/skipSegments?videoID={}&categories=[{}]",
        API_BASE,
        video_id,
        cats.split(',')
            .map(|c| format!("\"{}\"", c))
            .collect::<Vec<_>>()
            .join(",")
    );

    let resp = client.get(&url).send().await?;

    if resp.status() == 404 {
        CACHE.lock().unwrap().insert(video_id.to_string(), vec![]);
        return Ok(vec![]);
    }

    let segments: Vec<Segment> = resp.error_for_status()?.json().await?;
    CACHE
        .lock()
        .unwrap()
        .insert(video_id.to_string(), segments.clone());

    Ok(segments)
}

#[tauri::command]
pub async fn fetch_sponsor_segments(
    video_id: String,
    categories: Vec<String>,
) -> Result<Vec<Segment>, String> {
    let cats: Vec<&str> = categories.iter().map(|s| s.as_str()).collect();
    get_segments(&video_id, &cats)
        .await
        .map_err(|e| e.to_string())
}
