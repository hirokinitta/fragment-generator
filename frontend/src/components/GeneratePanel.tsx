import { useState } from 'react'
import styles from './GeneratePanel.module.css'

interface Props {
  onGenerate: (params: { nostalgia: number; anxiety: number; unreality: number }) => void
  isGenerating: boolean
}

export default function GeneratePanel({ onGenerate, isGenerating }: Props) {
  const [nostalgia, setNostalgia] = useState(50)
  const [anxiety,   setAnxiety]   = useState(50)
  const [unreality, setUnreality] = useState(50)
  const [isRandom,  setIsRandom]  = useState(true)

  const handleGenerate = () => {
    if (isRandom) {
      onGenerate({ nostalgia: 0, anxiety: 0, unreality: 0 }) // 0 = ランダム
    } else {
      onGenerate({ nostalgia, anxiety, unreality })
    }
  }

  return (
    <div className={styles.panel}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <span className={styles.sysLabel}>SYS://GENERATOR</span>
      </div>

      {/* メイン生成ボタン */}
      <button
        className={`${styles.generateBtn} ${isGenerating ? styles.generating : ''}`}
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <span className={styles.loadingText}>GENERATING<span className="cursor" /></span>
        ) : (
          <span>[ GENERATE ]</span>
        )}
      </button>

      <div className={styles.divider} />

      {/* ランダム/マニュアル切り替え */}
      <div className={styles.modeRow}>
        <button
          className={`${styles.modeBtn} ${isRandom ? styles.modeBtnActive : ''}`}
          onClick={() => setIsRandom(true)}
        >
          RANDOM
        </button>
        <button
          className={`${styles.modeBtn} ${!isRandom ? styles.modeBtnActive : ''}`}
          onClick={() => setIsRandom(false)}
        >
          MANUAL
        </button>
      </div>

      {/* スライダー（マニュアル時のみ操作可能） */}
      <div className={`${styles.sliders} ${isRandom ? styles.slidersDisabled : ''}`}>
        <Slider label="NOSTALGIA" value={nostalgia} onChange={setNostalgia} color="#7b6fff" disabled={isRandom} />
        <Slider label="ANXIETY"   value={anxiety}   onChange={setAnxiety}   color="#ff6fd8" disabled={isRandom} />
        <Slider label="UNREALITY" value={unreality} onChange={setUnreality} color="#6fffd4" disabled={isRandom} />
      </div>

      {/* ステータス */}
      <div className={styles.status}>
        <span className={styles.statusDot} />
        <span className={styles.statusText}>READY</span>
      </div>
    </div>
  )
}

// ── スライダーコンポーネント ──────────────────────────────

interface SliderProps {
  label:    string
  value:    number
  onChange: (v: number) => void
  color:    string
  disabled: boolean
}

function Slider({ label, value, onChange, color, disabled }: SliderProps) {
  return (
    <div className={`${styles.sliderRow} ${disabled ? styles.sliderRowDisabled : ''}`}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue} style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className={styles.sliderInput}
        style={{ '--thumb-color': color } as React.CSSProperties}
      />
    </div>
  )
}
