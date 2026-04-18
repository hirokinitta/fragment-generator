interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  downloadUrl:    string | null
  releaseNotes:   string
  canHotUpdate:   boolean
}

interface ElectronAPI {
  getBackendUrl: () => Promise<string>
  getVersion:    () => Promise<string>
  minimize:      () => void
  maximize:      () => void
  close:         () => void

  // オンライン/オフライン
  getOnlineMode:       () => Promise<boolean>
  setOnlineMode:       (enabled: boolean) => void
  onOnlineModeChanged: (cb: (data: { isOnline: boolean }) => void) => void
  onOnlineModeError:   (cb: (data: { message: string }) => void) => void

  // アップデート
  onUpdateAvailable:  (cb: (info: UpdateInfo) => void) => void
  confirmUpdate:      (info: UpdateInfo) => void
  cancelUpdate:       () => void
  checkUpdate:        () => void
  onUpdateProgress:   (cb: (data: { percent: number; message?: string }) => void) => void
  onUpdateError:      (cb: (data: { message: string }) => void) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}
