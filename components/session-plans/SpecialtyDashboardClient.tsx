'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Plus,
    Activity,
    Calendar,
    Clock,
    User,
    FileText,
    Edit3,
    CheckCircle2,
    AlertCircle,
    Save,
    Trash2,
    TrendingUp,
    Shield,
    ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { SpecialtyTemplateConfig } from '@/lib/session-plans/types'

interface SpecialtyDashboardClientProps {
    patient: {
        id: string
        full_name: string
        birth_date?: string
        cpf?: string
        phone?: string
        gender?: string
        created_at: string
    }
    especialidade: string
    meta?: {
        label: string
        icon: string
        color: string
        description: string
    }
    template: SpecialtyTemplateConfig
    initialCapa: any
    initialSessoes: any[]
}

export function SpecialtyDashboardClient({
    patient,
    especialidade,
    meta,
    template,
    initialCapa,
    initialSessoes,
}: SpecialtyDashboardClientProps) {
    const router = useRouter()
    const [capa, setCapa] = useState(initialCapa || {})
    const [sessoes, setSessoes] = useState(initialSessoes || [])
    const [showEditCapaModal, setShowEditCapaModal] = useState(false)
    const [isSavingCapa, setIsSavingCapa] = useState(false)
    const [isCreatingSessao, setIsCreatingSessao] = useState(false)

    // Form Capa State
    const [capaForm, setCapaForm] = useState({
        profissional_referencia: initialCapa?.profissional_referencia || '',
        inicio_acompanhamento: initialCapa?.inicio_acompanhamento || '',
        frequencia_sessoes: initialCapa?.frequencia_sessoes || '2x por semana',
        duracao_padrao_sessao: initialCapa?.duracao_padrao_sessao || '50 minutos',
        resumo_clinico: initialCapa?.resumo_clinico || '',
        objetivos_longo_prazo: initialCapa?.objetivos_longo_prazo || '',
        criterios_progressao: initialCapa?.criterios_progressao || '',
        nova_revisao_obs: '',
    })

    // Calcula idade
    const calcAge = (birthDate?: string) => {
        if (!birthDate) return '-'
        const birth = new Date(birthDate)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return `${age} anos`
    }

    // Salvar Capa
    const handleSaveCapa = async () => {
        try {
            setIsSavingCapa(true)

            // Se digitou uma nova revisão, acrescenta ao histórico
            let historico = Array.isArray(capa.historico_revisoes)
                ? [...capa.historico_revisoes]
                : []

            if (capaForm.nova_revisao_obs.trim()) {
                historico.unshift({
                    data: new Date().toISOString().split('T')[0],
                    profissional: capaForm.profissional_referencia || 'Fisioterapeuta',
                    observacao: capaForm.nova_revisao_obs.trim(),
                })
            }

            const payload = {
                profissional_referencia: capaForm.profissional_referencia,
                inicio_acompanhamento: capaForm.inicio_acompanhamento || null,
                frequencia_sessoes: capaForm.frequencia_sessoes,
                duracao_padrao_sessao: capaForm.duracao_padrao_sessao,
                resumo_clinico: capaForm.resumo_clinico,
                objetivos_longo_prazo: capaForm.objetivos_longo_prazo,
                criterios_progressao: capaForm.criterios_progressao,
                historico_revisoes: historico,
            }

            const res = await fetch(`/api/planos-sessao/${especialidade}/${patient.id}/capa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Erro ao salvar capa')

            const data = await res.json()
            setCapa(data.capa)
            setCapaForm((prev) => ({ ...prev, nova_revisao_obs: '' }))
            setShowEditCapaModal(false)
            toast.success('Ficha Capa atualizada com sucesso!')
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar capa')
        } finally {
            setIsSavingCapa(false)
        }
    }

    // Criar Nova Sessão
    const handleCreateSession = async () => {
        try {
            setIsCreatingSessao(true)
            const res = await fetch(
                `/api/planos-sessao/${especialidade}/${patient.id}/sessoes`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data_sessao: new Date().toISOString().split('T')[0],
                        duracao_minutos: 50,
                        contexto: 'Clínica',
                        forma_mobilidade: 'Marcha independente',
                    }),
                }
            )

            if (!res.ok) throw new Error('Erro ao iniciar nova sessão')

            const data = await res.json()
            toast.success('Nova sessão iniciada!')
            router.push(
                `/dashboard/pacientes/${patient.id}/planos-sessao/${especialidade}/sessao/${data.sessao.id}`
            )
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar sessão')
            setIsCreatingSessao(false)
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-6 py-4">
            {/* Top Bar / Breadcrumb */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href={`/dashboard/pacientes/${patient.id}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                {patient.full_name}
                            </h1>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-xs">
                                {template.name}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Nascimento: {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '-'} • Idade: {calcAge(patient.birth_date)} • World Sensory
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditCapaModal(true)}
                        className="h-9 gap-1.5 text-xs font-medium"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Capa</span>
                    </Button>

                    <Button
                        onClick={handleCreateSession}
                        disabled={isCreatingSessao}
                        className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nova Sessão</span>
                    </Button>
                </div>
            </div>

            {/* Ficha Capa do Paciente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1 e 2: Dados e Resumo Clínico */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border border-border/80 shadow-xs">
                        <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    Ficha de Acompanhamento Clínico · Capa do Paciente
                                </CardTitle>
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {template.councilName} • Oficial
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xs">
                            {/* Grid de Dados Principais da Capa */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-border/60">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Profissional de Ref.</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {capa.profissional_referencia || 'Não informado'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Início do Acompanh.</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {capa.inicio_acompanhamento
                                            ? new Date(capa.inicio_acompanhamento).toLocaleDateString('pt-BR')
                                            : 'Não informado'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Frequência</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {capa.frequencia_sessoes || '2x por semana'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Duração Padrão</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {capa.duracao_padrao_sessao || '50 minutos'}
                                    </p>
                                </div>
                            </div>

                            {/* Resumo Clínico e Objetivos de Longo Prazo */}
                            <div>
                                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                    Resumo Clínico e Objetivos de Longo Prazo
                                </h4>
                                <div className="p-3 bg-background rounded-md border border-border text-foreground leading-relaxed min-h-[70px] whitespace-pre-wrap">
                                    {capa.resumo_clinico ||
                                        'Nenhum resumo clínico registrado ainda. Clique em "Editar Capa" para inserir histórico e hipóteses funcionais.'}
                                </div>
                            </div>

                            {/* Critérios de Progressão (Box Oficial World Sensory) */}
                            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-md border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                    Critério de Progressão Institucional
                                </h4>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                                    A progressão deverá considerar conjuntamente: alcance da meta quantitativa, fadiga, nível de assistência, dor, segurança, funcionalidade, qualidade do movimento, generalização, presença de compensações e participação em atividades reais.
                                </p>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-500 italic">
                                    * Um objetivo não deverá ser considerado adquirido apenas porque o paciente conseguiu completar a tarefa.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Histórico de Revisões da Capa */}
                    <Card className="border border-border/80 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                Histórico de Revisões Desta Capa
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {Array.isArray(capa.historico_revisoes) && capa.historico_revisoes.length > 0 ? (
                                <div className="divide-y divide-border text-xs">
                                    {capa.historico_revisoes.map((rev: any, idx: number) => (
                                        <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-foreground">{rev.observacao}</p>
                                                <p className="text-[10px] text-muted-foreground">Por: {rev.profissional}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0">
                                                {rev.data ? new Date(rev.data).toLocaleDateString('pt-BR') : '-'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground py-2 italic">
                                    Nenhuma revisão registrada até o momento.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna 3: Sessões e Histórico Rápido */}
                <div className="space-y-6">
                    <Card className="border border-border/80 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                    Folhas de Sessão ({sessoes.length})
                                </CardTitle>
                                <Button
                                    size="sm"
                                    onClick={handleCreateSession}
                                    disabled={isCreatingSessao}
                                    className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Nova
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-3">
                            {sessoes.length === 0 ? (
                                <div className="text-center py-8 space-y-3">
                                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/50" />
                                    <p className="text-xs text-muted-foreground">
                                        Nenhum plano de sessão registrado ainda para este paciente.
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCreateSession}
                                        className="text-xs"
                                    >
                                        Iniciar Primeira Sessão
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {sessoes.map((sessao) => (
                                        <div
                                            key={sessao.id}
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/pacientes/${patient.id}/planos-sessao/${especialidade}/sessao/${sessao.id}`
                                                )
                                            }
                                            className="p-3 rounded-lg border border-border/70 hover:border-emerald-500/50 hover:bg-muted/40 transition-all cursor-pointer space-y-1.5 group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-600" />
                                                    <span className="font-semibold text-xs text-foreground">
                                                        {sessao.data_sessao
                                                            ? new Date(sessao.data_sessao + 'T12:00:00').toLocaleDateString('pt-BR')
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant={
                                                        sessao.status === 'assinado'
                                                            ? 'default'
                                                            : sessao.status === 'finalizado'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                    className={`text-[10px] uppercase font-semibold ${
                                                        sessao.status === 'assinado'
                                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                                            : ''
                                                    }`}
                                                >
                                                    {sessao.status}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>{sessao.contexto || 'Clínica'} • {sessao.duracao_minutos || 50} min</span>
                                                <span className="text-emerald-600 font-medium group-hover:underline flex items-center gap-1">
                                                    Acessar
                                                    <ExternalLink className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de Edição da Capa */}
            <Dialog open={showEditCapaModal} onOpenChange={setShowEditCapaModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-emerald-600" />
                            Editar Ficha de Acompanhamento Clínico · Capa do Paciente
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Preencha ou atualize as informações perenes que acompanham o prontuário do paciente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="prof_ref">Profissional de Referência</Label>
                                <Input
                                    id="prof_ref"
                                    placeholder="Ex: Dra. Patrícia / Fisioterapeuta"
                                    value={capaForm.profissional_referencia}
                                    onChange={(e) =>
                                        setCapaForm({ ...capaForm, profissional_referencia: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dt_inicio">Início do Acompanhamento</Label>
                                <Input
                                    id="dt_inicio"
                                    type="date"
                                    value={capaForm.inicio_acompanhamento}
                                    onChange={(e) =>
                                        setCapaForm({ ...capaForm, inicio_acompanhamento: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="freq">Frequência das Sessões</Label>
                                <Input
                                    id="freq"
                                    placeholder="Ex: 2x por semana"
                                    value={capaForm.frequencia_sessoes}
                                    onChange={(e) =>
                                        setCapaForm({ ...capaForm, frequencia_sessoes: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="duracao">Duração Padrão</Label>
                                <Input
                                    id="duracao"
                                    placeholder="Ex: 50 minutos"
                                    value={capaForm.duracao_padrao_sessao}
                                    onChange={(e) =>
                                        setCapaForm({ ...capaForm, duracao_padrao_sessao: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="resumo">Resumo Clínico e Objetivos de Longo Prazo</Label>
                            <Textarea
                                id="resumo"
                                rows={4}
                                placeholder="Breve histórico, hipóteses funcionais e metas gerais do acompanhamento..."
                                value={capaForm.resumo_clinico}
                                onChange={(e) =>
                                    setCapaForm({ ...capaForm, resumo_clinico: e.target.value })
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="nova_rev">Registrar Nova Revisão da Capa (Opcional)</Label>
                            <Input
                                id="nova_rev"
                                placeholder="Descreva a alteração ou revisão realizada nesta data..."
                                value={capaForm.nova_revisao_obs}
                                onChange={(e) =>
                                    setCapaForm({ ...capaForm, nova_revisao_obs: e.target.value })
                                }
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Se preenchido, será adicionado ao histórico de revisões da capa com a data de hoje.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditCapaModal(false)}
                            disabled={isSavingCapa}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveCapa}
                            disabled={isSavingCapa}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            {isSavingCapa ? 'Salvando...' : 'Salvar Capa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
