import { useState } from 'react'
import styles from './ContactForm.module.css'

// ── EmailJS 設定 ──────────────────────────────────────────────────────────────
// EmailJS (https://www.emailjs.com/) で取得した値を設定してください
// 無料プランで月200通まで送信可能
const EMAILJS_SERVICE_ID  = 'service_d5mxmfh'   // ← EmailJSのService ID
const EMAILJS_TEMPLATE_ID = 'template_wx24gas'  // ← EmailJSのTemplate ID
const EMAILJS_PUBLIC_KEY  = 'sSOFOjmTVpfM08Q85'   // ← EmailJSのPublic Key

type Category = 'bug' | 'feature' | 'word' | 'other'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'bug',     label: 'バグ報告' },
  { id: 'feature', label: '機能要望' },
  { id: 'word',    label: 'ワード追加提案' },
  { id: 'other',   label: 'その他' },
]

// EmailJS をCDN経由で動的にロード（bundle sizeを増やさない）
async function loadEmailJS() {
  if ((window as any).emailjs) return (window as any).emailjs
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
    script.onload  = () => resolve()
    script.onerror = () => reject(new Error('EmailJS load failed'))
    document.head.appendChild(script)
  })
  ;(window as any).emailjs.init(EMAILJS_PUBLIC_KEY)
  return (window as any).emailjs
}

export default function ContactForm() {
  const [category, setCategory] = useState<Category>('bug')
  const [name,     setName]     = useState('')
  const [body,     setBody]     = useState('')
  const [status,   setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error,    setError]    = useState('')

  const handleSubmit = async () => {
    if (!body.trim()) {
      setError('内容を入力してください')
      return
    }
    setError('')
    setStatus('sending')

    const catLabel = CATEGORIES.find(c => c.id === category)?.label ?? category

    try {
      const emailjs = await loadEmailJS()
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          category: catLabel,
          name:     name.trim() || '匿名',
          message:  body.trim(),
          date:     new Date().toLocaleString('ja-JP'),
        }
      )
      setStatus('sent')
      setName('')
      setBody('')
    } catch (e) {
      console.error('EmailJS error:', e)
      setStatus('error')
      setError('送信に失敗しました。しばらく後に再試行してください。')
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>// CONTACT</span>
        <span className={styles.note}>送信先: locaminase666@gmail.com</span>
      </div>

      {/* 送信完了 */}
      {status === 'sent' && (
        <div className={styles.sentBanner}>
          ✓ 送信しました。フィードバックありがとうございます。
          <button className={styles.sentReset} onClick={() => setStatus('idle')}>
            もう一件送る
          </button>
        </div>
      )}

      {status !== 'sent' && (
        <>
          {/* カテゴリ */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>CATEGORY</span>
            <div className={styles.categories}>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`${styles.catBtn} ${category === c.id ? styles.catBtnActive : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 名前（任意） */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>NAME（任意）</span>
            <input
              className={styles.input}
              type="text"
              placeholder="匿名でもOK"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* 本文 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>CONTENT</span>
            <textarea
              className={styles.textarea}
              placeholder={
                category === 'word'
                  ? 'ワードの種類（場所/感情/音など）と具体的なワードを書いてください'
                  : 'できるだけ詳しく書いてください'
              }
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              maxLength={1000}
            />
            <span className={styles.charCount}>{body.length} / 1000</span>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button
            className={`${styles.submitBtn} ${status === 'sending' ? styles.submitSending : ''}`}
            onClick={handleSubmit}
            disabled={status === 'sending'}
          >
            {status === 'sending'
              ? 'SENDING...'
              : '[ SEND ]'}
          </button>
        </>
      )}
    </div>
  )
}
