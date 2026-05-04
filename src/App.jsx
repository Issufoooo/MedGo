import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient }    from './lib/queryClient'
import { PublicLayout }   from './layouts/PublicLayout'
import { DashboardLayout }from './layouts/DashboardLayout'
import { AuthGuard }      from './guards/AuthGuard'
import { RequireRole }    from './guards/RequireRole'
import { USER_ROLE }      from './lib/constants'
import { ToastContainer } from './components/ui/ToastContainer'
import { useAuthStore }   from './store/authStore'

// Public (eager)
import { HomePage }        from './pages/public/HomePage'
import { MedicationsPage } from './pages/public/MedicationsPage'
import { OrderPage }       from './pages/public/OrderPage'
import { TrackingPage }    from './pages/public/TrackingPage'
import { ThankYouPage }    from './pages/public/ThankYouPage'
import { CancelPage }      from './pages/public/CancelPage'
import { LoginPage }       from './pages/LoginPage'

// Internal (lazy)
const OperatorDashboard  = lazy(() => import('./pages/operator/OperatorDashboard').then(m=>({default:m.OperatorDashboard})))
const OrderDetailPage    = lazy(() => import('./pages/operator/OrderDetailPage').then(m=>({default:m.OrderDetailPage})))
const OwnerDashboard     = lazy(() => import('./pages/owner/OwnerDashboard').then(m=>({default:m.OwnerDashboard})))
const CancellationsPage  = lazy(() => import('./pages/owner/CancellationsPage').then(m=>({default:m.CancellationsPage})))
const PharmaciesPage     = lazy(() => import('./pages/owner/PharmaciesPage').then(m=>({default:m.PharmaciesPage})))
const UsersPage          = lazy(() => import('./pages/owner/UsersPage').then(m=>({default:m.UsersPage})))
const SystemConfigPage   = lazy(() => import('./pages/owner/SystemConfigPage').then(m=>({default:m.SystemConfigPage})))
const MotoboyDashboard   = lazy(() => import('./pages/motoboy/MotoboyDashboard').then(m=>({default:m.MotoboyDashboard})))
const StockManagerDashboard = lazy(() => import('./pages/stock/StockManagerDashboard').then(m=>({default:m.StockManagerDashboard})))

// Implemented pages (v7)
const CustomerListPage       = lazy(() => import('./pages/operator/CustomerListPage').then(m=>({default:m.CustomerListPage})))
const MedicationsCatalogPage = lazy(() => import('./pages/owner/MedicationsCatalogPage').then(m=>({default:m.MedicationsCatalogPage})))
const ZonesPage              = lazy(() => import('./pages/owner/ZonesPage').then(m=>({default:m.ZonesPage})))
const NotFoundPage           = lazy(() => import('./pages/Placeholders').then(m=>({default:m.NotFoundPage})))

function Loader() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="w-7 h-7 rounded-full border-[3px] border-teal-100 border-t-teal-500 animate-spin" />
    </div>
  )
}
const S = ({children}) => <Suspense fallback={<Loader/>}>{children}</Suspense>

export function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* PUBLIC */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="medicamentos" element={<MedicationsPage />} />
            <Route path="pedido/:medicationId" element={<OrderPage />} />
            <Route path="acompanhar/:token" element={<TrackingPage />} />
            <Route path="obrigado" element={<ThankYouPage />} />
            <Route path="cancelar/:token" element={<CancelPage />} />
          </Route>

          <Route path="login" element={<LoginPage />} />

          {/* OPERATOR + OWNER */}
          <Route path="dashboard" element={
            <AuthGuard><RequireRole roles={[USER_ROLE.OPERATOR,USER_ROLE.OWNER]}><DashboardLayout/></RequireRole></AuthGuard>
          }>
            <Route index element={<S><OperatorDashboard/></S>} />
            <Route path="pedido/:orderId" element={<S><OrderDetailPage/></S>} />
            <Route path="clientes" element={<S><CustomerListPage/></S>} />
          </Route>

          {/* OWNER ONLY */}
          <Route path="dono" element={
            <AuthGuard><RequireRole roles={[USER_ROLE.OWNER]}><DashboardLayout/></RequireRole></AuthGuard>
          }>
            <Route index element={<S><OwnerDashboard/></S>} />
            <Route path="cancelamentos"  element={<S><CancellationsPage/></S>} />
            <Route path="farmacias"      element={<S><PharmaciesPage/></S>} />
            <Route path="medicamentos"   element={<S><MedicationsCatalogPage/></S>} />
            <Route path="zonas"          element={<S><ZonesPage/></S>} />
            <Route path="utilizadores"   element={<S><UsersPage/></S>} />
            <Route path="configuracoes"  element={<S><SystemConfigPage/></S>} />
          </Route>

          {/* MOTOBOY */}
          <Route path="motoboy" element={
            <AuthGuard><RequireRole roles={[USER_ROLE.MOTOBOY,USER_ROLE.OWNER]}><DashboardLayout/></RequireRole></AuthGuard>
          }>
            <Route index element={<S><MotoboyDashboard/></S>} />
          </Route>

          {/* STOCK MANAGER */}
          <Route path="stock" element={
            <AuthGuard><RequireRole roles={[USER_ROLE.STOCK_MANAGER,USER_ROLE.OWNER]}><DashboardLayout/></RequireRole></AuthGuard>
          }>
            <Route index element={<S><StockManagerDashboard/></S>} />
          </Route>

          <Route path="*" element={<S><NotFoundPage/></S>} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
