function GlassCard({ as: asElement = 'div', className = '', children, ...props }) {
  const Component = asElement
  const combinedClassName = ['liquid-glass', className].filter(Boolean).join(' ')

  return (
    <Component className={combinedClassName} {...props}>
      {children}
    </Component>
  )
}

export default GlassCard
