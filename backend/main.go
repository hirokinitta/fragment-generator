package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

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

	handler := corsMiddleware(mux)

	addr := fmt.Sprintf("127.0.0.1:%s", port)
	log.Printf("Fragment Generator backend listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
