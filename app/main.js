const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn }   = require('child_process')
const path        = require('path')
const fs          = require('fs')
const https       = require('https')
const http        = require('http')
const os          = require('os')

// ── 設定 ─────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = '0.1.0'
const GITHUB_REPO     = 'yourname/fragment-generator'
const BACKEND_PORT    = 8765
const FRONTEND_PORT   = 8766   // 静的ファイルサーバーのポート
const IS_DEV          = process.env.NODE_ENV === 'development'

let mainWindow   = null
let backendProc  = null
let staticServer = null   // 静的ファイルサーバー

// ── 静的ファイルサーバー（本番用）────────────────────────────────────────────
// Electronの loadFile は CSS の絶対パスが壊れるため
// ローカルHTTPサーバーで Next.js の out/ を配信する
function startStaticServer() {
  const outDir = path.join(__dirname, '../frontend/out')

  staticServer = http.createServer((req, res) => {
    // URLのデコードとクリーニング
    let urlPath = decodeURIComponent(req.url.split('?')[0])

    // / → /splash/index.html（エントリポイント）
    if (urlPath === '/') urlPath = '/splash/index.html'

    // /splash → /splash/index.html（trailingSlash対応）
    if (!path.extname(urlPath)) {
      urlPath = urlPath.replace(/\/?$/, '/index.html')
    }

    const filePath = path.join(outDir, urlPath)

    // MIMEタイプの判定
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'application/javascript',
      '.css':  'text/css',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.svg':  'image/svg+xml',
      '.ico':  'image/x-icon',
      '.json': 'application/json',
      '.woff': 'font/woff',
      '.woff2':'font/woff2',
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // ファイルが見つからない場合はsplashにフォールバック
        const fallback = path.join(outDir, 'splash/index.html')
        fs.readFile(fallback, (err2, data2) => {
          if (err2) {
            res.writeHead(404)
            res.end('Not found')
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(data2)
        })
        return
      }
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(data)
    })
  })

  staticServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
    console.log(`[static] Serving frontend on http://127.0.0.1:${FRONTEND_PORT}`)
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
    console.log('[Electron] Dev mode: run `go run ./backend` separately')
    return
  }
  if (!fs.existsSync(binPath)) {
    console.error('[Electron] Backend binary not found:', binPath)
    return
  }
  backendProc = spawn(binPath, [], {
    env: {
      ...process.env,
      FRAGMENT_PORT: String(BACKEND_PORT),
      FRAGMENT_DB:   path.join(app.getPath('userData'), 'fragments.db'),
    },
  })
  backendProc.stdout.on('data', d => console.log('[backend]', d.toString().trim()))
  backendProc.stderr.on('data', d => console.error('[backend]', d.toString().trim()))
  backendProc.on('exit', code => console.log('[Electron] Backend exited:', code))
}

// ── アップデートチェック ─────────────────────────────────────────────────────
function checkForUpdate() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
  https.get(url, { headers: { 'User-Agent': 'fragment-generator' } }, res => {
    let data = ''
    res.on('data', chunk => (data += chunk))
    res.on('end', () => {
      try {
        const release     = JSON.parse(data)
        const latestVer   = release.tag_name?.replace(/^v/, '') ?? null
        const exeAsset    = release.assets?.find(a =>
          a.name.endsWith('.exe') && a.name.includes('Setup')
        )
        const downloadUrl = exeAsset?.browser_download_url
        if (latestVer && latestVer !== CURRENT_VERSION && downloadUrl) {
          mainWindow?.webContents.send('update-available', {
            currentVersion: CURRENT_VERSION,
            latestVersion:  latestVer,
            downloadUrl,
            releaseNotes:   release.body ?? '',
          })
        }
      } catch (e) {
        console.error('[updater] parse error:', e)
      }
    })
  }).on('error', e => console.log('[updater] offline:', e.message))
}

// ── アップデートダウンロード ─────────────────────────────────────────────────
function downloadAndInstallUpdate(downloadUrl, latestVersion) {
  const tmpFile = path.join(os.tmpdir(), `fg-${latestVersion}-setup.exe`)
  const sendProgress = p => mainWindow?.webContents.send('update-progress', { percent: p })

  sendProgress(0)
  const file = fs.createWriteStream(tmpFile)

  function download(url, redirectCount = 0) {
    if (redirectCount > 3) {
      mainWindow?.webContents.send('update-error', { message: 'リダイレクトが多すぎます' })
      return
    }
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'fragment-generator' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, redirectCount + 1)
        return
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0
      res.on('data', chunk => {
        downloaded += chunk.length
        file.write(chunk)
        if (total > 0) sendProgress(Math.round(downloaded / total * 100))
      })
      res.on('end', () => {
        file.end()
        sendProgress(100)
        setTimeout(() => {
          spawn(tmpFile, ['/S'], { detached: true, stdio: 'ignore' }).unref()
          backendProc?.kill()
          staticServer?.close()
          app.quit()
        }, 500)
      })
      res.on('error', err => mainWindow?.webContents.send('update-error', { message: err.message }))
    }).on('error', err => mainWindow?.webContents.send('update-error', { message: err.message }))
  }
  download(downloadUrl)
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('update-check-manual', () => checkForUpdate())
ipcMain.on('update-confirm',  (_e, { downloadUrl, latestVersion }) =>
  downloadAndInstallUpdate(downloadUrl, latestVersion))
ipcMain.on('update-cancel',   () => console.log('[updater] cancelled'))
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
    // ローカルサーバー経由でロード（CSSパスが正しく解決される）
    mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/`)
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── アプリライフサイクル ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend()
  if (!IS_DEV) startStaticServer()
  createWindow()
  setTimeout(checkForUpdate, 3000)
})

app.on('window-all-closed', () => {
  backendProc?.kill()
  staticServer?.close()
  if (process.platform !== 'darwin') app.quit()
})
