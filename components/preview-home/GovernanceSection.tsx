'use client'

import { useState } from 'react'
import { BrainCircuit, FileKey2, FileSignature, KeyRound, ShieldCheck, type LucideIcon } from 'lucide-react'
import { GOVERNANCE_CONTENT, MOCKUP_DISCLAIMER } from './content'

const MODULE_ICONS: Record<string, LucideIcon> = {
    rbac: ShieldCheck,
    'sessao-unica': KeyRound,
    documentos: FileKey2,
    assinatura: FileSignature,
    'ai-lgpd': BrainCircuit,
}

const MODULE_FACTS: Record<string, [string, string][]> = {
    rbac: [
        ['Terapeuta', 'Somente próprios pacientes'],
        ['Recepção', 'Sem acesso ao prontuário'],
        ['Auditoria', 'Perfil Somente Leitura'],
    ],
    'sessao-unica': [
        ['Sessão ativa', '1 dispositivo válido'],
        ['Login simultâneo', 'Sessão anterior revogada'],
        ['Trilha LGPD', 'Registrada por ação'],
    ],
    documentos: [
        ['Armazenamento', 'Privado por clínica'],
        ['Acesso', 'URL assinada temporária'],
        ['Titular', 'Portabilidade LGPD'],
    ],
    assinatura: [
        ['Carimbo', 'Data e hora UTC'],
        ['Origem', 'IP registrado e rubrica'],
        ['Integridade', 'Hash SHA-256'],
    ],
    'ai-lgpd': [
        ['Anonimização', 'Nome, CPF, telefone, e-mail'],
        ['Cota', 'Isolada por clínica'],
        ['Auditoria', 'Zero texto sensível'],
    ],
}

export function GovernanceSection() {
    const modules = GOVERNANCE_CONTENT.modules
    const [activeId, setActiveId] = useState<string>(modules[modules.length - 1].id)
    const active = modules.find((m) => m.id === activeId) || modules[0]
    const facts = MODULE_FACTS[active.id] || []

    return (
        <section
            id="governanca"
            className="scroll-mt-20 py-16 lg:py-20 bg-[#0D1F1B] text-white border-y border-[#1D3831]"
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7CD4B6]">
                        {GOVERNANCE_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-white">
                        {GOVERNANCE_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#7CD4B6] font-normal text-[1.08em]">
                            {GOVERNANCE_CONTENT.headlineAccent}
                        </span>
                        {GOVERNANCE_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[#A8BCB5] leading-relaxed">
                        {GOVERNANCE_CONTENT.subtitle}
                    </p>
                </div>

                {/* Faixa compacta de 5 controles clicáveis */}
                <div
                    role="tablist"
                    aria-label="Controles de segurança e conformidade"
                    className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
                >
                    {modules.map((mod) => {
                        const Icon = MODULE_ICONS[mod.id] || ShieldCheck
                        const selected = mod.id === active.id
                        return (
                            <button
                                key={mod.id}
                                role="tab"
                                type="button"
                                id={`gov-tab-${mod.id}`}
                                aria-selected={selected}
                                aria-controls="gov-panel"
                                onClick={() => setActiveId(mod.id)}
                                className={`min-h-[72px] text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${
                                    selected
                                        ? 'bg-[#15352D] border-[#7CD4B6]'
                                        : 'bg-[#112823] border-[#1D3831] hover:border-[#2E544A]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-[#7CD4B6] shrink-0" strokeWidth={1.75} />
                                    <span className="font-tech-mono text-[10px] text-[#7CD4B6]">{mod.code}</span>
                                </div>
                                <div className="mt-1.5 text-xs sm:text-[13px] font-semibold text-white leading-snug">
                                    {mod.title}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Detalhe do controle selecionado */}
                <div
                    id="gov-panel"
                    role="tabpanel"
                    aria-labelledby={`gov-tab-${active.id}`}
                    className="mt-4 rounded-xl border border-[#1D3831] bg-[#112823] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
                >
                    <p className="lg:col-span-6 text-sm text-[#CBE2D8] leading-relaxed">{active.description}</p>
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-tech-mono text-[11px]">
                        {facts.map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] px-3.5 py-2.5">
                                <div className="text-[#809B92]">{label}</div>
                                <div className="mt-1 text-white">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 font-tech-mono text-[11px] text-[#809B92]">{MOCKUP_DISCLAIMER}</div>
            </div>
        </section>
    )
}
