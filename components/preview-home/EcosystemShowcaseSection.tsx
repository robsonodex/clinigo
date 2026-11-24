'use client'

import { useState, type KeyboardEvent } from 'react'
import { Briefcase, CheckCircle2, ClipboardCheck, HeartPulse, Users } from 'lucide-react'
import { ECOSYSTEM_ROLES_CONTENT, type RoleSpotlightId } from './content'

export function EcosystemShowcaseSection() {
    const roles = ECOSYSTEM_ROLES_CONTENT.roles
    const [activeRoleId, setActiveRoleId] = useState<RoleSpotlightId>('gestora')

    const activeIdx = Math.max(0, roles.findIndex((r) => r.id === activeRoleId))
    const activeRole = roles[activeIdx] || roles[0]

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveRoleId(roles[(idx + 1) % roles.length].id)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveRoleId(roles[(idx - 1 + roles.length) % roles.length].id)
        }
    }

    const renderIcon = (id: RoleSpotlightId) => {
        if (id === 'gestora') return <Briefcase className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        if (id === 'coordenacao') return <ClipboardCheck className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        if (id === 'terapeuta') return <HeartPulse className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        return <Users className="w-4 h-4 shrink-0" strokeWidth={1.75} />
    }

    return (
        <section aria-label="Recursos por função na clínica" className="py-20 lg:py-28 bg-[#FAFAF8] border-t border-[#E6E8E5]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {ECOSYSTEM_ROLES_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                        {ECOSYSTEM_ROLES_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {ECOSYSTEM_ROLES_CONTENT.headlineAccent}
                        </span>
                        {ECOSYSTEM_ROLES_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-3.5 text-base text-[#4B5B56] leading-relaxed">
                        {ECOSYSTEM_ROLES_CONTENT.subtitle}
                    </p>
                </div>

                {/* Abas de perfil */}
                <div
                    role="tablist"
                    aria-label="Selecionar perfil da equipe"
                    className="mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
                >
                    {roles.map((role, idx) => {
                        const selected = role.id === activeRole.id
                        return (
                            <button
                                key={role.id}
                                role="tab"
                                type="button"
                                id={`role-tab-${role.id}`}
                                aria-selected={selected}
                                aria-controls="role-panel"
                                onClick={() => setActiveRoleId(role.id)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                className={`min-h-[64px] text-left rounded-xl border px-4 py-3.5 transition-all duration-200 cursor-pointer ${
                                    selected
                                        ? 'bg-[#155E4B] border-[#155E4B] text-white shadow-[0_12px_28px_-20px_rgba(21,94,75,0.65)]'
                                        : 'bg-white border-[#E6E8E5] text-[#0F1F1B] hover:border-[#C7CFCB]'
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <span className={selected ? 'text-[#A8E0CC]' : 'text-[#155E4B]'}>
                                        {renderIcon(role.id)}
                                    </span>
                                    <span>{role.roleLabel}</span>
                                </div>
                                <div
                                    className={`mt-1 text-xs ${
                                        selected ? 'text-[#D6EFE5]' : 'text-[#4B5B56]'
                                    }`}
                                >
                                    {role.tagline}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Painel vivo da função selecionada */}
                <div
                    id="role-panel"
                    role="tabpanel"
                    aria-labelledby={`role-tab-${activeRole.id}`}
                    className="mt-6 rounded-2xl border border-[#E6E8E5] bg-white p-6 sm:p-8 lg:p-10 shadow-[0_18px_48px_-34px_rgba(15,31,27,0.16)]"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                            <div>
                                <span className="font-tech-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] font-semibold">
                                    {activeRole.roleLabel}
                                </span>
                                <h3 className="mt-4 text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] leading-[1.14] text-[#0F1F1B]">
                                    {activeRole.headline}
                                </h3>
                                <p className="mt-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                    {activeRole.summary}
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#C8DFD6] bg-[#F2FAF7] p-5 flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-tech-mono text-2xl sm:text-3xl font-semibold text-[#155E4B]">
                                        {activeRole.metricNumber}
                                    </div>
                                    <div className="mt-0.5 text-xs font-medium text-[#114D3E]">
                                        {activeRole.metricLabel}
                                    </div>
                                </div>
                                <span className="font-tech-mono text-[11px] px-2.5 py-1 rounded bg-white border border-[#C8DFD6] text-[#114D3E]">
                                    Permissão isolada
                                </span>
                            </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeRole.highlights.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-xl border border-[#E6E8E5] bg-[#FAFAF8] p-5 flex flex-col gap-2"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <CheckCircle2
                                            className="w-4 h-4 text-[#155E4B] mt-0.5 shrink-0"
                                            strokeWidth={1.9}
                                        />
                                        <h4 className="text-sm font-semibold text-[#0F1F1B] leading-snug">
                                            {item.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs sm:text-[13px] text-[#4B5B56] leading-relaxed pl-6">
                                        {item.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

