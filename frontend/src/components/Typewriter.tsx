import { useEffect, useRef, useState } from 'react'

interface Props {
  text:      string
  className?: string
  onDone?:   () => void
}

const MISTAKE_CHARS = 'アイウエオカキクケコabcdefghijklmnopqrstuvwxyz0123456789!@#'

export default function Typewriter({ text, className, onDone }: Props) {
  const [displayed, setDisplayed] = useState('')
  const [done,      setDone]      = useState(false)

  // useRef でタイマーIDを管理（state にしない → 再描画しない）
  const rafRef     = useRef<number | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef   = useRef(0)
  const textRef    = useRef(text)

  useEffect(() => {
    // textが変わったらリセット
    textRef.current = text
    indexRef.current = 0
    setDisplayed('')
    setDone(false)

    // 前のタイマーをクリア
    if (rafRef.current)   cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)

    function scheduleNext(delay: number) {
      timerRef.current = setTimeout(() => {
        rafRef.current = requestAnimationFrame(typeNext)
      }, delay)
    }

    function typeNext() {
      const i   = indexRef.current
      const tgt = textRef.current

      if (i >= tgt.length) {
        setDone(true)
        onDone?.()
        return
      }

      // 4%の確率で誤字演出
      if (Math.random() < 0.04 && i < tgt.length - 1) {
        const wrong = MISTAKE_CHARS[Math.floor(Math.random() * MISTAKE_CHARS.length)]
        setDisplayed(tgt.slice(0, i) + wrong)
        timerRef.current = setTimeout(() => {
          setDisplayed(tgt.slice(0, i))
          timerRef.current = setTimeout(() => {
            indexRef.current++
            setDisplayed(tgt.slice(0, indexRef.current))
            scheduleNext(30 + Math.random() * 50)
          }, 70)
        }, 100)
        return
      }

      indexRef.current++
      setDisplayed(tgt.slice(0, indexRef.current))

      // 句読点で少し長く止まる
      const ch = tgt[indexRef.current - 1]
      const pause = /[。、！？「」…]/.test(ch)
        ? 160 + Math.random() * 100
        : 25 + Math.random() * 45
      scheduleNext(pause)
    }

    // 起動ディレイ
    timerRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(typeNext)
    }, 100)

    return () => {
      if (rafRef.current)   cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text]) // onDone は意図的に依存配列に入れない（毎回変わる関数参照を避ける）

  return (
    <span
      className={`${className ?? ''} ${!done ? 'cursor' : 'glitch'}`}
      data-text={displayed}
    >
      {displayed || '\u00A0'}
    </span>
  )
}
