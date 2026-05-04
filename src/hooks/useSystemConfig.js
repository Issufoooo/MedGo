import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Read one or many system_config keys.
 *
 * useSystemConfig(['whatsapp_number', 'tracking_base_url'])
 * → { data: { whatsapp_number: '+258...', tracking_base_url: 'https://...' }, isLoading }
 *
 * useSystemConfig('whatsapp_number')
 * → { data: '+258...', isLoading }
 */
export function useSystemConfig(keys) {
  const keysArr = Array.isArray(keys) ? keys : [keys]

  return useQuery({
    queryKey: ['system-config', ...keysArr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', keysArr)

      if (error) throw error

      const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))

      // Single key — return value directly
      if (!Array.isArray(keys)) return map[keys] ?? null

      // Multiple keys — return map
      return map
    },
    staleTime: 60_000,
  })
}

/**
 * Build a wa.me URL from system_config.whatsapp_number.
 * Falls back to a safe empty string so links don't show placeholder text.
 */
export function useWhatsAppUrl() {
  const { data: number } = useSystemConfig('whatsapp_number')
  if (!number) return null
  const clean = number.replace(/[\s\-()]/g, '').replace(/^\+/, '')
  return `https://wa.me/${clean}`
}
