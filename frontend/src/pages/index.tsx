// pages/index.tsx
// 起動時のエントリポイント → スプラッシュ画面へリダイレクト
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/splash')
  }, [])

  // リダイレクト中は何も表示しない
  return null
}
