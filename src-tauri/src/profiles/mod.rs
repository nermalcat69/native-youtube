use anyhow::Result;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tracing::info;

static PROFILES_DIR: OnceCell<PathBuf> = OnceCell::new();
static ACTIVE_PROFILE: OnceCell<Mutex<String>> = OnceCell::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub name: String,
    pub path: PathBuf,
}

pub fn init(data_dir: &PathBuf) -> Result<()> {
    let profiles_dir = data_dir.join("profiles");

    for name in &["default", "work", "personal"] {
        let profile_path = profiles_dir.join(name);
        std::fs::create_dir_all(&profile_path)?;
    }

    PROFILES_DIR
        .set(profiles_dir.clone())
        .map_err(|_| anyhow::anyhow!("profiles dir already set"))?;

    ACTIVE_PROFILE
        .set(Mutex::new("default".to_string()))
        .map_err(|_| anyhow::anyhow!("active profile already set"))?;

    info!("Profiles initialized at {:?}", profiles_dir);
    Ok(())
}

pub fn get_profile_path(name: &str) -> Result<PathBuf> {
    let dir = PROFILES_DIR
        .get()
        .ok_or_else(|| anyhow::anyhow!("profiles not initialized"))?;
    Ok(dir.join(name))
}

pub fn list_profiles() -> Result<Vec<Profile>> {
    let dir = PROFILES_DIR
        .get()
        .ok_or_else(|| anyhow::anyhow!("profiles not initialized"))?;

    let mut profiles = vec![];
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            profiles.push(Profile {
                path: entry.path(),
                name,
            });
        }
    }
    profiles.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(profiles)
}

#[tauri::command]
pub fn get_profiles() -> Result<Vec<Profile>, String> {
    list_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_active_profile() -> String {
    ACTIVE_PROFILE
        .get()
        .and_then(|m| m.lock().ok())
        .map(|g| g.clone())
        .unwrap_or_else(|| "default".to_string())
}

#[tauri::command]
pub fn set_active_profile(name: String) -> Result<(), String> {
    let profile_path = get_profile_path(&name).map_err(|e| e.to_string())?;
    if !profile_path.exists() {
        return Err(format!("Profile '{}' does not exist", name));
    }

    if let Some(mutex) = ACTIVE_PROFILE.get() {
        if let Ok(mut guard) = mutex.lock() {
            *guard = name;
            return Ok(());
        }
    }
    Err("Failed to set active profile".to_string())
}

#[tauri::command]
pub fn create_profile(name: String) -> Result<Profile, String> {
    let dir = PROFILES_DIR.get().ok_or("profiles not initialized")?;

    let profile_path = dir.join(&name);
    std::fs::create_dir_all(&profile_path).map_err(|e| e.to_string())?;

    Ok(Profile {
        path: profile_path,
        name,
    })
}
