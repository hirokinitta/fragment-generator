package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(dbPath string) error {
	var err error
	// WALモード + ビジータイムアウト：電源断でもDBが壊れにくい設定
	DB, err = sql.Open("sqlite",
		dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)",
	)
	if err != nil {
		return err
	}

	// 接続数制限（SQLiteは並行書き込みが苦手なので1に制限）
	DB.SetMaxOpenConns(1)

	if err := migrate(); err != nil {
		return err
	}

	// 起動時に整合性チェック（電源断後の破損を検出）
	if err := integrityCheck(); err != nil {
		return fmt.Errorf("DB integrity check failed: %w", err)
	}

	return nil
}

func Close() {
	if DB != nil {
		// 終了時に WAL をメインDBに統合してクリーンな状態で保存
		DB.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
		DB.Close()
	}
}

// integrityCheck はDB破損を検出する
func integrityCheck() error {
	row := DB.QueryRow("PRAGMA integrity_check")
	var result string
	if err := row.Scan(&result); err != nil {
		return err
	}
	if result != "ok" {
		log.Printf("[db] integrity check result: %s", result)
		return fmt.Errorf("integrity check: %s", result)
	}
	log.Println("[db] integrity check: ok")
	return nil
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

	// 既存DBへの安全なカラム追加
	for _, sql := range []string{
		`ALTER TABLE scenes ADD COLUMN weather     TEXT`,
		`ALTER TABLE scenes ADD COLUMN comp_angle  TEXT`,
		`ALTER TABLE scenes ADD COLUMN comp_layout TEXT`,
	} {
		DB.Exec(sql) // エラー無視（既存カラムの場合）
	}

	return nil
}
