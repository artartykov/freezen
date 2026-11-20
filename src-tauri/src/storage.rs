use std::fs;
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::Manager;

const FILE_NAME: &str = "data.json";
static WRITE_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tauri::command]
pub async fn load_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
    read(&data_dir(&app)?.join(FILE_NAME)).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_data(
    app: tauri::AppHandle,
    data: String,
    expected: Option<String>,
) -> Result<bool, String> {
    let dir = data_dir(&app)?;
    compare_and_write(&dir, &data, expected).map_err(|error| error.to_string())
}

fn compare_and_write(dir: &Path, data: &str, expected: Option<String>) -> std::io::Result<bool> {
    fs::create_dir_all(dir)?;
    let lock = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(dir.join("data.lock"))?;
    lock.lock()?;
    let current = read(&dir.join(FILE_NAME))?;
    if current.as_deref() == Some(data) {
        sync_directory(dir)?;
        return Ok(true);
    }
    if current != expected {
        return Ok(false);
    }
    write_atomically(dir, FILE_NAME, data)?;
    Ok(true)
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|error| error.to_string())
}

fn read(path: &Path) -> std::io::Result<Option<String>> {
    match fs::read_to_string(path) {
        Ok(data) => Ok(Some(data)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn write_atomically(dir: &Path, name: &str, data: &str) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;
    let write_id = WRITE_COUNTER.fetch_add(1, Ordering::Relaxed);
    let temp_path = dir.join(format!("{name}.{}.{write_id}.tmp", std::process::id()));
    let result =
        write_synced(&temp_path, data).and_then(|()| fs::rename(&temp_path, dir.join(name)));
    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result?;
    sync_directory(dir)
}

#[cfg(unix)]
fn sync_directory(dir: &Path) -> std::io::Result<()> {
    fs::File::open(dir)?.sync_all()
}

#[cfg(not(unix))]
fn sync_directory(_: &Path) -> std::io::Result<()> {
    Ok(())
}

fn write_synced(path: &Path, data: &str) -> std::io::Result<()> {
    let mut file = fs::File::create(path)?;
    file.write_all(data.as_bytes())?;
    file.sync_all()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file_count(dir: &Path) -> usize {
        fs::read_dir(dir)
            .unwrap()
            .filter(|entry| {
                entry
                    .as_ref()
                    .unwrap()
                    .file_name()
                    .to_string_lossy()
                    .ends_with(".tmp")
            })
            .count()
    }

    fn temp_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("freezen-storage-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn read_returns_none_for_missing_file() {
        let dir = temp_dir("missing");
        assert_eq!(read(&dir.join(FILE_NAME)).unwrap(), None);
    }

    #[test]
    fn write_creates_directory_and_file() {
        let dir = temp_dir("create");
        write_atomically(&dir, FILE_NAME, "{\"version\":1}").unwrap();
        assert_eq!(
            read(&dir.join(FILE_NAME)).unwrap().as_deref(),
            Some("{\"version\":1}")
        );
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn write_replaces_file_and_removes_temp_file() {
        let dir = temp_dir("replace");
        write_atomically(&dir, FILE_NAME, "old").unwrap();
        write_atomically(&dir, FILE_NAME, "new").unwrap();
        assert_eq!(read(&dir.join(FILE_NAME)).unwrap().as_deref(), Some("new"));
        assert_eq!(temp_file_count(&dir), 0);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn stale_write_leaves_the_current_document_intact() {
        let dir = temp_dir("conflict");
        assert!(compare_and_write(&dir, "first", None).unwrap());
        assert!(compare_and_write(&dir, "second", Some("first".into())).unwrap());
        assert!(!compare_and_write(&dir, "stale", Some("first".into())).unwrap());
        assert_eq!(
            read(&dir.join(FILE_NAME)).unwrap().as_deref(),
            Some("second")
        );
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn failed_write_removes_temp_file() {
        let dir = temp_dir("failed");
        fs::create_dir_all(dir.join(FILE_NAME).join("blocker")).unwrap();
        assert!(write_atomically(&dir, FILE_NAME, "data").is_err());
        assert_eq!(temp_file_count(&dir), 0);
        fs::remove_dir_all(&dir).unwrap();
    }
}
