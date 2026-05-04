import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MedicationSearch } from '../../components/public/MedicationSearch'
import { CategoryBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const CATS = [
  { value: 'ALL',                  label: 'Todos' },
  { value: 'FREE',                 label: 'Venda livre' },
  { value: 'PRESCRIPTION',        label: 'Receita obrigatória' },
  { value: 'RESTRICTED_MONITORED',label: 'Venda restrita' },
]

function SearchOffIcon() {
  return (
    <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 15.5L20 20M10.75 17.5a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 10.75h4.5" />
    </svg>
  )
}

export function MedicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cat, setCat] = useState('ALL')

  // Read ?q from URL — set when MedicationSearch clicks "Ver todos os resultados"
  const urlQuery = searchParams.get('q') || ''

  // Clear ?q from URL after reading so back-nav is clean
  useEffect(() => {
    if (urlQuery) {
      const t = setTimeout(() => {
        setSearchParams(p => { p.delete('q'); return p }, { replace: true })
      }, 100)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications-page', cat],
    queryFn: async () => {
      let q = supabase
        .from('medications')
        .select('id,commercial_name,generic_name,dosage,pharmaceutical_form,category,requires_prescription,package_size')
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('commercial_name')

      if (cat !== 'ALL') q = q.eq('category', cat)

      const { data } = await q.limit(120)
      return data || []
    },
  })

  // Client-side text filter from ?q — applied on top of category filter
  const filtered = useMemo(() => {
    if (!urlQuery.trim()) return medications
    const q = urlQuery.toLowerCase()
    return medications.filter(m =>
      m.commercial_name?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q)
    )
  }, [medications, urlQuery])

  const countLabel = `${filtered.length} medicamento${filtered.length === 1 ? '' : 's'}`

  const handleCat = (val) => {
    setCat(val)
    // Clear any active URL search when switching category
    setSearchParams(p => { p.delete('q'); return p }, { replace: true })
  }

  return (
    <div className="page-wrap py-10 md:py-12">
      <div className="mb-8 md:mb-10 max-w-3xl">
        <p className="section-label mb-2">Catálogo</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight text-balance">
          Procure o medicamento e avance para o pedido
        </h1>
        <p className="text-slate-500 text-base md:text-lg leading-relaxed">
          Use a pesquisa para encontrar rapidamente o medicamento. Se ele exigir receita médica, o sistema vai pedir isso no momento certo do fluxo.
        </p>
      </div>

      {/* Search widget — passes initial query from URL */}
      <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-card-lg max-w-3xl">
        <MedicationSearch size="md" initialQuery={urlQuery} />
      </div>

      {/* Active text search banner */}
      {urlQuery && (
        <div className="flex items-center gap-3 mb-5 max-w-3xl">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-4 py-2.5">
            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <p className="text-sm font-semibold text-teal-800">
              A mostrar resultados para <span className="italic">"{urlQuery}"</span>
            </p>
          </div>
          <Link
            to="/medicamentos"
            replace
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 whitespace-nowrap transition-colors"
          >
            Limpar ×
          </Link>
        </div>
      )}

      {/* Category tabs */}
      <div className="scroll-x flex gap-2 pb-2 mb-8">
        {CATS.map((c) => (
          <button
            key={c.value}
            onClick={() => handleCat(c.value)}
            className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border ${
              cat === c.value
                ? 'bg-navy-950 text-white border-navy-950'
                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200 hover:text-teal-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400">A carregar medicamentos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-lg text-center py-16 px-6 border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfffe_100%)]">
          <div className="flex justify-center mb-4">
            <SearchOffIcon />
          </div>
          <p className="font-bold text-slate-800 mb-2 text-lg">Nenhum medicamento encontrado</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            {urlQuery
              ? `Não encontrámos resultados para "${urlQuery}". Tente outro nome ou limpe a pesquisa.`
              : 'Tente outra designação, mude a categoria ou procure pelo nome genérico.'}
          </p>
          {urlQuery && (
            <Link to="/medicamentos" replace className="btn-secondary inline-flex">
              Limpar pesquisa
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400 font-medium mb-4">{countLabel}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((med) => (
              <Link
                key={med.id}
                to={`/pedido/${med.id}`}
                className="card p-5 hover:shadow-card-md hover:-translate-y-0.5 border border-slate-200 hover:border-teal-100 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight text-base">
                      {med.commercial_name}
                    </h3>
                    {med.generic_name && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{med.generic_name}</p>
                    )}
                  </div>
                  <CategoryBadge category={med.category} />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {med.dosage && (
                    <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                      {med.dosage}
                    </span>
                  )}
                  {med.pharmaceutical_form && (
                    <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                      {med.pharmaceutical_form}
                    </span>
                  )}
                  {med.package_size && (
                    <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                      {med.package_size}
                    </span>
                  )}
                </div>

                {med.requires_prescription && (
                  <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-4">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Requer receita médica
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-sm text-slate-500 font-medium">Abrir pedido</span>
                  <svg className="w-4 h-4 text-teal-500 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
