interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  releaseNotes:   string
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
  checkUpdate:          () => void
  confirmUpdate:        () => void
  installUpdate:        () => void
  onUpdateAvailable:    (cb: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (cb: () => void) => void
  onUpdateProgress:     (cb: (data: { percent: number; message?: string }) => void) => void
  onUpdateDownloaded:   (cb: () => void) => void
  onUpdateError:        (cb: (data: { message: string }) => void) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}