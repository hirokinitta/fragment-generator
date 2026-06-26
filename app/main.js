const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater }  = require('electron-updater')
const log              = require('electron-log')
const { spawn }        = require('child_process')
const path             = require('path')
const fs               = require('fs')
const https            = require('https')
const http             = require('http')

// ── 設定 ─────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = app.getVersion()
const BACKEND_PORT    = 8765
const FRONTEND_PORT   = 8766
const IS_DEV          = process.env.NODE_ENV === 'development'

let mainWindow  = null
let backendProc = null
let staticServer = null

// ── electron-updater 設定 ────────────────────────────────────────────────────
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = false

autoUpdater.on('update-available', info => {
  log.info('[updater] update available:', info.version)
  mainWindow?.webContents.send('update-available', {
    currentVersion: CURRENT_VERSION,
    latestVersion:  info.version,
    releaseNotes:   info.releaseNotes ?? '',
  })
})

autoUpdater.on('update-not-available', () => {
  log.info('[updater] already latest')
})

autoUpdater.on('download-progress', progress => {
  const percent = Math.round(progress.percent)
  log.info(`[updater] downloading: ${percent}%`)
  mainWindow?.webContents.send('update-progress', {
    percent,
    message: `ダウンロード中... ${percent}%`,
  })
})

autoUpdater.on('update-downloaded', () => {
  log.info('[updater] download complete')
  mainWindow?.webContents.send('update-downloaded')
})

autoUpdater.on('error', err => {
  log.error('[updater] error:', err)
  mainWindow?.webContents.send('update-error', { message: err.message })
})

function checkForUpdate() {
  if (IS_DEV) {
    log.info('[updater] skipped in dev mode')
    return
  }
  autoUpdater.checkForUpdates()
}

// ── 静的ファイルサーバー ─────────────────────────────────────────────────────
function startStaticServer() {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }

  const outDir = path.join(__dirname, '../frontend/out')
  log.info('[static] Serving from:', outDir)

  staticServer = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0])
    if (urlPath === '/') urlPath = '/splash/index.html'
    if (!path.extname(urlPath)) urlPath = urlPath.replace(/\/?$/, '/index.html')

    const filePath = path.join(outDir, urlPath)
    const ext = path.extname(filePath).toLowerCase()
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'application/javascript',
      '.css':  'text/css',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.svg':  'image/svg+xml',
      '.ico':  'image/x-icon',
      '.json': 'application/json',
      '.woff2':'font/woff2',
      '.woff': 'font/woff',
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const fallback = path.join(outDir, 'splash/index.html')
        fs.readFile(fallback, (err2, data2) => {
          if (err2) { res.writeHead(404); res.end('Not found'); return }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(data2)
        })
        return
      }
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
      res.end(data)
    })
  })

  staticServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
    log.info(`[static] Listening on http://127.0.0.1:${FRONTEND_PORT}`)
  })
}

// ── Goバックエンド起動 ───────────────────────────────────────────────────────
function getBackendPath() {
  if (IS_DEV) return null
  const ext = process.platform === 'win32' ? '.exe' : ''
  return path.join(process.resourcesPath, `backend${ext}`)
}

function startBackend() {
  const binPath = getBackendPath()
  if (!binPath || IS_DEV) {
    log.info('[backend] Dev mode: run `go run ./backend` separately')
    return
  }
  if (!fs.existsSync(binPath)) {
    log.error('[backend] not found:', binPath)
    return
  }
  backendProc = spawn(binPath, [], {
    env: {
      ...process.env,
      FRAGMENT_PORT: String(BACKEND_PORT),
      FRAGMENT_DB:   path.join(app.getPath('userData'), 'fragments.db'),
    },
  })
  backendProc.stdout.on('data', d => log.info('[backend]', d.toString().trim()))
  backendProc.stderr.on('data', d => log.error('[backend]', d.toString().trim()))
  backendProc.on('exit', code => log.info('[backend] exited:', code))
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('update-check-manual', () => checkForUpdate())

// 「今すぐ再起動してアップデート」ボタン用
ipcMain.on('update-install', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('get-backend-url', () => `http://localhost:${BACKEND_PORT}`)
ipcMain.handle('get-version',     () => CURRENT_VERSION)

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.on('window-close', () => {
  backendProc?.kill()
  staticServer?.close()
  mainWindow?.close()
})

// ── ウィンドウ生成 ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900, height: 680, minWidth: 700, minHeight: 500,
    frame:           false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  })

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/`)
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── アプリライフサイクル ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend()
  if (!IS_DEV) startStaticServer()
  createWindow()

  // ウィンドウ表示後に少し待ってからアップデート確認
  setTimeout(() => checkForUpdate(), 3000)
})

app.on('window-all-closed', () => {
  backendProc?.kill()
  staticServer?.close()
  if (process.platform !== 'darwin') app.quit()
})