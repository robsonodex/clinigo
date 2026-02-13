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
                        {/* RESUMO DA PARCERIA */}
                        <div className="bg-teal-vibrant/10 border border-teal-vibrant/30 rounded-lg p-4">
                            <h3 className="font-bold text-teal-vibrant mb-2">📋 RESUMO DA PARCERIA</h3>
                            <p className="text-slate-300">Ao aceitar este termo, você se torna Parceiro Comercial Autorizado do CliniGO para comercialização do sistema de gestão para clínicas médicas.</p>
                        </div>

                        {/* COMISSIONAMENTO */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-3">COMISSIONAMENTO - SISTEMA PROGRESSIVO MENSAL</h3>
                            <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left p-3 text-slate-300 font-semibold">Vendas no Mês</th>
                                            <th className="text-left p-3 text-slate-300 font-semibold">Comissão (1ª Mensalidade)</th>
                                            <th className="text-left p-3 text-slate-300 font-semibold">Recorrência</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-700/50">
                                            <td className="p-3 text-slate-300">0-4 licenças</td>
                                            <td className="p-3 text-teal-vibrant font-bold">35%</td>
                                            <td className="p-3 text-slate-300">8% mensal</td>
                                        </tr>
                                        <tr className="border-b border-slate-700/50">
                                            <td className="p-3 text-slate-300">5-9 licenças</td>
                                            <td className="p-3 text-teal-vibrant font-bold">40%</td>
                                            <td className="p-3 text-slate-300">8% mensal</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 text-slate-300">10+ licenças</td>
                                            <td className="p-3 text-teal-vibrant font-bold">45%</td>
                                            <td className="p-3 text-slate-300">8% mensal</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                <p className="text-sm text-amber-300"><strong>BÔNUS ESPECIAL:</strong> Os 10 primeiros vendedores que atingirem 10+ vendas no primeiro mês recebem 40% de comissão em todas as vendas daquele mês.</p>
                            </div>
                            <p className="mt-2 text-sm text-slate-400">O bônus é aplicado sobre todas as vendas do mês quando a meta for atingida. A contagem reinicia mensalmente.</p>
                        </div>

                        {/* REGRAS DE PAGAMENTO */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">REGRAS DE PAGAMENTO</h3>
                            <ul className="space-y-2 text-slate-300">
                                <li>• <strong>Prazo:</strong> Até 7 dias úteis após recebimento do cliente</li>
                                <li>• <strong>Forma:</strong> PIX ou transferência bancária</li>
                                <li>• <strong>Condição:</strong> Comissão só é devida após pagamento efetivo do cliente</li>
                                <li>• <strong>Recorrência:</strong> 8% mensal enquanto cliente estiver ativo e pagante</li>
                            </ul>
                        </div>

                        {/* CANCELAMENTO ANTECIPADO */}
                        <div>
                            <h3 className="text-white font-bold text-base mb-2">CANCELAMENTO ANTECIPADO</h3>
                            <p className="text-slate-300 mb-2">Se o cliente cancelar nos primeiros 90 dias:</p>
                            <ul className="space-y-2 text-slate-300">
                                <li>• <strong>0-30 dias:</strong> Reembolso de 100% da comissão inicial</li>
                                <li>• <strong>31-60 dias:</strong> Reembolso de 50% da comissão inicial</li>
                                <li>• <strong>61-90 dias:</strong> Reembolso de 25% da comissão inicial</li>
                                <li>• <strong>Após 90 dias:</strong> Sem reembolso, comissão consolidada</li>
                            </ul>
                            <p className="mt-2 text-sm text-slate-400">O reembolso pode ser descontado de comissões futuras.</p>
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
                                {/* SUAS OBRIGAÇÕES */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">SUAS OBRIGAÇÕES</h3>
                                    <p className="text-slate-300 mb-2">Você se compromete a:</p>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• Prospectar clientes no segmento de clínicas e consultórios médicos</li>
                                        <li>• Realizar demonstrações do sistema</li>
                                        <li>• Negociar e fechar vendas</li>
                                        <li>• Prestar suporte inicial ao cliente (onboarding)</li>
                                        <li>• Manter sigilo sobre informações comerciais e técnicas</li>
                                        <li>• Reportar vendas semanalmente</li>
                                        <li>• Emitir nota fiscal ou recibo de suas comissões</li>
                                    </ul>
                                </div>

                                {/* O QUE VOCÊ RECEBE */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">O QUE VOCÊ RECEBE</h3>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• Treinamento completo do produto</li>
                                        <li>• Materiais de vendas (pitch deck, demos, vídeos)</li>
                                        <li>• Suporte técnico durante vendas</li>
                                        <li>• Ambiente de demonstração funcional</li>
                                        <li>• Relatório mensal de comissões</li>
                                        <li>• Comissões recorrentes vitalícias (enquanto cliente ativo)</li>
                                    </ul>
                                </div>

                                {/* TERRITÓRIO E EXCLUSIVIDADE */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">TERRITÓRIO E EXCLUSIVIDADE</h3>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• <strong>Início:</strong> Sem exclusividade territorial nos primeiros 30 dias</li>
                                        <li>• <strong>Exclusividade:</strong> Concedida após atingir 10 vendas no primeiro mês</li>
                                        <li>• <strong>Revisão:</strong> Território pode ser revisto a cada 6 meses conforme performance</li>
                                    </ul>
                                </div>

                                {/* VIGÊNCIA E RESCISÃO */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">VIGÊNCIA E RESCISÃO</h3>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• <strong>Vigência:</strong> Prazo indeterminado</li>
                                        <li>• <strong>Rescisão:</strong> Qualquer parte pode rescindir com 30 dias de aviso prévio</li>
                                        <li>• <strong>Rescisão Imediata:</strong> Por violação de confidencialidade, conduta antiética ou descumprimento de obrigações</li>
                                        <li>• <strong>Pós-Rescisão:</strong> Comissões recorrentes continuam por 6 meses após rescisão</li>
                                    </ul>
                                </div>

                                {/* CONFIDENCIALIDADE */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">CONFIDENCIALIDADE</h3>
                                    <p className="text-slate-300 mb-2">Você se compromete a manter sigilo absoluto sobre:</p>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• Informações técnicas do produto</li>
                                        <li>• Estratégias comerciais</li>
                                        <li>• Base de clientes</li>
                                        <li>• Precificação e condições especiais</li>
                                        <li>• Qualquer informação privilegiada</li>
                                    </ul>
                                    <p className="mt-2 text-sm text-slate-400">O descumprimento resulta em rescisão imediata e possível indenização.</p>
                                </div>

                                {/* NATUREZA DA RELAÇÃO */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">NATUREZA DA RELAÇÃO</h3>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• <strong>Sem Vínculo Empregatício:</strong> Esta é uma parceria comercial, não uma relação de emprego</li>
                                        <li>• <strong>Impostos:</strong> Você é responsável por seus próprios impostos e contribuições</li>
                                        <li>• <strong>Autonomia:</strong> Você atua como representante comercial independente</li>
                                    </ul>
                                </div>

                                {/* INADIMPLÊNCIA DE CLIENTES */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">INADIMPLÊNCIA DE CLIENTES</h3>
                                    <ul className="space-y-2 text-slate-300">
                                        <li>• Cliente inadimplente = comissão suspensa</li>
                                        <li>• Comissão só volta após regularização do pagamento</li>
                                        <li>• Inadimplência acima de 60 dias = comissão cancelada</li>
                                        <li>• Estorno/chargeback = comissão descontada das futuras ou reembolsada em 30 dias</li>
                                    </ul>
                                </div>

                                {/* DECLARAÇÃO DE ACEITE */}
                                <div>
                                    <h3 className="text-white font-bold text-base mb-2">DECLARAÇÃO DE ACEITE</h3>
                                    <p className="text-slate-300 mb-2">Ao clicar em &quot;ACEITAR&quot;, você declara que:</p>
                                    <ol className="space-y-2 text-slate-300 list-decimal list-inside">
                                        <li>Leu e compreendeu todos os termos deste documento</li>
                                        <li>Concorda com todas as condições estabelecidas</li>
                                        <li>Reconhece que não há vínculo empregatício</li>
                                        <li>É responsável por seus próprios impostos</li>
                                        <li>Manterá sigilo sobre informações confidenciais</li>
                                        <li>Está ciente das regras de comissionamento e reembolso</li>
                                    </ol>
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-500">
                                CliniGO - Gestão de Clínicas e Consultórios<br />
                                CNPJ: 57.444.727/0001-85<br />
                                Juazeiro do Norte - CE<br /><br />
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
                            Li e aceito integralmente o <strong>Termo de Parceria Comercial CliniGO</strong>, concordando com todas as condições de comissionamento, pagamento, cancelamento, obrigações e confidencialidade.
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
