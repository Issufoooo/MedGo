import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CategoryBadge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'

export function MedicationSearch({ size = 'lg', autoFocus = false, initialQuery = '' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 50)
  }, [autoFocus])

  useEffect(() => {
    const fn = (e) => {
      if (!listRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.rpc('search_medications', { query: q.trim() })
      setResults(data || [])
      setOpen(true)
      setActiveIdx(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 260)
  }

  const handleSelect = (med) => {
    setOpen(false)
    setQuery('')
    navigate(`/pedido/${med.id}`)
  }

  const handleKeyDown = (e) => {
    if (!open || !results.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        if (activeIdx >= 0) {
          e.preventDefault()
          handleSelect(results[activeIdx])
        }
        break
      case 'Escape':
        setOpen(false)
        break
      default:
        break
    }
  }

  const isLg = size === 'lg'

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <svg className={`${isLg ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Pesquise pelo nome do medicamento..."
          className={`w-full bg-white text-slate-900 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none transition-all duration-150 ${
            isLg ? 'pl-12 pr-4 py-4 text-base rounded-2xl' : 'pl-10 pr-4 py-3 text-sm rounded-xl input'
          }`}
          autoComplete="off"
          aria-label="Pesquisar medicamento"
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-3 bg-white rounded-3xl shadow-card-xl border border-slate-100 overflow-hidden animate-scale-in"
          role="listbox"
        >
          {results.length === 0 && !loading && (
            <li className="px-5 py-6 text-sm text-slate-500 text-center">
              Nenhum resultado para “{query}”
            </li>
          )}

          {results.map((med, i) => (
            <li
              key={med.id}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => handleSelect(med)}
              className={`flex items-start justify-between gap-3 px-5 py-4 cursor-pointer border-b border-slate-50 last:border-0 transition-colors duration-100 ${
                i === activeIdx ? 'bg-teal-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{med.commercial_name}</p>
                {(med.generic_name || med.dosage) && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {[med.generic_name, med.dosage].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CategoryBadge category={med.category} />
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </li>
          ))}

          {results.length > 0 && (
            <li
              onClick={() => {
                setOpen(false)
                navigate(`/medicamentos?q=${encodeURIComponent(query)}`)
              }}
              className="px-5 py-3.5 text-sm text-teal-700 font-semibold text-center cursor-pointer hover:bg-teal-50 border-t border-slate-100 transition-colors"
            >
              Ver todos os resultados
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
