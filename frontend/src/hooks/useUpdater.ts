import { useEffect, useState } from 'react'

interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  releaseNotes:   string
}

// idle        : 何もなし
// available   : 新バージョンあり（ユーザーに確認中）
// downloading : ダウンロード中
// downloaded  : ダウンロード完了（再起動待ち）
// error       : エラー
type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export function useUpdater() {
  const [updateInfo,  setUpdateInfo]  = useState<UpdateInfo | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>('idle')
  const [progress,    setProgress]    = useState(0)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return

    window.electron.onUpdateAvailable(info => {
      setUpdateInfo(info)
      setUpdateState('available')
    })

    window.electron.onUpdateProgress(({ percent }) => {
      setProgress(percent)
      setUpdateState('downloading')
    })

    window.electron.onUpdateDownloaded(() => {
      setProgress(100)
      setUpdateState('downloaded')
    })

    window.electron.onUpdateError(({ message }) => {
      setErrorMsg(message)
      setUpdateState('error')
    })
  }, [])

  // OKを押したとき: available→DL開始 / downloaded→再起動
  const confirm = () => {
    if (updateState === 'available') {
      window.electron?.confirmUpdate()
    } else if (updateState === 'downloaded') {
      window.electron?.installUpdate()
    }
  }

  const dismiss = () => {
    setUpdateState('idle')
    setUpdateInfo(null)
    setErrorMsg(null)
  }

  return { updateInfo, updateState, progress, errorMsg, confirm, dismiss }
}