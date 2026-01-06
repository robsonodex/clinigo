'use client'

import { useState } from 'react'
import { Scale, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TermoResponsabilidadeProps {
    userName: string
    crm: string
    onAccept: () => void
}

const TERMO_COMPLETO = `
# TERMO DE RESPONSABILIDADE E USO PROFISSIONAL
## CliniGo - Plataforma de Teleconsultoria Médica

**Data de Vigência:** 01 de Janeiro de 2026
**Versão:** 1.0

---

### 1. NATUREZA DO SERVIÇO

1.1. O CliniGo é uma plataforma tecnológica que fornece ferramentas para agendamento, gestão e realização de teleconsultas médicas.

1.2. O CliniGo **NÃO** presta serviços médicos. Toda consulta é realizada por profissional de saúde devidamente habilitado, com registro ativo no Conselho Regional de Medicina.

1.3. A relação médico-paciente é estabelecida diretamente entre o profissional e o paciente. O CliniGo atua exclusivamente como intermediador tecnológico.

---

### 2. RESPONSABILIDADES DA CLÍNICA/MÉDICO

2.1. **Registro Profissional**
- Manter registro ativo no CRM
- Cumprir normas do CFM sobre telemedicina (Resolução CFM 2.314/2022)
- Atualizar dados cadastrais sempre que necessário

2.2. **Sigilo Médico**
- Responsabilidade exclusiva sobre conteúdo dos prontuários
- Cumprimento do Código de Ética Médica
- Proteção de dados sensíveis (LGPD Art. 11)

2.3. **Qualidade do Atendimento**
- Conectividade adequada para videochamadas
- Ambiente privativo para consultas
- Equipamentos em boas condições

2.4. **Documentação**
- Emissão de receitas médicas conforme legislação
- Registro adequado em prontuário
- Guarda de documentação por 20 anos (CFM 1.821/2007)

---

### 3. RESPONSABILIDADES DO CLINIGO

3.1. **Infraestrutura Tecnológica**
- Disponibilidade de 99% (meta)
- Backup diário de dados
- Criptografia de dados sensíveis
- Conformidade LGPD

3.2. **Suporte Técnico**
- Horário comercial (Starter/Básico)
- Prioritário (Profissional)
- Dedicado 24/7 (Enterprise)

---

### 4. CONSENTIMENTO E LGPD

4.1. A clínica/médico se compromete a:
- Obter consentimento do paciente antes da consulta
- Informar sobre tratamento de dados
- Respeitar direitos do titular (LGPD Art. 18)
- Responder a solicitações de dados em até 15 dias

---

### 5. LIMITAÇÃO DE RESPONSABILIDADE

5.1. **Erro Médico:** O CliniGo não se responsabiliza por erros de diagnóstico, tratamento ou prescrição realizados pelo profissional de saúde.

5.2. **Falhas Tecnológicas:** Em caso de indisponibilidade, o CliniGo reembolsará proporcionalmente a mensalidade.

---

### 6. ACEITAÇÃO

Ao criar conta no CliniGo, você declara:
- Que leu e compreendeu este Termo
- Que é profissional de saúde habilitado
- Que tem registro ativo no CRM
- Que cumprirá todas as normas médicas e legais
- Que protegerá dados dos pacientes conforme LGPD
`.trim()

export function TermoResponsabilidade({ userName, crm, onAccept }: TermoResponsabilidadeProps) {
    const [agreed, setAgreed] = useState(false)
    const [signature, setSignature] = useState('')
    const [loading, setLoading] = useState(false)

    const handleAccept = async () => {
        if (!agreed || signature.length < 5) return

        setLoading(true)
        try {
            // Get IP for audit
            let ipAddress = '0.0.0.0'
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json')
                const ipData = await ipRes.json()
                ipAddress = ipData.ip
            } catch {
                // Ignore IP fetch error
            }

            // Save acceptance
            const res = await fetch('/api/legal/terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    term_type: 'MEDICAL_RESPONSIBILITY',
                    signature: signature,
                    crm: crm,
                    ip_address: ipAddress,
                }),
            })

            if (res.ok) {
                onAccept()
            } else {
                const data = await res.json()
                alert(data.error || 'Erro ao salvar aceite')
            }
        } catch (error) {
            console.error('Error accepting terms:', error)
            alert('Erro ao processar aceite. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const canAccept = agreed && signature.length >= 5 && !loading

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Scale className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Termo de Responsabilidade Médica</h1>
                        <p className="text-gray-600">
                            Leitura obrigatória para profissionais de saúde
                        </p>
                    </div>
                </div>

                {/* Conteúdo scrollável do termo */}
                <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-6 bg-gray-50 prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap font-mono text-sm">
                        {TERMO_COMPLETO}
                    </div>
                </div>

                {/* Assinatura */}
                <div className="space-y-4">
                    <div>
                        <label className="block font-medium mb-2">
                            Digite seu nome completo para assinar:
                        </label>
                        <Input
                            type="text"
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="Nome completo conforme registro no CRM"
                            className="w-full"
                        />
                    </div>

                    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-5 h-5"
                        />
                        <span className="text-sm">
                            Declaro que li, compreendi e concordo com todos os termos acima.
                            Confirmo que sou profissional de saúde habilitado (CRM:{' '}
                            <strong>{crm}</strong>) e cumprirei todas as normas médicas e
                            legais vigentes.
                        </span>
                    </label>

                    <Button
                        onClick={handleAccept}
                        disabled={!canAccept}
                        className={`w-full py-6 text-lg ${canAccept
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            'Processando...'
                        ) : canAccept ? (
                            <>
                                <Check className="w-5 h-5 mr-2" />
                                Aceitar e Assinar Digitalmente
                            </>
                        ) : (
                            '✍️ Preencha os campos acima'
                        )}
                    </Button>

                    <div className="text-xs text-gray-500 text-center space-y-1">
                        <p>
                            <strong>Profissional:</strong> {userName}
                        </p>
                        <p>
                            <strong>CRM:</strong> {crm}
                        </p>
                        <p>
                            <strong>Data:</strong> {new Date().toLocaleString('pt-BR')}
                        </p>
                        <p>IP: [será registrado automaticamente]</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
