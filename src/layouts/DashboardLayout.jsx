import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { USER_ROLE } from '../lib/constants'
import { MedGoIcon } from '../components/shared/MedGoLogo'

// ── Icon set ──────────────────────────────────────────────────
const I = {
  Orders:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  Summary:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1021 12h-8V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3.055A9.005 9.005 0 0120.945 11H13V3.055z"/></svg>,
  Cancel:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"/></svg>,
  Delivery:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17H6a2 2 0 01-2-2V7a2 2 0 012-2h8a2 2 0 012 2v3m-6 7h5m0 0l-2-2m2 2l-2 2m5-8h2l2 3v4a2 2 0 01-2 2h-1m-13 0a2 2 0 100-4 2 2 0 000 4zm13 0a2 2 0 100-4 2 2 0 000 4z"/></svg>,
  Clients:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-5.356-3.77M9 20H4v-1a4 4 0 015.356-3.77M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Medicine:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6.5l7 7a3.536 3.536 0 11-5 5l-7-7a3.536 3.536 0 115-5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l7 7"/></svg>,
  Map:       () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"/></svg>,
  Pharmacy:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  Users:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  Settings:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.427 1.756 2.925 0 3.352a1.724 1.724 0 00-1.066 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.427 1.756-2.925 1.756-3.352 0a1.724 1.724 0 00-2.572-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.427-1.756-2.925 0-3.352a1.724 1.724 0 001.066-2.572c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Stock:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
  Logout:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 109 9"/></svg>,
}

// ── Navigation config per role ────────────────────────────────
const NAV_BY_ROLE = {
  [USER_ROLE.OPERATOR]: [
    { to:'/dashboard',         label:'Pedidos',   end:true,  Icon:I.Orders },
    { to:'/dashboard/clientes',label:'Clientes',  end:false, Icon:I.Clients },
  ],
  [USER_ROLE.OWNER]: [
    // ── Visão geral
    { group: 'Visão geral' },
    { to:'/dono',              label:'Resumo',        end:true,  Icon:I.Summary },
    { to:'/dashboard',         label:'Pedidos',       end:true,  Icon:I.Orders },
    { to:'/dono/cancelamentos',label:'Cancelamentos', end:false, Icon:I.Cancel },
    { to:'/motoboy',           label:'Entregas',      end:true,  Icon:I.Delivery },
    // ── Catálogo e operação
    { group: 'Operação' },
    { to:'/dono/farmacias',    label:'Farmácias',     end:false, Icon:I.Pharmacy },
    { to:'/dono/medicamentos', label:'Medicamentos',  end:false, Icon:I.Medicine },
    { to:'/dono/zonas',        label:'Zonas',         end:false, Icon:I.Map },
    // ── Sistema
    { group: 'Sistema' },
    { to:'/dono/utilizadores', label:'Utilizadores',  end:false, Icon:I.Users },
    { to:'/dono/configuracoes',label:'Configurações', end:false, Icon:I.Settings },
    { to:'/stock',             label:'Stock',          end:true,  Icon:I.Stock },
  ],
  [USER_ROLE.MOTOBOY]: [
    { to:'/motoboy', label:'Entregas', end:true, Icon:I.Delivery },
  ],
  [USER_ROLE.STOCK_MANAGER]: [
    { group: 'Inventário' },
    { to:'/stock', label:'Gestão de Stock', end:true, Icon:I.Stock },
  ],
}

const ROLE_META = {
  [USER_ROLE.OWNER]:         { label:'Proprietário',    dot:'bg-violet-400', home:'/dono'      },
  [USER_ROLE.OPERATOR]:      { label:'Operador',        dot:'bg-teal-400',   home:'/dashboard' },
  [USER_ROLE.MOTOBOY]:       { label:'Motoboy',         dot:'bg-orange-400', home:'/motoboy'   },
  [USER_ROLE.STOCK_MANAGER]: { label:'Gestor de Stock', dot:'bg-blue-500',   home:'/stock'     },
}

function SidebarContent({ onClose }) {
  const { profile, role, signOut } = useAuthStore()
  const navigate = useNavigate()
  const items = NAV_BY_ROLE[role] || []
  const meta  = ROLE_META[role] || {}

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full sidebar-bg select-none">

      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2.5">
          <MedGoIcon size={28} />
          <span className="font-extrabold text-lg text-white tracking-tight leading-none">
            Med<span className="text-teal-400">Go</span>
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* User pill */}
      <div className="mx-3 mt-4 mb-2 px-3 py-3 rounded-2xl bg-white/5 border border-white/5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${meta.dot || 'bg-slate-500'} flex items-center justify-center text-white text-xs font-extrabold shrink-0`}>
            {(profile?.full_name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{profile?.full_name || 'Utilizador'}</p>
            <p className="text-xs text-slate-400 font-medium">{meta.label || role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scroll-x">
        {items.map((item, idx) => {
          // Group label
          if (item.group) {
            return (
              <p key={item.group + idx} className="px-2 pt-4 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/30 first:pt-1">
                {item.group}
              </p>
            )
          }
          const Icon = item.Icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center opacity-90">
                <Icon />
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <button onClick={handleSignOut} className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span className="w-5 h-5 shrink-0 flex items-center justify-center"><I.Logout /></span>
          <span>Terminar sessão</span>
        </button>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { role } = useAuthStore()
  const meta = ROLE_META[role] || {}

  return (
    <div className="flex h-svh bg-slate-50 overflow-hidden">
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full w-64 z-40 transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:shrink-0`}>
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setOpen(true)} className="btn-icon" aria-label="Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="text-center">
            <span className="font-extrabold text-slate-900">Med<span className="text-teal-500">Go</span></span>
            <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{meta.label}</div>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
