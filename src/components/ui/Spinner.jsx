export function Spinner({ size = 'md', color = 'teal', className = '' }) {
  const s = { sm:'w-4 h-4 border-2', md:'w-5 h-5 border-2', lg:'w-8 h-8 border-2', xl:'w-12 h-12 border-[3px]' }
  const c = color === 'white' ? 'border-white/30 border-t-white' : 'border-teal-100 border-t-teal-500'
  return (
    <div className={`${s[size] || s.md} ${c} rounded-full animate-spin ${className}`}
      role="status" aria-label="A carregar" />
  )
}
