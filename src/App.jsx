import { useMemo, useState } from 'react'
import CategorySidebar from './components/CategorySidebar'
import ConversionGrid from './components/ConversionGrid'
import ConverterModal from './components/ConverterModal'
import DashboardNavbar from './components/DashboardNavbar'
import FileUploadExample from './components/FileUploadExample'
import HistoryPanel from './components/HistoryPanel'
import { conversionCatalog, fileCategories } from './data/conversions'

function App() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeConversion, setActiveConversion] = useState(null)

  const filteredConversions = useMemo(() => {
    if (selectedCategory === 'all') {
      return conversionCatalog
    }

    return conversionCatalog.filter(
      (conversion) => conversion.category === selectedCategory,
    )
  }, [selectedCategory])

  return (
    <div className="relative min-h-screen">
      <span className="ambient-dot -left-24 top-10 h-64 w-64 bg-cyan-500/20" />
      <span className="ambient-dot right-0 top-1/3 h-72 w-72 bg-emerald-500/15" />
      <span className="ambient-dot bottom-0 left-1/3 h-64 w-64 bg-blue-500/15" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <DashboardNavbar />

        <main className="mt-6 grid flex-1 gap-5 lg:grid-cols-[260px_1fr]">
          <CategorySidebar
            categories={fileCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            conversions={conversionCatalog}
          />

          <section className="glass-panel animate-rise rounded-3xl p-5 sm:p-6">
            <header className="flex flex-col gap-3 border-b border-slate-200/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
                  Workspace
                </p>
                <h1 className="mt-2 font-display text-2xl font-semibold text-slate-100 sm:text-3xl">
                  Convert files in one clean flow
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300/80 sm:text-base">
                  Pick a conversion card, upload your file, and export in the
                  new format with live progress feedback.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {filteredConversions.length} tools
              </div>
            </header>

            <ConversionGrid
              conversions={filteredConversions}
              onSelectConversion={setActiveConversion}
            />

            <div className="mt-6">
              <FileUploadExample />
            </div>

            <div className="mt-6">
              <HistoryPanel />
            </div>
          </section>
        </main>

        <footer className="mt-8 border-t border-slate-200/10 pt-4 text-center text-xs text-slate-300/70 sm:text-sm">
          <p>Copyright - AnshDevLabs</p>
          <p className="mt-1">Made by - Ansh</p>
        </footer>
      </div>

      {activeConversion && (
        <ConverterModal
          key={activeConversion.id}
          conversion={activeConversion}
          onClose={() => setActiveConversion(null)}
        />
      )}
    </div>
  )
}

export default App
