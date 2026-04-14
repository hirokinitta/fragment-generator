interface UpdateInfo {
  currentVersion: string
  latestVersion:  string
  downloadUrl:    string
  releaseNotes:   string
}

interface ElectronAPI {
  getBackendUrl:     () => Promise<string>
  getVersion:        () => Promise<string>
  minimize:          () => void
  maximize:          () => void
  close:             () => void
  // アップデート
  onUpdateAvailable: (cb: (info: UpdateInfo) => void) => void
  confirmUpdate:     (info: UpdateInfo) => void
  cancelUpdate:      () => void
  checkUpdate:       () => void
  onUpdateProgress:  (cb: (data: { percent: number }) => void) => void
  onUpdateError:     (cb: (data: { message: string }) => void) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}
