use std::fs;
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::Manager;

const FILE_NAME: &str = "data.json";
const BACKUP_NAME: &str = "data.backup.json";
static WRITE_COUNTER: AtomicU64 = AtomicU64::new(0);

type RecoveryFiles = (bool, Option<String>, bool, Option<String>);

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
    compare_and_write(&dir, &data, expected, cfg!(target_os = "android"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn load_recovery_files(app: tauri::AppHandle) -> Result<Option<RecoveryFiles>, String> {
    if !cfg!(target_os = "android") {
        return Ok(None);
    }
    let dir = data_dir(&app)?;
    inspect_files(&dir)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn prepare_android_data(
    app: tauri::AppHandle,
    main_exists: bool,
    expected: Option<String>,
    restore: Option<String>,
) -> Result<bool, String> {
    if !cfg!(target_os = "android") {
        return Err("Android recovery is unavailable".into());
    }
    prepare_files(&data_dir(&app)?, main_exists, expected, restore)
        .map_err(|error| error.to_string())
}

fn lock_storage(dir: &Path) -> std::io::Result<fs::File> {
    fs::create_dir_all(dir)?;
    let lock = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(dir.join("data.lock"))?;
    lock.lock()?;
    Ok(lock)
}

fn compare_and_write(
    dir: &Path,
    data: &str,
    expected: Option<String>,
    backup: bool,
) -> std::io::Result<bool> {
    let _lock = lock_storage(dir)?;
    let current = read(&dir.join(FILE_NAME))?;
    if backup && current.is_none() && dir.join(BACKUP_NAME).try_exists()? {
        return Ok(false);
    }
    if current.as_deref() == Some(data) {
        sync_directory(dir)?;
        if backup {
            refresh_backup(dir, data);
        }
        return Ok(true);
    }
    if current != expected {
        return Ok(false);
    }
    write_atomically(dir, FILE_NAME, data)?;
    if backup {
        refresh_backup(dir, data);
    }
    Ok(true)
}

fn inspect_files(dir: &Path) -> std::io::Result<RecoveryFiles> {
    let _lock = lock_storage(dir)?;
    let (main_exists, main) = readable_text(read_bytes(&dir.join(FILE_NAME))?.as_deref());
    let (backup_exists, backup) = match read_bytes(&dir.join(BACKUP_NAME)) {
        Ok(bytes) => readable_text(bytes.as_deref()),
        Err(error) => {
            eprintln!("Could not read the FreeZen recovery copy: {error}");
            (true, None)
        }
    };
    Ok((main_exists, main, backup_exists, backup))
}

fn prepare_files(
    dir: &Path,
    main_exists: bool,
    expected: Option<String>,
    restore: Option<String>,
) -> std::io::Result<bool> {
    let _lock = lock_storage(dir)?;
    let current = read_bytes(&dir.join(FILE_NAME))?;
    let current_text = current
        .as_deref()
        .and_then(|bytes| std::str::from_utf8(bytes).ok());
    if current.is_some() != main_exists || current_text != expected.as_deref() {
        return Ok(false);
    }
    if let Some(backup) = restore {
        if read_bytes(&dir.join(BACKUP_NAME))?.as_deref() != Some(backup.as_bytes()) {
            return Ok(false);
        }
        if let Some(original) = current {
            preserve_original(dir, &original)?;
        }
        write_atomically(dir, FILE_NAME, &backup)?;
    } else if let Some(main) = expected {
        refresh_backup(dir, &main);
    }
    Ok(true)
}

fn refresh_backup(dir: &Path, data: &str) {
    let existing = read_bytes(&dir.join(BACKUP_NAME));
    let result = if matches!(existing, Ok(Some(bytes)) if bytes == data.as_bytes()) {
        sync_directory(dir)
    } else {
        write_atomically(dir, BACKUP_NAME, data)
    };
    if let Err(error) = result {
        eprintln!("Could not refresh the FreeZen recovery copy: {error}");
    }
}

fn preserve_original(dir: &Path, original: &[u8]) -> std::io::Result<()> {
    let mut index = 1;
    loop {
        let name = format!("data.corrupt.{index}.json");
        if !dir.join(&name).try_exists()? {
            return write_bytes_atomically(dir, &name, original);
        }
        index += 1;
    }
}

fn readable_text(data: Option<&[u8]>) -> (bool, Option<String>) {
    (
        data.is_some(),
        data.and_then(|data| std::str::from_utf8(data).ok())
            .map(str::to_owned),
    )
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

fn read_bytes(path: &Path) -> std::io::Result<Option<Vec<u8>>> {
    match fs::read(path) {
        Ok(data) => Ok(Some(data)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn write_atomically(dir: &Path, name: &str, data: &str) -> std::io::Result<()> {
    write_bytes_atomically(dir, name, data.as_bytes())
}

fn write_bytes_atomically(dir: &Path, name: &str, data: &[u8]) -> std::io::Result<()> {
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

fn write_synced(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let mut file = fs::File::create(path)?;
    file.write_all(data)?;
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
        assert!(compare_and_write(&dir, "first", None, false).unwrap());
        assert!(compare_and_write(&dir, "second", Some("first".into()), false).unwrap());
        assert!(!compare_and_write(&dir, "stale", Some("first".into()), false).unwrap());
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

    #[test]
    fn android_save_updates_the_recovery_copy() {
        let dir = temp_dir("android-save");
        assert!(compare_and_write(&dir, "first", None, true).unwrap());
        assert!(compare_and_write(&dir, "second", Some("first".into()), true).unwrap());
        assert!(!compare_and_write(&dir, "stale", Some("first".into()), true).unwrap());
        assert_eq!(
            inspect_files(&dir).unwrap(),
            (true, Some("second".into()), true, Some("second".into()))
        );
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn recovery_preserves_invalid_utf8_and_keeps_existing_archives() {
        let dir = temp_dir("android-corrupt");
        let original = b"{\xff}";
        write_bytes_atomically(&dir, FILE_NAME, original).unwrap();
        write_atomically(&dir, BACKUP_NAME, "backup").unwrap();
        write_atomically(&dir, "data.corrupt.1.json", "earlier original").unwrap();
        assert_eq!(
            inspect_files(&dir).unwrap(),
            (true, None, true, Some("backup".into()))
        );
        assert!(prepare_files(&dir, true, None, Some("backup".into())).unwrap());
        assert_eq!(fs::read(dir.join("data.corrupt.2.json")).unwrap(), original);
        assert_eq!(
            fs::read(dir.join("data.corrupt.1.json")).unwrap(),
            b"earlier original"
        );
        assert_eq!(fs::read(dir.join(FILE_NAME)).unwrap(), b"backup");
        assert_eq!(fs::read(dir.join(BACKUP_NAME)).unwrap(), b"backup");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn recovery_checks_both_files_before_replacing_the_main_file() {
        let dir = temp_dir("android-race");
        write_atomically(&dir, BACKUP_NAME, "newer backup").unwrap();
        assert!(!compare_and_write(&dir, "seed", None, true).unwrap());
        assert!(!prepare_files(&dir, false, None, Some("old backup".into())).unwrap());
        assert!(!dir.join(FILE_NAME).exists());
        assert!(prepare_files(&dir, false, None, Some("newer backup".into())).unwrap());
        assert!(!prepare_files(&dir, false, None, Some("newer backup".into())).unwrap());
        assert_eq!(fs::read(dir.join(FILE_NAME)).unwrap(), b"newer backup");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn an_unavailable_backup_does_not_block_a_valid_main_file() {
        let dir = temp_dir("android-backup-unavailable");
        assert!(compare_and_write(&dir, "first", None, true).unwrap());
        fs::remove_file(dir.join(BACKUP_NAME)).unwrap();
        fs::create_dir(dir.join(BACKUP_NAME)).unwrap();
        assert!(compare_and_write(&dir, "second", Some("first".into()), true).unwrap());
        assert_eq!(
            inspect_files(&dir).unwrap(),
            (true, Some("second".into()), true, None)
        );
        assert!(prepare_files(&dir, true, Some("second".into()), None).unwrap());
        fs::remove_dir_all(&dir).unwrap();
    }
}
