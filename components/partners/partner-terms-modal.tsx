'use client'

import { useState, useRef, useEffect } from 'react'
import { X, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface TermsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAccept: () => void
    partnerData: {
        full_name: string
        cpf: string
        email: string
        phone: string
    }
}

export function PartnerTermsModal({ open, onOpenChange, onAccept, partnerData }: TermsModalProps) {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showFullTerms, setShowFullTerms] = useState(false)

    // Format current date
    const currentDate = new Date().toLocaleDateString('pt-BR')
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // Format CPF
    const formatCPF = (cpf: string) => {
        const cleaned = cpf.replace(/\D/g, '')
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    // Format phone
    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        }
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    // Check if scrolled to bottom
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                setHasScrolledToBottom(true)
            }
        }
    }

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setHasScrolledToBottom(false)
            setAcceptedTerms(false)
        }
    }, [open])

    const handleAccept = () => {
        if (acceptedTerms) {
            onAccept()
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-vibrant/20 rounded-lg">
                            <FileText className="w-5 h-5 text-teal-vibrant" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Termo de Parceria Comercial</h2>
                            <p className="text-sm text-slate-400">Versão 1.0 | Vigência: 07/02/2026</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Partner Data Auto-filled */}
                <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                    <p className="text-sm text-slate-400 mb-2 font-medium">Dados do Parceiro (preenchidos automaticamente):</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500">Nome:</span>
                            <span className="ml-2 text-white font-medium">{partnerData.full_name || '—'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">CPF:</span>
                            <span className="ml-2 text-white font-medium">{partnerData.cpf ? formatCPF(partnerData.cpf) : '—'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Email:</span>
                            <span className="ml-2 text-white font-medium">{partnerData.email || '—'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Telefone:</span>
                            <span className="ml-2 text-white font-medium">{partnerData.phone ? formatPhone(partnerData.phone) : '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Terms Content */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 leading-relaxed"
                    style={{ maxHeight: 'calc(90vh - 350px)' }}
                >
                    <div className="space-y-6">
                        {/* Summary Section */}
                        <div className="bg-teal-vibrant/10 border border-teal-vibrant/30 rounded-lg p-4">
                            <h3 className="font-bold text-teal-vibrant mb-2">📋 Resumo do Termo</h3>
                            <ul className="space-y-1 text-slate-300">
                                <li>• <strong>Comissão Base:</strong> 35% da primeira mensalidade</li>
                                <li>• <strong>Bônus por Volume:</strong> +5% (5-9 vendas/mês) ou +10% (10+ vendas/mês)</li>
                                <li>• <strong>Comissão Recorrente:</strong> 8% mensal por cliente ativo</li>
                                <li>• <strong>Pagamento:</strong> Até 7 dias úteis via PIX após recebimento</li>
                                <li>• <strong>Sem vínculo empregatício</strong></li>
                            </ul>
                        </div>

                        {/* PARTES */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">PARTES</h3>
                            <p className="mb-2"><strong>CONTRATANTE:</strong> CLINIGO TECNOLOGIA E GESTÃO EM SAÚDE LTDA. (doravante "CLINIGO")</p>
                            <p><strong>CONTRATADO(A):</strong> {partnerData.full_name || '[Nome do Parceiro]'}, CPF: {partnerData.cpf ? formatCPF(partnerData.cpf) : '[CPF]'}, Email: {partnerData.email || '[Email]'} (doravante "PARCEIRO")</p>
                        </div>

                        {/* CLÁUSULA 1 */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 1ª - DO OBJETO</h3>
                            <p>O presente Termo estabelece as condições para que o PARCEIRO atue como <strong>representante comercial autônomo</strong> da CLINIGO, comercializando licenças de uso da plataforma CliniGo para clínicas médicas, consultórios e estabelecimentos de saúde.</p>
                            <p className="mt-2 text-slate-400">A relação estabelecida é exclusivamente comercial, não gerando direitos trabalhistas, previdenciários ou de qualquer outra natureza decorrentes de vínculo de emprego.</p>
                        </div>

                        {/* CLÁUSULA 2 - Comissionamento */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 2ª - DO MODELO DE COMISSIONAMENTO</h3>

                            <h4 className="text-slate-200 font-semibold mt-3 mb-2">2.1. COMISSÃO SOBRE VENDA INICIAL</h4>
                            <p>Comissão base de <strong className="text-teal-vibrant">35%</strong> do valor da primeira mensalidade.</p>

                            <div className="bg-slate-800/50 p-3 rounded mt-2">
                                <p className="font-medium text-slate-200 mb-1">Bônus por volume mensal:</p>
                                <ul className="text-sm">
                                    <li>• 5-9 licenças/mês: +5% (total <strong className="text-teal-vibrant">40%</strong>)</li>
                                    <li>• 10+ licenças/mês: +10% (total <strong className="text-teal-vibrant">45%</strong>)</li>
                                </ul>
                            </div>

                            <h4 className="text-slate-200 font-semibold mt-3 mb-2">2.2. COMISSÃO RECORRENTE MENSAL</h4>
                            <p>Comissão de <strong className="text-teal-vibrant">8%</strong> sobre o valor da mensalidade de cada cliente ativo, paga mensalmente a partir do segundo mês.</p>
                        </div>

                        {/* CLÁUSULA 3 - Churn */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 3ª - DAS REGRAS DE CHURN (CANCELAMENTO)</h3>
                            <ul className="space-y-2">
                                <li><strong>Antes de 3 meses:</strong> Perda imediata da comissão recorrente</li>
                                <li><strong>Entre 3 e 12 meses:</strong> Proteção de 3 meses após o cancelamento</li>
                                <li><strong>Após 12 meses:</strong> Proteção de 6 meses após o cancelamento (prêmio fidelidade)</li>
                            </ul>
                        </div>

                        {/* CLÁUSULA 4 - Pagamento */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 4ª - DO PAGAMENTO DAS COMISSÕES</h3>
                            <p>Pagamento em até <strong>7 dias úteis</strong> após recebimento efetivo do cliente, via <strong>PIX ou TED</strong>.</p>
                            <p className="mt-2 text-slate-400">O PARCEIRO é integralmente responsável pelos tributos incidentes sobre as comissões.</p>
                        </div>

                        {/* Toggle for full terms */}
                        <button
                            onClick={() => setShowFullTerms(!showFullTerms)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-teal-vibrant hover:text-teal-vibrant/80 transition-colors"
                        >
                            {showFullTerms ? (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Ocultar termos completos
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    Ver termos completos
                                </>
                            )}
                        </button>

                        {showFullTerms && (
                            <>
                                {/* CLÁUSULA 5 - Território */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 5ª - DO TERRITÓRIO EXCLUSIVO</h3>
                                    <p>Após a primeira venda confirmada, o PARCEIRO terá direito a um território exclusivo. Para manter a exclusividade, deverá atingir meta mínima de <strong>3 vendas por trimestre</strong>.</p>
                                </div>

                                {/* CLÁUSULA 6 - Confidencialidade */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 6ª - DA CONFIDENCIALIDADE E LGPD</h3>
                                    <p>O PARCEIRO compromete-se a manter absoluto sigilo sobre dados de clientes, estratégias comerciais e informações técnicas da plataforma, mesmo após o término da parceria.</p>
                                    <p className="mt-2">O PARCEIRO atuará como <strong>Operador de Dados</strong>, sendo a CLINIGO a <strong>Controladora</strong>, e deverá cumprir integralmente a LGPD.</p>
                                </div>

                                {/* CLÁUSULA 7 - Não-Concorrência */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 7ª - DA NÃO-CONCORRÊNCIA</h3>
                                    <p>Durante a vigência, o PARCEIRO não poderá comercializar sistemas concorrentes de gestão de clínicas. Após o término, há período de <strong>6 meses</strong> de não-concorrência para clientes prospectados.</p>
                                </div>

                                {/* CLÁUSULA 8 - Propriedade */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 8ª - DA PROPRIEDADE DOS CLIENTES</h3>
                                    <p>Os clientes prospectados são de <strong>propriedade exclusiva da CLINIGO</strong>. O PARCEIRO atua apenas como intermediário comercial.</p>
                                </div>

                                {/* CLÁUSULA 9-10 - Materiais e Obrigações */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULAS 9ª e 10ª - MATERIAIS E OBRIGAÇÕES</h3>
                                    <p>A CLINIGO fornece materiais de venda licenciados. O PARCEIRO deve prospectar de forma ética, conhecer a plataforma, manter cadastro atualizado e zelar pela imagem da empresa.</p>
                                </div>

                                {/* CLÁUSULA 11 - Infrações */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 11ª - DAS INFRAÇÕES E PENALIDADES</h3>
                                    <p className="text-slate-400">Infrações graves incluem: promessas falsas, divulgação de informações confidenciais, prospecção em território de outro parceiro. Infrações gravíssimas (violação LGPD, fraude, aliciamento) resultam em rescisão imediata e multa de R$ 50.000,00.</p>
                                </div>

                                {/* CLÁUSULA 12 - Vigência */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULA 12ª - DA VIGÊNCIA E RESCISÃO</h3>
                                    <p>Este Termo vigora por <strong>prazo indeterminado</strong>. Rescisão pelo PARCEIRO requer aviso de 30 dias. Rescisão pela CLINIGO pode ser imediata em caso de infrações.</p>
                                </div>

                                {/* CLÁUSULA 13-14 - Disposições Gerais */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CLÁUSULAS 13ª e 14ª - DISPOSIÇÕES GERAIS E FORO</h3>
                                    <p>A CLINIGO poderá alterar os termos com notificação prévia de 30 dias. Foro eleito para disputas: Comarca da sede da CLINIGO.</p>
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-500">
                                <strong>Data de Aceitação:</strong> {currentDate} às {currentTime}<br />
                                <strong>Versão do Termo:</strong> 1.0<br />
                                Este documento possui validade jurídica conforme Lei 14.063/2020 (assinatura eletrônica) e MP 2.200-2/2001.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scroll hint */}
                {!hasScrolledToBottom && (
                    <div className="absolute bottom-32 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none flex items-end justify-center pb-2">
                        <span className="text-xs text-slate-400 animate-bounce">↓ Role para continuar ↓</span>
                    </div>
                )}

                {/* Acceptance Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    <div className="flex items-start gap-3 mb-4">
                        <Checkbox
                            id="accept-terms"
                            checked={acceptedTerms}
                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                            disabled={!hasScrolledToBottom}
                            className="mt-1 border-slate-600 data-[state=checked]:bg-teal-vibrant data-[state=checked]:border-teal-vibrant"
                        />
                        <label
                            htmlFor="accept-terms"
                            className={`text-sm cursor-pointer ${hasScrolledToBottom ? 'text-slate-300' : 'text-slate-500'}`}
                        >
                            Li e aceito integralmente o <strong>Termo de Parceria Comercial CliniGo</strong>, concordando com o modelo de comissionamento, regras de churn, obrigações de confidencialidade e não-concorrência.
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-teal-vibrant hover:bg-teal-vibrant/90 text-navy-deep font-bold disabled:opacity-50"
                            onClick={handleAccept}
                            disabled={!acceptedTerms}
                        >
                            Aceitar e Finalizar Cadastro
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
