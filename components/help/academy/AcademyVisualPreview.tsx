'use client'

import { useState } from 'react'
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock,
    FileCode2,
    FileSpreadsheet,
    FileText,
    Lock,
    QrCode,
    ScanFace,
    Send,
    ShieldCheck,
    Tv,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react'
import type { AcademyStationId } from './academy-data'

interface AcademyVisualPreviewProps {
    stationId: AcademyStationId
}

export function AcademyVisualPreview({ stationId }: AcademyVisualPreviewProps) {
    // Estados interativos leves (sandbox 100% fictício — nunca altera dados reais)
    const [preCadastroEnviado, setPreCadastroEnviado] = useState(false)
    const [serieGerada, setSerieGerada] = useState(false)
    const [biometriaOk, setBiometriaOk] = useState(false)
    const [especialidadeAtiva, setEspecialidadeAtiva] = useState<'ABA' | 'Psicologia' | 'Fono' | 'TO'>('ABA')
    const [evolucaoAssinada, setEvolucaoAssinada] = useState(false)
    const [sessoesRegistradas, setSessoesRegistradas] = useState(0)
    const [escudoValidado, setEscudoValidado] = useState(false)
    const [contaLiberada, setContaLiberada] = useState(false)
    const [dossieMontado, setDossieMontado] = useState(false)
    const [visaoRepasse, setVisaoRepasse] = useState<'gestor' | 'terapeuta'>('gestor')

    const urlByStation: Record<AcademyStationId, string> = {
        'pre-cadastro': 'clinigo.app/dashboard/pre-cadastros',
        'agenda-recorrente': 'clinigo.app/dashboard/agenda',
        'biometria-checkin': 'clinigo.app/dashboard/recepcao',
        'evolucao-especialidade': 'clinigo.app/dashboard/evolucoes',
        'planos-faltas': 'clinigo.app/dashboard/planos-terapeuticos',
        'escudo-tiss': 'clinigo.app/dashboard/tiss',
        'glosas-dossie': 'clinigo.app/dashboard/tiss/glosas',
        'repasse-financeiro': 'clinigo.app/dashboard/financial/payroll',
    }

    const templateTextBySpecialty: Record<'ABA' | 'Psicologia' | 'Fono' | 'TO', { area: string; council: string; note: string }> = {
        ABA: {
            area: 'Análise do Comportamento (ABA)',
            council: 'Coordenação ABA / CRP',
            note: 'Programa de mando funcional com reforço imediato. 8/10 respostas independentes em ambiente estruturado.',
        },
        Psicologia: {
            area: 'Psicologia Clínica (Sigilo CRP)',
            council: 'Acesso exclusivo Psicologia',
            note: 'Sessão de regulação emocional e vínculo terapêutico. Conteúdo restrito por sigilo profissional.',
        },
        Fono: {
            area: 'Fonoaudiologia (CRFa)',
            council: 'CRFa — Linguagem Infantil',
            note: 'Treino articulatório e ampliação de repertório verbal expressivo com apoio visual.',
        },
        TO: {
            area: 'Terapia Ocupacional (CREFITO)',
            council: 'CREFITO — Integração Sensorial',
            note: 'Circuito proprioceptivo na Sala Sensorial 02 com excelente tolerância tátil e vestibular.',
        },
    }

    return (
        <div className="rounded-xl border border-[#DCE2DF] bg-[#FAFAF8] overflow-hidden shadow-sm">
            {/* Barra superior simulando o navegador / tela real do sistema */}
            <div className="px-3.5 py-2.5 bg-white border-b border-[#E6E8E5] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DCE2DF]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DCE2DF]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DCE2DF]" />
                    </div>
                    <span className="text-[11px] font-mono text-[#4B5B56] bg-[#F2F5F3] px-2.5 py-0.5 rounded truncate">
                        {urlByStation[stationId]}
                    </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#155E4B] bg-[#E8F2EE] px-2 py-0.5 rounded shrink-0">
                    Interativo
                </span>
            </div>

            {/* Corpo visual da Mini-Tela */}
            <div className="p-4 sm:p-5 space-y-4">
                {stationId === 'pre-cadastro' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-3 bg-white border border-[#E6E8E5] rounded-lg p-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-lg bg-[#E8F2EE] border border-[#155E4B]/20 flex items-center justify-center shrink-0">
                                    <QrCode className="w-6 h-6 text-[#155E4B]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#0F1F1B]">
                                        Pré-Cadastro Remoto — Paciente Exemplo (Lucas M.)
                                    </p>
                                    <p className="text-[11px] text-[#4B5B56]">
                                        Link seguro para preenchimento no celular do responsável
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${
                                    preCadastroEnviado
                                        ? 'bg-[#E8F2EE] text-[#155E4B]'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                            >
                                {preCadastroEnviado ? 'Preenchido' : 'Aguardando'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="bg-white border border-[#E6E8E5] rounded-lg p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-[#4B5B56]">Dados e CPF</p>
                                <p className="text-xs font-semibold text-[#0F1F1B] mt-0.5">
                                    {preCadastroEnviado ? 'Validados pelo responsável' : 'Pendente de envio'}
                                </p>
                            </div>
                            <div className="bg-white border border-[#E6E8E5] rounded-lg p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-[#4B5B56]">Carteirinha Convênio</p>
                                <p className="text-xs font-semibold text-[#0F1F1B] mt-0.5">
                                    {preCadastroEnviado ? 'Foto anexada (PDF/IMG)' : 'Sem anexo'}
                                </p>
                            </div>
                            <div className="bg-white border border-[#E6E8E5] rounded-lg p-2.5">
                                <p className="text-[10px] uppercase tracking-wider text-[#4B5B56]">Termo LGPD</p>
                                <p className="text-xs font-semibold text-[#0F1F1B] mt-0.5">
                                    {preCadastroEnviado ? 'Assinado eletronicamente' : 'Não assinado'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setPreCadastroEnviado((v) => !v)}
                            className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            {preCadastroEnviado ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Cadastro recebido e pronto na ficha (clique para simular de novo)
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Testar aqui: Simular preenchimento pelo WhatsApp
                                </>
                            )}
                        </button>
                    </div>
                )}

                {stationId === 'agenda-recorrente' && (
                    <div className="space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1F1B]">
                                <Calendar className="w-4 h-4 text-[#155E4B]" />
                                <span>Grade Semanal — Sala Sensorial 02</span>
                            </div>
                            <span className="text-[11px] font-medium text-[#155E4B] bg-[#E8F2EE] px-2 py-0.5 rounded">
                                Co-terapia ativa (2 profissionais)
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {['Terça 14:00', 'Quinta 14:00', 'Próx. Semana'].map((dia, idx) => {
                                const filled = idx < 2 || serieGerada
                                return (
                                    <div
                                        key={dia}
                                        className={`rounded-lg border p-2.5 transition-all ${
                                            filled
                                                ? 'bg-white border-[#155E4B]/35'
                                                : 'bg-[#F2F5F3]/70 border-dashed border-[#CBD5D0]'
                                        }`}
                                    >
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5B56]">
                                            {dia}
                                        </p>
                                        {filled ? (
                                            <div className="mt-1.5 space-y-1">
                                                <p className="text-xs font-semibold text-[#0F1F1B]">Lucas M. (ABA)</p>
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-[10px] bg-[#E8F2EE] text-[#155E4B] px-1.5 py-0.5 rounded font-medium">
                                                        Psico + TO
                                                    </span>
                                                    <span className="text-[10px] bg-[#F2F5F3] text-[#354540] px-1.5 py-0.5 rounded">
                                                        Sala 02
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-[#6B7A75] mt-2">
                                                Aguardando geração da série...
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setSerieGerada((v) => !v)}
                            className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            {serieGerada ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    24 sessões recorrentes criadas sem conflito de sala (resetar)
                                </>
                            ) : (
                                <>
                                    <Calendar className="w-4 h-4" />
                                    Testar aqui: Gerar série recorrente (12 semanas) com 1 clique
                                </>
                            )}
                        </button>
                    </div>
                )}

                {stationId === 'biometria-checkin' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Simulação de câmera biométrica */}
                            <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 flex flex-col items-center justify-center text-center space-y-2">
                                <div
                                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-colors ${
                                        biometriaOk
                                            ? 'border-[#155E4B] bg-[#E8F2EE] text-[#155E4B]'
                                            : 'border-dashed border-[#9FB1AA] bg-[#FAFAF8] text-[#4B5B56]'
                                    }`}
                                >
                                    <ScanFace className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#0F1F1B]">
                                        {biometriaOk ? 'Rosto Confirmado (98,4%)' : 'Câmera da Recepção / Totem'}
                                    </p>
                                    <p className="text-[11px] text-[#4B5B56] tabular-nums">
                                        {biometriaOk ? 'Presença gravada às 13:57 • Hash TISS' : 'Posicione o rosto para check-in'}
                                    </p>
                                </div>
                            </div>

                            {/* Simulação do Painel de TV */}
                            <div className="bg-[#0F1F1B] text-white rounded-lg p-3.5 flex flex-col justify-between space-y-2">
                                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-emerald-300">
                                    <span className="inline-flex items-center gap-1">
                                        <Tv className="w-3.5 h-3.5" />
                                        Painel de TV
                                    </span>
                                    <span>Sala de Espera</span>
                                </div>
                                <div className="py-1">
                                    <p className="text-[11px] text-slate-300">Chamada atual</p>
                                    <p className="text-base font-bold tracking-tight mt-0.5">
                                        {biometriaOk ? 'Lucas M. — Sala Sensorial 02' : 'Aguardando check-in'}
                                    </p>
                                </div>
                                <div className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                        {biometriaOk ? 'Prova biométrica vinculada à guia' : 'Pronto para vincular ao TISS'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setBiometriaOk((v) => !v)}
                            className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            {biometriaOk ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Presença comprovada e enviada ao terapeuta (simular novamente)
                                </>
                            ) : (
                                <>
                                    <ScanFace className="w-4 h-4" />
                                    Testar aqui: Simular Check-in Facial na Recepção
                                </>
                            )}
                        </button>
                    </div>
                )}

                {stationId === 'evolucao-especialidade' && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {(['ABA', 'Psicologia', 'Fono', 'TO'] as const).map((esp) => (
                                <button
                                    key={esp}
                                    type="button"
                                    onClick={() => {
                                        setEspecialidadeAtiva(esp)
                                        setEvolucaoAssinada(false)
                                    }}
                                    className={`min-h-[36px] px-3 rounded-md text-xs font-semibold border transition-colors ${
                                        especialidadeAtiva === esp
                                            ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                            : 'bg-white text-[#354540] border-[#DCE2DF] hover:border-[#155E4B]/50'
                                    }`}
                                >
                                    {esp}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#0F1F1B]">
                                    {templateTextBySpecialty[especialidadeAtiva].area}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#155E4B] bg-[#E8F2EE] px-2 py-0.5 rounded">
                                    <Lock className="w-3 h-3" />
                                    {templateTextBySpecialty[especialidadeAtiva].council}
                                </span>
                            </div>
                            <p className="text-xs text-[#354540] leading-relaxed bg-[#FAFAF8] border border-[#E6E8E5] rounded-md p-2.5">
                                {templateTextBySpecialty[especialidadeAtiva].note}
                            </p>
                            {evolucaoAssinada && (
                                <div className="flex items-center justify-between text-[11px] text-[#155E4B] bg-[#E8F2EE] px-2.5 py-1.5 rounded-md">
                                    <span className="inline-flex items-center gap-1.5 font-semibold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Assinado eletronicamente (Lei 14.063/2020)
                                    </span>
                                    <span className="font-mono text-[10px]">SHA256: 9f4a...c81e</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setEvolucaoAssinada((v) => !v)}
                            className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            {evolucaoAssinada ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Evolução travada e liberada para o TISS (testar outra especialidade)
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    Testar aqui: Assinar evolução ({especialidadeAtiva})
                                </>
                            )}
                        </button>
                    </div>
                )}

                {stationId === 'planos-faltas' && (
                    <div className="space-y-3.5">
                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1F1B]">
                                    <Activity className="w-4 h-4 text-[#155E4B]" />
                                    Curva de Evolução — Plano ABA (Lucas M.)
                                </span>
                                <span className="text-[11px] font-semibold text-[#155E4B] tabular-nums">
                                    {12 + sessoesRegistradas} sessões
                                </span>
                            </div>

                            {[
                                { label: 'Comunicação funcional', base: 72 },
                                { label: 'Contato visual sustentado', base: 80 },
                                { label: 'Autonomia motora fina', base: 64 },
                            ].map((meta) => {
                                const pct = Math.min(100, meta.base + sessoesRegistradas * 6)
                                return (
                                    <div key={meta.label} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-[#354540] font-medium">{meta.label}</span>
                                            <span className="font-semibold text-[#0F1F1B] tabular-nums">{pct}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-[#E6E8E5] overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[#155E4B] transition-all duration-300"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSessoesRegistradas((n) => (n >= 4 ? 0 : n + 1))}
                                className="flex-1 min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <Activity className="w-4 h-4" />
                                {sessoesRegistradas >= 4
                                    ? 'Reiniciar metas do plano'
                                    : 'Testar aqui: Registrar avanço de sessão (+6%)'}
                            </button>
                        </div>
                    </div>
                )}

                {stationId === 'escudo-tiss' && (
                    <div className="space-y-3">
                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#0F1F1B]">
                                    Escudo Anti-Glosa — Guia #2026-0841 (ABA • R$ 180,00)
                                </span>
                                <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                        contaLiberada
                                            ? 'bg-[#E8F2EE] text-[#155E4B]'
                                            : escudoValidado
                                              ? 'bg-emerald-50 text-emerald-800'
                                              : 'bg-amber-50 text-amber-800'
                                    }`}
                                >
                                    {contaLiberada ? 'Liberada (Ctrl+L)' : escudoValidado ? '4/4 Pronta' : '3/4 Pendente'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Carteirinha Convênio', ok: true },
                                    { label: 'Biometria Facial', ok: true },
                                    { label: 'Evolução Assinada', ok: true },
                                    { label: 'Senha Autorização ANS', ok: escudoValidado },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className={`rounded-md border px-2.5 py-2 flex items-center gap-2 text-[11px] font-medium ${
                                            item.ok
                                                ? 'border-[#155E4B]/25 bg-[#E8F2EE]/60 text-[#0F1F1B]'
                                                : 'border-amber-300 bg-amber-50 text-amber-900'
                                        }`}
                                    >
                                        {item.ok ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#155E4B] shrink-0" />
                                        ) : (
                                            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        )}
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!escudoValidado ? (
                            <button
                                type="button"
                                onClick={() => setEscudoValidado(true)}
                                className="w-full min-h-[44px] px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Passo 1: Validar Senha de Autorização pendente
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (contaLiberada) {
                                        setEscudoValidado(false)
                                        setContaLiberada(false)
                                    } else {
                                        setContaLiberada(true)
                                    }
                                }}
                                className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <FileCode2 className="w-4 h-4" />
                                {contaLiberada
                                    ? 'Conta liberada para Remessa XML ANS (simular de novo)'
                                    : 'Passo 2: Encerrar e Liberar Conta (Ctrl+L)'}
                            </button>
                        )}
                    </div>
                )}

                {stationId === 'glosas-dossie' && (
                    <div className="space-y-3">
                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#0F1F1B]">
                                    Glosa Código ANS 1705 — R$ 180,00 (Recuperável)
                                </span>
                                <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                        dossieMontado ? 'bg-[#E8F2EE] text-[#155E4B]' : 'bg-red-50 text-red-700'
                                    }`}
                                >
                                    {dossieMontado ? 'Dossiê Pronto' : 'Aguardando Recurso'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    'Espelho da Guia TISS',
                                    'Biometria Facial (13:57)',
                                    'Evolução Assinada (Lei 14.063)',
                                ].map((doc) => (
                                    <div
                                        key={doc}
                                        className={`rounded-md border p-2 text-[11px] flex items-center gap-1.5 ${
                                            dossieMontado
                                                ? 'border-[#155E4B]/30 bg-[#E8F2EE]/70 text-[#0F1F1B] font-semibold'
                                                : 'border-[#E6E8E5] bg-[#FAFAF8] text-[#6B7A75]'
                                        }`}
                                    >
                                        <CheckCircle2
                                            className={`w-3.5 h-3.5 shrink-0 ${
                                                dossieMontado ? 'text-[#155E4B]' : 'text-[#CBD5D0]'
                                            }`}
                                        />
                                        <span className="truncate">{doc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setDossieMontado((v) => !v)}
                            className="w-full min-h-[44px] px-4 py-2 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {dossieMontado
                                ? 'Dossiê Probatório compilado com 3 provas (clique para resetar)'
                                : 'Testar aqui: Montar Dossiê Probatório em 1 Clique'}
                        </button>
                    </div>
                )}

                {stationId === 'repasse-financeiro' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setVisaoRepasse('gestor')}
                                className={`flex-1 min-h-[38px] rounded-md text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 ${
                                    visaoRepasse === 'gestor'
                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                        : 'bg-white text-[#354540] border-[#DCE2DF]'
                                }`}
                            >
                                <Wallet className="w-3.5 h-3.5" />
                                Visão do Gestor (Folha)
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisaoRepasse('terapeuta')}
                                className={`flex-1 min-h-[38px] rounded-md text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 ${
                                    visaoRepasse === 'terapeuta'
                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                        : 'bg-white text-[#354540] border-[#DCE2DF]'
                                }`}
                            >
                                <UserCheck className="w-3.5 h-3.5" />
                                Visão da Terapeuta
                            </button>
                        </div>

                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-3.5 space-y-2.5">
                            {visaoRepasse === 'gestor' ? (
                                <>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-[#0F1F1B] inline-flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-[#155E4B]" />
                                            Folha de Repasse — Competência Atual
                                        </span>
                                        <span className="font-semibold text-[#155E4B] tabular-nums">3 terapeutas</span>
                                    </div>
                                    <div className="divide-y divide-[#E6E8E5] text-xs">
                                        <div className="py-1.5 flex items-center justify-between">
                                            <span className="text-[#354540]">Dra. Ana (Psicologia • 32 sessões)</span>
                                            <span className="font-semibold text-[#0F1F1B] tabular-nums">R$ 2.880,00</span>
                                        </div>
                                        <div className="py-1.5 flex items-center justify-between">
                                            <span className="text-[#354540]">Dra. Carla (ABA • 28 sessões)</span>
                                            <span className="font-semibold text-[#0F1F1B] tabular-nums">R$ 2.940,00</span>
                                        </div>
                                        <div className="py-1.5 flex items-center justify-between">
                                            <span className="text-[#354540]">Dr. Bruno (Fono • 24 sessões)</span>
                                            <span className="font-semibold text-[#0F1F1B] tabular-nums">R$ 2.160,00</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-[#0F1F1B]">
                                            Meu Financeiro — Dra. Carla (ABA)
                                        </span>
                                        <span className="text-[11px] bg-[#E8F2EE] text-[#155E4B] font-semibold px-2 py-0.5 rounded">
                                            Transparente
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="rounded-md bg-[#FAFAF8] border border-[#E6E8E5] p-2.5">
                                            <p className="text-[10px] uppercase text-[#4B5B56]">Sessões Realizadas</p>
                                            <p className="text-base font-bold text-[#0F1F1B] tabular-nums mt-0.5">28</p>
                                        </div>
                                        <div className="rounded-md bg-[#E8F2EE]/70 border border-[#155E4B]/20 p-2.5">
                                            <p className="text-[10px] uppercase text-[#155E4B]">Repasse Estimado</p>
                                            <p className="text-base font-bold text-[#155E4B] tabular-nums mt-0.5">R$ 2.940,00</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-[#4B5B56] inline-flex items-center gap-1.5">
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#155E4B]" />
                                        A terapeuta vê apenas a própria produção (sigilo total dos demais colegas).
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

