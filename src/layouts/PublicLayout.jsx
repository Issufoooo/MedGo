import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, Outlet } from 'react-router-dom'
import { MedGoLogo } from '../components/shared/MedGoLogo'
import { useWhatsAppUrl } from '../hooks/useSystemConfig'

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10.5L12 3l9 7.5M5.25 9.75V20.25H18.75V9.75" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8.25 4.5L12 12 3.75 7.5 12 3zm8.25 4.5v9L12 21l-8.25-4.5v-9" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.051 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
    </svg>
  )
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const waUrl = useWhatsAppUrl()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navCls = ({ isActive }) =>
    `px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="min-h-svh flex flex-col bg-white">
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
            : 'bg-white/88 backdrop-blur-sm border-b border-slate-100/80'
        }`}
      >
        <div className="page-wrap">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="shrink-0" aria-label="MedGo">
              <MedGoLogo size={28} />
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <NavLink to="/" end className={navCls}>Início</NavLink>
              <NavLink to="/medicamentos" className={navCls}>Medicamentos</NavLink>
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/medicamentos" className="hidden sm:inline-flex btn-primary-lg">
                Solicitar agora
              </Link>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden btn-icon"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 animate-slide-down pb-safe">
            <div className="page-wrap py-4 space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-semibold text-slate-700">
                <HomeIcon />
                Início
              </Link>
              <Link to="/medicamentos" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-50 text-sm font-semibold text-slate-700">
                <BoxIcon />
                Medicamentos
              </Link>
              <div className="pt-2">
                <Link to="/medicamentos" className="btn-primary-lg w-full">Solicitar agora</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 bg-white">
        <Outlet />
      </main>

      <footer className="bg-navy-950 text-slate-400 pt-14 pb-8">
        <div className="page-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            <div>
              <MedGoLogo size={24} inverted className="mb-4" />
              <p className="text-sm leading-relaxed max-w-xs">
                Plataforma para pedido, validação e acompanhamento de medicamentos em Maputo e Matola.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Informação útil</p>
              <p className="text-sm mb-1">Segunda – Sábado</p>
              <p className="text-sm mb-4">08h00 – 20h00</p>
              <p className="text-xs leading-relaxed text-slate-500 max-w-xs">
                A equipa confirma o pedido, orienta os próximos passos e mantém contacto pelo WhatsApp quando necessário.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Acesso rápido</p>
              <div className="space-y-2.5 text-sm">
                <Link to="/medicamentos" className="block hover:text-white transition-colors">Medicamentos</Link>
                <Link to="/login" className="block hover:text-white transition-colors">Área da equipa</Link>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors font-semibold">
                    <WhatsAppIcon />
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© {new Date().getFullYear()} MedGo · Todos os direitos reservados</p>
            <p className="text-slate-600">Maputo · Matola · Moçambique</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
