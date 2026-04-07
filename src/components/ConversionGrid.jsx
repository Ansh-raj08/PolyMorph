import ConversionCard from './ConversionCard'
import {
  isLimitedConversion,
  isSupportedConversion,
} from '../data/conversions'

function ConversionGrid({ conversions, onSelectConversion }) {
  if (!conversions.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-200/20 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
        No converters match this category yet.
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {conversions.map((conversion) => (
        <ConversionCard
          key={conversion.id}
          conversion={conversion}
          isSupported={isSupportedConversion(conversion)}
          isLimited={isLimitedConversion(conversion)}
          onSelect={onSelectConversion}
        />
      ))}
    </div>
  )
}

export default ConversionGrid
