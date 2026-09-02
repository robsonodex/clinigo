"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Building2,
  Heart,
  CalendarDays,
  FileText,
  Coins,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Check,
  ScanFace,
  Tv,
  Sparkles,
  ArrowRight,
  Clock,
  Lock,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Tipos e dados                                                      */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  tag: string
  tagColor: string
}

interface Profile {
  id: "clinica" | "terapeuta"
  icon: LucideIcon
  title: string
  subtitle: string
  badgeLabel: string
  panelKicker: string
  headline: string
  ctaText: string
  ctaHref: string
  features: Feature[]
}

const profiles: Profile[] = [
  {
    id: "clinica",
    icon: Building2,
    title: "Clínica ou Consultório",
    subtitle: "Múltiplos médicos, recepção com IA, totem, faturamento TISS e repasses automáticos",
    badgeLabel: "Gestão Médica & Multiprofissional",
    panelKicker: "ONDE O CLINIGO TRANSFORMA A SUA CLÍNICA",
    headline: "Tecnologia de ponta a ponta: da recepção ao faturamento TISS e repasse dos médicos.",
    ctaText: "Começar Teste Grátis para Clínicas",
    ctaHref: "/registro",
    features: [
      {
        icon: ScanFace,
        title: "Recepção Inteligente & Check-in Facial",
        description:
          "O paciente é identificado por biometria facial no totem ou recepção em segundos, emitindo senha de atendimento e eliminando filas.",
        tag: "Biometria com IA",
        tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      },
      {
        icon: UserCheck,
        title: "Check-in do Médico & Prontuário Aberto",
        description:
          "O profissional confirma a presença na sala com 1 clique (ou QR Code na sala), abrindo imediatamente o prontuário do paciente.",
        tag: "1 Clique na Sala",
        tagColor: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      },
      {
        icon: ShieldCheck,
        title: "Dupla Comprovação TISS (Zero Glosas)",
        description:
          "Validação cruzada de presença (Recepção + Sala do Médico) para blindar o faturamento TISS contra glosas de convênios.",
        tag: "Faturamento Seguro",
        tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      {
        icon: Coins,
        title: "Folha de Repasse com Extrato WhatsApp",
        description:
          "Cálculo instantâneo de honorários por contrato (% ou fixo). O médico consulta seu saldo e extrato direto pelo WhatsApp.",
        tag: "WhatsApp Interativo",
        tagColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      },
      {
        icon: Tv,
        title: "Painel de TV com Chamada Vocalizada",
        description:
          "Chamada automática de pacientes com vocalização de voz por IA na TV da recepção, indicando nome, senha e consultório de destino.",
        tag: "Voz por IA",
        tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      },
      {
        icon: CalendarDays,
        title: "Agenda Multiprofissional & Multi-Salas",
        description:
          "Visão diária e semanal com controle de salas, bloqueios rápidos, encaixes inteligentes e confirmações automáticas por WhatsApp.",
        tag: "Multi-Salas",
        tagColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    ],
  },
  {
    id: "terapeuta",
    icon: Heart,
    title: "Terapeuta ou Clínica de Terapia",
    subtitle: "Sessões recorrentes, prontuário multidisciplinar, anotações protegidas e acompanhamento",
    badgeLabel: "Foco em Terapias & Saúde Mental",
    panelKicker: "ONDE O CLINIGO POTENCIALIZA O SEU ATENDIMENTO",
    headline: "Organização pensada para o vínculo terapêutico: grade contínua, prontuário especializado e sigilo total.",
    ctaText: "Começar Teste Grátis para Terapeutas",
    ctaHref: "/registro",
    features: [
      {
        icon: Clock,
        title: "Sessões Recorrentes & Grade Semanal",
        description:
          "Configure horários fixos semanais ou quinzenais para tratamentos contínuos de longo prazo com poucos cliques, sem reagendar toda semana.",
        tag: "Grade Contínua",
        tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      },
      {
        icon: FileText,
        title: "Prontuário Multidisciplinar Estruturado",
        description:
          "Modelos clínicos dedicados para Psicologia, Terapia Ocupacional, Fisioterapia e Fonoaudiologia, registrando a evolução clara do paciente.",
        tag: "Evolução Clínica",
        tagColor: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      },
      {
        icon: UserCheck,
        title: "Check-in em Sala & Abertura Imediata",
        description:
          "Ao acolher o paciente, confirme a presença direto da sala para abrir a tela de evolução e registrar a sessão para o repasse.",
        tag: "Presença em Sala",
        tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      },
      {
        icon: Coins,
        title: "Repasse por Sessão ou % com Extrato no Celular",
        description:
          "Contratos flexíveis por valor fixo por sessão ou percentual (Particular e Convênios). O terapeuta acompanha seus ganhos pelo WhatsApp.",
        tag: "Honorários Claros",
        tagColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      },
      {
        icon: Lock,
        title: "Anotações Protegidas, Sigilo & LGPD",
        description:
          "Conformidade rigorosa com CFP, CREFITO e LGPD. Apenas o terapeuta responsável acessa suas evoluções e anotações confidenciais.",
        tag: "Sigilo Absoluto",
        tagColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      },
      {
        icon: MessageSquare,
        title: "Lembretes Automáticos aos Pacientes e Famílias",
        description:
          "Reduza faltas e esquecimentos com mensagens automáticas de confirmação via WhatsApp antes de cada sessão.",
        tag: "Menos Faltas",
        tagColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

export default function AudienceSelector() {
  const [activeProfile, setActiveProfile] = useState<"clinica" | "terapeuta">("clinica")

  const activeData = profiles.find((p) => p.id === activeProfile) || profiles[0]

  return (
    <section
      id="para-quem"
      className="py-16 md:py-24 border-t border-white/[0.06] relative overflow-hidden"
    >
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-teal-vibrant/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* ---------- Cabeçalho ---------- */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-vibrant/10 border border-teal-vibrant/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-vibrant" />
            <span className="text-teal-vibrant font-semibold tracking-[0.15em] uppercase text-xs">
              SOLUÇÕES DEDICADAS
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Feito sob medida para o seu modelo de atendimento.
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
            Seja uma clínica médica com equipe e convênios ou um consultório terapêutico com foco em acompanhamento contínuo.
            <br className="hidden sm:inline" /> Clique no seu perfil para conhecer as ferramentas dedicadas.
          </p>
        </div>

        {/* ---------- Cards de seleção superiores ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {profiles.map((profile) => {
            const isActive = activeProfile === profile.id
            const Icon = profile.icon

            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveProfile(profile.id)}
                className={`
                  relative text-left rounded-2xl p-6 border cursor-pointer
                  transition-all duration-300 ease-out min-h-[110px]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-vibrant/60
                  active:scale-[0.99] group
                  ${
                    isActive
                      ? "border-[#00E5BE] bg-gradient-to-br from-[rgba(0,229,190,0.12)] to-[rgba(0,229,190,0.02)] shadow-[0_0_30px_rgba(0,229,190,0.15)] ring-1 ring-[#00E5BE]/40"
                      : "border-white/[0.1] bg-white/[0.03] hover:border-teal-vibrant/40 hover:bg-white/[0.06] opacity-85 hover:opacity-100"
                  }
                `}
              >
                {/* Badge selecionado ou tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center
                      transition-all duration-300
                      ${
                        isActive
                          ? "bg-[#00E5BE] text-slate-950 shadow-[0_0_15px_rgba(0,229,190,0.4)]"
                          : "bg-white/[0.08] text-slate-300 group-hover:text-white group-hover:bg-white/[0.12]"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00E5BE] bg-[rgba(0,229,190,0.15)] border border-[#00E5BE]/30 px-3 py-1 rounded-full animate-in fade-in">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Perfil Selecionado
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full group-hover:text-slate-200">
                      Clique para ver
                    </span>
                  )}
                </div>

                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-white font-bold text-lg md:text-xl">
                    {profile.title}
                  </h3>
                </div>

                <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                  {profile.subtitle}
                </p>
              </button>
            )
          })}
        </div>

        {/* ---------- Painel detalhado de recursos ---------- */}
        <div className="bg-[#090f1d]/90 border border-white/[0.1] rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all duration-300">
          {/* Topo do painel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/[0.08]">
            <div>
              <span className="text-teal-vibrant text-xs font-bold tracking-[0.18em] uppercase block mb-1">
                {activeData.panelKicker}
              </span>
              <h4 className="text-white font-extrabold text-lg sm:text-xl md:text-2xl leading-snug">
                {activeData.headline}
              </h4>
            </div>
            <span className="self-start md:self-auto text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-slate-300 whitespace-nowrap">
              {activeData.badgeLabel}
            </span>
          </div>

          {/* Grid de 6 features em cards destacados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {activeData.features.map((feature) => {
              const FeatureIcon = feature.icon

              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-teal-vibrant/30 p-5 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Linha de Ícone + Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(0,229,190,0.1)] border border-[#00E5BE]/20 flex items-center justify-center text-[#00E5BE] group-hover:scale-105 transition-transform">
                        <FeatureIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${feature.tagColor}`}>
                        {feature.tag}
                      </span>
                    </div>

                    <h5 className="text-white font-bold text-sm sm:text-[15px] mb-2 leading-snug group-hover:text-teal-vibrant transition-colors">
                      {feature.title}
                    </h5>

                    <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Banner de Ação Inferior (CTA) */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-teal-vibrant/[0.08] via-transparent to-transparent -mx-6 -mb-6 md:-mx-8 md:-mb-8 p-6 md:p-8 rounded-b-2xl">
            <div className="text-center sm:text-left">
              <p className="text-white font-bold text-base mb-0.5">
                Pronto para transformar sua rotina com o CliniGo?
              </p>
              <p className="text-slate-300 text-xs sm:text-sm">
                ✨ Teste grátis por 7 dias • Sem cartão de crédito • Suporte humanizado via WhatsApp
              </p>
            </div>

            <Link
              href={activeData.ctaHref}
              className="inline-flex items-center justify-center gap-2 bg-[#00E5BE] hover:bg-[#00c9a7] text-slate-950 font-bold text-sm px-6 py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,229,190,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 min-h-[48px] whitespace-nowrap w-full sm:w-auto"
            >
              <span>{activeData.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
