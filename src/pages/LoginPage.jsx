import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Spinner } from '../components/ui/Spinner'
import { MedGoLogo } from '../components/shared/MedGoLogo'
import { USER_ROLE } from '../lib/constants'

const ROLE_HOME = {
  [USER_ROLE.OWNER]:         '/dono',
  [USER_ROLE.OPERATOR]:      '/dashboard',
  [USER_ROLE.MOTOBOY]:       '/motoboy',
  [USER_ROLE.STOCK_MANAGER]: '/stock',
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const loading = useAuthStore((s) => s.loading)
  const isReady = useAuthStore((s) => s.isReady)
  const signIn = useAuthStore((s) => s.signIn)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)

  // Redireciona apenas quando a autenticação estiver pronta e houver sessão+role
  useEffect(() => {
    if (isReady && session && role) {
      const from = location.state?.from?.pathname
      let redirectTo = ROLE_HOME[role] || '/dashboard'
      if (from && from !== '/login') redirectTo = from
      navigate(redirectTo, { replace: true })
    }
  }, [isReady, session, role, location.state, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password || busy || loading) return
    setBusy(true)
    clearError()
    try {
      await signIn(email, password)
      // O useEffect fará o redirecionamento
    } finally {
      setBusy(false)
    }
  }

  // Aguarda o carregamento inicial
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  // Se já está logado, não renderiza o formulário (evita flicker)
  if (session && role) {
    return null
  }

  // Formulário de login completo
  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #0d9488 0%, #0f766e 25%, #0a192f 100%)' }}
    >
      <div className="absolute inset-0 dot-pattern pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-5">
            <MedGoLogo size={36} inverted />
          </div>
          <p className="text-sm text-white/60 font-medium">
            Acesso restrito · Equipa MedGo
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-xl font-extrabold text-slate-900 text-center mb-7">
            Entrar na plataforma
          </h1>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={clearError}
                className="shrink-0 text-red-400 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="staff@medgo.co.mz"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) clearError()
                }}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) clearError()
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || loading || !email || !password}
              className="btn-primary-lg w-full mt-2"
            >
              {busy || loading ? (
                <>
                  <Spinner size="sm" /> A verificar...
                </>
              ) : (
                <>
                  Entrar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-white/50 hover:text-white/80 transition-colors font-medium"
          >
            ← Voltar ao website público
          </Link>
        </div>
      </div>
    </div>
  )
}