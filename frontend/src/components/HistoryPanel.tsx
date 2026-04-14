import { useState, useEffect } from 'react'
import type { Scene } from '../lib/api'
import { fetchScenes } from '../lib/api'
import styles from './HistoryPanel.module.css'

interface Props {
  refreshTrigger: number
  onSelect: (scene: Scene) => void
  selectedId?: number
  onDragStart?: (scene: Scene) => void
}

export default function HistoryPanel({ refreshTrigger, onSelect, selectedId, onDragStart }: Props) {
  const [scenes,   setScenes]   = useState<Scene[]>([])
  const [filter,   setFilter]   = useState<'all' | 'fav' | 'drawn'>('all')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    load()
  }, [refreshTrigger, filter])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchScenes({
        limit:    50,
        favorite: filter === 'fav',
      })
      const filtered = filter === 'drawn' ? data.filter(s => s.is_drawn) : data
      setScenes(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <span className={styles.label}>// HISTORY</span>
        <div className={styles.filters}>
          {(['all', 'fav', 'drawn'] as const).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'ALL' : f === 'fav' ? '★' : '◉'}
            </button>
          ))}
        </div>
      </div>

      {/* リスト */}
      <div className={styles.list}>
        {loading && (
          <div className={styles.loading}>LOADING<span className="cursor" /></div>
        )}
        {!loading && scenes.length === 0 && (
          <div className={styles.empty}>NO_DATA</div>
        )}
        {scenes.map(scene => (
          <div
            key={scene.id}
            className={`${styles.item} ${selectedId === scene.id ? styles.itemActive : ''}`}
            onClick={() => onSelect(scene)}
            draggable={!!onDragStart}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copy'
              onDragStart?.(scene)
            }}
          >
            <div className={styles.itemTop}>
              <span className={styles.itemTitle}>{scene.title}</span>
              <div className={styles.itemBadges}>
                {scene.is_favorite && <span className={styles.badgeFav}>★</span>}
                {scene.is_drawn    && <span className={styles.badgeDrawn}>◉</span>}
              </div>
            </div>
            <div className={styles.itemMeta}>
              {scene.environment?.location} / {scene.environment?.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
