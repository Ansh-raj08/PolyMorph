function DashboardNavbar() {
  return (
    <header className="glass-panel animate-rise flex items-center justify-between rounded-2xl px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-600 p-[1px]">
          <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950/90 font-display text-sm font-bold text-cyan-100">
            VC
          </div>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-[0.22em] text-slate-100">
            VarConverter
          </p>
          <p className="text-xs text-slate-400">Smart file conversion suite</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg border border-slate-200/15 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-200/30 hover:bg-slate-800/70 sm:inline-flex"
        >
          API Docs
        </button>

        <button
          type="button"
          className="rounded-lg bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        >
          Start Free
        </button>
      </div>
    </header>
  )
}

export default DashboardNavbar
