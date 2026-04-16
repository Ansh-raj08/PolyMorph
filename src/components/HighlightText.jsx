function HighlightText({ children, variant = 'solid' }) {
  const normalizedVariant = variant === 'gradient' ? 'gradient' : 'solid'
  const variantClass =
    normalizedVariant === 'gradient'
      ? 'highlight-text-gradient'
      : 'highlight-text-solid'

  return <span className={`highlight-text ${variantClass}`}>{children}</span>
}

export default HighlightText
