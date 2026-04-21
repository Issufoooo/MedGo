import { useSearchParams, Link } from 'react-router-dom'

const WHATSAPP_URL = 'https://wa.me/258XXXXXXXXX'

function CheckIcon() {
  return (
    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.051 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
    </svg>
  )
}

function StepCard({ title, desc, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
  }

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-bold mb-1">{title}</p>
      <p className="text-sm leading-relaxed opacity-90">{desc}</p>
    </div>
  )
}

export function ThankYouPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  return (
    <div className="min-h-[82svh] bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_32%,#ffffff_100%)] px-4 py-12 md:py-16">
      <div className="page-wrap-xs">
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] shadow-lg mb-6 bg-[linear-gradient(135deg,#14b8a6_0%,#0d9488_100%)]">
            <CheckIcon />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight mb-3 text-balance">
            Pedido recebido com sucesso
          </h1>
          <p className="text-slate-500 text-base leading-relaxed max-w-md mx-auto">
            A nossa equipa vai validar os detalhes do pedido e continuar o acompanhamento consigo.
          </p>
        </div>

        <div className="card-lg p-6 md:p-7 mb-5 border border-slate-200">
          <div className="space-y-4">
            {token && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">Referência do pedido</p>
                <p className="font-mono text-sm font-semibold text-slate-800 break-all">{token}</p>
              </div>
            )}

            <StepCard
              tone="teal"
              title="O que acontece a seguir"
              desc="A MedGo confirma disponibilidade, receita quando aplicável, e o valor final antes do avanço do pedido."
            />

            <StepCard
              title="Acompanhamento e contacto"
              desc="Pode acompanhar o estado do pedido nesta página e falar com a equipa via WhatsApp sempre que precisar."
            />
          </div>
        </div>

        <div className="space-y-3">
          {token && (
            <Link
              to={`/acompanhar/${token}`}
              className="btn-primary-lg w-full flex justify-center"
            >
              Acompanhar o meu pedido
            </Link>
          )}

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 py-3.5 text-white font-semibold hover:bg-green-600 transition-colors"
          >
            <WhatsAppIcon />
            Falar com a MedGo no WhatsApp
          </a>

          <Link
            to="/medicamentos"
            className="btn-secondary-lg w-full flex justify-center"
          >
            Fazer outro pedido
          </Link>
        </div>
      </div>
    </div>
  )
}
