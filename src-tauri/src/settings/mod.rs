use anyhow::Result;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tracing::info;

static SETTINGS_PATH: OnceCell<PathBuf> = OnceCell::new();
static SETTINGS: OnceCell<Mutex<Settings>> = OnceCell::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub adblock_enabled: bool,
    pub cosmetic_filtering_enabled: bool,
    pub sponsorblock_enabled: bool,
    pub sponsorblock_categories: Vec<String>,
    pub auto_update: bool,
    pub active_profile: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            adblock_enabled: true,
            cosmetic_filtering_enabled: true,
            sponsorblock_enabled: true,
            sponsorblock_categories: vec![
                "sponsor".to_string(),
                "selfpromo".to_string(),
                "interaction".to_string(),
                "intro".to_string(),
                "outro".to_string(),
            ],
            auto_update: true,
            active_profile: "default".to_string(),
        }
    }
}

pub fn init(data_dir: &Path) -> Result<()> {
    let path = data_dir.join("settings.json");
    SETTINGS_PATH
        .set(path.clone())
        .map_err(|_| anyhow::anyhow!("settings path already set"))?;

    let settings = if path.exists() {
        let raw = std::fs::read_to_string(&path)?;
        serde_json::from_str(&raw).unwrap_or_default()
    } else {
        Settings::default()
    };

    SETTINGS
        .set(Mutex::new(settings))
        .map_err(|_| anyhow::anyhow!("settings already initialized"))?;

    info!("Settings initialized from {:?}", path);
    Ok(())
}

fn save() -> Result<()> {
    let path = SETTINGS_PATH
        .get()
        .ok_or_else(|| anyhow::anyhow!("settings not initialized"))?;
    let guard = SETTINGS
        .get()
        .ok_or_else(|| anyhow::anyhow!("settings not initialized"))?
        .lock()
        .map_err(|_| anyhow::anyhow!("settings mutex poisoned"))?;
    let json = serde_json::to_string_pretty(&*guard)?;
    std::fs::write(path, json)?;
    Ok(())
}

pub fn current() -> Settings {
    SETTINGS
        .get()
        .and_then(|m| m.lock().ok())
        .map(|g| g.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    let guard = SETTINGS
        .get()
        .ok_or("settings not initialized")?
        .lock()
        .map_err(|_| "mutex poisoned")?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn update_settings(new_settings: Settings) -> Result<(), String> {
    {
        let mut guard = SETTINGS
            .get()
            .ok_or("settings not initialized")?
            .lock()
            .map_err(|_| "mutex poisoned")?;
        *guard = new_settings;
    }
    save().map_err(|e| e.to_string())
}
