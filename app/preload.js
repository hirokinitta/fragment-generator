const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getVersion:    () => ipcRenderer.invoke('get-version'),

  // ウィンドウ操作
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // ── アップデート ────────────────────────────────────────────────────────
  checkUpdate:        ()     => ipcRenderer.send('update-check-manual'),
  installUpdate:      ()     => ipcRenderer.send('update-install'),
  onUpdateAvailable:  (cb)   => ipcRenderer.on('update-available',  (_e, info) => cb(info)),
  onUpdateProgress:   (cb)   => ipcRenderer.on('update-progress',   (_e, data) => cb(data)),
  onUpdateDownloaded: (cb)   => ipcRenderer.on('update-downloaded',  (_e)      => cb()),
  onUpdateError:      (cb)   => ipcRenderer.on('update-error',      (_e, data) => cb(data)),
})