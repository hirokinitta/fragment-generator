import { useState, useCallback, useRef, useEffect } from 'react'
import Head from 'next/head'
import TitleBar from '../components/TitleBar'
import GeneratePanel from '../components/GeneratePanel'
import SceneCard from '../components/SceneCard'
import HistoryPanel from '../components/HistoryPanel'
import MixMode from '../components/MixMode'
import ColorZukan from '../components/ColorZukan'
import ContactForm from '../components/ContactForm'
import type { Scene } from '../lib/api'
import { generateScene } from '../lib/api'
import styles from './main.module.css'

type Tab = 'scene' | 'mix' | 'color' | 'history' | 'gen' | 'contact'

export default function Main() {
  const [scene,          setScene]          = useState<Scene | null>(null)
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [historyTrigger, setHistoryTrigger] = useState(0)
  const [selectedId,     setSelectedId]     = useState<number | undefined>()
  const [error,          setError]          = useState<string | null>(null)
  const [tab,            setTab]            = useState<Tab>('scene')
  const [allScenes,      setAllScenes]      = useState<Scene[]>([])
  const [glitchLevel,    setGlitchLevel]    = useState<0 | 1 | 2>(0)
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electron?.getVersion().then(v => setVersion(v))
  }, [])

  const calcGlitch = (n: number, ax: number, u: number): 0 | 1 | 2 => {
    if (n >= 90 && ax >= 90 && u >= 90) return 2
    if (
        (n >= 70 && ax >= 70 && u >= 70) || 
        (n >= 90 || ax >= 90 || u >= 90)
      ) return 1
    return 0
  }

  const draggingScene = useRef<Scene | null>(null)
  const handleDragStart = useCallback((s: Scene) => {
    draggingScene.current = s
    setTab('mix')
  }, [])
  const getDraggingScene = useCallback(() => draggingScene.current, [])

  const handleGenerate = useCallback(async (params: {
    nostalgia: number; anxiety: number; unreality: number
  }) => {
    setIsGenerating(true)
    setError(null)
    setTab('scene')
    try {
      const result = await generateScene(params)
      setScene(result)
      setSelectedId(result.id)
      setAllScenes(prev => [result, ...prev].slice(0, 30))
      setHistoryTrigger(t => t + 1)
      setGlitchLevel(calcGlitch(result.nostalgia, result.anxiety, result.unreality))
    } catch {
      setError('BACKEND_UNREACHABLE — go run ./backend を確認')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleHistorySelect = useCallback((s: Scene) => {
    setScene(s)
    setSelectedId(s.id)
    setTab('scene')
    setGlitchLevel(calcGlitch(s.nostalgia, s.anxiety, s.unreality))
  }, [])

  const handleSceneUpdate = useCallback((updated: Scene) => {
    setScene(updated)
    setHistoryTrigger(t => t + 1)
  }, [])

  const TABS: { id: Tab; label: string; mobileOnly?: boolean }[] = [
    { id: 'gen',     label: 'GEN',     mobileOnly: true },
    { id: 'scene',   label: 'SCENE' },
    { id: 'mix',     label: 'MIX' },
    { id: 'color',   label: 'COLOR' },
    { id: 'history', label: 'HIST' },
    { id: 'contact', label: 'CONTACT' },
  ]

  const glitchClass =
    glitchLevel === 2 ? styles.glitchMax  :
    glitchLevel === 1 ? styles.glitchHigh :
                        styles.glitchNone

  return (
    <>
      <Head>
        <title>記憶断片生成器</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div id="crt-overlay" className={glitchClass} />

      <div className={`${styles.root} ${glitchClass}`}>
        <TitleBar />

        <div className={styles.main}>
          <aside className={styles.left}>
            <GeneratePanel onGenerate={handleGenerate} isGenerating={isGenerating} />
          </aside>

          <main className={styles.center}>
            <div className={styles.tabBar}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''} ${t.mobileOnly ? styles.tabMobileOnly : ''}`}
                  onClick={() => setTab(t.id)}
                >{t.label}</button>
              ))}
            </div>

            <div className={styles.tabContent}>
              {tab === 'gen'     && <GeneratePanel onGenerate={handleGenerate} isGenerating={isGenerating} />}
              {tab === 'scene'   && (
                <>
                  {error && <div className={styles.error}><span className={styles.errorLabel}>⚠ ERROR</span><span>{error}</span></div>}
                  {!scene && !error && (
                    <div className={styles.empty}>
                      <p className={styles.emptyTitle}>記憶断片生成器</p>
                      <p className={styles.emptyHint}>[ GENERATE ] を押して断片を生成する</p>
                    </div>
                  )}
                  {scene && <SceneCard key={scene.id} scene={scene} onUpdate={handleSceneUpdate} />}
                </>
              )}
              {tab === 'mix'     && <MixMode scenes={allScenes} getDraggingScene={getDraggingScene} />}
              {tab === 'color'   && <ColorZukan />}
              {tab === 'contact' && <ContactForm />}
              {tab === 'history' && <HistoryPanel refreshTrigger={historyTrigger} onSelect={handleHistorySelect} selectedId={selectedId} />}
            </div>
          </main>

          <aside className={styles.right}>
            <HistoryPanel
              refreshTrigger={historyTrigger}
              onSelect={handleHistorySelect}
              selectedId={selectedId}
              onDragStart={handleDragStart}
            />
          </aside>
        </div>

        <footer className={styles.footer}>
          <span>FRAGMENT_GENERATOR v{version}</span>
          <span className={styles.footerDot}>·</span>
          <span>LOCAL_MODE</span>
          <span className={styles.footerDot}>·</span>
          <span>{allScenes.length} scenes</span>
          {glitchLevel === 2 && <span className={styles.footerWarning}>⚠ CRITICAL LEVEL</span>}
        </footer>

        <button
          className={`${styles.fab} ${isGenerating ? styles.fabGenerating : ''}`}
          onClick={() => handleGenerate({ nostalgia: 0, anxiety: 0, unreality: 0 })}
          disabled={isGenerating}
        >
          {isGenerating ? '...' : '⚡'}
        </button>
      </div>
    </>
  )
}
