import { useState, useRef } from 'react'
import type { Scene } from '../lib/api'
import styles from './MixMode.module.css'

interface Props {
  scenes: Scene[]
  getDraggingScene?: () => Scene | null
}

// シーン破綻チェック：場所と時間の組み合わせが矛盾しないか
function checkCompatibility(a: Scene, b: Scene): string[] {
  const warnings: string[] = []
  // 例: 両方が全く同じ場所だと意味がない
  if (a.environment?.location === b.environment?.location) {
    warnings.push('同じ場所が重複しています')
  }
  return warnings
}

// シーンから表示用サマリを生成
function sceneSummary(s: Scene): string {
  return `${s.environment?.location ?? '?'} / ${s.environment?.time ?? '?'}`
}

type SlotKey = 'title' | 'location' | 'time' | 'lighting' | 'emotion' | 'anomaly' | 'sound' | 'color'

interface SlotDef {
  key:   SlotKey
  label: string
  get:   (s: Scene) => string
}

const SLOTS: SlotDef[] = [
  { key:'title',    label:'TITLE',    get: s => s.title ?? '' },
  { key:'location', label:'LOCATION', get: s => s.environment?.location ?? '' },
  { key:'time',     label:'TIME',     get: s => s.environment?.time ?? '' },
  { key:'lighting', label:'LIGHTING', get: s => s.environment?.lighting ?? '' },
  { key:'emotion',  label:'EMOTION',  get: s => s.emotion ?? '' },
  { key:'anomaly',  label:'ANOMALY',  get: s => s.anomaly ?? '' },
  { key:'sound',    label:'SOUND',    get: s => s.sound ?? '' },
  { key:'color',    label:'COLOR',    get: s => s.color ?? '' },
]

export default function MixMode({ scenes, getDraggingScene }: Props) {
  const [slotA,     setSlotA]     = useState<Scene | null>(null)
  const [slotB,     setSlotB]     = useState<Scene | null>(null)
  const [selected,  setSelected]  = useState<Record<SlotKey, 'A' | 'B'>>(
    Object.fromEntries(SLOTS.map(s => [s.key, 'A'])) as Record<SlotKey, 'A' | 'B'>
  )
  const [copied, setCopied] = useState(false)
  const dragScene = useRef<Scene | null>(null)

  if (scenes.length < 2) {
    return (
      <div className={styles.empty}>
        シーンを2つ以上生成すると<br />MIXモードが使えます
      </div>
    )
  }

  const warnings = slotA && slotB ? checkCompatibility(slotA, slotB) : []

  const onDragStart = (scene: Scene) => {
    dragScene.current = scene
  }

  const onDropA = (e: React.DragEvent) => {
    e.preventDefault()
    // 内部リストからのドラッグ
    const s = dragScene.current ?? getDraggingScene?.()
    if (s) { setSlotA(s); dragScene.current = null }
  }
  const onDropB = (e: React.DragEvent) => {
    e.preventDefault()
    const s = dragScene.current ?? getDraggingScene?.()
    if (s) { setSlotB(s); dragScene.current = null }
  }

  const mixed = slotA && slotB
    ? SLOTS.map(slot => ({
        label: slot.label,
        value: selected[slot.key] === 'A' ? slot.get(slotA) : slot.get(slotB),
        from:  selected[slot.key],
      }))
    : null

  const copyText = mixed
    ? mixed.map(r => `${r.label}: ${r.value}`).join('\n')
    : ''

  const copy = async () => {
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shuffle = () => {
    if (!slotA || !slotB) return
    setSelected(Object.fromEntries(
      SLOTS.map(s => [s.key, Math.random() < 0.5 ? 'A' : 'B'])
    ) as Record<SlotKey, 'A' | 'B'>)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>// MIX_MODE</span>
        <span className={styles.hint}>右の履歴からドラッグ&ドロップ</span>
      </div>

      {/* DROP ゾーン 2つ */}
      <div className={styles.dropRow}>
        <DropZone
          label="SCENE A"
          scene={slotA}
          color="var(--accent)"
          onDrop={onDropA}
        />
        <span className={styles.plus}>×</span>
        <DropZone
          label="SCENE B"
          scene={slotB}
          color="var(--accent2)"
          onDrop={onDropB}
        />
      </div>

      {/* 警告 */}
      {warnings.map(w => (
        <div key={w} className={styles.warning}>⚠ {w}</div>
      ))}

      {/* スロット選択 */}
      {mixed && (
        <>
          <div className={styles.slotsHeader}>
            <span className={styles.slotsLabel}>各フィールドの採用元を選択</span>
            <button className={styles.btn} onClick={shuffle}>SHUFFLE</button>
            <button className={styles.btn} onClick={copy}>
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          <div className={styles.slots}>
            {SLOTS.map(slot => {
              const src = selected[slot.key]
              const scene = src === 'A' ? slotA! : slotB!
              return (
                <div key={slot.key} className={styles.slotRow}>
                  <span className={styles.slotLabel}>{slot.label}</span>
                  <button
                    className={`${styles.sourceBtn} ${src === 'A' ? styles.srcA : styles.srcB}`}
                    onClick={() => setSelected(prev => ({
                      ...prev,
                      [slot.key]: prev[slot.key] === 'A' ? 'B' : 'A',
                    }))}
                  >{src}</button>
                  <span className={styles.slotValue}>{slot.get(scene)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* シーン一覧（ドラッグ元） */}
      <div className={styles.sceneList}>
        <span className={styles.sceneListLabel}>// DRAG FROM HERE</span>
        {scenes.map((scene, idx) => (
          <div
            key={scene.id ?? idx}
            className={styles.sceneChip}
            draggable
            onDragStart={() => onDragStart(scene)}
          >
            <span className={styles.sceneChipNum}>#{idx + 1}</span>
            <span className={styles.sceneChipTitle}>{scene.title}</span>
            <span className={styles.sceneChipMeta}>{sceneSummary(scene)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DropZoneコンポーネント ────────────────────────────────────────────────────

function DropZone({
  label, scene, color, onDrop,
}: {
  label: string
  scene: Scene | null
  color: string
  onDrop: (e: React.DragEvent) => void
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`${styles.dropZone} ${over ? styles.dropOver : ''}`}
      style={{ '--zone-color': color } as React.CSSProperties}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e) }}
    >
      <span className={styles.dropLabel} style={{ color }}>{label}</span>
      {scene ? (
        <>
          <span className={styles.dropTitle}>{scene.title}</span>
          <span className={styles.dropMeta}>{sceneSummary(scene)}</span>
        </>
      ) : (
        <span className={styles.dropHint}>ここにドロップ</span>
      )}
    </div>
  )
}
