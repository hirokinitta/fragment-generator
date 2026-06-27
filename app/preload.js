const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getVersion:    () => ipcRenderer.invoke('get-version'),

  // ウィンドウ操作
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // オンライン/オフライン
  getOnlineMode:       ()          => ipcRenderer.invoke('get-online-mode'),
  setOnlineMode:       (enabled)   => ipcRenderer.send('set-online-mode', { enabled }),
  onOnlineModeChanged: (cb)        => ipcRenderer.on('online-mode-changed', (_e, data) => cb(data)),
  onOnlineModeError:   (cb)        => ipcRenderer.on('online-mode-error',   (_e, data) => cb(data)),

  // アップデート
  checkUpdate:          ()   => ipcRenderer.send('update-check-manual'),
  confirmUpdate:        ()   => ipcRenderer.send('update-confirm'),
  installUpdate:        ()   => ipcRenderer.send('update-install'),
  onUpdateAvailable:    (cb) => ipcRenderer.on('update-available',     (_e, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', (_e)       => cb()),
  onUpdateProgress:     (cb) => ipcRenderer.on('update-progress',      (_e, data) => cb(data)),
  onUpdateDownloaded:   (cb) => ipcRenderer.on('update-downloaded',    (_e)       => cb()),
  onUpdateError:        (cb) => ipcRenderer.on('update-error',         (_e, data) => cb(data)),
})