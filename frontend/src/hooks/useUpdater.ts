import { useEffect, useState } from 'react'

interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  releaseNotes:   string
}

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export function useUpdater() {
  const [updateInfo,   setUpdateInfo]   = useState<UpdateInfo | null>(null)
  const [updateState,  setUpdateState]  = useState<UpdateState>('idle')
  const [progress,     setProgress]     = useState(0)
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

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

  const install = () => window.electron?.installUpdate()
  const dismiss = () => { setUpdateState('idle'); setUpdateInfo(null) }

  return { updateInfo, updateState, progress, errorMsg, install, dismiss }
}