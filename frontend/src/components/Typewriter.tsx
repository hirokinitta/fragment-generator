import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  className?: string
  'data-text'?: string
  onDone?: () => void
}

// タイプライター：ランダムゆらぎ・誤字→訂正演出つき
export default function Typewriter({ text, className, onDone }: Props) {
  const [displayed, setDisplayed] = useState('')
  const [done,      setDone]      = useState(false)
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0

    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノabcdefghijklmnopqrstuvwxyz0123456789!@#$%'

    function typeNext() {
      if (i >= text.length) {
        setDone(true)
        onDone?.()
        return
      }

      // 5%の確率で「誤字→バックスペース→正字」演出
      const doMistake = Math.random() < 0.05 && i < text.length - 1

      if (doMistake) {
        const wrongChar = CHARS[Math.floor(Math.random() * CHARS.length)]
        // 誤字を表示
        setDisplayed(text.slice(0, i) + wrongChar)
        ref.current = setTimeout(() => {
          // バックスペース（消す）
          setDisplayed(text.slice(0, i))
          ref.current = setTimeout(() => {
            // 正しい文字
            i++
            setDisplayed(text.slice(0, i))
            ref.current = setTimeout(typeNext, 30 + Math.random() * 60)
          }, 80)
        }, 120)
      } else {
        i++
        setDisplayed(text.slice(0, i))
        // 句読点・記号で少し長めに止まる
        const ch    = text[i - 1]
        const pause = /[。、！？「」…]/.test(ch)
          ? 180 + Math.random() * 120
          : 28 + Math.random() * 55
        ref.current = setTimeout(typeNext, pause)
      }
    }

    // 起動前の一瞬の間
    ref.current = setTimeout(typeNext, 120)
    return () => { if (ref.current) clearTimeout(ref.current) }
  }, [text])

  return (
    <span
      className={`${className ?? ''} ${!done ? 'cursor' : 'glitch'}`}
      data-text={displayed}
    >
      {displayed || '\u00A0'}
    </span>
  )
}
