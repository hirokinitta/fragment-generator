package generator

import (
	"fmt"
	"math/rand"
	"time"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// ── 型定義 ───────────────────────────────────────────────────────────────────

type Scene struct {
	ID          int64       `json:"id,omitempty"`
	Title       string      `json:"title"`
	Scene       string      `json:"scene"`
	Emotion     string      `json:"emotion"`
	Environment Environment `json:"environment"`
	Composition Composition `json:"composition"`
	Anomaly     string      `json:"anomaly"`
	Sound       string      `json:"sound"`
	Color       string      `json:"color"`
	Nostalgia   int         `json:"nostalgia"`
	Anxiety     int         `json:"anxiety"`
	Unreality   int         `json:"unreality"`
	IsFavorite  bool        `json:"is_favorite"`
	IsDrawn     bool        `json:"is_drawn"`
	CreatedAt   string      `json:"created_at,omitempty"`
}

type Environment struct {
	Location string `json:"location"`
	Time     string `json:"time"`
	Lighting string `json:"lighting"`
	Weather  string `json:"weather"`
}

type Composition struct {
	Angle  string `json:"angle"`
	Layout string `json:"layout"`
}

type Params struct {
	Nostalgia int // 0〜100
	Anxiety   int // 0〜100
	Unreality int // 0〜100
}

// ── 場所辞書 ─────────────────────────────────────────────────────────────────

var locationsByMood = map[string][]string{

	// 懐かしさ寄り ─────────────────────────────────────────────────────────────
	"nostalgia": {
		// 教育施設
		"廃校の体育館",
		"夏休みの終わりの教室",
		"誰もいない図書室",
		"放課後の音楽室",
		"閉鎖されたプール",
		"古い木造校舎の廊下",
		"理科室の薄暗い棚の前",
		"埃が舞う社会科準備室",
		"視聴覚室",
		// 住宅・生活
		"夕暮れの団地",
		"昔の家の縁側",
		"取り壊し直前の実家",
		"誰も住まなくなった家",
		"祖父母の家の押し入れの前",
		"錆びた滑り台のある公園",
		"田んぼのあぜ道",
		"廃れたニュータウンの一角",
		// 商業施設（旧）
		"閉店したゲームセンター",
		"シャッターの降りた商店街",
		"廃業したホテルのロビー",
		"古い映画館のロビー",
		"使われなくなった公衆電話ボックス",
		"廃線になった駅のホーム",
		"錆びたアーケードの下",
		"誰もいないショッピングモールの広間",
		"深夜のSA",
		"老舗の駄菓子屋",
		"無人駅",
	},

	// 不安寄り ──────────────────────────────────────────────────────────────
	"anxiety": {
		// 閉塞空間
		"どこにも繋がらない廊下",
		"鏡張りのエレベーター",
		"天井が異常に高い部屋",
		"出口のないデパート",
		"窓のない待合室",
		"螺旋状に続く階段",
		"鍵のかかった扉が並ぶ通路",
		"遠近法が狂いそうな部屋",
		// 医療・施設
		"深夜の病院の待合室",
		"非常灯だけが点く地下駐車場",
		"廃病院の手術室",
		"無人の介護施設",
		"消毒液の匂いがする廊下",
		"延々と薬の棚が並ぶ部屋",
		// 無機質な場所
		"業務用エレベーターの内部",
		"サーバールームの片隅",
		"配管だらけの地下通路",
		"監視カメラだらけの廊下",
		"白い壁が続くだけの部屋",
		"核シェルターの中",
	},

	// どちらでもない（liminal）────────────────────────────────────────────────
	"neutral": {
		// ショッピング系
		"閉店後のショッピングモール",
		"深夜のコンビニ",
		"早朝のスーパーの青果コーナー",
		"閉店したファミレスのボックス席",
		"無人のフードコート",
		"誰もいないゲームセンター（営業中）",
		// 交通系
		"早朝の高速道路",
		"最終電車が去った後のホーム",
		"誰もいない空港の搭乗口",
		"回転が止まったカルーセル",
		"夜の駐車場",
		"霧の中の高速道路",
		// 屋外
		"霧の中の住宅街",
		"雨上がりの団地の中庭",
		"人気のない遊園地",
		"台風後の海岸",
		"誰も泳いでいないプールサイド",
		"芝生だけが広がるグラウンド",
		"何もなく延々と続く浜辺",
		// 複合
		"深夜のビジネスホテルの廊下",
		"無人のオフィスビルの受付",
		"閉館後の美術館",
		"誰もいないカラオケボックスの廊下",
		"誰もいない大ホール",
		"カプセルホテルの廊下",
		"人のいないランドリー",
	},
}

// ── 被写体 ───────────────────────────────────────────────────────────────────

var subjectsByMood = map[string][]string{
	"nostalgia": {
		"制服姿の少女",
		"ランドセルを背負った子ども",
		"老人",
		"昔の自分のような人影",
		"小学生くらいの子ども",
		"中年の男性",
		"黒づくめの女性",
	},
	"anxiety": {
		"後ろ姿だけの人物",
		"顔が見えない誰か",
		"複数いるはずなのに一人だけ残っている人",
		"動かない人影",
	},
	"neutral": {
		"少女",
		"少年",
		"誰か",
		"人影",
		"自分自身",
		"後ろ姿の人物",
		"立ち尽くしている人",
		"床に座り込んでいる誰か",
	},
}

// ── アノマリー（違和感）──────────────────────────────────────────────────────

var anomalies = []struct {
	text      string
	minUnreal int
}{
	// 低〜中（非現実度 15〜40）
	{"床に薄く水が張っている", 15},
	{"照明がゆっくりと点滅している", 20},
	{"時計がすべて同じ時刻を指している", 25},
	{"扉がすべて少しだけ開いている", 25},
	{"椅子がすべて同じ方向を向いている", 30},
	{"落ちているはずのゴミが一切ない", 30},
	{"窓の外が真っ白で何も見えない", 35},
	{"足音が自分のものではない音を立てる", 35},
	{"影が逆方向を向いている", 40},
	{"自分の声が少し遅れて聞こえる", 40},
	// 中（非現実度 45〜60）
	{"同じドアが何度も現れる", 45},
	{"振り返ると誰かが立っているが、また振り返ると消えている", 50},
	{"空が動いていない", 50},
	{"廊下が来たときより長くなっている", 50},
	{"すべての文字が読めない言語になっている", 55},
	{"壁に古い落書きが増えている", 55},
	{"鏡が自分より一瞬遅れて動く", 55},
	{"天井に足跡がある", 55},
	{"出口の扉を開けると同じ部屋に戻る", 60},
	{"遠くにもう一人の自分が立っている", 60},
	{"自分の影がない", 60},
	// 高（非現実度 65〜）
	{"自分の姿が鏡に映っていない", 65},
	{"蜃気楼のように空間が揺らぐ", 65},
	{"床が透明で、下に同じ部屋が続いている", 70},
	{"電話が鳴り続けているが受話器は置かれている", 70},
	{"部屋が少しずつ縮んでいる気がする", 75},
	{"自分以外の時間が止まっている", 80},
	{"来た道が消えている", 80},
	{"空に太陽が二つある", 85},
	{"壁の向こうから呼ばれている気がするが、壁はない", 90},
}

// ── 感情 ─────────────────────────────────────────────────────────────────────

var emotions = []string{
	// 穏やか系
	"穏やかだが少し不安",
	"懐かしいのに悲しい",
	"温かいが、戻れないとわかっている",
	"静かな幸福と微かな後悔",
	// 遠さ・解離
	"すべてが遠い",
	"ここにいるのに存在していない感覚",
	"誰かを待っているような",
	"終わりを知っているような",
	"夢の中にいるようなのに夢ではない",
	// 不安・緊張
	"怖いわけではないが何かがおかしい",
	"危険はないが逃げ出したい",
	"何かを忘れているような焦り",
	"静かなのに息苦しい",
	// 喪失
	"もう取り戻せないとわかっている",
	"ここに来たことがあるが、いつかは思い出せない",
	"誰かがいたはずの気配だけが残っている",
	"終わりと始まりの境界にいる感覚",
}

// ── 時間 ─────────────────────────────────────────────────────────────────────

var times = []string{
	"深夜", "夜明け前", "夕暮れ", "真昼", "日没直後",
	"時間が不明", "午前三時", "夕方の四時",
	"太陽が沈みかけている", "夜と朝の境目",
}

// ── 照明 ─────────────────────────────────────────────────────────────────────

var lightings = []string{
	"強い蛍光灯", "非常灯のみ", "斜めに差し込む夕光",
	"均一で影のない白い光", "点滅する照明",
	"一本だけ切れたままの蛍光灯", "外からの光が一切ない",
	"窓から差す白み切った光", "黄ばんだ電球一つ",
	"光源がどこにあるかわからない全体的な明るさ",
}

// ── 天気・環境 ────────────────────────────────────────────────────────────────

var weathers = []string{
	"無音の曇天", "雨上がり", "霧",
	"快晴なのに暑くない", "外の天気が見えない",
	"風だけが吹いている", "小雨", "濃い靄",
	"晴れているのに全体が薄暗い",
}

// ── 音 ───────────────────────────────────────────────────────────────────────

var sounds = []string{
	// 機械・設備
	"遠くで空調が唸っている",
	"蛍光灯が微かに鳴っている",
	"どこかでエスカレーターが動き続けている",
	"自動ドアが何度も開閉している",
	"遠くでコピー機が動いている",
	"古い冷蔵庫のモーター音",
	"どこかのラジオが小さく流れている",
	"蒸気機関の音がする",
	// 人の気配
	"誰かのヒールの音が近づいては消える",
	"笑い声がしたが、誰もいない",
	"子どもの声がしたが、どこからかわからない",
	"誰かが電話で話している声が漏れてくる",
	// 自然・雨
	"雨音だけが異常に近い",
	"風が窓を揺らしている",
	"遠くで雷が鳴っている",
	"聞き覚えのない鳥のさえずりが聞こえる",
	// 静寂系
	"自分の呼吸だけが聞こえる",
	"足音が響きすぎる",
	"何かが転がる音がしたが、何もない",
	"古いテレビのホワイトノイズ",
	// 奇妙な音
	"遠くで電話が鳴り続けている",
	"何かが壁を叩いているが、一定のリズムではない",
	"音楽が流れているが、曲名が思い出せない",
	"自分が来た方向から、自分と同じ足音が聞こえる",
}

// ── カラーパレット ────────────────────────────────────────────────────────────

var colorPalettes = []struct {
	name    string
	desc    string
}{
	{"青寄りの灰色", "冷たく、記憶が薄れていくような色"},
	{"黄ばんだ白", "時間が止まったような古い色"},
	{"くすんだ緑", "かつて生き生きとしていた何かの残り"},
	{"灰色がかった紫", "夢と現実の境界の色"},
	{"脱色された全体", "色が抜けて、何もかもが等しくなった"},
	{"セピア", "記憶の中の写真のような"},
	{"暗い橙", "夕暮れが永遠に続いているような"},
	{"冷たい白", "生命の気配がない清潔さ"},
	{"深い青", "深夜の水面のような"},
	{"錆色", "朽ちかけているものの美しさ"},
}

// ── 構図 ─────────────────────────────────────────────────────────────────────

var angles = []string{
	"俯瞰", "見上げ", "水平", "斜め45度", "真横",
	"極端な俯瞰（真上）", "低いアングル",
}

var layouts = []string{
	"中央配置", "左寄り", "右寄り", "対角線上",
	"三分割の交点", "極端に小さく遠い", "画面端ぎりぎり",
}

// ── タイトルテンプレート ──────────────────────────────────────────────────────

var titleTemplatesByMood = map[string][]string{
	"nostalgia": {
		"誰もいない%s",
		"忘れていた%s",
		"%sの夢を何度も見る",
		"%s、あの夏の終わり",
		"もう戻れない%s",
		"記憶の中の%s",
		"最後に見た%s",
		"%sにいた誰か",
		"あのころの%s",
	},
	"anxiety": {
		"%sからの出口",
		"%s、誰かがいた痕跡",
		"抜け出せない%s",
		"%sの向こうに何かいる",
		"終わらない%s",
		"%sで何かを待っている",
		"逃げられない%s",
		"%s、何かが違う",
	},
	"neutral": {
		"%sの、終わらない夜",
		"%s、光が強すぎる",
		"%sで待っている",
		"静かすぎる%s",
		"%sの午前三時",
		"誰かが去った%s",
		"%s、ここではないどこか",
		"閉じた後の%s",
		"%sという名前の場所",
	},
}

// ── シーン本文テンプレート ────────────────────────────────────────────────────

var sceneTemplates = []string{
	"%sの中央に%sがいる",
	"%sの片隅に%sが座っている",
	"%sで%sが何かを待っている",
	"%sを%sが歩いている、どこへ向かうのかはわからない",
	"%sの奥に%sの後ろ姿が見える",
	"%sの入り口付近に%sが立っている",
	"%sの床に%sが座り込んでいる",
}

// ── 生成ロジック ─────────────────────────────────────────────────────────────

func Generate(p Params) Scene {
	mood     := dominantMood(p)
	location := pickLocation(p)
	subject  := pickSubject(mood)
	anomaly  := pickAnomaly(p.Unreality)
	palette  := colorPalettes[rand.Intn(len(colorPalettes))]

	return Scene{
		Title:   buildTitle(location, mood, p),
		Scene:   buildScene(location, subject, anomaly),
		Emotion: pickEmotion(p),
		Environment: Environment{
			Location: location,
			Time:     pick(times),
			Lighting: pick(lightings),
			Weather:  pick(weathers),
		},
		Composition: Composition{
			Angle:  pick(angles),
			Layout: pick(layouts),
		},
		Anomaly:   anomaly,
		Sound:     pick(sounds),
		Color:     palette.name,
		Nostalgia: p.Nostalgia,
		Anxiety:   p.Anxiety,
		Unreality: p.Unreality,
	}
}

// dominantMood: 3パラメータの中から支配的なムードを返す
func dominantMood(p Params) string {
	if p.Nostalgia >= p.Anxiety && p.Nostalgia >= p.Unreality {
		return "nostalgia"
	}
	if p.Anxiety >= p.Nostalgia {
		return "anxiety"
	}
	return "neutral"
}

func pickLocation(p Params) string {
	pool := []string{}
	nw := p.Nostalgia/25 + 1
	aw := p.Anxiety/25 + 1
	for i := 0; i < nw; i++ {
		pool = append(pool, locationsByMood["nostalgia"]...)
	}
	for i := 0; i < aw; i++ {
		pool = append(pool, locationsByMood["anxiety"]...)
	}
	pool = append(pool, locationsByMood["neutral"]...)
	return pick(pool)
}

func pickSubject(mood string) string {
	// まずムード辞書、なければneutral
	pool := subjectsByMood[mood]
	if len(pool) == 0 {
		pool = subjectsByMood["neutral"]
	}
	// neutralもマージして混ぜる
	pool = append(pool, subjectsByMood["neutral"]...)
	return pick(pool)
}

func pickAnomaly(unreality int) string {
	if unreality < 15 {
		return ""
	}
	var available []string
	for _, a := range anomalies {
		if unreality >= a.minUnreal {
			available = append(available, a.text)
		}
	}
	if len(available) == 0 {
		return ""
	}
	return pick(available)
}

func pickEmotion(p Params) string {
	// 感情も重み付き抽選にできるが、今はシンプルにランダム
	// 将来: 懐かしさ高→喪失系、不安高→緊張系を重くする
	return pick(emotions)
}

func buildTitle(location, mood string, p Params) string {
	templates := titleTemplatesByMood[mood]
	if len(templates) == 0 {
		templates = titleTemplatesByMood["neutral"]
	}
	// 全テンプレートから抽選（ムード混合も自然に起きる）
	if rand.Intn(3) == 0 {
		// 1/3の確率で別ムードのテンプレートを混ぜて意外性を出す
		allTemplates := []string{}
		for _, ts := range titleTemplatesByMood {
			allTemplates = append(allTemplates, ts...)
		}
		templates = allTemplates
	}
	return fmt.Sprintf(pick(templates), location)
}

func buildScene(location, subject, anomaly string) string {
	tmpl := pick(sceneTemplates)
	base := fmt.Sprintf(tmpl, location, subject)
	if anomaly != "" {
		return base + "。" + anomaly + "。"
	}
	return base + "。"
}

// ── ユーティリティ ───────────────────────────────────────────────────────────

func pick(s []string) string {
	if len(s) == 0 {
		return ""
	}
	return s[rand.Intn(len(s))]
}

func RandInt(min, max int) int {
	return min + rand.Intn(max-min+1)
}
