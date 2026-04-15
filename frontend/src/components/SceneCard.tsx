import { useState, useEffect } from 'react'
import type { Scene } from '../lib/api'
import { toggleFavorite, toggleDrawn } from '../lib/api'
import Typewriter from './Typewriter'
import CompositionDiagram from './CompositionDiagram'
import styles from './SceneCard.module.css'

interface Props {
  scene: Scene
  onUpdate?: (updated: Scene) => void
}

export default function SceneCard({ scene: initialScene, onUpdate }: Props) {
  const [scene,       setScene]       = useState(initialScene)
  const [bodyVisible, setBodyVisible] = useState(false)

  // initialScene が変わったとき（新規生成・履歴選択）にリセット
  useEffect(() => {
    setScene(initialScene)
    setBodyVisible(false)
  }, [initialScene.id]) // id が変わった時だけ実行（オブジェクト比較を避ける）

  const handleTitleDone = () => {
    // タイプライター完了後120msでボディ表示
    setTimeout(() => setBodyVisible(true), 120)
  }

  const handleFavorite = async () => {
    const next = { ...scene, is_favorite: !scene.is_favorite }
    setScene(next)
    await toggleFavorite(scene.id, next.is_favorite)
    onUpdate?.(next)
  }
  const handleDrawn = async () => {
    const next = { ...scene, is_drawn: !scene.is_drawn }
    setScene(next)
    await toggleDrawn(scene.id, next.is_drawn)
    onUpdate?.(next)
  }

  return (
    <div className={styles.card}>
      <div className={styles.titleRow}>
        <span className={styles.titleLabel}>// SCENE_TITLE</span>
        <h2 className={styles.title}>
          <Typewriter
            key={scene.id}
            text={scene.title}
            onDone={handleTitleDone}
          />
        </h2>
      </div>

      <div className={styles.divider} />

      {bodyVisible && (
        <div className={`${styles.body} fadeup`}>
          <p className={styles.sceneText}>{scene.scene}</p>
          <div className={styles.divider} />

          <div className={styles.twoCol}>
            {/* 左：環境データ */}
            <div className={styles.envCol}>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>ENV</span>
                <div className={styles.grid}>
                  <DataRow label="LOCATION" value={scene.environment?.location} />
                  <DataRow label="TIME"     value={scene.environment?.time} />
                  <DataRow label="LIGHTING" value={scene.environment?.lighting} />
                  {scene.environment?.weather && (
                    <DataRow label="WEATHER" value={scene.environment.weather} />
                  )}
                  <DataRow label="EMOTION"  value={scene.emotion} />
                  <DataRow label="COLOR"    value={scene.color} dim />
                </div>
              </div>
            </div>

            {/* 右：構図図解 */}
            {scene.composition?.angle && (
              <div className={styles.compCol}>
                <CompositionDiagram
                  angle={scene.composition.angle}
                  layout={scene.composition.layout}
                />
              </div>
            )}
          </div>

          {scene.anomaly && (
            <>
              <div className={styles.divider} />
              <div className={styles.anomaly}>
                <span className={styles.anomalyLabel}>⚠ ANOMALY</span>
                <span className={styles.anomalyText}>{scene.anomaly}</span>
              </div>
            </>
          )}
          {scene.sound && (
            <div className={styles.sound}>
              <span className={styles.soundLabel}>♪ SOUND</span>
              <span className={styles.soundText}>{scene.sound}</span>
            </div>
          )}

          <div className={styles.divider} />
          <div className={styles.params}>
            <ParamBar label="NOSTALGIA" value={scene.nostalgia} color="accent" />
            <ParamBar label="ANXIETY"   value={scene.anxiety}   color="accent2" />
            <ParamBar label="UNREALITY" value={scene.unreality} color="accent3" />
          </div>
          <div className={styles.divider} />

          <div className={styles.actions}>
            <button
              className={`${styles.actionBtn} ${scene.is_favorite ? styles.active : ''}`}
              onClick={handleFavorite}
            >
              {scene.is_favorite ? '★' : '☆'} FAV
            </button>
            <button
              className={`${styles.actionBtn} ${scene.is_drawn ? styles.activeGreen : ''}`}
              onClick={handleDrawn}
            >
              {scene.is_drawn ? '◉' : '○'} DRAWN
            </button>
            <span className={styles.timestamp}>
              {scene.created_at ? scene.created_at.slice(0,16).replace('T',' ') : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
function DataRow({ label, value, dim }: { label: string; value?: string; dim?: boolean }) {
  if (!value) return null
  return (
    <div className={styles.dataRow}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={`${styles.dataValue} ${dim ? styles.dataValueDim : ''}`}>{value}</span>
    </div>
  )
}

function ParamBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.paramRow}>
      <span className={styles.paramLabel}>{label}</span>
      <div className={styles.paramTrack}>
        <div className={`${styles.paramFill} ${styles[color]}`} style={{ width: `${value ?? 0}%` }} />
      </div>
      <span className={styles.paramValue}>{value ?? 0}</span>
    </div>
  )
}
