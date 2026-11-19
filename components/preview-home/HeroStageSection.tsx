'use client'

import { useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    CalendarDays,
    Check,
    CheckCheck,
    Clock,
    EyeOff,
    Lock,
    MessageSquare,
    ShieldCheck,
    Users,
} from 'lucide-react'
import { HERO_CONTENT, MOCKUP_DISCLAIMER } from './content'

type StageTabId = 'recorrencia' | 'whatsapp' | 'sigilo'

interface AgendaSlot {
    id: string
    day: string
    time: string
    duration: string
    patient: string
    specialty: string
    room: string
    therapist: string
    isLoggedTherapist: boolean
    badges: string[]
    insurance: string
    cardCode: string
    whatsappTarget?: boolean
}

const AGENDA_SLOTS: AgendaSlot[] = [
    {
        id: 's1',
        day: 'Segunda',
        time: '08:00',
        duration: '45 min',
        patient: 'Lucas M. (5a)',
        specialty: 'ABA e Terapia Ocupacional',
        room: 'Sala ABA 01',
        therapist: 'Dra. Camila N. + Dra. Beatriz L.',
        isLoggedTherapist: true,
        badges: ['Semanal', 'Co-atendimento'],
        insurance: 'Convênio Unimed',
        cardCode: '0084 · 9912',
    },
    {
        id: 's2',
        day: 'Segunda',
        time: '08:45',
        duration: '50 min',
        patient: 'Mariana C. (14a)',
        specialty: 'Psicologia',
        room: 'Sala 02',
        therapist: 'Dra. Camila N.',
        isLoggedTherapist: true,
        badges: ['Quinzenal'],
        insurance: 'Particular',
        cardCode: 'Pacote 8/12',
        whatsappTarget: true,
    },
    {
        id: 's3',
        day: 'Terça',
        time: '09:40',
        duration: '40 min',
        patient: 'Sofia R. (6a)',
        specialty: 'Fonoaudiologia',
        room: 'Sala 03',
        therapist: 'Dr. André V.',
        isLoggedTherapist: false,
        badges: ['Semanal'],
        insurance: 'Convênio SulAmérica',
        cardCode: '0042 · 3108',
    },
    {
        id: 's4',
        day: 'Terça',
        time: '10:30',
        duration: '120 min',
        patient: 'Equipe ABA',
        specialty: 'Supervisão técnica',
        room: 'Sala Coordenação',
        therapist: 'Dra. Camila N.',
        isLoggedTherapist: true,
        badges: ['Supervisão técnica', 'Mensal'],
        insurance: 'Bloco interno',
        cardCode: 'Interno',
    },
    {
        id: 's5',
        day: 'Quarta',
        time: '14:00',
        duration: '45 min',
        patient: 'Pedro H. (7a)',
        specialty: 'Psicomotricidade',
        room: 'Sala Motora',
        therapist: 'Dra. Helena P.',
        isLoggedTherapist: false,
        badges: ['Quinzenal', 'Reposição'],
        insurance: 'Convênio Bradesco',
        cardCode: '0091 · 7724',
    },
    {
        id: 's6',
        day: 'Quinta',
        time: '15:15',
        duration: '50 min',
        patient: 'Mentoria clínica',
        specialty: 'Alinhamento multidisciplinar',
        room: 'Sala 04',
        therapist: 'Dra. Camila N.',
        isLoggedTherapist: true,
        badges: ['Mentoria clínica'],
        insurance: 'Bloco interno',
        cardCode: 'Interno',
    },
]

export function HeroStageSection() {
    const [activeTab, setActiveTab] = useState<StageTabId>('recorrencia')
    const [waConfirmed, setWaConfirmed] = useState(true)

    const tabs = HERO_CONTENT.stageTabs

    const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveTab(tabs[(idx + 1) % tabs.length].id)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].id)
        }
    }

    const visibleSlots =
        activeTab === 'sigilo'
            ? AGENDA_SLOTS.filter((slot) => slot.isLoggedTherapist)
            : AGENDA_SLOTS

    return (
        <section id="topo" className="pt-28 sm:pt-32 pb-20 lg:pb-24">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                {/* Cabeçalho Editorial Limpo */}
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#E6E8E5] bg-white px-3 py-1.5 text-[11px] font-tech-mono font-medium tracking-[0.12em] uppercase text-[#114D3E]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#155E4B]" />
                        <span>{HERO_CONTENT.kicker}</span>
                    </div>

                    <h1 className="mt-6 text-[36px] sm:text-5xl lg:text-[62px] font-semibold tracking-[-0.035em] leading-[1.06] text-[#0F1F1B]">
                        {HERO_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal tracking-[-0.01em] text-[1.08em]">
                            {HERO_CONTENT.headlineAccent}
                        </span>
                        {HERO_CONTENT.headlineAfter}
                    </h1>

                    <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-[#4B5B56] leading-relaxed">
                        {HERO_CONTENT.subheadline}
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href={HERO_CONTENT.primaryCta.href}
                            className="w-full sm:w-auto min-h-[48px] px-6 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm sm:text-base font-medium transition-colors inline-flex items-center justify-center gap-2 group"
                        >
                            {HERO_CONTENT.primaryCta.label}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </Link>
                        <a
                            href={HERO_CONTENT.secondaryCta.href}
                            className="w-full sm:w-auto min-h-[48px] px-6 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm sm:text-base font-medium transition-colors inline-flex items-center justify-center"
                        >
                            {HERO_CONTENT.secondaryCta.label}
                        </a>
                    </div>

                    {/* Linha factual de especialidades */}
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-[#4B5B56]">
                        {HERO_CONTENT.specialtiesLine.map((spec, idx) => (
                            <span key={spec} className="inline-flex items-center gap-3">
                                <span>{spec}</span>
                                {idx < HERO_CONTENT.specialtiesLine.length - 1 && (
                                    <span className="text-[#C7CFCB]" aria-hidden="true">
                                        ·
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stage Interativo do Hero (Agenda Multidisciplinar Viva) */}
                <div className="mt-12 sm:mt-14">
                    {/* Seletor das 3 visões interativas */}
                    <div
                        role="tablist"
                        aria-label="Modos de visualização da agenda multidisciplinar"
                        className="flex flex-wrap items-center justify-center gap-2 mb-4"
                    >
                        {tabs.map((tab, idx) => {
                            const selected = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    type="button"
                                    id={`hero-stage-tab-${tab.id}`}
                                    aria-selected={selected}
                                    aria-controls="hero-stage-panel"
                                    onClick={() => setActiveTab(tab.id)}
                                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                    className={`min-h-[44px] px-4 rounded-md border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer inline-flex items-center gap-2 ${
                                        selected
                                            ? 'bg-[#0F1F1B] border-[#0F1F1B] text-white'
                                            : 'bg-white border-[#E6E8E5] text-[#4B5B56] hover:border-[#C7CFCB] hover:text-[#0F1F1B]'
                                    }`}
                                >
                                    {tab.id === 'recorrencia' && <CalendarDays className="w-4 h-4" strokeWidth={1.75} />}
                                    {tab.id === 'whatsapp' && <MessageSquare className="w-4 h-4" strokeWidth={1.75} />}
                                    {tab.id === 'sigilo' && <Lock className="w-4 h-4" strokeWidth={1.75} />}
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Moldura de aplicação desktop arquitetônica */}
                    <div
                        id="hero-stage-panel"
                        role="tabpanel"
                        aria-labelledby={`hero-stage-tab-${activeTab}`}
                        className="rounded-xl border border-[#E6E8E5] bg-white shadow-[0_18px_50px_-34px_rgba(15,31,27,0.18)] overflow-hidden"
                    >
                        {/* Topbar da aplicação */}
                        <div className="px-4 sm:px-6 py-3 border-b border-[#E6E8E5] bg-[#FAFAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5" aria-hidden="true">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#D5DAD7]" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#D5DAD7]" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#D5DAD7]" />
                                </div>
                                <span className="font-tech-mono text-[11px] text-[#4B5B56]">
                                    clinigo.app/dashboard/agenda · Semana atual
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {activeTab === 'sigilo' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] text-[11px] font-medium">
                                        <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                                        Isolamento RBAC ativo: convênios e agendas de colegas ocultos
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F2F5F3] text-[#4B5B56] font-tech-mono text-[11px]">
                                        <Clock className="w-3.5 h-3.5 text-[#155E4B]" strokeWidth={1.75} />
                                        Grade livre: 40 · 45 · 50 · 120 min
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Conteúdo principal do Stage */}
                        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Grade semanal em alta legibilidade */}
                            <div className={activeTab === 'whatsapp' ? 'lg:col-span-8' : 'lg:col-span-12'}>
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6E8E5]">
                                    <div>
                                        <div className="text-sm sm:text-base font-semibold text-[#0F1F1B]">
                                            {activeTab === 'sigilo'
                                                ? 'Minha Agenda · Dra. Camila N. (CRP 06/00000)'
                                                : 'Agenda Multidisciplinar · Salas e Equipe'}
                                        </div>
                                        <div className="text-xs text-[#4B5B56] mt-0.5">
                                            {activeTab === 'sigilo'
                                                ? 'Exibindo exclusivamente pacientes sob responsabilidade clínica da profissional autenticada.'
                                                : 'Séries recorrentes, co-atendimentos, supervisão técnica e mentoria clínica no mesmo quadro.'}
                                        </div>
                                    </div>
                                    <div className="font-tech-mono text-[11px] text-[#4B5B56] bg-[#F2F5F3] px-2.5 py-1 rounded">
                                        {visibleSlots.length} blocos exibidos
                                    </div>
                                </div>

                                <div
                                    className={`mt-4 grid grid-cols-1 sm:grid-cols-2 ${
                                        activeTab === 'whatsapp' ? 'xl:grid-cols-2' : 'lg:grid-cols-3'
                                    } gap-3`}
                                >
                                    {visibleSlots.map((slot) => {
                                        const isWaHighlighted =
                                            activeTab === 'whatsapp' && slot.whatsappTarget
                                        return (
                                            <div
                                                key={slot.id}
                                                className={`rounded-lg border p-4 transition-all duration-200 ${
                                                    isWaHighlighted
                                                        ? waConfirmed
                                                            ? 'border-[#155E4B] bg-[#F2FAF7]'
                                                            : 'border-[#C89B54] bg-[#FCF8F0]'
                                                        : 'border-[#E6E8E5] bg-[#FAFAF8]/60 hover:bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-tech-mono text-xs font-semibold text-[#0F1F1B]">
                                                        {slot.day} · {slot.time}
                                                    </span>
                                                    <span className="font-tech-mono text-[11px] px-2 py-0.5 rounded bg-white border border-[#E6E8E5] text-[#4B5B56]">
                                                        {slot.duration}
                                                    </span>
                                                </div>

                                                <div className="mt-2.5 text-sm font-semibold text-[#0F1F1B]">
                                                    {slot.patient}
                                                </div>
                                                <div className="text-xs text-[#4B5B56] mt-0.5">
                                                    {slot.specialty} · {slot.room}
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#4B5B56]">
                                                    <Users className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={1.75} />
                                                    <span className="truncate">{slot.therapist}</span>
                                                </div>

                                                {/* Badges de modalidade / recorrência */}
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {slot.badges.map((badge) => (
                                                        <span
                                                            key={badge}
                                                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#E6F2EE] text-[#114D3E]"
                                                        >
                                                            {badge}
                                                        </span>
                                                    ))}
                                                    {isWaHighlighted && (
                                                        <span
                                                            className={`px-2 py-0.5 rounded font-tech-mono text-[11px] font-medium inline-flex items-center gap-1 ${
                                                                waConfirmed
                                                                    ? 'bg-[#155E4B] text-white'
                                                                    : 'bg-[#F5E6CC] text-[#7A5212]'
                                                            }`}
                                                        >
                                                            {waConfirmed ? (
                                                                <>
                                                                    <Check className="w-3 h-3" strokeWidth={2} />
                                                                    Confirmado
                                                                </>
                                                            ) : (
                                                                'Aguardando'
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Linha de convênio / dados administrativos: protegida no Modo Sigilo */}
                                                <div className="mt-3 pt-2.5 border-t border-[#E6E8E5] flex items-center justify-between gap-2 text-[11px]">
                                                    {activeTab === 'sigilo' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[#4B5B56] font-tech-mono">
                                                            <EyeOff className="w-3.5 h-3.5 text-[#155E4B]" strokeWidth={1.75} />
                                                            Convênio e financeiro protegidos
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="text-[#4B5B56] truncate">{slot.insurance}</span>
                                                            <span className="font-tech-mono text-[#4B5B56] shrink-0">
                                                                {slot.cardCode}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Painel lateral interativo do WhatsApp Automático */}
                            {activeTab === 'whatsapp' && (
                                <div className="lg:col-span-4 rounded-xl border border-[#E6E8E5] bg-[#F2F5F3] p-4 sm:p-5 flex flex-col justify-between gap-4">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DFE4E1]">
                                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F1F1B]">
                                                <MessageSquare className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                                Confirmação WhatsApp
                                            </span>
                                            <span className="font-tech-mono text-[11px] text-[#114D3E] bg-[#E6F2EE] px-2 py-0.5 rounded">
                                                Setor Recepção
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-3 text-xs sm:text-sm">
                                            <div className="rounded-lg bg-white border border-[#E6E8E5] p-3 text-[#0F1F1B]">
                                                <p className="leading-relaxed">
                                                    Olá. Lembramos da sessão de Psicologia de Mariana C. na segunda-feira às 08:45 (50 min). Responda SIM para confirmar.
                                                </p>
                                                <div className="mt-1.5 font-tech-mono text-[10px] text-[#4B5B56] text-right">
                                                    08:00 · Enviado
                                                </div>
                                            </div>

                                            {waConfirmed ? (
                                                <div className="ml-6 rounded-lg bg-[#E6F2EE] border border-[#C3DFD5] p-3 text-[#0F1F1B]">
                                                    <p className="font-medium">SIM, confirmo presença.</p>
                                                    <div className="mt-1 font-tech-mono text-[10px] text-[#114D3E] flex items-center justify-end gap-1">
                                                        <span>08:14</span>
                                                        <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed border-[#C89B54] bg-[#FCF8F0] p-3 text-xs text-[#7A5212]">
                                                    Aguardando resposta da família. Status atual na grade: Aguardando.
                                                </div>
                                            )}

                                            <div className="rounded-lg bg-white border border-[#E6E8E5] p-3 text-xs flex items-center justify-between gap-2">
                                                <span className="text-[#4B5B56]">Fila da recepção</span>
                                                <span className="font-tech-mono font-semibold text-[#114D3E]">
                                                    {waConfirmed ? 'Confirmado · 08:14' : 'Pendente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setWaConfirmed((v) => !v)}
                                        className="w-full min-h-[44px] px-4 rounded-md border border-[#155E4B] bg-white hover:bg-[#E6F2EE] text-[#114D3E] text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        {waConfirmed
                                            ? 'Alternar para status Aguardando'
                                            : 'Simular resposta "SIM, confirmo"'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Rodapé honesto do mockup */}
                        <div className="px-4 sm:px-6 py-2.5 border-t border-[#E6E8E5] bg-[#FAFAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#4B5B56]">
                            <span className="font-tech-mono">{MOCKUP_DISCLAIMER}</span>
                            <span>Alterne as abas acima para inspecionar recorrência, WhatsApp e sigilo RBAC.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

