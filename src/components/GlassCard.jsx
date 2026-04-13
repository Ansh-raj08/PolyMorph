function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  const combinedClassName = ['liquid-glass', className].filter(Boolean).join(' ')

  return (
    <Component className={combinedClassName} {...props}>
      {children}
    </Component>
  )
}

export default GlassCard
