import { useState } from 'react'
import styles from './ContactForm.module.css'

type Category = 'bug' | 'feature' | 'word' | 'other'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'bug',     label: 'バグ報告' },
  { id: 'feature', label: '機能要望' },
  { id: 'word',    label: 'ワード追加提案' },
  { id: 'other',   label: 'その他' },
]

export default function ContactForm() {
  const [category, setCategory] = useState<Category>('bug')
  const [name,     setName]     = useState('')
  const [body,     setBody]     = useState('')
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')

  // メールソフトを起動して送信する
  const handleSubmit = () => {
    if (!body.trim()) {
      setError('内容を入力してください')
      return
    }
    setError('')

    const catLabel = CATEGORIES.find(c => c.id === category)?.label ?? category
    const text = [
      `[Fragment Generator フィードバック]`,
      `カテゴリ: ${catLabel}`,
      name ? `名前: ${name}` : '',
      ``,
      body.trim(),
    ].filter(Boolean).join('\n')

    // メールソフトを起動
    const subject = encodeURIComponent(`[Fragment Generator Feedback] ${catLabel}`)
    const mailtoUrl = `mailto:locaminase666@gmail.com?subject=${subject}&body=${encodeURIComponent(text)}`
    window.location.href = mailtoUrl

    setSent(true)
    setTimeout(() => setSent(false), 4000)
    setName('')
    setBody('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>// CONTACT</span>
        <span className={styles.note}>
          メールソフトを起動して送信します
        </span>
      </div>

      {/* カテゴリ選択 */}
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
              ? 'ワードの種類（場所/感情/音 など）と具体的なワードを書いてください'
              : 'できるだけ詳しく書いてください'
          }
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          maxLength={1000}
        />
        <span className={styles.charCount}>{body.length} / 1000</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={`${styles.submitBtn} ${sent ? styles.submitSent : ''}`}
        onClick={handleSubmit}
        disabled={sent}
      >
        {sent ? '✓ 準備完了（メールを確認してください）' : '[ SEND FEEDBACK ]'}
      </button>

      {sent && (
        <p className={styles.sentNote}>
          メールソフトが起動しない場合は、locaminase666@gmail.com 宛に直接送信してください。
        </p>
      )}
    </div>
  )
}
