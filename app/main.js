const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn }   = require('child_process')
const path        = require('path')
const fs          = require('fs')
const https       = require('https')
const http        = require('http')
const os          = require('os')
const AdmZip      = require('adm-zip')

// ── 設定 ─────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = '0.1.0'
const GITHUB_REPO     = 'hirokinitta/fragment-generator'
const BACKEND_PORT    = 8765
const FRONTEND_PORT   = 8766
const IS_DEV          = process.env.NODE_ENV === 'development'

let mainWindow   = null
let backendProc  = null
let staticServer = null
let isOnlineMode = false

// ── オンラインモード ─────────────────────────────────────────────────────────
function setOnlineMode(enabled) {
  isOnlineMode = enabled
  console.log(`[mode] Online: ${enabled}`)
  mainWindow?.webContents.send('online-mode-changed', { isOnline: enabled })
  if (enabled) checkForUpdate()
}

function checkConnectivity() {
  return new Promise(resolve => {
    const req = https.get('https://api.github.com', { timeout: 5000 }, res => {
      resolve(res.statusCode < 500)
      res.resume()
    })
    req.on('error',   () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
  })
}

// ── 静的ファイルサーバー ─────────────────────────────────────────────────────
function getFrontendDir() {
  const userDataOut = path.join(app.getPath('userData'), 'frontend', 'out')
  if (fs.existsSync(userDataOut) && fs.readdirSync(userDataOut).length > 0) {
    console.log('[static] Using userData frontend:', userDataOut)
    return userDataOut
  }
  const bundledOut = path.join(__dirname, '../frontend/out')
  console.log('[static] Using bundled frontend:', bundledOut)
  return bundledOut
}

function startStaticServer() {
  if (staticServer) {
    staticServer.close()
    staticServer = null
  }

  const outDir = getFrontendDir()
  console.log('[static] Serving from:', outDir)

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
    console.log(`[static] Listening on http://127.0.0.1:${FRONTEND_PORT}`)
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
    console.error('[Electron] Backend not found:', binPath)
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
  backendProc.on('exit', code => console.log('[backend] exited:', code))
}

// ── アップデートチェック ─────────────────────────────────────────────────────
function checkForUpdate() {
  if (!isOnlineMode) return
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
  https.get(url, { headers: { 'User-Agent': 'fragment-generator' } }, res => {
    let data = ''
    res.on('data', c => (data += c))
    res.on('end', () => {
      try {
        const release       = JSON.parse(data)
        const latestVer     = release.tag_name?.replace(/^v/, '') ?? null
        const frontendAsset = release.assets?.find(a => a.name === 'frontend.zip')
        const frontendUrl   = frontendAsset?.browser_download_url ?? null

        console.log('[updater] latest:', latestVer, 'current:', CURRENT_VERSION)
        console.log('[updater] frontendUrl:', frontendUrl)

        if (!latestVer || latestVer === CURRENT_VERSION) {
          console.log('[updater] Already latest')
          return
        }

        mainWindow?.webContents.send('update-available', {
          currentVersion: CURRENT_VERSION,
          latestVersion:  latestVer,
          downloadUrl:    frontendUrl,
          releaseNotes:   release.body ?? '',
          canHotUpdate:   !!frontendUrl,
        })
      } catch (e) {
        console.error('[updater] parse error:', e)
      }
    })
  }).on('error', e => console.log('[updater] error:', e.message))
}

// ── ダウンロード（リダイレクト対応）────────────────────────────────────────
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    function doGet(url, redirects = 0) {
      if (redirects > 5) { reject(new Error('Too many redirects')); return }
      const client = url.startsWith('https') ? https : http
      client.get(url, { headers: { 'User-Agent': 'fragment-generator' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          doGet(res.headers.location, redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        res.on('data', chunk => {
          downloaded += chunk.length
          file.write(chunk)
          if (total > 0) onProgress(Math.round(downloaded / total * 60))
        })
        res.on('end',   () => { file.end(); resolve() })
        res.on('error', reject)
      }).on('error', reject)
    }

    doGet(url)
  })
}

// ── ホットアップデート ───────────────────────────────────────────────────────
async function hotUpdate(downloadUrl, latestVersion) {
  const send = (percent, message) =>
    mainWindow?.webContents.send('update-progress', { percent, message })

  const tmpZip  = path.join(os.tmpdir(), `fg-${latestVersion}.zip`)
  const outDir  = path.join(app.getPath('userData'), 'frontend', 'out')

  try {
    // ── Step1: ダウンロード ───────────────────────────────────────────────
    send(0, 'ダウンロード中...')
    console.log('[hotUpdate] Downloading:', downloadUrl)
    await downloadFile(downloadUrl, tmpZip, p => send(p, `ダウンロード中... ${p}%`))
    console.log('[hotUpdate] Download complete:', tmpZip)
    console.log('[hotUpdate] File size:', fs.statSync(tmpZip).size)

    // ── Step2: AdmZipで展開 ───────────────────────────────────────────────
    send(65, '展開中...')
    const zip = new AdmZip(tmpZip)
    const entries = zip.getEntries()
    console.log('[hotUpdate] ZIP entries:', entries.length)
    console.log('[hotUpdate] First entries:',
      entries.slice(0, 5).map(e => e.entryName))

    // ── Step3: outDirを準備して展開 ───────────────────────────────────────
    send(75, '適用中...')
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true })
      console.log('[hotUpdate] Removed old outDir')
    }
    fs.mkdirSync(outDir, { recursive: true })

    // zipを outDir に直接展開
    zip.extractAllTo(outDir, true)
    console.log('[hotUpdate] Extracted to:', outDir)
    console.log('[hotUpdate] outDir contents:', fs.readdirSync(outDir))

    // ── Step4: 検証 ──────────────────────────────────────────────────────
    const splashExists = fs.existsSync(path.join(outDir, 'splash', 'index.html'))
    const mainExists   = fs.existsSync(path.join(outDir, 'main',   'index.html'))
    console.log('[hotUpdate] splash/index.html:', splashExists)
    console.log('[hotUpdate] main/index.html:',   mainExists)

    if (!splashExists) {
      throw new Error('展開されたファイルにsplash/index.htmlがありません')
    }

    // ── Step5: 後処理 ─────────────────────────────────────────────────────
    send(90, '後処理中...')
    try { fs.rmSync(tmpZip, { force: true }) } catch (_) {}

    send(100, '完了！画面を更新します...')
    console.log('[hotUpdate] Success! Reloading...')

    await new Promise(r => setTimeout(r, 1000))
    startStaticServer()
    mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/`)

  } catch (err) {
    console.error('[hotUpdate] Error:', err)
    mainWindow?.webContents.send('update-error', { message: err.message })
    try { fs.rmSync(tmpZip, { force: true }) } catch (_) {}
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('set-online-mode', async (_e, { enabled }) => {
  if (enabled) {
    const ok = await checkConnectivity()
    if (!ok) {
      mainWindow?.webContents.send('online-mode-error', {
        message: 'インターネットに接続できませんでした',
      })
      return
    }
  }
  setOnlineMode(enabled)
})

ipcMain.handle('get-online-mode', () => isOnlineMode)
ipcMain.on('update-check-manual', () => checkForUpdate())

ipcMain.on('update-confirm', (_e, { downloadUrl, latestVersion }) => {
  if (downloadUrl) hotUpdate(downloadUrl, latestVersion)
})

ipcMain.on('update-cancel', () => console.log('[updater] cancelled'))
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
})

app.on('window-all-closed', () => {
  backendProc?.kill()
  staticServer?.close()
  if (process.platform !== 'darwin') app.quit()
})
