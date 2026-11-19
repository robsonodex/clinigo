import { Check, FileKey2, FileSignature, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { GOVERNANCE_CONTENT, MOCKUP_DISCLAIMER } from './content'

export function GovernanceSection() {
    const [rbac, sessaoUnica, documentos, assinatura] = GOVERNANCE_CONTENT.modules

    return (
        <section
            id="governanca"
            className="scroll-mt-20 py-20 lg:py-28 bg-[#0D1F1B] text-white border-y border-[#1D3831]"
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7CD4B6]">
                        {GOVERNANCE_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-white">
                        {GOVERNANCE_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#7CD4B6] font-normal text-[1.08em]">
                            {GOVERNANCE_CONTENT.headlineAccent}
                        </span>
                        {GOVERNANCE_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-4 text-base text-[#A8BCB5] leading-relaxed">
                        {GOVERNANCE_CONTENT.subtitle}
                    </p>
                </div>

                {/* Grid assimétrico arquitetônico (4 módulos técnicos reais) */}
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Módulo 1: RBAC real (7 cols) */}
                    <article className="lg:col-span-7 rounded-xl border border-[#1D3831] bg-[#112823] p-6 sm:p-7 flex flex-col justify-between gap-6">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="w-9 h-9 rounded-md border border-[#1D3831] bg-[#0D1F1B] text-[#7CD4B6] flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                                </span>
                                <span className="font-tech-mono text-[11px] text-[#7CD4B6] px-2.5 py-0.5 rounded border border-[#1D3831] bg-[#0D1F1B]">
                                    {rbac.code}
                                </span>
                            </div>
                            <h3 className="mt-5 text-lg sm:text-xl font-semibold text-white tracking-tight">
                                {rbac.title}
                            </h3>
                            <p className="mt-2 text-sm text-[#A8BCB5] leading-relaxed">
                                {rbac.description}
                            </p>
                        </div>

                        {/* Micro-ilustração de matriz RBAC */}
                        <div className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[400px]">
                                <thead>
                                    <tr className="border-b border-[#1D3831] font-tech-mono text-[10px] uppercase tracking-wider text-[#809B92]">
                                        <th className="px-3.5 py-2.5 font-medium">Perfil</th>
                                        <th className="px-3 py-2.5 font-medium">Prontuário</th>
                                        <th className="px-3 py-2.5 font-medium">Convênios</th>
                                        <th className="px-3 py-2.5 font-medium">Escopo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1D3831]/70">
                                    {[
                                        { role: 'Terapeuta', pep: 'Somente próprios', conv: 'Bloqueado', scope: 'Clínico isolado', locked: true },
                                        { role: 'Recepção', pep: 'Bloqueado', conv: 'Cadastro', scope: 'Agenda e fila', locked: true },
                                        { role: 'Coordenação', pep: 'Autorizado', conv: 'Visualização', scope: 'Equipe e BI', locked: false },
                                        { role: 'Somente Leitura', pep: 'Auditoria', conv: 'Auditoria', scope: 'Sem edição', locked: false },
                                    ].map((row) => (
                                        <tr key={row.role}>
                                            <td className="px-3.5 py-2.5 font-medium text-white">{row.role}</td>
                                            <td className="px-3 py-2.5 font-tech-mono text-[11px] text-[#CBE2D8]">{row.pep}</td>
                                            <td className="px-3 py-2.5 font-tech-mono text-[11px]">
                                                <span
                                                    className={`inline-flex items-center gap-1 ${
                                                        row.conv === 'Bloqueado' ? 'text-[#E3A978]' : 'text-[#7CD4B6]'
                                                    }`}
                                                >
                                                    {row.conv === 'Bloqueado' ? (
                                                        <Lock className="w-3 h-3" strokeWidth={1.75} />
                                                    ) : (
                                                        <Check className="w-3 h-3" strokeWidth={1.75} />
                                                    )}
                                                    {row.conv}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-[#8DA89F]">{row.scope}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    {/* Módulo 2: Sessão Única Auditada (5 cols) */}
                    <article className="lg:col-span-5 rounded-xl border border-[#1D3831] bg-[#112823] p-6 sm:p-7 flex flex-col justify-between gap-6">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="w-9 h-9 rounded-md border border-[#1D3831] bg-[#0D1F1B] text-[#7CD4B6] flex items-center justify-center">
                                    <KeyRound className="w-4 h-4" strokeWidth={1.75} />
                                </span>
                                <span className="font-tech-mono text-[11px] text-[#7CD4B6] px-2.5 py-0.5 rounded border border-[#1D3831] bg-[#0D1F1B]">
                                    {sessaoUnica.code}
                                </span>
                            </div>
                            <h3 className="mt-5 text-lg sm:text-xl font-semibold text-white tracking-tight">
                                {sessaoUnica.title}
                            </h3>
                            <p className="mt-2 text-sm text-[#A8BCB5] leading-relaxed">
                                {sessaoUnica.description}
                            </p>
                        </div>

                        <div className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] p-4 space-y-2.5 font-tech-mono text-[11px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[#809B92]">Sessão ativa</span>
                                <span className="text-[#7CD4B6]">1 dispositivo válido</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[#1D3831] pt-2">
                                <span className="text-[#809B92]">Novo login simultâneo</span>
                                <span className="text-[#E3A978]">Sessão anterior revogada</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[#1D3831] pt-2">
                                <span className="text-[#809B92]">Trilha LGPD</span>
                                <span className="text-white">Registrada por ação</span>
                            </div>
                        </div>
                    </article>

                    {/* Módulo 3: Documentos Privados e URLs Assinadas (5 cols) */}
                    <article className="lg:col-span-5 rounded-xl border border-[#1D3831] bg-[#112823] p-6 sm:p-7 flex flex-col justify-between gap-6">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="w-9 h-9 rounded-md border border-[#1D3831] bg-[#0D1F1B] text-[#7CD4B6] flex items-center justify-center">
                                    <FileKey2 className="w-4 h-4" strokeWidth={1.75} />
                                </span>
                                <span className="font-tech-mono text-[11px] text-[#7CD4B6] px-2.5 py-0.5 rounded border border-[#1D3831] bg-[#0D1F1B]">
                                    {documentos.code}
                                </span>
                            </div>
                            <h3 className="mt-5 text-lg sm:text-xl font-semibold text-white tracking-tight">
                                {documentos.title}
                            </h3>
                            <p className="mt-2 text-sm text-[#A8BCB5] leading-relaxed">
                                {documentos.description}
                            </p>
                        </div>

                        <div className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] p-4 space-y-2 font-tech-mono text-[11px]">
                            <div className="text-[#809B92]">Bucket privado isolado por clínica</div>
                            <div className="rounded bg-[#112823] border border-[#1D3831] px-2.5 py-2 text-[#CBE2D8] truncate">
                                /vault/clinic_id/prontuario_doc.pdf?exp=300s
                            </div>
                            <div className="flex items-center justify-between pt-1 text-[#7CD4B6]">
                                <span>URL assinada temporária</span>
                                <span>Portabilidade LGPD</span>
                            </div>
                        </div>
                    </article>

                    {/* Módulo 4: Assinatura Eletrônica Probatória (7 cols) */}
                    <article className="lg:col-span-7 rounded-xl border border-[#1D3831] bg-[#112823] p-6 sm:p-7 flex flex-col justify-between gap-6">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="w-9 h-9 rounded-md border border-[#1D3831] bg-[#0D1F1B] text-[#7CD4B6] flex items-center justify-center">
                                    <FileSignature className="w-4 h-4" strokeWidth={1.75} />
                                </span>
                                <span className="font-tech-mono text-[11px] text-[#7CD4B6] px-2.5 py-0.5 rounded border border-[#1D3831] bg-[#0D1F1B]">
                                    {assinatura.code}
                                </span>
                            </div>
                            <h3 className="mt-5 text-lg sm:text-xl font-semibold text-white tracking-tight">
                                {assinatura.title}
                            </h3>
                            <p className="mt-2 text-sm text-[#A8BCB5] leading-relaxed">
                                {assinatura.description}
                            </p>
                        </div>

                        <div className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 font-tech-mono text-[11px]">
                            <div className="rounded border border-[#1D3831] bg-[#112823]/70 p-3">
                                <div className="text-[#809B92]">Carimbo UTC</div>
                                <div className="mt-1 text-white">2026-11-19 14:22:08Z</div>
                            </div>
                            <div className="rounded border border-[#1D3831] bg-[#112823]/70 p-3">
                                <div className="text-[#809B92]">Origem auditada</div>
                                <div className="mt-1 text-white">IP registrado · Rubrica</div>
                            </div>
                            <div className="rounded border border-[#1D3831] bg-[#112823]/70 p-3">
                                <div className="text-[#809B92]">Integridade SHA-256</div>
                                <div className="mt-1 text-[#7CD4B6] truncate">a8e4c19b...4f21d0c3</div>
                            </div>
                        </div>
                    </article>
                </div>

                <div className="mt-6 font-tech-mono text-[11px] text-[#809B92]">
                    {MOCKUP_DISCLAIMER}
                </div>
            </div>
        </section>
    )
}

