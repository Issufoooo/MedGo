import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Home page per role — where to redirect if accessing a forbidden area
const ROLE_HOME = {
  owner:         '/dono',
  operator:      '/dashboard',
  motoboy:       '/motoboy',
  stock_manager: '/stock',
}

export function RequireRole({ children, roles }) {
  const isReady = useAuthStore((s) => s.isReady)
  const session = useAuthStore((s) => s.session)
  const role    = useAuthStore((s) => s.role)

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  if (!session) return null

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  // Has permission — render
  if (roles.includes(role)) return children

  // No permission — redirect to role's home
  const home = ROLE_HOME[role] || '/'
  return <Navigate to={home} replace />
}
