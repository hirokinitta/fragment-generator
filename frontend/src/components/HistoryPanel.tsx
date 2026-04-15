import { useState, useEffect, useCallback } from 'react'
import type { Scene } from '../lib/api'
import { fetchScenes } from '../lib/api'
import styles from './HistoryPanel.module.css'

const PAGE_SIZE = 20

interface Props {
  refreshTrigger: number
  onSelect:       (scene: Scene) => void
  selectedId?:    number
  onDragStart?:   (scene: Scene) => void
}

export default function HistoryPanel({
  refreshTrigger, onSelect, selectedId, onDragStart,
}: Props) {
  const [scenes,   setScenes]   = useState<Scene[]>([])
  const [filter,   setFilter]   = useState<'all' | 'fav' | 'drawn'>('all')
  const [loading,  setLoading]  = useState(false)
  const [hasMore,  setHasMore]  = useState(false)
  const [offset,   setOffset]   = useState(0)

  // フィルターかrefreshTriggerが変わったら先頭からリセット
  useEffect(() => {
    setScenes([])
    setOffset(0)
    loadPage(0)
  }, [refreshTrigger, filter])

  const loadPage = useCallback(async (pageOffset: number) => {
    setLoading(true)
    try {
      const data = await fetchScenes({
        limit:    PAGE_SIZE + 1, // 1件多く取って「まだある」か確認
        offset:   pageOffset,
        favorite: filter === 'fav',
      })

      // drawnフィルターはクライアント側で処理
      const filtered = filter === 'drawn' ? data.filter(s => s.is_drawn) : data
      const page     = filtered.slice(0, PAGE_SIZE)

      setHasMore(filtered.length > PAGE_SIZE)
      setScenes(prev => pageOffset === 0 ? page : [...prev, ...page])
      setOffset(pageOffset + page.length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const loadMore = () => {
    if (!loading && hasMore) loadPage(offset)
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
        {!loading && scenes.length === 0 && (
          <div className={styles.empty}>NO_DATA</div>
        )}

        {scenes.map(scene => (
          <div
            key={scene.id}
            className={`${styles.item} ${selectedId === scene.id ? styles.itemActive : ''}`}
            onClick={() => onSelect(scene)}
            draggable={!!onDragStart}
            onDragStart={e => {
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

        {/* もっと読み込む */}
        {hasMore && (
          <button
            className={styles.loadMore}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'LOADING...' : 'LOAD MORE'}
          </button>
        )}

        {loading && scenes.length === 0 && (
          <div className={styles.loading}>LOADING<span className="cursor" /></div>
        )}
      </div>
    </div>
  )
}
