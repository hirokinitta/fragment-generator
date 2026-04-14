package generator

import (
	"strings"
	"testing"
)

// ── Generate() の基本テスト ───────────────────────────────────────────────────

func TestGenerate_ReturnsNonEmptyFields(t *testing.T) {
	params := Params{Nostalgia: 50, Anxiety: 30, Unreality: 40}
	scene := Generate(params)

	checks := map[string]string{
		"Title":    scene.Title,
		"Scene":    scene.Scene,
		"Emotion":  scene.Emotion,
		"Location": scene.Environment.Location,
		"Time":     scene.Environment.Time,
		"Lighting": scene.Environment.Lighting,
		"Angle":    scene.Composition.Angle,
		"Layout":   scene.Composition.Layout,
		"Sound":    scene.Sound,
		"Color":    scene.Color,
	}
	for field, val := range checks {
		if strings.TrimSpace(val) == "" {
			t.Errorf("Generate(): %s is empty", field)
		}
	}
}

func TestGenerate_ParamsStoredCorrectly(t *testing.T) {
	p := Params{Nostalgia: 80, Anxiety: 20, Unreality: 60}
	s := Generate(p)
	if s.Nostalgia != 80 {
		t.Errorf("Nostalgia: want 80, got %d", s.Nostalgia)
	}
	if s.Anxiety != 20 {
		t.Errorf("Anxiety: want 20, got %d", s.Anxiety)
	}
	if s.Unreality != 60 {
		t.Errorf("Unreality: want 60, got %d", s.Unreality)
	}
}

func TestGenerate_TitleContainsLocation(t *testing.T) {
	for i := 0; i < 20; i++ {
		p := Params{Nostalgia: 50, Anxiety: 50, Unreality: 50}
		s := Generate(p)
		if s.Title == "" {
			t.Errorf("run %d: Title is empty", i)
		}
		if s.Environment.Location == "" {
			t.Errorf("run %d: Location is empty", i)
		}
	}
}

// ── Anomaly のしきい値テスト ──────────────────────────────────────────────────

func TestPickAnomaly_BelowThreshold_ReturnsEmpty(t *testing.T) {
	for i := 0; i < 50; i++ {
		result := pickAnomaly(10)
		if result != "" {
			t.Errorf("unreality=10: expected empty anomaly, got %q", result)
		}
	}
}

func TestPickAnomaly_HighUnreality_ReturnsNonEmpty(t *testing.T) {
	found := false
	for i := 0; i < 50; i++ {
		if pickAnomaly(100) != "" {
			found = true
			break
		}
	}
	if !found {
		t.Error("unreality=100: anomaly should appear, but never did")
	}
}

func TestPickAnomaly_NeverExceedsUnrealityLevel(t *testing.T) {
	for unreality := 0; unreality <= 100; unreality += 10 {
		for i := 0; i < 30; i++ {
			result := pickAnomaly(unreality)
			if result == "" {
				continue
			}
			// 返ってきたアノマリーのminUnrealがunreality以下か確認
			valid := false
			for _, a := range anomalies {
				if a.text == result && a.minUnreal <= unreality {
					valid = true
					break
				}
			}
			if !valid {
				t.Errorf("unreality=%d: anomaly %q violates threshold", unreality, result)
			}
		}
	}
}

// ── dominantMood テスト ───────────────────────────────────────────────────────

func TestDominantMood(t *testing.T) {
	cases := []struct {
		p    Params
		want string
	}{
		{Params{Nostalgia: 80, Anxiety: 20, Unreality: 10}, "nostalgia"},
		{Params{Nostalgia: 10, Anxiety: 90, Unreality: 20}, "anxiety"},
		{Params{Nostalgia: 50, Anxiety: 50, Unreality: 30}, "nostalgia"}, // 同値はnostalgia優先
		{Params{Nostalgia: 0, Anxiety: 0, Unreality: 0}, "nostalgia"},
	}
	for _, c := range cases {
		got := dominantMood(c.p)
		if got != c.want {
			t.Errorf("dominantMood(%+v) = %q, want %q", c.p, got, c.want)
		}
	}
}

// ── RandInt テスト ────────────────────────────────────────────────────────────

func TestRandInt_InRange(t *testing.T) {
	for i := 0; i < 1000; i++ {
		v := RandInt(0, 100)
		if v < 0 || v > 100 {
			t.Errorf("RandInt(0,100) = %d: out of range", v)
		}
	}
}

func TestRandInt_MinEqualsMax(t *testing.T) {
	for i := 0; i < 10; i++ {
		v := RandInt(42, 42)
		if v != 42 {
			t.Errorf("RandInt(42,42) = %d, want 42", v)
		}
	}
}

// ── pick テスト ───────────────────────────────────────────────────────────────

func TestPick_EmptySlice_ReturnsEmpty(t *testing.T) {
	result := pick([]string{})
	if result != "" {
		t.Errorf("pick([]): want empty, got %q", result)
	}
}

func TestPick_SingleElement_ReturnsThatElement(t *testing.T) {
	result := pick([]string{"only"})
	if result != "only" {
		t.Errorf("pick([only]): want \"only\", got %q", result)
	}
}

func TestPick_AlwaysFromSlice(t *testing.T) {
	s := []string{"a", "b", "c"}
	for i := 0; i < 100; i++ {
		v := pick(s)
		found := false
		for _, x := range s {
			if x == v {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("pick() returned %q which is not in the slice", v)
		}
	}
}

// ── Stress test: 大量生成でパニックしないか ───────────────────────────────────

func TestGenerate_Stress(t *testing.T) {
	for i := 0; i < 500; i++ {
		p := Params{
			Nostalgia: RandInt(0, 100),
			Anxiety:   RandInt(0, 100),
			Unreality: RandInt(0, 100),
		}
		scene := Generate(p)
		if scene.Title == "" || scene.Scene == "" {
			t.Errorf("stress run %d: got empty Title or Scene", i)
		}
	}
}
