use anyhow::Result;
use once_cell::sync::OnceCell;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use tracing::info;
use uuid::Uuid;

static DB: OnceCell<Mutex<Connection>> = OnceCell::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Download {
    pub id: String,
    pub video_id: String,
    pub title: String,
    pub url: String,
    pub file_path: String,
    pub format: String,
    pub status: String,
    pub progress: f32,
    pub created_at: String,
}

pub fn init(data_dir: &Path) -> Result<()> {
    let db_path = data_dir.join("downloads.db");
    let conn = Connection::open(&db_path)?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS downloads (
            id          TEXT PRIMARY KEY,
            video_id    TEXT NOT NULL,
            title       TEXT NOT NULL,
            url         TEXT NOT NULL,
            file_path   TEXT NOT NULL,
            format      TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'pending',
            progress    REAL NOT NULL DEFAULT 0.0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    DB.set(Mutex::new(conn))
        .map_err(|_| anyhow::anyhow!("download DB already initialized"))?;

    info!("Download database initialized at {:?}", db_path);
    Ok(())
}

fn with_db<F, T>(f: F) -> Result<T>
where
    F: FnOnce(&Connection) -> Result<T>,
{
    let guard = DB
        .get()
        .ok_or_else(|| anyhow::anyhow!("DB not initialized"))?
        .lock()
        .map_err(|_| anyhow::anyhow!("DB mutex poisoned"))?;
    f(&guard)
}

pub fn create_download(
    video_id: &str,
    title: &str,
    url: &str,
    file_path: &str,
    format: &str,
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    with_db(|conn| {
        conn.execute(
            "INSERT INTO downloads (id, video_id, title, url, file_path, format) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, video_id, title, url, file_path, format],
        )?;
        Ok(id)
    })
}

#[allow(dead_code)]
pub fn update_progress(id: &str, progress: f32, status: &str) -> Result<()> {
    with_db(|conn| {
        conn.execute(
            "UPDATE downloads SET progress = ?1, status = ?2 WHERE id = ?3",
            params![progress, status, id],
        )?;
        Ok(())
    })
}

pub fn list_downloads() -> Result<Vec<Download>> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, video_id, title, url, file_path, format, status, progress, created_at FROM downloads ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Download {
                id: row.get(0)?,
                video_id: row.get(1)?,
                title: row.get(2)?,
                url: row.get(3)?,
                file_path: row.get(4)?,
                format: row.get(5)?,
                status: row.get(6)?,
                progress: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(Into::into)
    })
}

#[tauri::command]
pub fn get_downloads() -> Result<Vec<Download>, String> {
    list_downloads().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_video(
    video_id: String,
    title: String,
    url: String,
    format: String,
) -> Result<String, String> {
    let downloads_dir = dirs::download_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("Downloads"));
    let safe_title = title.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let ext = if format == "audio" { "mp3" } else { "mp4" };
    let file_path = downloads_dir.join(format!("{}_{}.{}", safe_title, video_id, ext));

    let id = create_download(
        &video_id,
        &title,
        &url,
        file_path.to_str().unwrap_or_default(),
        &format,
    )
    .map_err(|e| e.to_string())?;

    info!("Download queued: {} -> {:?}", id, file_path);
    Ok(id)
}
