import { useState } from 'react'
import styles from './ColorZukan.module.css'

interface ColorEntry {
  name:  string
  hex:   string
  desc:  string
  dark?: boolean  // スウォッチ上のhexテキストを白にするか
}
interface Category {
  label:  string
  colors: ColorEntry[]
}

const CATEGORIES: Category[] = [
  {
    label: '喪失・時間',
    colors: [
      { name:'黄ばんだ白',      hex:'#e8e0c8', desc:'時間が止まったような古い色' },
      { name:'セピア',          hex:'#a07848', desc:'記憶の中の写真のような' },
      { name:'日焼けた紙',      hex:'#d0b888', desc:'読まれなくなった本のページ' },
      { name:'褪せた朱',        hex:'#c07860', desc:'かつて鮮やかだったものの残滓' },
      { name:'古い金',          hex:'#b89850', desc:'輝いていた頃の面影だけが残る' },
      { name:'錆色',            hex:'#8c4a28', desc:'朽ちかけているものの美しさ', dark:true },
      { name:'煤けた黄',        hex:'#c8b060', desc:'電球が消えかけているような' },
    ],
  },
  {
    label: '冷たさ・距離',
    colors: [
      { name:'青寄りの灰色',    hex:'#7a8fa8', desc:'冷たく、記憶が薄れていくような色', dark:true },
      { name:'冷たい白',        hex:'#e0e8f0', desc:'生命の気配がない清潔さ' },
      { name:'霧の白',          hex:'#d8dce0', desc:'輪郭がはっきりしない、何もかもが曖昧' },
      { name:'深い青',          hex:'#1a3a5c', desc:'深夜の水面のような', dark:true },
      { name:'水底の青緑',      hex:'#3a7a7a', desc:'閉鎖されたプールの底', dark:true },
      { name:'夜明け前の空',    hex:'#2a3a58', desc:'まだ誰も起きていない時間の色', dark:true },
      { name:'氷の蒼',          hex:'#a8c8d8', desc:'凍りついた湖面に差す光' },
      { name:'遠い山の青',      hex:'#6888a8', desc:'もう戻れない場所の色', dark:true },
    ],
  },
  {
    label: '静寂・無機質',
    colors: [
      { name:'脱色された全体',  hex:'#b0b0b8', desc:'色が抜けて、何もかもが等しくなった', dark:true },
      { name:'灰色がかった紫',  hex:'#7a6e8f', desc:'夢と現実の境界の色', dark:true },
      { name:'煤けた黒',        hex:'#2a2a30', desc:'使われなくなった機械の表面', dark:true },
      { name:'病院の壁',        hex:'#d0d4cc', desc:'清潔だが、温もりがない' },
      { name:'コンクリートの灰',hex:'#909090', desc:'何もないことを主張する色', dark:true },
      { name:'白みがかった銀',  hex:'#c8ccd0', desc:'蛍光灯の下でだけ存在する色' },
      { name:'鉛色',            hex:'#707880', desc:'重く、どこにでも漂っている', dark:true },
    ],
  },
  {
    label: '生命・有機',
    colors: [
      { name:'くすんだ緑',      hex:'#6b8c6b', desc:'かつて生き生きとしていた何かの残り', dark:true },
      { name:'蛍光灯の緑',      hex:'#c0d4b0', desc:'深夜のコンビニの天井に滲む色' },
      { name:'苔の緑',          hex:'#4a6840', desc:'人間が去ったあとに繁茂するもの', dark:true },
      { name:'枯れ草',          hex:'#c0a060', desc:'夏の終わりの匂いがする' },
      { name:'濁った水',        hex:'#788870', desc:'長い間動いていない水の色', dark:true },
      { name:'薄い草色',        hex:'#a8c890', desc:'春の終わりの午後' },
    ],
  },
  {
    label: '夕暮れ・終わり',
    colors: [
      { name:'暗い橙',          hex:'#b86830', desc:'夕暮れが永遠に続いているような', dark:true },
      { name:'夕焼けの残照',    hex:'#d87040', desc:'誰も見ていない窓の外の色', dark:true },
      { name:'錆びた赤',        hex:'#a04030', desc:'かつて情熱的だったものが酸化した色', dark:true },
      { name:'くすんだ朱',      hex:'#c86040', desc:'薄れかけた警告のような', dark:true },
      { name:'燃え残りの橙',    hex:'#e09060', desc:'消える直前の残り火' },
      { name:'夕陽の桃',        hex:'#e8a888', desc:'今日も終わると知っている色' },
    ],
  },
  {
    label: '異常・非現実',
    colors: [
      { name:'毒々しい緑',      hex:'#60c060', desc:'自然界にあってはならない明るさ', dark:true },
      { name:'電子の青',        hex:'#40a0ff', desc:'画面の中にしか存在しない色', dark:true },
      { name:'蛍光ピンク',      hex:'#ff70a0', desc:'現実の色ではないと本能が言う', dark:true },
      { name:'紫外線の紫',      hex:'#8040c0', desc:'見えているのに見えてはいけない色', dark:true },
      { name:'白飛びした光',    hex:'#f0f8ff', desc:'露出オーバーで消えてしまった現実' },
      { name:'ノイズの灰',      hex:'#989898', desc:'信号が途切れたときの色', dark:true },
    ],
  },
]

export default function ColorZukan() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const displayed = activeCategory
    ? CATEGORIES.filter(c => c.label === activeCategory)
    : CATEGORIES

  const totalCount = CATEGORIES.reduce((n, c) => n + c.colors.length, 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>// COLOR_ZUKAN</span>
        <span className={styles.count}>{totalCount} colors</span>
      </div>

      {/* カテゴリフィルター */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${!activeCategory ? styles.filterActive : ''}`}
          onClick={() => setActiveCategory(null)}
        >ALL</button>
        {CATEGORIES.map(c => (
          <button
            key={c.label}
            className={`${styles.filterBtn} ${activeCategory === c.label ? styles.filterActive : ''}`}
            onClick={() => setActiveCategory(activeCategory === c.label ? null : c.label)}
          >{c.label}</button>
        ))}
      </div>

      {/* カラーグリッド */}
      {displayed.map(cat => (
        <div key={cat.label} className={styles.category}>
          <span className={styles.categoryLabel}>{cat.label}</span>
          <div className={styles.grid}>
            {cat.colors.map(p => (
              <div key={p.name} className={styles.card}>
                <div className={styles.swatch} style={{ background: p.hex }}>
                  <span className={`${styles.hex} ${p.dark ? styles.hexLight : ''}`}>
                    {p.hex}
                  </span>
                </div>
                <div className={styles.info}>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.desc}>{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
