import ThemeToggle from './ThemeToggle'

function DashboardNavbar() {
  return (
    <header className="glass-panel animate-rise flex items-center justify-between rounded-2xl px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-600 p-[1px] shadow-[0_12px_28px_-18px_rgba(56,189,248,0.9)]">
          <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950/90 font-display text-sm font-bold text-cyan-100">
            PM
          </div>
        </div>

        <div>
          <p className="text-theme-primary font-display text-sm uppercase tracking-[0.22em]">
            PolyMorph
          </p>
          <p className="text-theme-muted text-xs">
            Polymorph – A multi-format file conversion engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <button
          type="button"
          className="liquid-button hidden rounded-lg px-3 py-1.5 text-sm sm:inline-flex"
        >
          API Docs
        </button>

        <button
          type="button"
          className="liquid-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Start Free
        </button>
      </div>
    </header>
  )
}

export default DashboardNavbar
