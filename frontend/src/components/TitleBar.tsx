import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../pages/_app'
import { useUpdater } from '../hooks/useUpdater'
import styles from './TitleBar.module.css'

interface Notice {
  id:       string
  title:    string
  body:     string
  date:     string
  isNew:    boolean
  isUpdate?: boolean        // アップデート通知かどうか
  updateInfo?: UpdateInfo   // アップデート情報（isUpdate=trueのとき）
}

interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  downloadUrl:    string | null
  releaseNotes:   string
  canHotUpdate:   boolean   // trueなら再インストール不要
}

// アップデート以外の固定お知らせ
const STATIC_NOTICES: Notice[] = [
  {
    id:    'rel-003',
    title: 'v0.1.1: 送信機能のシンプル化',
    body:  'お問い合わせフォームのクリップボードコピーを廃止し、メール起動のみに調整しました。',
    date:  '2026-04-14',
    isNew: true,
  },
  {
    id:    'rel-001',
    title: 'Fragment Generator v0.1.0 リリース',
    body:  'ローカルアプリとして初回リリース。生成・MIX・色図鑑・構図図解が使えます。',
    date:  '2026-04-10',
    isNew: true,
  },
  {
    id:    'rel-002',
    title: 'テーマ切り替え・スプラッシュ画面を追加',
    body:  'ダーク/ライト切替・スプラッシュ画面・MIX D&D対応など多数の機能追加。',
    date:  '2026-04-11',
    isNew: true,
  },
]

// ── アップデート進捗ポップアップ ─────────────────────────────────────────────
function UpdateModal({
  info,
  onConfirm,
  onCancel,
  progress,
  error,
}: {
  info:      UpdateInfo
  onConfirm: () => void
  onCancel:  () => void
  progress:  number | null   // null=未開始 0〜100=ダウンロード中
  error:     string | null
}) {
  const downloading = progress !== null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>// UPDATE_AVAILABLE</span>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalVersionRow}>
            <span className={styles.modalVerOld}>v{info.currentVersion}</span>
            <span className={styles.modalArrow}>→</span>
            <span className={styles.modalVerNew}>v{info.latestVersion}</span>
          </div>

          {/* 更新方式の表示 */}
          <div className={styles.modalUpdateType}>
            {info.canHotUpdate ? (
              <span className={styles.hotUpdateBadge}>
                ✓ 再インストール不要 — アプリ内で自動更新します
              </span>
            ) : (
              <span className={styles.coldUpdateBadge}>
                インストーラーをダウンロードして更新します
              </span>
            )}
          </div>

          {info.releaseNotes && (
            <div className={styles.modalNotes}>
              <span className={styles.modalNotesLabel}>更新内容</span>
              <p className={styles.modalNotesBody}>
                {info.releaseNotes.slice(0, 300)}
                {info.releaseNotes.length > 300 ? '…' : ''}
              </p>
            </div>
          )}

          {/* ダウンロード進捗バー */}
          {downloading && !error && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {progress < 100 ? `ダウンロード中... ${progress}%` : 'インストーラーを起動しています...'}
              </span>
            </div>
          )}

          {/* エラー */}
          {error && (
            <p className={styles.modalError}>⚠ {error}</p>
          )}
        </div>

        {/* ボタン */}
        {!downloading && !error && (
          <div className={styles.modalFooter}>
            <button className={styles.modalCancel} onClick={onCancel}>
              あとで
            </button>
            <button className={styles.modalOk} onClick={onConfirm}>
              OK — {info.canHotUpdate ? '今すぐ更新（再起動のみ）' : 'インストーラーをダウンロード'}
            </button>
          </div>
        )}
        {(downloading || error) && (
          <div className={styles.modalFooter}>
            <button
              className={styles.modalCancel}
              onClick={onCancel}
              disabled={progress !== null && progress < 100}
            >
              {error ? '閉じる' : 'バックグラウンドで続行'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TitleBar 本体 ─────────────────────────────────────────────────────────────
export default function TitleBar() {
  const { theme, toggle } = useTheme()
  const { updateInfo: hookUpdateInfo } = useUpdater()

  const [mounted,    setMounted]    = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [bellOpen,   setBellOpen]   = useState(false)
  const [notices,    setNotices]    = useState<Notice[]>(STATIC_NOTICES)
  const [readIds,    setReadIds]    = useState<Set<string>>(new Set())

  // アップデートモーダル
  const [modalInfo,  setModalInfo]  = useState<UpdateInfo | null>(null)
  const [dlProgress, setDlProgress] = useState<number | null>(null)
  const [dlError,    setDlError]    = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsElectron(!!window.electron)

    const saved = localStorage.getItem('fg-read-notices')
    if (saved) setReadIds(new Set(JSON.parse(saved)))

    // ダウンロード進捗を受け取る
    window.electron?.onUpdateProgress?.(({ percent }: { percent: number }) => {
      setDlProgress(percent)
    })

    // エラーを受け取る
    window.electron?.onUpdateError?.(({ message }: { message: string }) => {
      setDlError(message)
    })
  }, [])

  // アップデート情報がElectronから届いたらお知らせに追加
  useEffect(() => {
    if (!hookUpdateInfo) return
    const updateNotice: Notice = {
      id:        `update-${hookUpdateInfo.latestVersion}`,
      title:     `アップデート v${hookUpdateInfo.latestVersion} が利用可能`,
      body:      `現在のバージョン: v${hookUpdateInfo.currentVersion}\nクリックしてアップデートを開始`,
      date:      new Date().toISOString().slice(0, 10),
      isNew:     true,
      isUpdate:  true,
      updateInfo: hookUpdateInfo,
    }
    setNotices(prev => {
      const filtered = prev.filter(n => !n.isUpdate)
      return [updateNotice, ...filtered]
    })
  }, [hookUpdateInfo])

  // パネル外クリックで閉じる
  useEffect(() => {
    if (!bellOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])

  const unreadCount = notices.filter(n => n.isNew && !readIds.has(n.id)).length

  const openBell = () => {
    setBellOpen(v => !v)
    const allIds = new Set(notices.map(n => n.id))
    setReadIds(allIds)
    localStorage.setItem('fg-read-notices', JSON.stringify([...allIds]))
  }

  // お知らせクリック
  const handleNoticeClick = (n: Notice) => {
    if (n.isUpdate && n.updateInfo) {
      setBellOpen(false)
      setDlProgress(null)
      setDlError(null)
      setModalInfo(n.updateInfo)   // ← ポップアップを開く
    }
  }

  // モーダルでOK
  const handleUpdateConfirm = () => {
    if (!modalInfo || !window.electron) return
    setDlProgress(0)
    window.electron.confirmUpdate(modalInfo)
  }

  // モーダルでキャンセル
  const handleUpdateCancel = () => {
    setModalInfo(null)
    setDlProgress(null)
    setDlError(null)
    window.electron?.cancelUpdate?.()
  }

  return (
    <>
      <div className={styles.bar}>
        <span className={styles.title}>
          <span className={styles.bracket}>[</span>
          FRAGMENT_GENERATOR
          <span className={styles.bracket}>]</span>
        </span>

        {mounted && (
          <button className="theme-toggle" onClick={toggle}>
            {theme === 'dark' ? '☀ LIGHT' : '🌙 DARK'}
          </button>
        )}

        {/* ベルアイコン */}
        {mounted && (
          <div className={styles.bellWrap} ref={panelRef}>
            <button className={styles.bellBtn} onClick={openBell} title="お知らせ">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4z"
                  stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <path d="M5.5 11.5a1.5 1.5 0 0 0 3 0"
                  stroke="currentColor" strokeWidth="1.2" fill="none"/>
              </svg>
              {unreadCount > 0 && (
                <span className={styles.bellBadge}>{unreadCount}</span>
              )}
            </button>

            {bellOpen && (
              <div className={styles.noticePanel}>
                <div className={styles.noticePanelHeader}>
                  <span className={styles.noticePanelTitle}>// NOTICES</span>
                  <button className={styles.noticePanelClose} onClick={() => setBellOpen(false)}>✕</button>
                </div>
                {notices.length === 0 && (
                  <div className={styles.noticeEmpty}>お知らせはありません</div>
                )}
                {notices.map(n => (
                  <div
                    key={n.id}
                    className={`${styles.noticeItem}
                      ${readIds.has(n.id) ? styles.noticeRead : styles.noticeUnread}
                      ${n.isUpdate ? styles.noticeUpdate : ''}`}
                    onClick={() => handleNoticeClick(n)}
                    style={{ cursor: n.isUpdate ? 'pointer' : 'default' }}
                  >
                    <div className={styles.noticeItemHeader}>
                      <span className={styles.noticeItemTitle}>{n.title}</span>
                      <span className={styles.noticeItemDate}>{n.date}</span>
                    </div>
                    <p className={styles.noticeItemBody}>
                      {n.body}
                      {n.isUpdate && (
                        <span className={styles.noticeCta}> → クリックで詳細</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mounted && isElectron && (
          <div className={styles.winControls}>
            <button className={styles.winBtn} onClick={() => window.electron!.minimize()}>─</button>
            <button className={styles.winBtn} onClick={() => window.electron!.maximize()}>□</button>
            <button className={`${styles.winBtn} ${styles.winClose}`} onClick={() => window.electron!.close()}>✕</button>
          </div>
        )}
      </div>

      {/* アップデートモーダル */}
      {modalInfo && (
        <UpdateModal
          info={modalInfo}
          onConfirm={handleUpdateConfirm}
          onCancel={handleUpdateCancel}
          progress={dlProgress}
          error={dlError}
        />
      )}
    </>
  )
}
