package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"fragment-generator/db"
	"fragment-generator/generator"
)

func RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/generate",        handleGenerate)
	mux.HandleFunc("/api/scenes",          handleScenes)
	mux.HandleFunc("/api/scenes/favorite", handleFavorite)
	mux.HandleFunc("/api/scenes/drawn",    handleDrawn)
	mux.HandleFunc("/api/health",          handleHealth)
}

// GET /api/generate?nostalgia=50&anxiety=30&unreality=60
func handleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q          := r.URL.Query()
	nostalgia, _ := strconv.Atoi(q.Get("nostalgia"))
	anxiety,   _ := strconv.Atoi(q.Get("anxiety"))
	unreality, _ := strconv.Atoi(q.Get("unreality"))

	// すべて0 → ランダム生成
	if nostalgia == 0 && anxiety == 0 && unreality == 0 {
		nostalgia = generator.RandInt(0, 100)
		anxiety   = generator.RandInt(0, 100)
		unreality = generator.RandInt(0, 100)
	}

	params := generator.Params{
		Nostalgia: clamp(nostalgia, 0, 100),
		Anxiety:   clamp(anxiety,   0, 100),
		Unreality: clamp(unreality, 0, 100),
	}

	scene := generator.Generate(params)

	id, err := saveScene(scene, params)
	if err == nil {
		scene.ID = id
	}

	writeJSON(w, scene)
}

// GET /api/scenes?limit=20&offset=0&favorite=1
func handleScenes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q           := r.URL.Query()
	limit,    _  := strconv.Atoi(q.Get("limit"))
	offset,   _  := strconv.Atoi(q.Get("offset"))
	favoriteOnly := q.Get("favorite") == "1"

	if limit == 0 {
		limit = 20
	}

	query := `SELECT id, title, scene, emotion,
	           location, time, lighting, weather,
	           comp_angle, comp_layout,
	           anomaly, sound, color,
	           nostalgia, anxiety, unreality,
	           is_favorite, is_drawn, created_at
	          FROM scenes`
	if favoriteOnly {
		query += ` WHERE is_favorite = 1`
	}
	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`

	rows, err := db.DB.Query(query, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	scenes := []generator.Scene{}
	for rows.Next() {
		var s generator.Scene
		rows.Scan(
			&s.ID, &s.Title, &s.Scene, &s.Emotion,
			&s.Environment.Location, &s.Environment.Time,
			&s.Environment.Lighting, &s.Environment.Weather,
			&s.Composition.Angle, &s.Composition.Layout,
			&s.Anomaly, &s.Sound, &s.Color,
			&s.Nostalgia, &s.Anxiety, &s.Unreality,
			&s.IsFavorite, &s.IsDrawn, &s.CreatedAt,
		)
		scenes = append(scenes, s)
	}
	writeJSON(w, scenes)
}

// POST /api/scenes/favorite  body: {"id": 1, "value": true}
func handleFavorite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		ID    int  `json:"id"`
		Value bool `json:"value"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	db.DB.Exec(`UPDATE scenes SET is_favorite = ? WHERE id = ?`, body.Value, body.ID)
	writeJSON(w, map[string]bool{"ok": true})
}

// POST /api/scenes/drawn  body: {"id": 1, "value": true}
func handleDrawn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		ID    int  `json:"id"`
		Value bool `json:"value"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	db.DB.Exec(`UPDATE scenes SET is_drawn = ? WHERE id = ?`, body.Value, body.ID)
	writeJSON(w, map[string]bool{"ok": true})
}

// GET /api/health
func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]string{"status": "ok"})
}

// ── helpers ──────────────────────────────────────────────────────────────────

func saveScene(s generator.Scene, p generator.Params) (int64, error) {
	res, err := db.DB.Exec(`
		INSERT INTO scenes (
			title, scene, emotion,
			location, time, lighting, weather,
			comp_angle, comp_layout,
			anomaly, sound, color,
			nostalgia, anxiety, unreality
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.Title, s.Scene, s.Emotion,
		s.Environment.Location, s.Environment.Time,
		s.Environment.Lighting, s.Environment.Weather,
		s.Composition.Angle, s.Composition.Layout,
		s.Anomaly, s.Sound, s.Color,
		p.Nostalgia, p.Anxiety, p.Unreality,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func clamp(v, min, max int) int {
	if v < min { return min }
	if v > max { return max }
	return v
}
