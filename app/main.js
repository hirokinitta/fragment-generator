const { app, BrowserWindow, ipcMain } = require('electron')
const { spawn }  = require('child_process')
const path       = require('path')
const fs         = require('fs')
const https      = require('https')
const http       = require('http')
const os         = require('os')
const { execSync } = require('child_process')

// ── 設定 ─────────────────────────────────────────────────────────────────────
const CURRENT_VERSION = '0.1.0'
const GITHUB_REPO     = 'yourname/fragment-generator' // ← 実際のリポジトリ名
const BACKEND_PORT    = 8765
const FRONTEND_PORT   = 8766
const IS_DEV          = process.env.NODE_ENV === 'development'

let mainWindow   = null
let backendProc  = null
let staticServer = null

// ── 静的ファイルサーバー ─────────────────────────────────────────────────────
function startStaticServer() {
  const outDir = path.join(__dirname, '../frontend/out')

  staticServer = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0])
    if (urlPath === '/') urlPath = '/splash/index.html'
    if (!path.extname(urlPath)) urlPath = urlPath.replace(/\/?$/, '/index.html')

    const filePath = path.join(outDir, urlPath)
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
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(data)
    })
  })

  staticServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
    console.log(`[static] Frontend on http://127.0.0.1:${FRONTEND_PORT}`)
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
        const release   = JSON.parse(data)
        const latestVer = release.tag_name?.replace(/^v/, '') ?? null

        // frontend.zip アセットを探す（フロントのみ差分更新）
        const frontendAsset = release.assets?.find(a => a.name === 'frontend.zip')
        const frontendUrl   = frontendAsset?.browser_download_url

        if (!latestVer || latestVer === CURRENT_VERSION) {
          console.log(`[updater] Already latest: ${CURRENT_VERSION}`)
          return
        }

        console.log(`[updater] New version: ${latestVer}`)
        mainWindow?.webContents.send('update-available', {
          currentVersion: CURRENT_VERSION,
          latestVersion:  latestVer,
          downloadUrl:    frontendUrl ?? null,
          releaseNotes:   release.body ?? '',
          // frontendUrlがある = 再インストール不要な差分更新が可能
          canHotUpdate:   !!frontendUrl,
        })
      } catch (e) {
        console.error('[updater] parse error:', e)
      }
    })
  }).on('error', e => console.log('[updater] offline:', e.message))
}

// ── ホットアップデート（再インストール不要）──────────────────────────────────
// GitHub Releases の frontend.zip をダウンロードして out/ に展開し再起動
async function hotUpdate(downloadUrl, latestVersion) {
  const tmpZip = path.join(os.tmpdir(), `fg-frontend-${latestVersion}.zip`)
  const outDir = path.join(__dirname, '../frontend/out')

  const sendProgress = (percent, message) => {
    mainWindow?.webContents.send('update-progress', { percent, message })
  }

  sendProgress(0, 'ダウンロード開始...')

  // ── Step1: ダウンロード ─────────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpZip)

    function download(url, redirectCount = 0) {
      if (redirectCount > 5) { reject(new Error('Too many redirects')); return }
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
          if (total > 0) sendProgress(
            Math.round(downloaded / total * 60), // 0〜60%をダウンロードに使う
            `ダウンロード中... ${Math.round(downloaded / total * 100)}%`
          )
        })
        res.on('end',   () => { file.end(); resolve() })
        res.on('error', reject)
      }).on('error', reject)
    }
    download(downloadUrl)
  })

  sendProgress(65, '展開中...')

  // ── Step2: 展開（PowerShellのExpand-Archiveを使用）───────────────────────
  const tmpExtract = path.join(os.tmpdir(), `fg-extract-${latestVersion}`)
  if (fs.existsSync(tmpExtract)) fs.rmSync(tmpExtract, { recursive: true })

  execSync(
    `powershell -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpExtract}' -Force"`,
    { timeout: 60000 }
  )

  sendProgress(80, '適用中...')

  // ── Step3: out/ を新しいファイルで置き換え ──────────────────────────────
  // 展開されたフォルダ構造: tmpExtract/out/ または tmpExtract/ 直下
  let srcDir = tmpExtract
  if (fs.existsSync(path.join(tmpExtract, 'out'))) {
    srcDir = path.join(tmpExtract, 'out')
  }

  // 古いout/を退避（ロールバック用）
  const backupDir = outDir + '_backup'
  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true })
  if (fs.existsSync(outDir))    fs.renameSync(outDir, backupDir)

  // 新しいファイルを配置
  fs.renameSync(srcDir, outDir)

  sendProgress(90, '後処理中...')

  // 一時ファイルを削除
  try {
    fs.rmSync(tmpZip,      { force: true })
    fs.rmSync(tmpExtract,  { recursive: true, force: true })
    fs.rmSync(backupDir,   { recursive: true, force: true })
  } catch (_) { /* 削除失敗は無視 */ }

  sendProgress(100, '完了！再起動します...')

  // ── Step4: 静的サーバーを再起動してウィンドウをリロード ─────────────────
  await new Promise(r => setTimeout(r, 800))

  staticServer?.close(() => {
    startStaticServer()
    mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/`)
  })
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('update-check-manual', () => checkForUpdate())

ipcMain.on('update-confirm', async (_e, { downloadUrl, latestVersion, canHotUpdate }) => {
  if (canHotUpdate && downloadUrl) {
    // ホットアップデート（再インストール不要）
    try {
      await hotUpdate(downloadUrl, latestVersion)
    } catch (err) {
      console.error('[hotUpdate] failed:', err)
      mainWindow?.webContents.send('update-error', {
        message: `更新に失敗しました: ${err.message}`,
      })
    }
  }
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
  setTimeout(checkForUpdate, 3000)
})

app.on('window-all-closed', () => {
  backendProc?.kill()
  staticServer?.close()
  if (process.platform !== 'darwin') app.quit()
})
