import { useTheme } from '../context/ThemeContext'

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme()

  const handleThemeToggle = (event) => {
    const buttonBounds = event.currentTarget.getBoundingClientRect()
    toggleTheme({
      x: buttonBounds.left + buttonBounds.width / 2,
      y: buttonBounds.top + buttonBounds.height / 2,
    })
  }

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="theme-toggle app-button-glow"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`theme-toggle-icon theme-toggle-icon-sun ${
          isDarkMode ? 'theme-icon-hidden' : 'theme-icon-visible'
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="4.4" />
          <path d="M12 2.75V5.1" />
          <path d="M12 18.9v2.35" />
          <path d="m4.82 4.82 1.65 1.65" />
          <path d="m17.53 17.53 1.65 1.65" />
          <path d="M2.75 12H5.1" />
          <path d="M18.9 12h2.35" />
          <path d="m4.82 19.18 1.65-1.65" />
          <path d="m17.53 6.47 1.65-1.65" />
        </svg>
      </span>
      <span
        className={`theme-toggle-icon theme-toggle-icon-moon ${
          isDarkMode ? 'theme-icon-visible' : 'theme-icon-hidden'
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M20.2 14.66A8.7 8.7 0 1 1 9.34 3.8a7.15 7.15 0 1 0 10.86 10.86Z" />
        </svg>
      </span>
    </button>
  )
}

export default ThemeToggle
