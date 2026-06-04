"use client"

import { useState } from "react"
import {
  Building2,
  Heart,
  CalendarDays,
  ClipboardList,
  Coins,
  MessageSquare,
  Users,
  BarChart2,
  NotebookPen,
  ShieldCheck,
  UserCheck,
  Check,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Tipos e dados                                                      */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

interface Profile {
  id: "clinica" | "terapeuta"
  icon: LucideIcon
  title: string
  subtitle: string
  panelKicker: string
  features: Feature[]
}

const profiles: Profile[] = [
  {
    id: "clinica",
    icon: Building2,
    title: "Clínica ou consultório",
    subtitle: "Múltiplos profissionais, recepção e gestão completa",
    panelKicker: "ONDE O CLINIGO AJUDA A SUA CLÍNICA",
    features: [
      {
        icon: CalendarDays,
        title: "Agenda com múltiplos profissionais",
        description:
          "Organize todos os horários em um só painel, sem conflitos",
      },
      {
        icon: ClipboardList,
        title: "Prontuário eletrônico unificado",
        description:
          "Histórico completo de cada paciente, acessível por toda a equipe",
      },
      {
        icon: Coins,
        title: "Controle financeiro e faturamento",
        description:
          "Cobranças, repasses e relatórios financeiros centralizados",
      },
      {
        icon: MessageSquare,
        title: "Confirmações automáticas de consulta",
        description:
          "Reduza faltas com lembretes enviados automaticamente",
      },
      {
        icon: Users,
        title: "Gestão da equipe e das salas",
        description:
          "Controle de agenda por profissional e sala de atendimento",
      },
      {
        icon: BarChart2,
        title: "Relatórios de desempenho",
        description:
          "Acompanhe consultas, faturamento e taxa de retorno",
      },
    ],
  },
  {
    id: "terapeuta",
    icon: Heart,
    title: "Terapeuta ou clínica de terapia",
    subtitle: "Sessões recorrentes, prontuário e acompanhamento de pacientes",
    panelKicker: "ONDE O CLINIGO AJUDA O SEU ATENDIMENTO",
    features: [
      {
        icon: CalendarDays,
        title: "Sessões recorrentes e agenda online",
        description:
          "Configure horários fixos semanais com poucos cliques",
      },
      {
        icon: NotebookPen,
        title: "Anotações de sessão protegidas",
        description:
          "Registre evoluções com segurança e total privacidade",
      },
      {
        icon: Heart,
        title: "Prontuário focado em saúde mental",
        description:
          "Campos voltados para acompanhamento psicológico e terapêutico",
      },
      {
        icon: ShieldCheck,
        title: "Conformidade com LGPD e conselhos",
        description:
          "Dados dos pacientes protegidos conforme a legislação",
      },
      {
        icon: MessageSquare,
        title: "Comunicação automática com pacientes",
        description:
          "Lembretes de sessão e confirmações sem esforço manual",
      },
      {
        icon: UserCheck,
        title: "Acompanhamento evolutivo",
        description:
          "Histórico de sessões e progresso do paciente ao longo do tempo",
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

export default function AudienceSelector() {
  const [activeProfile, setActiveProfile] = useState<
    "clinica" | "terapeuta" | null
  >(null)

  const activeData = profiles.find((p) => p.id === activeProfile) ?? null

  return (
    <section
      id="para-quem"
      className="py-16 md:py-24 border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* ---------- Cabeçalho ---------- */}
        <div className="text-center mb-12 md:mb-16">
          <span className="text-teal-vibrant font-semibold tracking-[0.15em] uppercase text-xs md:text-sm mb-3 block">
            PARA QUEM É O CLINIGO
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6 leading-tight">
            Feito para o seu tipo de atendimento.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
            Clínica, consultório ou espaço de terapia — selecione o seu perfil e
            veja como o CliniGo se encaixa no seu dia a dia.
          </p>
        </div>

        {/* ---------- Cards de seleção ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {profiles.map((profile) => {
            const isActive = activeProfile === profile.id
            const hasSelection = activeProfile !== null
            const isInactive = hasSelection && !isActive
            const Icon = profile.icon

            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveProfile(profile.id)}
                className={`
                  relative text-left rounded-xl p-5 md:p-6 border cursor-pointer
                  transition-all duration-300 ease-out min-h-[100px]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-vibrant/60
                  active:scale-[0.98]
                  ${
                    isActive
                      ? "border-[#00E5BE] bg-[rgba(0,229,190,0.06)]"
                      : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]"
                  }
                  ${isInactive ? "opacity-40 hover:opacity-70" : "opacity-100"}
                `}
              >
                {/* Badge selecionado */}
                {isActive && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00E5BE] bg-[rgba(0,229,190,0.12)] px-2.5 py-1 rounded-md">
                    <Check className="w-3 h-3" />
                    selecionado
                  </span>
                )}

                <div
                  className={`
                    w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center mb-3
                    transition-colors duration-300
                    ${
                      isActive
                        ? "bg-[rgba(0,229,190,0.15)] text-[#00E5BE]"
                        : "bg-white/[0.06] text-slate-400"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>

                <h3 className="text-white font-bold text-base md:text-lg mb-1 pr-24 md:pr-28">
                  {profile.title}
                </h3>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  {profile.subtitle}
                </p>
              </button>
            )
          })}
        </div>

        {/* ---------- Painel de features (animado) ---------- */}
        <div
          className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            maxHeight: activeData ? "800px" : "0px",
            opacity: activeData ? 1 : 0,
          }}
        >
          {activeData && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 md:p-8">
              {/* Kicker do painel */}
              <span className="block text-slate-400 text-[10px] md:text-xs font-semibold tracking-[0.15em] uppercase mb-5 md:mb-6">
                {activeData.panelKicker}
              </span>

              {/* Grid de features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {activeData.features.map((feature, idx) => {
                  const FeatureIcon = feature.icon
                  const isLastRow =
                    idx >= activeData.features.length - 2 &&
                    activeData.features.length > 1
                  const isLastMobile = idx === activeData.features.length - 1

                  return (
                    <div
                      key={feature.title}
                      className={`
                        flex items-start gap-3 md:gap-4 py-4 md:py-5 px-2 md:px-3
                        ${!isLastMobile ? "border-b border-white/[0.05] md:border-b" : "border-b-0"}
                        ${isLastRow ? "md:border-b-0" : ""}
                      `}
                    >
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[rgba(0,229,190,0.08)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FeatureIcon className="w-4 h-4 text-[#00E5BE]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-bold text-sm md:text-[15px] mb-0.5 leading-snug">
                          {feature.title}
                        </h4>
                        <p className="text-slate-400 text-xs md:text-[13px] leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
