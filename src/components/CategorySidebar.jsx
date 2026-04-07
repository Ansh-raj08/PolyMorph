const categoryStyles = {
  all: 'from-slate-300/20 to-slate-500/5',
  pdf: 'from-rose-400/20 to-red-500/5',
  word: 'from-blue-400/20 to-sky-500/5',
  excel: 'from-emerald-400/20 to-green-500/5',
  powerpoint: 'from-amber-300/20 to-orange-500/5',
  image: 'from-emerald-400/20 to-green-500/5',
  audio: 'from-amber-300/20 to-orange-500/5',
  video: 'from-cyan-300/20 to-indigo-500/5',
}

function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  conversions,
}) {
  const getCategoryCount = (categoryId) => {
    if (categoryId === 'all') {
      return conversions.length
    }

    return conversions.filter((conversion) => conversion.category === categoryId)
      .length
  }

  return (
    <aside className="glass-panel animate-rise rounded-3xl p-4 sm:p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
        File Types
      </p>
      <h2 className="mt-2 font-display text-lg text-slate-100">Categories</h2>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {categories.map((category) => {
          const isActive = category.id === selectedCategory

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`group relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                isActive
                  ? 'border-cyan-300/40 bg-slate-800/80'
                  : 'border-slate-200/10 bg-slate-900/40 hover:border-slate-200/30 hover:bg-slate-800/65'
              }`}
            >
              <span
                className={`absolute inset-0 bg-gradient-to-r opacity-60 transition group-hover:opacity-100 ${
                  categoryStyles[category.id] ?? categoryStyles.all
                }`}
              />

              <span className="relative flex items-center justify-between gap-2">
                <span className="font-display text-sm uppercase tracking-[0.18em] text-slate-100">
                  {category.label}
                </span>
                <span className="rounded-md border border-slate-200/20 bg-slate-950/50 px-1.5 py-0.5 text-xs text-slate-300">
                  {getCategoryCount(category.id)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default CategorySidebar
