async function getBaseUrl(): Promise<string> {
  if (typeof window !== 'undefined' && window.electron) {
    return await window.electron.getBackendUrl()
  }
  return ''
}

export interface Scene {
  id:      number
  title:   string
  scene:   string
  emotion: string
  environment: {
    location: string
    time:     string
    lighting: string
    weather:  string
  }
  composition: {
    angle:  string
    layout: string
  }
  anomaly:     string
  sound:       string
  color:       string
  nostalgia:   number
  anxiety:     number
  unreality:   number
  is_favorite: boolean
  is_drawn:    boolean
  created_at:  string
}

export interface GenerateParams {
  nostalgia?: number
  anxiety?:   number
  unreality?: number
}

export async function generateScene(params: GenerateParams = {}): Promise<Scene> {
  const base = await getBaseUrl()
  const q    = new URLSearchParams()
  if (params.nostalgia) q.set('nostalgia', String(params.nostalgia))
  if (params.anxiety)   q.set('anxiety',   String(params.anxiety))
  if (params.unreality) q.set('unreality', String(params.unreality))
  const res = await fetch(`${base}/api/generate?${q}`)
  if (!res.ok) throw new Error('generate failed')
  return res.json()
}

export async function fetchScenes(opts: {
  limit?:    number
  offset?:   number
  favorite?: boolean
} = {}): Promise<Scene[]> {
  const base = await getBaseUrl()
  const q    = new URLSearchParams()
  if (opts.limit)    q.set('limit',    String(opts.limit))
  if (opts.offset)   q.set('offset',   String(opts.offset))
  if (opts.favorite) q.set('favorite', '1')
  const res = await fetch(`${base}/api/scenes?${q}`)
  if (!res.ok) throw new Error('fetch scenes failed')
  return res.json()
}

export async function toggleFavorite(id: number, value: boolean): Promise<void> {
  const base = await getBaseUrl()
  await fetch(`${base}/api/scenes/favorite`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ id, value }),
  })
}

export async function toggleDrawn(id: number, value: boolean): Promise<void> {
  const base = await getBaseUrl()
  await fetch(`${base}/api/scenes/drawn`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ id, value }),
  })
}
