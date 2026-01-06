'use client'

import { useState } from 'react'
import { Shield, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConsentimentoLGPDProps {
    clinicName: string
    clinicSlug: string
    onAccept: (consents: ConsentData) => void
}

interface ConsentData {
    dataTreatment: boolean
    medicalRecord: boolean
    communications: boolean
}

const CONSENT_TEXT = `
Autorizo o tratamento dos meus dados pessoais (nome, CPF, email, telefone, data de nascimento) exclusivamente para:
- Agendamento e realização de consultas
- Envio de confirmações e lembretes
- Processamento de pagamentos
- Cumprimento de obrigações legais

Autorizo a criação e armazenamento de prontuário eletrônico, protegido por sigilo médico e acessível apenas por profissionais autorizados. Conforme Resolução CFM nº 1.821/2007 e LGPD Art. 11 (dados sensíveis).

Autorizo o recebimento de comunicações relacionadas às minhas consultas (confirmações, lembretes, links de videochamada) por email, SMS e WhatsApp.

Direitos do Titular (LGPD Art. 18):
- Acessar seus dados a qualquer momento
- Corrigir dados incompletos ou desatualizados
- Solicitar exclusão de dados (direito ao esquecimento)
- Revogar este consentimento a qualquer momento
- Solicitar portabilidade dos dados
`.trim()

export function ConsentimentoLGPD({ clinicName, clinicSlug, onAccept }: ConsentimentoLGPDProps) {
    const [consents, setConsents] = useState<ConsentData>({
        dataTreatment: false,
        medicalRecord: false,
        communications: false,
    })

    const allAccepted = consents.dataTreatment && consents.medicalRecord && consents.communications

    const handleAccept = () => {
        if (allAccepted) {
            onAccept(consents)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-3 rounded-full">
                    <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Consentimento de Tratamento de Dados
                    </h2>
                    <p className="text-sm text-gray-600">
                        Conforme Lei Geral de Proteção de Dados (LGPD)
                    </p>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                {/* Consentimento 1: Tratamento de Dados */}
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                        type="checkbox"
                        checked={consents.dataTreatment}
                        onChange={(e) =>
                            setConsents({ ...consents, dataTreatment: e.target.checked })
                        }
                        className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                            ✅ Autorizo o tratamento dos meus dados pessoais
                        </p>
                        <p className="text-sm text-gray-600">
                            Autorizo a <strong>{clinicName}</strong> a coletar, armazenar e
                            processar meus dados pessoais (nome, CPF, email, telefone, data de
                            nascimento) exclusivamente para:
                        </p>
                        <ul className="text-sm text-gray-600 ml-4 mt-2 space-y-1">
                            <li>• Agendamento e realização de consultas</li>
                            <li>• Envio de confirmações e lembretes</li>
                            <li>• Processamento de pagamentos</li>
                            <li>• Cumprimento de obrigações legais</li>
                        </ul>
                    </div>
                </label>

                {/* Consentimento 2: Prontuário Eletrônico */}
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                        type="checkbox"
                        checked={consents.medicalRecord}
                        onChange={(e) =>
                            setConsents({ ...consents, medicalRecord: e.target.checked })
                        }
                        className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                            🏥 Autorizo criação e armazenamento de prontuário eletrônico
                        </p>
                        <p className="text-sm text-gray-600">
                            Autorizo o registro de informações de saúde (histórico médico,
                            exames, diagnósticos, prescrições) no prontuário eletrônico,
                            protegido por sigilo médico e acessível apenas por profissionais
                            autorizados.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            ⚕️ Conforme Resolução CFM nº 1.821/2007 e LGPD Art. 11 (dados
                            sensíveis)
                        </p>
                    </div>
                </label>

                {/* Consentimento 3: Comunicações */}
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                        type="checkbox"
                        checked={consents.communications}
                        onChange={(e) =>
                            setConsents({ ...consents, communications: e.target.checked })
                        }
                        className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                            📧 Autorizo recebimento de comunicações
                        </p>
                        <p className="text-sm text-gray-600">
                            Autorizo o envio de notificações relacionadas às minhas consultas
                            (confirmações, lembretes, links de videochamada) por email, SMS e
                            WhatsApp.
                        </p>
                    </div>
                </label>
            </div>

            {/* Direitos do Titular */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                    📋 Seus Direitos (LGPD Art. 18):
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Acessar seus dados a qualquer momento</li>
                    <li>• Corrigir dados incompletos ou desatualizados</li>
                    <li>• Solicitar exclusão de dados (direito ao esquecimento)</li>
                    <li>• Revogar este consentimento a qualquer momento</li>
                    <li>• Solicitar portabilidade dos dados</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                    Para exercer seus direitos:{' '}
                    <strong>privacidade@{clinicSlug}.clinigo.com.br</strong>
                </p>
            </div>

            {/* Links importantes */}
            <div className="flex justify-between items-center text-sm mb-6">
                <a
                    href="/politica-privacidade"
                    target="_blank"
                    className="text-blue-600 hover:underline"
                >
                    📄 Política de Privacidade Completa
                </a>
                <a href="/termos-uso" target="_blank" className="text-blue-600 hover:underline">
                    📜 Termos de Uso
                </a>
            </div>

            {/* Botão de aceitar */}
            <Button
                onClick={handleAccept}
                disabled={!allAccepted}
                className={`w-full py-6 text-lg ${allAccepted
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
            >
                {allAccepted ? (
                    <>
                        <Check className="w-5 h-5 mr-2" />
                        Aceitar e Continuar
                    </>
                ) : (
                    '⚠️ Marque todas as opções para continuar'
                )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
                Ao clicar em &quot;Aceitar&quot;, você confirma que leu e concorda com os
                termos acima. Data do consentimento: {new Date().toLocaleString('pt-BR')}
            </p>
        </div>
    )
}

export { CONSENT_TEXT }
