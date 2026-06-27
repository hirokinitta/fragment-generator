import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styles from './splash.module.css'

// ── フェーズ定義 ──────────────────────────────────────────────────────────────
// icon       : アイコンがフェードイン・静止
// iconFadeOut: アイコンがフェードアウト（画面ごと暗転）
// title      : タイトル画面でタイプライター
// ready      : CLICK TO START が点滅
type Phase = 'icon' | 'iconFadeOut' | 'title' | 'ready'

const APP_TITLE = 'FRAGMENT_GENERATOR'
const APP_SUB   = '記憶断片生成器'
const [version, setVersion] = useState('')

export default function Splash() {
  const router = useRouter()
  const [phase,          setPhase]          = useState<Phase>('icon')
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [displayedSub,   setDisplayedSub]   = useState('')
  const [canClick,       setCanClick]        = useState(false)
  const [windowWidth,    setWindowWidth]    = useState(0)

  useEffect(() => {
    window.electron?.getVersion().then(v => setVersion(v))
  }, [])

  // ── デバイスごとのサイズ計算 ──────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const iconSize = useMemo(() => {
    if (windowWidth === 0) return '300px' // 初期値
    if (windowWidth >= 1025) return '500px' // PC
    if (windowWidth >= 768)  return '500px' // Tablet
    return '200px' // Mobile
  }, [windowWidth])

  // ── フェーズ1：アイコン表示 → フェードアウト開始 ─────────────────────────
  useEffect(() => {
    // 1.4秒 アイコンを静止表示
    const t1 = setTimeout(() => setPhase('iconFadeOut'), 1400)
    return () => clearTimeout(t1)
  }, [])

  // ── フェーズ2：フェードアウト完了 → タイトルへ ───────────────────────────
  useEffect(() => {
    if (phase !== 'iconFadeOut') return
    // CSSのフェードアウトが0.6秒 → 完了後にtitleへ
    const t = setTimeout(() => setPhase('title'), 650)
    return () => clearTimeout(t)
  }, [phase])

  // ── フェーズ3：サブタイトル → メインタイトルのタイプライター ──────────────
  useEffect(() => {
    if (phase !== 'title') return

    let i = 0
    // まずサブタイトル（短い）
    const subInterval = setInterval(() => {
      i++
      setDisplayedSub(APP_SUB.slice(0, i))
      if (i >= APP_SUB.length) {
        clearInterval(subInterval)
        // サブ完了後0.3秒でメインタイトル開始
        setTimeout(() => {
          let j = 0
          const mainInterval = setInterval(() => {
            j++
            setDisplayedTitle(APP_TITLE.slice(0, j))
            if (j >= APP_TITLE.length) {
              clearInterval(mainInterval)
              // 完了後0.7秒でready
              setTimeout(() => {
                setPhase('ready')
                setCanClick(true)
              }, 700)
            }
          }, 55)
        }, 300)
      }
    }, 80)

    return () => clearInterval(subInterval)
  }, [phase])

  const handleEnter = () => {
    if (!canClick) return
    router.push('/main')
  }

  const isIconScene  = phase === 'icon' || phase === 'iconFadeOut'
  const isTitleScene = phase === 'title' || phase === 'ready'

  return (
    <>
      <Head>
        <style>{`
          /* スマホかつ縦向きの場合、コンテンツを90度回転させて強制的に横画面に見せる */
          @media screen and (max-width: 767px) and (orientation: portrait) {
            body {
              transform: rotate(90deg);
              transform-origin: bottom left;
              position: absolute;
              top: -100vw;
              left: 0;
              height: 100vw;
              width: 100vh;
              overflow: hidden;
            }
          }
        `}</style>
      </Head>

      {/* ── シーン1：アイコン ── */}
      <div className={`${styles.scene} ${styles.sceneIcon}
        ${phase === 'iconFadeOut' ? styles.sceneFadeOut : ''}
        ${isTitleScene           ? styles.sceneGone    : ''}`}
      >
        <div className={styles.scanlines} />

        {/* アイコン本体 */}
        <div className={styles.iconWrap}>
          {/*
            ── 自作アイコンへの差し替え手順 ──────────────────────────
            1. frontend/public/ フォルダに icon.png（推奨: 256×256px）を置く
            2. 下の <svg>...</svg> を以下に差し替える：
              <img src="/icon.png" className={styles.iconImg} alt="icon" />
            ────────────────────────────────────────────────────────
          */}
          <img
            src="/icon.png"
            className={styles.iconImg}
            alt="icon"
            style={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
          />
        </div>

        <p className={styles.iconVersion}>v{version}</p>
      </div>

      {/* ── シーン2：タイトル ── */}
      <div className={`${styles.scene} ${styles.sceneTitle}
        ${isTitleScene ? styles.sceneFadeIn : styles.sceneInvisible}`}
        onClick={handleEnter}
        style={{ cursor: canClick ? 'pointer' : 'default' }}
      >
        <div className={styles.scanlines} />

        {/* ノイズライン装飾 */}
        <div className={styles.noiseLine} />

        <div className={styles.titleContent}>
          {/* サブタイトル */}
          <p className={styles.titleSub}>
            {displayedSub}
            {phase === 'title' && displayedSub.length < APP_SUB.length && (
              <span className={styles.cursor}>█</span>
            )}
          </p>

          {/* メインタイトル */}
          <h1 className={styles.titleMain}>
            {displayedTitle || '\u00A0'}
            {phase === 'title' && displayedSub.length >= APP_SUB.length && (
              <span className={styles.cursor}>█</span>
            )}
          </h1>

          {/* 区切り線 */}
          <div className={`${styles.titleDivider} ${phase === 'ready' ? styles.titleDividerVisible : ''}`} />

          {/* クリックプロンプト */}
          <p className={`${styles.prompt} ${phase === 'ready' ? styles.promptVisible : ''}`}>
            [ CLICK TO START ]
          </p>
        </div>

        <p className={styles.titleVersion}>v{version}</p>
      </div>
    </>
  )
}
