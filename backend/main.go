package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"fragment-generator/api"
	"fragment-generator/db"
)

func main() {
	port := os.Getenv("FRAGMENT_PORT")
	if port == "" {
		port = "8765"
	}
	dbPath := os.Getenv("FRAGMENT_DB")
	if dbPath == "" {
		dbPath = "./fragments.db"
	}

	if err := db.Init(dbPath); err != nil {
		log.Fatalf("DB init error: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	api.RegisterRoutes(mux)

	// ミドルウェアを重ねる
	handler := securityMiddleware(corsMiddleware(mux))

	// タイムアウト設定（ハングアップ防止）
	srv := &http.Server{
		Addr:         fmt.Sprintf("127.0.0.1:%s", port),
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Fragment Generator backend listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// corsMiddleware：127.0.0.1からのアクセスのみ許可
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// 許可するオリジン（開発時のNext.jsとElectronのローカルサーバー）
		allowed := map[string]bool{
			"http://localhost:3000":       true,
			"http://127.0.0.1:3000":      true,
			"http://127.0.0.1:8766":      true,
		}
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// securityMiddleware：セキュリティヘッダーの付与とアクセス制限
func securityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ローカルからのリクエストのみ受け付ける
		// （127.0.0.1バインドで既に制限しているが念のため）
		host := r.Host
		if host != fmt.Sprintf("127.0.0.1:%s", getPort()) &&
			host != fmt.Sprintf("localhost:%s", getPort()) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		// セキュリティヘッダー
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Cache-Control", "no-store")

		// リクエストボディのサイズ制限（1MB）→ 大量データ送信攻撃を防ぐ
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

		next.ServeHTTP(w, r)
	})
}

func getPort() string {
	p := os.Getenv("FRAGMENT_PORT")
	if p == "" {
		return "8765"
	}
	return p
}
