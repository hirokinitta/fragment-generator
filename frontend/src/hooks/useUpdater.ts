import { useEffect, useState } from 'react'

interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  downloadUrl:    string
  releaseNotes:   string
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return
    window.electron.onUpdateAvailable((info) => {
      setUpdateInfo(info)
    })
  }, [])

  const accept = () => {
    if (!updateInfo || !window.electron) return
    window.electron.confirmUpdate(updateInfo)
    setUpdateInfo(null)
  }

  const dismiss = () => setUpdateInfo(null)

  return { updateInfo, accept, dismiss }
}
