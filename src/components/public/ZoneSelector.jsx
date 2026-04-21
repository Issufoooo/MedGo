import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../ui/Spinner'

const fmt = v => new Intl.NumberFormat('pt-MZ', { style:'currency', currency:'MZN', minimumFractionDigits:0 }).format(v)

export function ZoneSelector({ value, onChange, error }) {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data } = await supabase.from('delivery_zones').select('*').eq('is_active', true).order('sort_order')
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) return (
    <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
      <Spinner size="sm" /><span>A carregar zonas...</span>
    </div>
  )

  return (
    <div className="space-y-2">
      {zones.map(zone => {
        const selected = value === zone.id
        return (
          <label key={zone.id} className={`
            flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer
            transition-all duration-150
            ${selected
              ? 'border-teal-500 bg-teal-50/50 shadow-teal-sm'
              : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50/50'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                transition-colors ${selected ? 'border-teal-500' : 'border-slate-300'}
              `}>
                {selected && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">{zone.name}</p>
                {zone.description && <p className="text-xs text-slate-500 mt-0.5">{zone.description}</p>}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className={`font-extrabold text-sm ${selected ? 'text-teal-700' : 'text-slate-700'}`}>
                {fmt(zone.delivery_fee)}
              </p>
              <p className="text-2xs text-slate-400 font-medium">entrega</p>
            </div>
            <input type="radio" name="zone" value={zone.id} checked={selected}
              onChange={() => onChange(zone.id, zone.delivery_fee)} className="sr-only" />
          </label>
        )
      })}
      {error && (
        <p className="field-error">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
