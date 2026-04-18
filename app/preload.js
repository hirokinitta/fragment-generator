const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getVersion:    () => ipcRenderer.invoke('get-version'),

  // ウィンドウ操作
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // ── オンライン/オフライン切り替え ──────────────────────────────────────
  getOnlineMode:  ()          => ipcRenderer.invoke('get-online-mode'),
  setOnlineMode:  (enabled)   => ipcRenderer.send('set-online-mode', { enabled }),
  onOnlineModeChanged: (cb)   => ipcRenderer.on('online-mode-changed', (_e, data) => cb(data)),
  onOnlineModeError:   (cb)   => ipcRenderer.on('online-mode-error',   (_e, data) => cb(data)),

  // ── アップデート ────────────────────────────────────────────────────────
  onUpdateAvailable:  (cb) => ipcRenderer.on('update-available',  (_e, info) => cb(info)),
  confirmUpdate:      (info)   => ipcRenderer.send('update-confirm', info),
  cancelUpdate:       ()       => ipcRenderer.send('update-cancel'),
  checkUpdate:        ()       => ipcRenderer.send('update-check-manual'),
  onUpdateProgress:   (cb) => ipcRenderer.on('update-progress', (_e, data) => cb(data)),
  onUpdateError:      (cb) => ipcRenderer.on('update-error',    (_e, data) => cb(data)),
})
