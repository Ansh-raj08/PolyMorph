const cardTones = {
  pdf: 'from-rose-500/20 via-red-500/10 to-transparent',
  word: 'from-blue-500/20 via-sky-500/10 to-transparent',
  image: 'from-emerald-500/20 via-green-500/10 to-transparent',
  audio: 'from-amber-500/20 via-orange-500/10 to-transparent',
  video: 'from-cyan-500/20 via-indigo-500/10 to-transparent',
}

function ConversionCard({ conversion, onSelect }) {
  const tone = cardTones[conversion.category] ?? cardTones.pdf

  return (
    <button
      type="button"
      onClick={() => onSelect(conversion)}
      className="card-shell card-glow group h-full"
    >
      <span
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-80`}
      />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-slate-200/20 bg-slate-950/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            {conversion.category}
          </span>
          <span className="text-xs text-slate-400 transition group-hover:text-cyan-200">
            Click to convert
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
    </button>
  )
}

export default ConversionCard
