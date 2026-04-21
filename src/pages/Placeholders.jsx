import { Link, useLocation } from 'react-router-dom'

const PAGE_MAP = {
  '/dashboard/clientes': {
    title: 'Clientes',
    description: 'Histórico de pedidos, recorrência e observações dos clientes da plataforma.',
    ready: 'Próxima fase',
    icon: '👥',
  },
  '/dono/medicamentos': {
    title: 'Medicamentos',
    description: 'Gestão do catálogo: nomes, genéricos, categorias, visibilidade pública e exigência de receita.',
    ready: 'Próxima fase',
    icon: '💊',
  },
  '/dono/zonas': {
    title: 'Zonas e taxas',
    description: 'Cobertura de entrega, zonas activas e custos associados a cada zona.',
    ready: 'Próxima fase',
    icon: '🗺️',
  },
}

function PlaceholderPage({ title, description, ready, icon }) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Área de gestão</p>
          <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">{description}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {ready}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-extrabold text-slate-900 mb-3">O que está previsto para esta área</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">→</span> Interface consistente com o restante painel MedGo.</li>
          <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">→</span> Dados reais do Supabase — criar, editar, filtrar e consultar.</li>
          <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">→</span> Estados claros para a equipa perceber o que já está operacional.</li>
          <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">→</span> Integração com o fluxo de pedidos existente.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dono" className="btn-secondary">← Voltar ao resumo</Link>
          <Link to="/dashboard" className="btn-primary">Ir para pedidos</Link>
        </div>
      </div>
    </div>
  )
}

export function CustomerListPage() {
  return <PlaceholderPage icon="👥" title="Clientes" description="Histórico de pedidos, recorrência e observações dos clientes." ready="Próxima fase" />
}
export function MedicationsCatalogPage() {
  return <PlaceholderPage icon="💊" title="Medicamentos" description="Gestão do catálogo, categorias, exigência de receita e visibilidade pública." ready="Próxima fase" />
}
export function ZonesPage() {
  return <PlaceholderPage icon="🗺️" title="Zonas e taxas" description="Gestão das zonas de entrega e respectivos custos operacionais." ready="Próxima fase" />
}

export function NotFoundPage() {
  const location = useLocation()
  return (
    <div className="min-h-svh bg-slate-50 px-4 py-12 flex items-center justify-center">
      <div className="max-w-md w-full card p-8 text-center">
        <p className="text-7xl font-black text-slate-200 leading-none">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          O endereço <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{location.pathname}</span> não existe.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/" className="btn-primary">Ir para o site</Link>
          <Link to="/login" className="btn-secondary">Acesso interno</Link>
        </div>
      </div>
    </div>
  )
}
