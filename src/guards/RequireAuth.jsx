import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function RequireAuth({ children }) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  // Enquanto carrega, exibe um spinner (evita redirecionamentos prematuros)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  // Se não está logado, redireciona para login, mas preserva a rota original
  if (!session) {
    // Evita loop: se já está em /login, não redireciona novamente
    if (location.pathname === '/login') {
      return null;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se está logado, renderiza a rota protegida
  return children;
}