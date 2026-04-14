import styles from './CompositionDiagram.module.css'

interface Props {
  angle:  string
  layout: string
}

// アングル設定：カメラ位置・視野の向き・背景パターン
const ANGLE_CONFIG: Record<string, {
  camX: number
  camY: number
  fovDir: number   // 視野扇形の向き（度、0=右、90=下、270=上）
  label: string
  bg: 'down' | 'up' | 'flat' | 'side'
}> = {
  '俯瞰':               { camX:50, camY:10, fovDir:90,  label:'↓ 俯瞰',     bg:'down' },
  '見上げ':             { camX:50, camY:90, fovDir:270, label:'↑ 見上げ',   bg:'up'   },
  '水平':               { camX:10, camY:50, fovDir:0,   label:'→ 水平',     bg:'flat' },
  '斜め45度':           { camX:15, camY:15, fovDir:45,  label:'↘ 45°斜め', bg:'down' },
  '真横':               { camX:10, camY:50, fovDir:0,   label:'→ 真横',     bg:'side' },
  '極端な俯瞰（真上）': { camX:50, camY:5,  fovDir:90,  label:'⊙ 真上',     bg:'down' },
  '低いアングル':       { camX:50, camY:92, fovDir:270, label:'↑ ロー',     bg:'up'   },
}

// レイアウト設定：被写体の位置とサイズ
const LAYOUT_CONFIG: Record<string, {
  sx: number
  sy: number
  scale: number
  label: string
}> = {
  '中央配置':         { sx:50, sy:55, scale:1.0,  label:'中央' },
  '左寄り':           { sx:25, sy:55, scale:1.0,  label:'左寄り' },
  '右寄り':           { sx:75, sy:55, scale:1.0,  label:'右寄り' },
  '対角線上':         { sx:70, sy:30, scale:0.8,  label:'対角線' },
  '三分割の交点':     { sx:33, sy:40, scale:0.85, label:'三分割' },
  '極端に小さく遠い': { sx:50, sy:38, scale:0.38, label:'遠景' },
  '画面端ぎりぎり':   { sx:87, sy:55, scale:1.0,  label:'端' },
}

// 人物シルエット：頭＋上半身＋腕のシルエット
function Figure({ cx, cy, scale = 1.0, color = 'var(--accent2)' }: {
  cx: number; cy: number; scale?: number; color?: string
}) {
  const headR  = 7   * scale
  const neckH  = 3   * scale
  const bodyW  = 11  * scale
  const bodyH  = 18  * scale
  const shoulderY = cy - bodyH * 0.7
  // 影（地面）
  const shadowRx = bodyW * 0.7
  const shadowRy = 2.5 * scale

  return (
    <g>
      {/* 地面の影 */}
      <ellipse
        cx={cx} cy={cy + 1}
        rx={shadowRx} ry={shadowRy}
        fill="rgba(0,0,0,0.3)"
      />
      {/* 胴体（台形っぽく） */}
      <path
        d={`M ${cx - bodyW*0.4} ${cy}
            L ${cx - bodyW*0.5} ${shoulderY}
            L ${cx + bodyW*0.5} ${shoulderY}
            L ${cx + bodyW*0.4} ${cy} Z`}
        fill={color}
        opacity="0.9"
      />
      {/* 首 */}
      <rect
        x={cx - 2.5 * scale}
        y={shoulderY - neckH}
        width={5 * scale}
        height={neckH}
        fill={color}
        opacity="0.9"
      />
      {/* 頭 */}
      <circle
        cx={cx}
        cy={shoulderY - neckH - headR}
        r={headR}
        fill={color}
        opacity="0.95"
      />
    </g>
  )
}

// カメラアイコン：本体＋レンズ＋グリップ
function Camera({ cx, cy, size = 1.0 }: { cx: number; cy: number; size?: number }) {
  const w = 12 * size
  const h = 8  * size
  return (
    <g>
      {/* 本体 */}
      <rect
        x={cx - w/2} y={cy - h/2}
        width={w} height={h} rx={2 * size}
        fill="var(--bg-panel)"
        stroke="var(--accent)"
        strokeWidth={1.2 * size}
      />
      {/* レンズ外円 */}
      <circle cx={cx} cy={cy} r={3 * size}
        fill="var(--bg)" stroke="var(--accent)" strokeWidth={1 * size} />
      {/* レンズ内円 */}
      <circle cx={cx} cy={cy} r={1.5 * size} fill="var(--accent)" opacity="0.8" />
      {/* グリップ（上の出っ張り） */}
      <rect
        x={cx + w*0.1} y={cy - h/2 - 3 * size}
        width={w * 0.3} height={3 * size} rx={1}
        fill="var(--accent)" opacity="0.7"
      />
    </g>
  )
}

// 視野角の扇形
function Fov({ camX, camY, toX, toY }: {
  camX: number; camY: number; toX: number; toY: number
}) {
  const dx   = toX - camX
  const dy   = toY - camY
  const dist = Math.sqrt(dx*dx + dy*dy)
  if (dist < 2) return null

  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const spread = 22  // 扇形の半角（度）
  const r = dist * 1.1

  const a1 = (angle - spread) * (Math.PI / 180)
  const a2 = (angle + spread) * (Math.PI / 180)

  const x1 = camX + r * Math.cos(a1)
  const y1 = camY + r * Math.sin(a1)
  const x2 = camX + r * Math.cos(a2)
  const y2 = camY + r * Math.sin(a2)

  return (
    <path
      d={`M ${camX} ${camY} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
      fill="var(--accent)"
      opacity="0.08"
    />
  )
}

// 背景のパースライン
function BgLines({ type }: { type: string }) {
  const color = 'var(--accent3)'
  const op    = 0.15

  if (type === 'down') return (
    <g stroke={color} strokeWidth="0.5" opacity={op}>
      {[15, 30, 50, 70, 85].map(x => (
        <line key={x} x1={x} y1="0" x2="50" y2="100" />
      ))}
    </g>
  )
  if (type === 'up') return (
    <g stroke={color} strokeWidth="0.5" opacity={op}>
      {[15, 30, 50, 70, 85].map(x => (
        <line key={x} x1={x} y1="100" x2="50" y2="0" />
      ))}
    </g>
  )
  if (type === 'flat') return (
    <g stroke={color} strokeWidth="0.5" opacity={op}>
      <line x1="0" y1="50" x2="100" y2="50" />
      {[0, 25, 75, 100].map(y => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} strokeDasharray="2 4" />
      ))}
    </g>
  )
  return (
    <g stroke={color} strokeWidth="0.5" opacity={op}>
      {[20, 40, 60, 80].map(y => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} />
      ))}
    </g>
  )
}

export default function CompositionDiagram({ angle, layout }: Props) {
  const cam  = ANGLE_CONFIG[angle]   ?? ANGLE_CONFIG['水平']
  const subj = LAYOUT_CONFIG[layout] ?? LAYOUT_CONFIG['中央配置']

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>// COMPOSITION</span>

      <svg
        viewBox="0 0 100 100"
        className={styles.svg}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        {/* 背景 */}
        <rect x="0" y="0" width="100" height="100" fill="var(--bg)" />

        {/* パースライン */}
        <BgLines type={cam.bg} />

        {/* 三分割グリッド（薄め） */}
        {[33, 66].map(v => (
          <g key={v}>
            <line x1={v} y1="2"  x2={v} y2="98"
              stroke="var(--border-dim)" strokeWidth="0.3" strokeDasharray="2 4" />
            <line x1="2"  y1={v} x2="98" y2={v}
              stroke="var(--border-dim)" strokeWidth="0.3" strokeDasharray="2 4" />
          </g>
        ))}

        {/* フレーム */}
        <rect x="1" y="1" width="98" height="98" rx="2"
          fill="none" stroke="var(--border)" strokeWidth="0.8" />

        {/* 視野角の扇形 */}
        <Fov
          camX={cam.camX} camY={cam.camY}
          toX={subj.sx}   toY={subj.sy}
        />

        {/* カメラ→被写体の視線（破線） */}
        <line
          x1={cam.camX} y1={cam.camY}
          x2={subj.sx}  y2={subj.sy}
          stroke="var(--accent)"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          opacity="0.7"
        />

        {/* 被写体（人物シルエット） */}
        <Figure cx={subj.sx} cy={subj.sy} scale={subj.scale} />

        {/* カメラ */}
        <Camera cx={cam.camX} cy={cam.camY} size={0.9} />

        {/* カメララベル */}
        <text
          x={cam.camX}
          y={cam.camY > 50 ? cam.camY - 12 : cam.camY + 14}
          textAnchor="middle"
          fontSize="6"
          fill="var(--accent)"
          fontFamily="'Share Tech Mono', monospace"
          fontWeight="500"
        >{cam.label}</text>

        {/* レイアウトラベル（被写体と重ならない位置に） */}
        <text
          x={subj.sx}
          y={Math.min(subj.sy + 24 * subj.scale + 4, 96)}
          textAnchor={subj.sx > 72 ? 'end' : subj.sx < 28 ? 'start' : 'middle'}
          fontSize="5"
          fill="var(--text-dim)"
          fontFamily="'Share Tech Mono', monospace"
        >{subj.label}</text>

      </svg>

      {/* テキスト補足 */}
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>ANGLE</span>
          <span className={styles.metaVal}>{angle}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaKey}>LAYOUT</span>
          <span className={styles.metaVal}>{layout}</span>
        </div>
      </div>
    </div>
  )
}
