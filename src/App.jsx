import { useMemo, useState } from 'react'
import CategorySidebar from './components/CategorySidebar'
import ConversionGrid from './components/ConversionGrid'
import ConverterModal from './components/ConverterModal'
import DashboardNavbar from './components/DashboardNavbar'
import FileUploadExample from './components/FileUploadExample'
import GlassCard from './components/GlassCard'
import HighlightText from './components/HighlightText'
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
      <span className="ambient-dot ambient-dot-a -left-24 top-10 h-64 w-64" />
      <span className="ambient-dot ambient-dot-b right-0 top-1/3 h-72 w-72" />
      <span className="ambient-dot ambient-dot-c bottom-0 left-1/3 h-64 w-64" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <DashboardNavbar />

        <main className="mt-6 grid flex-1 gap-5 lg:grid-cols-[260px_1fr]">
          <CategorySidebar
            categories={fileCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            conversions={conversionCatalog}
          />

          <GlassCard as="section" className="animate-rise rounded-3xl p-5 sm:p-6">
            <header className="flex flex-col gap-3 border-b border-slate-200/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-brand-accent-soft text-xs uppercase tracking-[0.28em]">
                  Workspace
                </p>
                <h1 className="text-theme-primary mt-2 font-display text-2xl font-semibold sm:text-3xl">
                  <HighlightText variant="gradient">Convert</HighlightText> your{' '}
                  <HighlightText>Files</HighlightText> in one clean flow
                </h1>
                <p className="text-theme-secondary mt-2 max-w-2xl text-sm sm:text-base">
                  Pick a conversion card, <HighlightText>Upload</HighlightText>{' '}
                  your file, and <HighlightText>Download</HighlightText> it in the
                  new format with live progress feedback.
                </p>
              </div>

              <div className="brand-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
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
          </GlassCard>
        </main>

        <footer className="text-theme-muted mt-8 border-t border-slate-200/10 pt-4 text-center text-xs sm:text-sm">
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
