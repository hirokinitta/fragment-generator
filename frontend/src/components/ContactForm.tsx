import { useState } from 'react'
import { useOnline } from '../pages/_app'
import styles from './ContactForm.module.css'

const EMAILJS_SERVICE_ID  = 'service_d5mxmfh'
const EMAILJS_TEMPLATE_ID = 'template_wx24gas'
const EMAILJS_PUBLIC_KEY  = 'sSOFOjmTVpfM08Q85'

type Category = 'bug' | 'feature' | 'word' | 'other'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'bug',     label: 'バグ報告' },
  { id: 'feature', label: '機能要望' },
  { id: 'word',    label: 'ワード追加提案' },
  { id: 'other',   label: 'その他' },
]

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
  const isOnline = useOnline()

  const [category, setCategory] = useState<Category>('bug')
  const [name,     setName]     = useState('')
  const [body,     setBody]     = useState('')
  const [status,   setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error,    setError]    = useState('')

  const handleSubmit = async () => {
    if (!isOnline) {
      setError('送信にはオンラインモードが必要です。右上の OFFLINE ボタンをクリックしてください。')
      return
    }
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

      {/* オフライン警告 */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          ⚠ 送信にはオンラインモードが必要です。右上の OFFLINE ボタンをクリックしてください。
        </div>
      )}

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
            disabled={status === 'sending' || !isOnline}
          >
            {status === 'sending' ? 'SENDING...' : '[ SEND ]'}
          </button>
        </>
      )}
    </div>
  )
}