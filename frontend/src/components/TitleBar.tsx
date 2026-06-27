import { useState, useEffect, useRef } from 'react'
import { useTheme, useOnline } from '../pages/_app'
import { useUpdater } from '../hooks/useUpdater'
import styles from './TitleBar.module.css'

interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  releaseNotes:   string
}

interface Notice {
  id:       string
  title:    string
  body:     string
  date:     string
  isNew:    boolean
  isUpdate?: boolean
}

const STATIC_NOTICES: Notice[] = [
  {
    id:    'rel-006',
    title: 'fragment Generater v0.1.xをご利用のお客様へ',
    body:  'こんな機能が欲しい、バグがあるなどありましたら、ご気軽にお問合せフォームからメールを頂けたら幸いです。送信の際はオンラインモードにするのをお忘れなく。',
    date:  '6666-66-66',
    isNew: true,
  },
  {
    id:    'rel-005',
    title: 'v0.1.5: バージョン表示を動的にする',
    body:  'バージョン表示を動的に表示するようにしました',
    date:  '2026-06-27',
    isNew: true,
  },
  {
    id:    'rel-004',
    title: 'v0.1.5: 自動アップデート機能の搭載',
    body:  'オンライン/オフライン切り替え機能と、アップデート情報を取ってきてアップデートする機能を搭載しました。',
    date:  '2026-06-27',
    isNew: true,
  },
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

function UpdateModal({
  info, state, progress, error, onConfirm, onDismiss,
}: {
  info:      UpdateInfo
  state:     'available' | 'downloading' | 'downloaded' | 'error'
  progress:  number
  error:     string | null
  onConfirm: () => void
  onDismiss: () => void
}) {
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
          <div className={styles.modalUpdateType}>
            <span className={styles.hotUpdateBadge}>
              ✓ ダウンロード後に再起動して更新します
            </span>
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
          {state === 'downloading' && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.progressLabel}>ダウンロード中... {progress}%</span>
            </div>
          )}
          {state === 'downloaded' && (
            <p className={styles.progressLabel}>✓ ダウンロード完了。再起動して更新できます。</p>
          )}
          {error && <p className={styles.modalError}>⚠ {error}</p>}
        </div>
        <div className={styles.modalFooter}>
          {state === 'available' && (
            <>
              <button className={styles.modalCancel} onClick={onDismiss}>あとで</button>
              <button className={styles.modalOk} onClick={onConfirm}>OK — ダウンロード開始</button>
            </>
          )}
          {state === 'downloading' && (
            <button className={styles.modalCancel} disabled>ダウンロード中...</button>
          )}
          {state === 'downloaded' && (
            <>
              <button className={styles.modalCancel} onClick={onDismiss}>あとで</button>
              <button className={styles.modalOk} onClick={onConfirm}>再起動して更新</button>
            </>
          )}
          {state === 'error' && (
            <button className={styles.modalCancel} onClick={onDismiss}>閉じる</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TitleBar() {
  const { theme, toggle }  = useTheme()
  const isOnline           = useOnline()
  const { updateInfo, updateState, progress, errorMsg, confirm, dismiss } = useUpdater()

  const [mounted,       setMounted]       = useState(false)
  const [isElectron,    setIsElectron]    = useState(false)
  const [bellOpen,      setBellOpen]      = useState(false)
  const [notices,       setNotices]       = useState<Notice[]>(STATIC_NOTICES)
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set())
  const [modalOpen,     setModalOpen]     = useState(false)
  const [onlineError,   setOnlineError]   = useState<string | null>(null)
  const [onlineLoading, setOnlineLoading] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsElectron(!!window.electron)
    const saved = localStorage.getItem('fg-read-notices')
    if (saved) setReadIds(new Set(JSON.parse(saved)))

    if (!window.electron) return

    // onOnlineModeChanged は _app.tsx に移したのでここではエラーのみ
    window.electron.onOnlineModeError(({ message }) => {
      setOnlineError(message)
      setOnlineLoading(false)
      setTimeout(() => setOnlineError(null), 4000)
    })

    // オンラインモード切り替え完了時にloadingを解除
    window.electron.onOnlineModeChanged(() => {
      setOnlineLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!updateInfo) return
    const notice: Notice = {
      id:       `update-${updateInfo.latestVersion}`,
      title:    `アップデート v${updateInfo.latestVersion} が利用可能`,
      body:     `現在: v${updateInfo.currentVersion} → クリックして更新`,
      date:     new Date().toISOString().slice(0, 10),
      isNew:    true,
      isUpdate: true,
    }
    setNotices(prev => [notice, ...prev.filter(n => !n.isUpdate)])
    setModalOpen(true)
  }, [updateInfo])

  useEffect(() => {
    if (updateState === 'downloaded') setModalOpen(true)
  }, [updateState])

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

  const handleNoticeClick = (n: Notice) => {
    if (n.isUpdate) { setBellOpen(false); setModalOpen(true) }
  }

  const handleToggleOnline = () => {
    if (!window.electron || onlineLoading) return
    setOnlineLoading(true)
    window.electron.setOnlineMode(!isOnline)
  }

  const handleConfirm = () => { confirm() }

  const handleDismiss = () => {
    setModalOpen(false)
    if (updateState !== 'downloaded') dismiss()
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

        {mounted && isElectron && (
          <div className={styles.onlineWrap}>
            <button
              className={`${styles.onlineBtn} ${isOnline ? styles.onlineBtnOn : styles.onlineBtnOff}`}
              onClick={handleToggleOnline}
              disabled={onlineLoading}
              title={isOnline ? 'オンラインモード（クリックでオフラインに）' : 'オフラインモード（クリックでオンラインに）'}
            >
              <span className={`${styles.onlineDot} ${isOnline ? styles.onlineDotOn : ''}`} />
              {onlineLoading ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
            {onlineError && (
              <span className={styles.onlineError}>{onlineError}</span>
            )}
          </div>
        )}

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
                      {n.isUpdate && <span className={styles.noticeCta}> → クリックで詳細</span>}
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

      {modalOpen && updateInfo &&
        (updateState === 'available' || updateState === 'downloading' ||
         updateState === 'downloaded' || updateState === 'error') && (
        <UpdateModal
          info={updateInfo}
          state={updateState}
          progress={progress}
          error={errorMsg}
          onConfirm={handleConfirm}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}