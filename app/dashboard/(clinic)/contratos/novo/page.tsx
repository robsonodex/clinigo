'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    ArrowLeft,
    Check,
    FileText,
    Users,
    Eye,
    Send,
    Plus,
    Trash2,
    Building2,
    Calendar,
    DollarSign,
    Sparkles,
    ShieldCheck,
    AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Template {
    id: string
    title: string
    category: string
    description?: string
    content: string
    required_variables: Array<{
        name: string
        label: string
        group: string
        required?: boolean
    }>
    default_signers: Array<{
        role: string
        label: string
        required?: boolean
    }>
}

interface Professional {
    id: string
    full_name: string
    cpf?: string
    specialty?: string
    email?: string
    phone?: string
}

interface Patient {
    id: string
    full_name: string
    cpf?: string
    guardian_name?: string
    guardian_cpf?: string
}

export default function NovoContratoPage() {
    const router = useRouter()

    // Passos do Fluxo
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Seleção Modelo e Destinatário, 2: Preenchimento Variáveis & Signatários, 3: Pré-visualização e Envio
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Dados Carregados
    const [templates, setTemplates] = useState<Template[]>([])
    const [professionals, setProfessionals] = useState<Professional[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [loadingInit, setLoadingInit] = useState(true)
    const [isUnauthorized, setIsUnauthorized] = useState(false)

    // Seleções
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [targetType, setTargetType] = useState<'PROFESSIONAL' | 'PATIENT_LEGAL_GUARDIAN' | 'CUSTOM'>('PROFESSIONAL')
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
    const [selectedPatientId, setSelectedPatientId] = useState<string>('')

    // Formulário do Documento
    const [documentTitle, setDocumentTitle] = useState('')
    const [variablesPayload, setVariablesPayload] = useState<Record<string, string>>({})
    const [isSequential, setIsSequential] = useState(false)
    const [expiresDays, setExpiresDays] = useState('30')

    // Signatários
    const [signers, setSigners] = useState<Array<{
        role: string
        name: string
        email: string
        phone: string
        document_tax_id: string
        signing_order: number
    }>>([])

    // Carregamento Inicial
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoadingInit(true)
                const [tplRes, docsRes, patRes] = await Promise.all([
                    fetch('/api/contracts/templates'),
                    fetch('/api/doctors?limit=200'),
                    fetch('/api/patients?limit=200'),
                ])

                if (tplRes.status === 403) {
                    setIsUnauthorized(true)
                    return
                }

                if (tplRes.ok) {
                    const tplJson = await tplRes.json()
                    const list = Array.isArray(tplJson)
                        ? tplJson
                        : Array.isArray(tplJson?.templates)
                            ? tplJson.templates
                            : Array.isArray(tplJson?.data)
                                ? tplJson.data
                                : []
                    setTemplates(list)
                    if (list.length > 0) {
                        setSelectedTemplateId(list[0].id)
                    }
                }

                if (docsRes.ok) {
                    const docsJson = await docsRes.json()
                    const list = Array.isArray(docsJson)
                        ? docsJson
                        : Array.isArray(docsJson?.data)
                            ? docsJson.data
                            : Array.isArray(docsJson?.doctors)
                                ? docsJson.doctors
                                : []
                    setProfessionals(list)
                }

                if (patRes.ok) {
                    const patJson = await patRes.json()
                    const list = Array.isArray(patJson)
                        ? patJson
                        : Array.isArray(patJson?.data)
                            ? patJson.data
                            : Array.isArray(patJson?.patients)
                                ? patJson.patients
                                : []
                    setPatients(list)
                }
            } catch (err) {
                console.error(err)
                toast.error('Erro ao carregar dados iniciais.')
            } finally {
                setLoadingInit(false)
            }
        }

        loadInitialData()
    }, [])

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

    // Atualiza título e signatários quando o template muda
    useEffect(() => {
        if (!selectedTemplate) return
        setDocumentTitle(selectedTemplate.title)

        // Configuração de signatários padrão
        const defSigners = (selectedTemplate.default_signers || []).map((ds, idx) => ({
            role: ds.role || 'CONTRATADA',
            name: '',
            email: '',
            phone: '',
            document_tax_id: '',
            signing_order: idx + 1,
        }))

        if (defSigners.length > 0) {
            setSigners(defSigners)
        } else {
            setSigners([
                { role: 'CONTRATANTE', name: 'Clínica', email: '', phone: '', document_tax_id: '', signing_order: 1 },
                { role: 'CONTRATADA', name: '', email: '', phone: '', document_tax_id: '', signing_order: 2 }
            ])
        }
    }, [selectedTemplate])

    // Autopreenchimento inteligente ao selecionar profissional ou paciente
    const handleAutofill = async (docId?: string, patId?: string) => {
        try {
            const params = new URLSearchParams()
            if (docId) params.set('doctor_id', docId)
            if (patId) params.set('patient_id', patId)

            const res = await fetch(`/api/contracts/autofill?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                const newVars = { ...variablesPayload, ...json.variables }
                setVariablesPayload(newVars)

                // Preenche também nos signatários
                setSigners(prev => prev.map(s => {
                    if (s.role === 'CONTRATANTE') {
                        return {
                            ...s,
                            name: json.variables.contratante_razao_social || s.name,
                            document_tax_id: json.variables.contratante_cnpj || s.document_tax_id,
                            email: json.variables.contratante_representante_email || s.email,
                            phone: json.variables.contratante_telefone || s.phone
                        }
                    }
                    if (s.role === 'CONTRATADA' && json.target) {
                        return {
                            ...s,
                            name: json.target.full_name || s.name,
                            document_tax_id: json.target.cpf || s.document_tax_id,
                            email: json.target.email || s.email,
                            phone: json.target.phone || s.phone
                        }
                    }
                    if (s.role === 'REPRESENTANTE_LEGAL' && json.variables) {
                        return {
                            ...s,
                            name: json.variables.nome_completo_responsavel || s.name,
                            document_tax_id: json.variables.cpf_responsavel || s.document_tax_id,
                            email: s.email,
                            phone: s.phone
                        }
                    }
                    return s
                }))

                toast.success('Campos pré-preenchidos automaticamente com sucesso.')
            }
        } catch (err) {
            console.error('Erro no autofill:', err)
        }
    }

    const handleVariableChange = (name: string, value: string) => {
        setVariablesPayload(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSignerChange = (index: number, field: string, value: string) => {
        setSigners(prev => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
    }

    const handleAddSigner = () => {
        setSigners(prev => [
            ...prev,
            {
                role: 'TESTEMUNHA_1',
                name: '',
                email: '',
                phone: '',
                document_tax_id: '',
                signing_order: prev.length + 1
            }
        ])
    }

    const handleRemoveSigner = (index: number) => {
        setSigners(prev => prev.filter((_, idx) => idx !== index))
    }

    // Renderização do texto com as variáveis aplicadas para pré-visualização
    const renderPreviewText = () => {
        if (!selectedTemplate) return ''
        let text = selectedTemplate.content
        for (const [key, val] of Object.entries(variablesPayload)) {
            const regex = new RegExp(`{{${key}}}`, 'g')
            text = text.replace(regex, val || `[${key.toUpperCase()}]`)
        }
        return text
    }

    const handleSubmit = async () => {
        if (!documentTitle.trim()) {
            toast.error('Informe o título do contrato.')
            return
        }

        // Validação de signatários
        const invalidSigner = signers.find(s => !s.name.trim())
        if (invalidSigner) {
            toast.error('Informe o nome de todos os signatários.')
            return
        }

        try {
            setIsSubmitting(true)
            const payload = {
                template_id: selectedTemplateId,
                title: documentTitle.trim(),
                category: selectedTemplate?.category,
                raw_content: selectedTemplate?.content,
                variables_payload: variablesPayload,
                target_type: targetType,
                target_id: targetType === 'PROFESSIONAL' ? selectedDoctorId : (targetType === 'PATIENT_LEGAL_GUARDIAN' ? selectedPatientId : null),
                signers: signers,
                is_sequential: isSequential,
                expires_days: Number(expiresDays) || 30
            }

            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Falha ao emitir contrato')
            }

            const json = await res.json()
            toast.success('Contrato emitido e pronto para assinaturas.')
            router.push(`/dashboard/contratos/${json.document.id}`)
        } catch (err: any) {
            toast.error(err.message || 'Erro ao emitir contrato.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Agrupamento das variáveis por grupo para facilitar preenchimento
    const groupedVariables = (selectedTemplate?.required_variables || []).reduce((acc: Record<string, any[]>, v) => {
        const group = v.group || 'Geral'
        if (!acc[group]) acc[group] = []
        acc[group].push(v)
        return acc
    }, {})

    if (isUnauthorized) {
        return (
            <div className="flex-1 p-6 md:p-12 max-w-xl mx-auto w-full text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-amber-50 text-amber-700">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Acesso Restrito</h1>
                <p className="text-sm text-slate-600">
                    A emissão de novos contratos está restrita à clínica autorizada (World Sensory).
                </p>
                <div className="pt-2">
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-slate-300">
                            Voltar ao Painel
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full">
            {/* Barra de Navegação */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/contratos">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300">
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                            Emissão de Contrato & Termo
                        </h1>
                        <p className="text-xs text-slate-600">
                            Preenchimento assistido com dados cadastrais e validação probatória.
                        </p>
                    </div>
                </div>

                {/* Indicador de Passos */}
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
                    <span className={`px-2.5 py-1 rounded ${step === 1 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        1. Modelo & Destinatário
                    </span>
                    <span className={`px-2.5 py-1 rounded ${step === 2 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        2. Preenchimento & Signatários
                    </span>
                    <span className={`px-2.5 py-1 rounded ${step === 3 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        3. Pré-visualização & Envio
                    </span>
                </div>
            </div>

            {/* PASSO 1: Seleção de Modelo e Destinatário */}
            {step === 1 && (
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-900">1. Selecione o Modelo de Contrato</CardTitle>
                            <CardDescription>
                                Escolha um dos modelos jurídicos cadastrados na biblioteca da clínica.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingInit ? (
                                <p className="text-sm text-slate-500">Carregando biblioteca...</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(templates || []).map(tpl => (
                                        <div
                                            key={tpl.id}
                                            onClick={() => setSelectedTemplateId(tpl.id)}
                                            className={`p-3.5 border rounded-lg cursor-pointer transition-all ${
                                                selectedTemplateId === tpl.id
                                                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                                                        {tpl.category.replace(/_/g, ' ')}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-900">{tpl.title}</div>
                                                    {tpl.description && (
                                                        <div className="text-xs text-slate-500 line-clamp-2">{tpl.description}</div>
                                                    )}
                                                </div>
                                                {selectedTemplateId === tpl.id && (
                                                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-900">2. Destinatário Principal (Cadastro Existente)</CardTitle>
                            <CardDescription>
                                Vincule a um profissional ou paciente já cadastrado no Clinigo para puxar dados automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button
                                    type="button"
                                    variant={targetType === 'PROFESSIONAL' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setTargetType('PROFESSIONAL')
                                        if (selectedDoctorId) handleAutofill(selectedDoctorId, undefined)
                                    }}
                                    className={`h-11 justify-start text-xs ${targetType === 'PROFESSIONAL' ? 'bg-slate-800 text-white' : 'border-slate-300'}`}
                                >
                                    <Users className="w-4 h-4 mr-2 text-slate-500" />
                                    Profissional / Prestador (PJ)
                                </Button>

                                <Button
                                    type="button"
                                    variant={targetType === 'PATIENT_LEGAL_GUARDIAN' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setTargetType('PATIENT_LEGAL_GUARDIAN')
                                        if (selectedPatientId) handleAutofill(undefined, selectedPatientId)
                                    }}
                                    className={`h-11 justify-start text-xs ${targetType === 'PATIENT_LEGAL_GUARDIAN' ? 'bg-slate-800 text-white' : 'border-slate-300'}`}
                                >
                                    <ShieldCheck className="w-4 h-4 mr-2 text-slate-500" />
                                    Paciente / Responsável Legal
                                </Button>

                                <Button
                                    type="button"
                                    variant={targetType === 'CUSTOM' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setTargetType('CUSTOM')
                                        handleAutofill(undefined, undefined)
                                    }}
                                    className={`h-11 justify-start text-xs ${targetType === 'CUSTOM' ? 'bg-slate-800 text-white' : 'border-slate-300'}`}
                                >
                                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                    Avulso / Personalizado
                                </Button>
                            </div>

                            {targetType === 'PROFESSIONAL' && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">Selecione o Profissional:</Label>
                                    <Select
                                        value={selectedDoctorId}
                                        onValueChange={(val) => {
                                            setSelectedDoctorId(val)
                                            handleAutofill(val, undefined)
                                        }}
                                    >
                                        <SelectTrigger className="h-10 text-xs border-slate-300">
                                            <SelectValue placeholder="Selecione um profissional da equipe..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(professionals || []).map(doc => (
                                                <SelectItem key={doc.id} value={doc.id} className="text-xs">
                                                    {doc.full_name} {doc.specialty ? `— ${doc.specialty}` : ''} {doc.cpf ? `(CPF: ${doc.cpf})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {targetType === 'PATIENT_LEGAL_GUARDIAN' && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700">Selecione o Paciente / Responsável:</Label>
                                    <Select
                                        value={selectedPatientId}
                                        onValueChange={(val) => {
                                            setSelectedPatientId(val)
                                            handleAutofill(undefined, val)
                                        }}
                                    >
                                        <SelectTrigger className="h-10 text-xs border-slate-300">
                                            <SelectValue placeholder="Selecione um paciente cadastrado..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(patients || []).map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                                    {p.full_name} {p.guardian_name ? `— Resp: ${p.guardian_name}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex justify-between">
                            <Button variant="outline" onClick={() => router.push('/dashboard/contratos')} className="h-9 text-xs">
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => setStep(2)}
                                className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                            >
                                Avançar para Preenchimento
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* PASSO 2: Preenchimento de Variáveis & Signatários */}
            {step === 2 && (
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-900">Preenchimento de Campos do Contrato</CardTitle>
                            <CardDescription>
                                Os campos abaixo foram preenchidos com os cadastros do Clinigo. Revise ou edite conforme necessário.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-xs font-semibold text-slate-800">Título do Contrato na Emissão</Label>
                                <Input
                                    value={documentTitle}
                                    onChange={(e) => setDocumentTitle(e.target.value)}
                                    className="mt-1 h-9 border-slate-300 text-xs"
                                />
                            </div>

                            {Object.entries(groupedVariables).map(([groupName, vars]) => (
                                <div key={groupName} className="space-y-3 border-t pt-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                        {groupName}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {vars.map(v => (
                                            <div key={v.name} className="space-y-1">
                                                <Label className="text-xs text-slate-700">
                                                    {v.label} {v.required && <span className="text-rose-500">*</span>}
                                                </Label>
                                                {v.name.includes('atribuicoes') || v.name.includes('descreva') ? (
                                                    <Textarea
                                                        value={variablesPayload[v.name] || ''}
                                                        onChange={(e) => handleVariableChange(v.name, e.target.value)}
                                                        rows={3}
                                                        className="text-xs border-slate-300"
                                                    />
                                                ) : (
                                                    <Input
                                                        value={variablesPayload[v.name] || ''}
                                                        onChange={(e) => handleVariableChange(v.name, e.target.value)}
                                                        className="h-9 text-xs border-slate-300"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Signatários */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base text-slate-900">Signatários do Contrato</CardTitle>
                                <CardDescription>
                                    Defina quem deve assinar este documento. Cada signatário receberá um link individual e exclusivo.
                                </CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleAddSigner} className="h-8 text-xs border-slate-300">
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Adicionar Signatário
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {signers.map((s, idx) => (
                                <div key={idx} className="p-3.5 border rounded-lg bg-slate-50/50 border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="bg-white text-xs font-semibold text-slate-800">
                                            Signatário #{idx + 1} ({s.role})
                                        </Badge>
                                        {signers.length > 1 && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveSigner(idx)}
                                                className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                Remover
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                        <div>
                                            <Label className="text-[11px] text-slate-600">Papel / Função</Label>
                                            <Select
                                                value={s.role}
                                                onValueChange={(val) => handleSignerChange(idx, 'role', val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs border-slate-300 bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CONTRATANTE">Clínica (Contratante)</SelectItem>
                                                    <SelectItem value="CONTRATADA">Prestador (Contratada)</SelectItem>
                                                    <SelectItem value="REPRESENTANTE_LEGAL">Responsável Legal</SelectItem>
                                                    <SelectItem value="TESTEMUNHA_1">Testemunha 1</SelectItem>
                                                    <SelectItem value="TESTEMUNHA_2">Testemunha 2</SelectItem>
                                                    <SelectItem value="OUTRO">Outro Signatário</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-slate-600">Nome Completo *</Label>
                                            <Input
                                                value={s.name}
                                                onChange={(e) => handleSignerChange(idx, 'name', e.target.value)}
                                                className="h-8 text-xs border-slate-300 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-slate-600">CPF ou CNPJ</Label>
                                            <Input
                                                value={s.document_tax_id}
                                                onChange={(e) => handleSignerChange(idx, 'document_tax_id', e.target.value)}
                                                className="h-8 text-xs border-slate-300 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-slate-600">E-mail para Notificação</Label>
                                            <Input
                                                type="email"
                                                value={s.email}
                                                onChange={(e) => handleSignerChange(idx, 'email', e.target.value)}
                                                className="h-8 text-xs border-slate-300 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-md border border-slate-200">
                                <div>
                                    <div className="text-xs font-semibold text-slate-800">Ordem de Assinatura Sequencial</div>
                                    <div className="text-[11px] text-slate-500">
                                        Se ativado, o próximo signatário só recebe o link após o anterior ter assinado.
                                    </div>
                                </div>
                                <Switch
                                    checked={isSequential}
                                    onCheckedChange={setIsSequential}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex justify-between">
                            <Button variant="outline" onClick={() => setStep(1)} className="h-9 text-xs">
                                Voltar
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                            >
                                <Eye className="w-4 h-4 mr-1.5" />
                                Pré-visualizar Documento Final
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* PASSO 3: Pré-visualização & Envio */}
            {step === 3 && (
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base text-slate-900">{documentTitle}</CardTitle>
                                    <CardDescription>
                                        Revise o documento exatamente como será apresentado aos signatários.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-mono text-xs">
                                    Status: Pronto para Envio
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Visualizador do Documento Final Renderizado */}
                            <div className="p-6 bg-white border rounded-md shadow-inner max-h-[500px] overflow-y-auto whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-800">
                                {renderPreviewText()}
                            </div>

                            <div className="mt-6 border-t pt-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Signatários Registrados ({signers.length}):
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {signers.map((s, idx) => (
                                        <div key={idx} className="text-xs p-2.5 bg-slate-50 border rounded border-slate-200">
                                            <span className="font-bold text-slate-800">{s.name}</span>{' '}
                                            <span className="text-slate-500">({s.role})</span>
                                            {s.email && <div className="text-slate-500 text-[11px]">E-mail: {s.email}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex justify-between bg-slate-50/50">
                            <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting} className="h-9 text-xs">
                                Ajustar Campos
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {isSubmitting ? 'Gerando Documento...' : 'Confirmar e Enviar para Assinatura'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}
