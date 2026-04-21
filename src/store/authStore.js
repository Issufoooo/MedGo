import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  profile: null,
  role: null,
  loading: true,
  error: null,
  isReady: false,

  init: async () => {
    // Evita múltiplas inicializações
    if (get().isReady) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await get()._loadProfile(session)
      } else {
        set({ session: null, profile: null, role: null, loading: false, isReady: true })
      }

      // Listener de mudança de autenticação
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          await get()._loadProfile(session)
        } else {
          set({ session: null, profile: null, role: null, loading: false, isReady: true })
        }
      })
    } catch (err) {
      console.error('Auth init error:', err)
      set({ session: null, profile: null, role: null, loading: false, isReady: true, error: err.message })
    }
  },

  _loadProfile: async (session) => {
    const current = get()
    // Evita recarregar o mesmo perfil
    if (current.session?.user?.id === session.user.id && current.role !== null) {
      if (current.loading) set({ loading: false, isReady: true })
      return
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !profile) {
      await supabase.auth.signOut()
      set({ session: null, profile: null, role: null, loading: false, isReady: true,
            error: 'Perfil não encontrado. Contacte o administrador.' })
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      set({ session: null, profile: null, role: null, loading: false, isReady: true,
            error: 'Esta conta está desativada. Contacte o administrador.' })
      return
    }

    set({ session, profile, role: profile.role, loading: false, isReady: true, error: null })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null, isReady: false })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false, isReady: true, error: 'Email ou senha incorretos.' })
      return { error }
    }
    await get()._loadProfile(data.session)
    return { profile: get().profile }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null, role: null, loading: false, isReady: true })
  },

  clearError: () => set({ error: null })
}))