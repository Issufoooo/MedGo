import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function AuthGuard({ children }) {
  const isReady = useAuthStore((s) => s.isReady)
  const session = useAuthStore((s) => s.session)
  const location = useLocation()

  // Ainda carregando o estado de autenticação
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  // Sem sessão → redireciona para login (a menos que já esteja em /login)
  if (!session) {
    // Evita loop: se já está tentando acessar /login, não redireciona
    if (location.pathname === '/login') return null
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Com sessão → renderiza o conteúdo protegido
  return children
}