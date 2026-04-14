const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // バックエンドURL
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getVersion:    () => ipcRenderer.invoke('get-version'),

  // ウィンドウ操作
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // ── アップデート ────────────────────────────────────────────────────────
  // アップデート情報が届いたとき（自動チェック）
  onUpdateAvailable: (cb) =>
    ipcRenderer.on('update-available', (_e, info) => cb(info)),

  // フロントから「OK」→ダウンロード開始をメインプロセスに伝える
  confirmUpdate: (info) =>
    ipcRenderer.send('update-confirm', info),

  // フロントから「キャンセル」
  cancelUpdate: () =>
    ipcRenderer.send('update-cancel'),

  // 手動チェックボタン用
  checkUpdate: () =>
    ipcRenderer.send('update-check-manual'),

  // ダウンロード進捗（0〜100）
  onUpdateProgress: (cb) =>
    ipcRenderer.on('update-progress', (_e, data) => cb(data)),

  // エラー通知
  onUpdateError: (cb) =>
    ipcRenderer.on('update-error', (_e, data) => cb(data)),
})
