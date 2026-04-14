package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fragment-generator/db"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	if err := db.Init(":memory:"); err != nil {
		t.Fatalf("db.Init failed: %v", err)
	}
	t.Cleanup(func() { db.Close() })
}

// ── /api/health ───────────────────────────────────────────────────────────────

func TestHealthEndpoint(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /api/health: want 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("status: want \"ok\", got %q", body["status"])
	}
}

// ── /api/generate ─────────────────────────────────────────────────────────────

func TestGenerateEndpoint_Random(t *testing.T) {
	setupTestDB(t)
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/generate", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /api/generate: want 200, got %d", w.Code)
	}

	var scene map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&scene); err != nil {
		t.Fatalf("decode error: %v", err)
	}

	requiredFields := []string{"title", "scene", "emotion", "anomaly", "sound", "color"}
	for _, f := range requiredFields {
		if _, ok := scene[f]; !ok {
			t.Errorf("response missing field: %s", f)
		}
	}
}

func TestGenerateEndpoint_WithParams(t *testing.T) {
	setupTestDB(t)
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/generate?nostalgia=80&anxiety=10&unreality=50", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("want 200, got %d", w.Code)
	}
}

func TestGenerateEndpoint_MethodNotAllowed(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodPost, "/api/generate", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST /api/generate: want 405, got %d", w.Code)
	}
}

// ── /api/scenes ───────────────────────────────────────────────────────────────

func TestScenesEndpoint_EmptyDB(t *testing.T) {
	setupTestDB(t)
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/scenes", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /api/scenes: want 200, got %d", w.Code)
	}

	body := strings.TrimSpace(w.Body.String())
	// 空配列 "null" か "[]" のどちらかを許容
	if body != "null" && body != "[]" && !strings.HasPrefix(body, "[") {
		t.Errorf("expected JSON array, got: %s", body)
	}
}

// ── /api/scenes/favorite ──────────────────────────────────────────────────────

func TestFavoriteEndpoint_MethodNotAllowed(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/scenes/favorite", nil)
	w   := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/scenes/favorite: want 405, got %d", w.Code)
	}
}

// ── clamp ─────────────────────────────────────────────────────────────────────

func TestClamp(t *testing.T) {
	cases := []struct{ v, min, max, want int }{
		{50, 0, 100, 50},
		{-10, 0, 100, 0},
		{150, 0, 100, 100},
		{0, 0, 100, 0},
		{100, 0, 100, 100},
	}
	for _, c := range cases {
		got := clamp(c.v, c.min, c.max)
		if got != c.want {
			t.Errorf("clamp(%d,%d,%d) = %d, want %d", c.v, c.min, c.max, got, c.want)
		}
	}
}
