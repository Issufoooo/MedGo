import { Link } from 'react-router-dom'
import { MedicationSearch } from '../../components/public/MedicationSearch'

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 3.75h6l4.5 4.5v10.5A1.5 1.5 0 0116.5 20.25h-9A1.5 1.5 0 016 18.75v-13.5A1.5 1.5 0 017.5 3.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 3.75v4.5H18" />
    </svg>
  )
}

function RouteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75A2.25 2.25 0 1111.25 9 2.25 2.25 0 019 6.75zm0 0C9 10.5 5.25 12 5.25 15.75M15 17.25A2.25 2.25 0 1017.25 15 2.25 2.25 0 0015 17.25zm0 0C15 13.5 18.75 12 18.75 8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 8.25h3m-3 7.5h3" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 12.25l1.5 1.5 3-3" />
    </svg>
  )
}

const QUICK_INFO = [
  {
    title: 'Procure o medicamento',
    desc: 'Pesquise pelo nome comercial, genérico ou uma designação conhecida.',
    icon: SearchIcon,
  },
  {
    title: 'Receita quando necessário',
    desc: 'Para medicamentos sujeitos a receita, o pedido já permite anexar o documento.',
    icon: FileIcon,
  },
  {
    title: 'Acompanhe o processo',
    desc: 'Depois do pedido, o cliente acompanha o estado online e fala com a equipa por WhatsApp.',
    icon: RouteIcon,
  },
]

const STEPS = [
  {
    title: 'Escolha ou pesquise o medicamento',
    desc: 'Comece pela pesquisa e avance diretamente para o pedido.',
  },
  {
    title: 'Preencha os dados e envie',
    desc: 'Nome, WhatsApp, zona de entrega e referência de morada. Sem criar conta.',
  },
  {
    title: 'A equipa confirma e acompanha',
    desc: 'Receita, disponibilidade, preço final e entrega são acompanhados pela MedGo.',
  },
]

const INFO_BLOCKS = [
  {
    title: 'Entrega em Maputo e Matola',
    desc: 'O cliente já vê desde o início que o serviço cobre estas duas áreas, com zonas de entrega definidas.',
  },
  {
    title: 'Preço confirmado antes do avanço',
    desc: 'O pedido entra, a equipa valida e o valor final é confirmado antes de qualquer passo seguinte.',
  },
  {
    title: 'Comunicação simples por WhatsApp',
    desc: 'O acompanhamento pode continuar pela página do pedido e pelo contacto direto com a equipa.',
  },
]

export function HomePage() {
  return (
    <div className="overflow-x-hidden bg-white">
      <section className="hero-bg text-white relative">
        <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none" />
        <div className="page-wrap relative z-10 py-16 md:py-20 lg:py-24">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 mb-6 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse2" />
                Pedidos assistidos por equipa real · Maputo e Matola
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.02] tracking-tight text-balance">
                Encontre e solicite medicamentos{' '}
                <span className="text-teal-200">com um processo claro do pedido até à entrega.</span>
              </h1>

              <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl leading-relaxed text-balance">
                A MedGo foi desenhada para reduzir fricção: pesquisa simples, receita quando necessária, contacto por WhatsApp e acompanhamento do pedido sem complicação.
              </p>

              <div className="mt-8 max-w-2xl rounded-[1.75rem] border border-white/10 bg-white/95 p-2 shadow-card-xl backdrop-blur-md">
                <MedicationSearch size="lg" />
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/medicamentos" className="btn-primary-xl">
                  Procurar medicamento
                </Link>
                <Link to="/medicamentos" className="btn-secondary-lg !bg-white/10 !text-white !border-white/10 hover:!bg-white/15 hover:!border-white/20">
                  Ver catálogo
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {QUICK_INFO.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="glass rounded-3xl p-5 md:p-6 text-white shadow-card-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-teal-200">
                        <Icon />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white mb-1.5">{item.title}</h3>
                        <p className="text-sm leading-relaxed text-white/75">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="glass rounded-3xl p-5 md:p-6 shadow-card-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-300 border border-orange-400/20 flex items-center justify-center">
                    <ShieldIcon />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Confirmação antes de avançar</p>
                    <p className="text-xs text-white/65">Receita, disponibilidade e preço fazem parte do fluxo.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-white/5 border border-white/10 py-3 px-2 text-white/85">Receita quando aplicável</div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 py-3 px-2 text-white/85">Preço confirmado</div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 py-3 px-2 text-white/85">Tracking do pedido</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="page-wrap">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Como funciona</p>
            <h2 className="section-title">Um fluxo simples para o cliente, organizado para a equipa</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
              O processo foi desenhado para ser fácil de entender e suficientemente claro para uma operação real no dia a dia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, index) => (
              <div key={step.title} className="card-lg p-6 border border-slate-200 bg-white">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-extrabold mb-4">
                  0{index + 1}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm bg-slate-50 border-y border-slate-100">
        <div className="page-wrap">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
            <div>
              <p className="section-label mb-2">Antes de enviar o pedido</p>
              <h2 className="section-title-sm mb-3">O que o cliente precisa mesmo de saber</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                Em vez de explicar o sistema por dentro, a homepage deve responder às perguntas que mais influenciam a decisão do cliente.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {INFO_BLOCKS.map((block, idx) => (
                <div key={block.title} className={`rounded-3xl p-5 border ${idx === 0 ? 'bg-navy-950 text-white border-navy-900 shadow-card-lg' : 'bg-white border-slate-200'}`}>
                  <p className={`text-sm font-extrabold mb-2 ${idx === 0 ? 'text-teal-300' : 'text-slate-900'}`}>{block.title}</p>
                  <p className={`text-sm leading-relaxed ${idx === 0 ? 'text-white/75' : 'text-slate-500'}`}>{block.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm bg-white">
        <div className="page-wrap">
          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fffe_100%)] p-8 md:p-10 shadow-card-lg">
            <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <p className="section-label mb-2">Pronto para avançar</p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-950 mb-3 text-balance">
                  Comece pelo medicamento. O resto do processo acontece em sequência.
                </h2>
                <p className="text-slate-500 max-w-2xl leading-relaxed">
                  O cliente não precisa perceber toda a operação para começar. Precisa apenas de encontrar o medicamento e iniciar o pedido com confiança.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <Link to="/medicamentos" className="btn-primary-lg">Ver medicamentos</Link>
                <Link to="/medicamentos" className="btn-secondary-lg">Iniciar pedido</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
