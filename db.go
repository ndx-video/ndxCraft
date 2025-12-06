package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type Database struct {
	conn *sql.DB
	path string
}

var db *Database

func InitDB() error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	appDir := filepath.Join(configDir, "ndxCraft")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return err
	}

	dbPath := filepath.Join(appDir, "settings.db")
	backupPath := filepath.Join(appDir, "settings.db.bak")

	// Check for corruption and restore if needed
	if exists(dbPath) {
		if isCorrupt(dbPath) {
			// Rename corrupt file so we can start with a fresh/empty one
			// and let the frontend prompt for restore
			os.Rename(dbPath, dbPath+".corrupt")
		} else {
			// Healthy, make a backup
			copyFile(dbPath, backupPath)
		}
	}

	conn, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	db = &Database{
		conn: conn,
		path: dbPath,
	}

	if err := db.initTables(); err != nil {
		return err
	}
	return db.InitGitIcons()
}

func (d *Database) HasCorruption() bool {
	return exists(d.path + ".corrupt")
}

func (d *Database) RestoreBackup() error {
	backupPath := d.path + ".bak"
	if !exists(backupPath) {
		return fmt.Errorf("no backup found")
	}

	// Close current connection
	d.conn.Close()

	// Wait a bit for file locks to release
	time.Sleep(100 * time.Millisecond)

	// Restore
	if err := copyFile(backupPath, d.path); err != nil {
		// Try to re-open even if restore failed
		conn, _ := sql.Open("sqlite", d.path)
		d.conn = conn
		return err
	}

	// Re-open
	conn, err := sql.Open("sqlite", d.path)
	if err != nil {
		return err
	}
	d.conn = conn

	// Remove corrupt file
	os.Remove(d.path + ".corrupt")

	return nil
}

func (d *Database) initTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS preferences (
			key TEXT PRIMARY KEY,
			value TEXT,
			type TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS app_state (
			key TEXT PRIMARY KEY,
			value TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS shadow_files (
			path TEXT PRIMARY KEY,
			content TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			is_dirty BOOLEAN DEFAULT 0
		);`,
		`CREATE TABLE IF NOT EXISTS projects (
			path TEXT PRIMARY KEY,
			name TEXT,
			last_opened DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS git_icons (
			id TEXT PRIMARY KEY,
			svg TEXT
		);`,
	}

	for _, query := range queries {
		_, err := d.conn.Exec(query)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d *Database) Close() error {
	return d.conn.Close()
}

// Preferences

func (d *Database) SetPreference(key string, value interface{}) error {
	var valStr string
	var typeStr string

	switch v := value.(type) {
	case string:
		valStr = v
		typeStr = "string"
	case int, int64, float64:
		valStr = fmt.Sprintf("%v", v)
		typeStr = "number"
	case bool:
		valStr = fmt.Sprintf("%v", v)
		typeStr = "boolean"
	default:
		// Assume JSON for complex types
		bytes, err := json.Marshal(v)
		if err != nil {
			return err
		}
		valStr = string(bytes)
		typeStr = "json"
	}

	_, err := d.conn.Exec(`INSERT OR REPLACE INTO preferences (key, value, type) VALUES (?, ?, ?)`, key, valStr, typeStr)
	return err
}

func (d *Database) GetPreference(key string) (interface{}, error) {
	var valStr, typeStr string
	err := d.conn.QueryRow(`SELECT value, type FROM preferences WHERE key = ?`, key).Scan(&valStr, &typeStr)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	switch typeStr {
	case "string":
		return valStr, nil
	case "number":
		// We don't know if it's int or float, returning float64 is safest for JSON compat
		var f float64
		fmt.Sscanf(valStr, "%f", &f)
		return f, nil
	case "boolean":
		return valStr == "true", nil
	case "json":
		var v interface{}
		err := json.Unmarshal([]byte(valStr), &v)
		if err != nil {
			return nil, err
		}
		return v, nil
	default:
		return valStr, nil
	}
}

func (d *Database) GetAllPreferences() (map[string]interface{}, error) {
	rows, err := d.conn.Query(`SELECT key, value, type FROM preferences`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	prefs := make(map[string]interface{})
	for rows.Next() {
		var key, valStr, typeStr string
		if err := rows.Scan(&key, &valStr, &typeStr); err != nil {
			continue
		}

		switch typeStr {
		case "string":
			prefs[key] = valStr
		case "number":
			var f float64
			fmt.Sscanf(valStr, "%f", &f)
			prefs[key] = f
		case "boolean":
			prefs[key] = (valStr == "true")
		case "json":
			var v interface{}
			if err := json.Unmarshal([]byte(valStr), &v); err == nil {
				prefs[key] = v
			} else {
				prefs[key] = valStr // Fallback
			}
		default:
			prefs[key] = valStr
		}
	}
	return prefs, nil
}

// App State

func (d *Database) SetAppState(key string, value string) error {
	_, err := d.conn.Exec(`INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)`, key, value)
	return err
}

func (d *Database) GetAppState(key string) (string, error) {
	var value string
	err := d.conn.QueryRow(`SELECT value FROM app_state WHERE key = ?`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

// Shadow Files

func (d *Database) SaveShadowFile(path string, content string, isDirty bool) error {
	_, err := d.conn.Exec(`INSERT OR REPLACE INTO shadow_files (path, content, updated_at, is_dirty) VALUES (?, ?, ?, ?)`, path, content, time.Now(), isDirty)
	return err
}

func (d *Database) GetShadowFile(path string) (string, bool, error) {
	var content string
	var isDirty bool
	err := d.conn.QueryRow(`SELECT content, is_dirty FROM shadow_files WHERE path = ?`, path).Scan(&content, &isDirty)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return content, isDirty, nil
}

func (d *Database) ClearShadowFile(path string) error {
	_, err := d.conn.Exec(`DELETE FROM shadow_files WHERE path = ?`, path)
	return err
}

// Helpers

func exists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

func copyFile(src, dst string) error {
	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

func isCorrupt(path string) bool {
	// Simple check: try to open and run integrity_check
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return true
	}
	defer db.Close()

	var result string
	err = db.QueryRow("PRAGMA integrity_check").Scan(&result)
	if err != nil || result != "ok" {
		return true
	}
	return false
}

// Projects

type Project struct {
	Path       string    `json:"path"`
	Name       string    `json:"name"`
	LastOpened time.Time `json:"lastOpened"`
}

func (d *Database) AddProject(path string) error {
	name := filepath.Base(path)
	_, err := d.conn.Exec(`INSERT OR REPLACE INTO projects (path, name, last_opened) VALUES (?, ?, ?)`, path, name, time.Now())
	return err
}

func (d *Database) GetProjects() ([]Project, error) {
	rows, err := d.conn.Query(`SELECT path, name, last_opened FROM projects ORDER BY last_opened DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		var lastOpened time.Time
		if err := rows.Scan(&p.Path, &p.Name, &lastOpened); err != nil {
			continue
		}
		p.LastOpened = lastOpened
		projects = append(projects, p)
	}
	return projects, nil
}

func (d *Database) RemoveProject(path string) error {
	_, err := d.conn.Exec(`DELETE FROM projects WHERE path = ?`, path)
	return err
}

func (d *Database) UpdateProjectLastOpened(path string) error {
	_, err := d.conn.Exec(`UPDATE projects SET last_opened = ? WHERE path = ?`, time.Now(), path)
	return err
}

// Git Icons

func (d *Database) InitGitIcons() error {
	// Check if table is empty
	var count int
	err := d.conn.QueryRow("SELECT COUNT(*) FROM git_icons").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	// Insert defaults
	defaults := map[string]string{
		"default": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
		"tower":   `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 22h20L12 2zm0 6l5 10H7l5-10z"/></svg>`, // Placeholder for Tower
		"gitlab":  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51a.42.42 0 0 1 .11-.18.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/></svg>`,
	}

	for id, svg := range defaults {
		_, err := d.conn.Exec(`INSERT INTO git_icons (id, svg) VALUES (?, ?)`, id, svg)
		if err != nil {
			return err
		}
	}
	return nil
}

func (d *Database) AddGitIcon(svg string) (string, error) {
	if len(svg) > 10*1024 { // 10KB limit
		return "", fmt.Errorf("icon too large (max 10KB)")
	}
	id := uuid.New().String()
	_, err := d.conn.Exec(`INSERT INTO git_icons (id, svg) VALUES (?, ?)`, id, svg)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (d *Database) GetGitIcons() (map[string]string, error) {
	rows, err := d.conn.Query(`SELECT id, svg FROM git_icons`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	icons := make(map[string]string)
	for rows.Next() {
		var id, svg string
		if err := rows.Scan(&id, &svg); err != nil {
			continue
		}
		icons[id] = svg
	}
	return icons, nil
}

func (d *Database) DeleteGitIcon(id string) error {
	_, err := d.conn.Exec(`DELETE FROM git_icons WHERE id = ?`, id)
	return err
}
