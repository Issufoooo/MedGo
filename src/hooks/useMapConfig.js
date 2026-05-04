import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const DEFAULT_REF = {
  lat: -25.9650,
  lng: 32.5699,
  label: 'MedGo HQ',
}

export function useMapConfig() {
  return useQuery({
    queryKey: ['mapConfig'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['map_reference_lat', 'map_reference_lng', 'map_reference_label'])

      if (!data?.length) return DEFAULT_REF

      const m = Object.fromEntries(data.map(r => [r.key, r.value]))
      return {
        lat: m.map_reference_lat ? parseFloat(m.map_reference_lat) : DEFAULT_REF.lat,
        lng: m.map_reference_lng ? parseFloat(m.map_reference_lng) : DEFAULT_REF.lng,
        label: m.map_reference_label || DEFAULT_REF.label,
      }
    },
    staleTime: 60_000,
  })
}
