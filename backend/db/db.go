package db

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(path string) error {
	var err error
	DB, err = sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return err
	}
	return migrate()
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}

func migrate() error {
	_, err := DB.Exec(`
	CREATE TABLE IF NOT EXISTS scenes (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		title        TEXT    NOT NULL,
		scene        TEXT    NOT NULL,
		emotion      TEXT,
		location     TEXT,
		time         TEXT,
		lighting     TEXT,
		weather      TEXT,
		comp_angle   TEXT,
		comp_layout  TEXT,
		anomaly      TEXT,
		sound        TEXT,
		color        TEXT,
		nostalgia    INTEGER DEFAULT 0,
		anxiety      INTEGER DEFAULT 0,
		unreality    INTEGER DEFAULT 0,
		is_favorite  INTEGER DEFAULT 0,
		is_drawn     INTEGER DEFAULT 0,
		created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS weights (
		id       INTEGER PRIMARY KEY AUTOINCREMENT,
		category TEXT    NOT NULL,
		word     TEXT    NOT NULL,
		score    INTEGER DEFAULT 0,
		UNIQUE(category, word)
	);
	`)
	if err != nil {
		log.Printf("migrate error: %v", err)
		return err
	}

	// 既存DBへのカラム追加（初回以降の起動でも安全）
	alterColumns := []string{
		`ALTER TABLE scenes ADD COLUMN weather     TEXT`,
		`ALTER TABLE scenes ADD COLUMN comp_angle  TEXT`,
		`ALTER TABLE scenes ADD COLUMN comp_layout TEXT`,
	}
	for _, sql := range alterColumns {
		DB.Exec(sql) // エラー無視（既にカラムがある場合）
	}

	return nil
}
