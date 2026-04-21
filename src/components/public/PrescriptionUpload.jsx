import { useState, useRef } from 'react'
import { validatePrescriptionFile } from '../../services/prescriptionService'

export function PrescriptionUpload({ onChange }) {
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [error,    setError]    = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const processFile = (f) => {
    setError('')
    const { valid, error: ve } = validatePrescriptionFile(f)
    if (!valid) { setError(ve); return }
    setFile(f)
    onChange(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview({ type: 'image', src: e.target.result })
      reader.readAsDataURL(f)
    } else {
      setPreview({ type: 'pdf', name: f.name })
    }
  }

  const handleRemove = () => {
    setFile(null); setPreview(null); setError(''); onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
        <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">Receita médica obrigatória</p>
          <p className="text-xs text-amber-700 mt-0.5">Tire uma foto nítida ou envie o PDF. O texto deve estar legível.</p>
        </div>
      </div>

      {/* Upload area */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          className={`drop-zone p-7 text-center ${dragOver ? 'drop-zone-active' : ''}`}
        >
          <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xs">
            📋
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Arraste aqui ou escolha um ficheiro
          </p>
          <p className="text-xs text-slate-400 mb-5">JPG, PNG, WebP ou PDF · Máx. 10MB</p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button type="button"
              onClick={() => { if(inputRef.current){ inputRef.current.setAttribute('capture','environment'); inputRef.current.click() } }}
              className="btn-primary text-sm py-2.5 px-5 gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Câmera
            </button>
            <button type="button"
              onClick={() => { if(inputRef.current){ inputRef.current.removeAttribute('capture'); inputRef.current.click() } }}
              className="btn-secondary text-sm py-2.5 px-5 gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
              Ficheiro
            </button>
          </div>
          <input ref={inputRef} type="file" className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={e => { if(e.target.files[0]) processFile(e.target.files[0]) }} />
        </div>
      ) : (
        /* Preview */
        <div className="border-2 border-teal-200 bg-teal-50/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Ficheiro pronto
            </div>
            <button type="button" onClick={handleRemove}
              className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
              Remover
            </button>
          </div>
          {preview?.type === 'image' ? (
            <img src={preview.src} alt="Receita" className="max-h-52 w-full object-contain rounded-xl border border-teal-100" />
          ) : (
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-teal-100">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl shrink-0">📄</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{preview?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="field-error">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
        </svg>
        Receita tratada com confidencialidade e eliminada após validação
      </div>
    </div>
  )
}
