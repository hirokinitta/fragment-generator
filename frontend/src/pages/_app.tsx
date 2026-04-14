import type { AppProps } from 'next/app'
import { useState, useEffect, createContext, useContext } from 'react'
import '../styles/globals.css'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: 'dark', toggle: () => {} })

export function useTheme() { return useContext(ThemeContext) }

export default function App({ Component, pageProps }: AppProps) {
  const [theme,   setTheme]   = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('fg-theme') as Theme | null
    if (saved) setTheme(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fg-theme', theme)
  }, [theme, mounted])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <Component {...pageProps} />
    </ThemeContext.Provider>
  )
}
