import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const THEME_STORAGE_KEY = 'theme'
const DARK_THEME = 'dark'
const LIGHT_THEME = 'light'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = createContext(null)

const isThemeValue = (value) => value === DARK_THEME || value === LIGHT_THEME

const readStoredTheme = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeValue(storedTheme) ? storedTheme : null
  } catch {
    return null
  }
}

const readSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DARK_THEME
  }

  return window.matchMedia(SYSTEM_QUERY).matches ? DARK_THEME : LIGHT_THEME
}

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
}

const getInitialTheme = () => {
  const storedTheme = readStoredTheme()
  const initialTheme = storedTheme || readSystemTheme()

  applyThemeToDocument(initialTheme)
  return initialTheme
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)
  const hasUserThemeRef = useRef(Boolean(readStoredTheme()))
  const rippleTimeoutRef = useRef(null)
  const switchingTimeoutRef = useRef(null)

  const triggerThemeMorph = useCallback((origin) => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    if (origin && Number.isFinite(origin.x) && Number.isFinite(origin.y)) {
      root.style.setProperty('--theme-ripple-x', `${origin.x}px`)
      root.style.setProperty('--theme-ripple-y', `${origin.y}px`)
    }

    root.classList.remove('theme-ripple-active')
    root.classList.remove('theme-switching')
    void root.offsetWidth
    root.classList.add('theme-ripple-active')
    root.classList.add('theme-switching')

    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current)
    }

    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current)
    }

    rippleTimeoutRef.current = setTimeout(() => {
      root.classList.remove('theme-ripple-active')
    }, 620)

    switchingTimeoutRef.current = setTimeout(() => {
      root.classList.remove('theme-switching')
    }, 480)
  }, [])

  const setThemeMode = useCallback(
    (nextTheme, origin) => {
      if (!isThemeValue(nextTheme)) {
        return
      }

      hasUserThemeRef.current = true
      triggerThemeMorph(origin)
      setTheme(nextTheme)
    },
    [triggerThemeMorph],
  )

  const toggleTheme = useCallback(
    (origin) => {
      hasUserThemeRef.current = true
      triggerThemeMorph(origin)
      setTheme((previousTheme) =>
        previousTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME,
      )
    },
    [triggerThemeMorph],
  )

  useEffect(() => {
    applyThemeToDocument(theme)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
      } catch {
        // Ignore persistence errors in restricted environments.
      }
    }
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(SYSTEM_QUERY)

    const handleSystemThemeChange = (event) => {
      if (hasUserThemeRef.current) {
        return
      }

      setTheme(event.matches ? DARK_THEME : LIGHT_THEME)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }

    mediaQuery.addListener(handleSystemThemeChange)
    return () => {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) {
        clearTimeout(rippleTimeoutRef.current)
      }

      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current)
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === DARK_THEME,
      setThemeMode,
      toggleTheme,
    }),
    [theme, setThemeMode, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

const useTheme = () => {
  const contextValue = useContext(ThemeContext)
  if (!contextValue) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return contextValue
}

export { ThemeProvider, useTheme, DARK_THEME, LIGHT_THEME }
