const cardTones = {
  pdf: 'from-rose-500/20 via-red-500/10 to-transparent',
  word: 'from-blue-500/20 via-sky-500/10 to-transparent',
  excel: 'from-emerald-500/20 via-green-500/10 to-transparent',
  powerpoint: 'from-orange-500/20 via-amber-500/10 to-transparent',
  image: 'from-emerald-500/20 via-green-500/10 to-transparent',
  audio: 'from-amber-500/20 via-orange-500/10 to-transparent',
  video: 'from-cyan-500/20 via-indigo-500/10 to-transparent',
}

function ConversionCard({ conversion, onSelect, isSupported, isLimited }) {
  const tone = cardTones[conversion.category] ?? cardTones.pdf
  const isInteractive = isSupported || isLimited

  const handleSelect = () => {
    if (!isInteractive) {
      return
    }

    onSelect(conversion)
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-disabled={!isInteractive}
      className={`card-shell group h-full ${
        isInteractive ? 'card-glow cursor-pointer' : 'card-shell-disabled cursor-default'
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-80`}
      />

      <div
        className={`relative flex h-full flex-col gap-5 ${
          isInteractive ? '' : 'blur-[1px] opacity-80'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200/20 bg-slate-950/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {conversion.category}
            </span>
            {isLimited && (
              <span className="rounded-full border border-amber-300/35 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                Limited
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 transition group-hover:text-cyan-200/90">
            {isSupported
              ? 'Click to convert'
              : isLimited
                ? 'Limited reliability'
                : 'Coming soon'}
          </span>
        </div>

        <div>
          <p className="font-display text-xl font-semibold text-slate-100">
            {conversion.from} <span className="text-cyan-300">-&gt;</span>{' '}
            {conversion.to}
          </p>
          <p className="mt-2 text-sm text-slate-300/85">{conversion.description}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
          <span>Accepts {conversion.accepts}</span>
          <span>Output .{conversion.outputExtension}</span>
        </div>
      </div>

      {!isInteractive && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/62">
          <span className="rounded-full border border-slate-200/20 bg-slate-950/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
            Coming Soon
          </span>
        </span>
      )}
    </button>
  )
}

export default ConversionCard
