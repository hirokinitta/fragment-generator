/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

const nextConfig = {
  // 本番ビルド時のみ静的書き出し（Electron用）
  ...(isDev ? {} : { output: 'export', trailingSlash: true }),
  images: { unoptimized: true },

  // 開発時のみGoへプロキシ（本番はElectron経由でGoに直接アクセス）
  ...(isDev ? {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: 'http://127.0.0.1:8765/api/:path*' },
      ]
    },
  } : {}),
}

module.exports = nextConfig
