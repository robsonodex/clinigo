'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Save,
    CheckCircle2,
    Clock,
    Calendar,
    Activity,
    AlertCircle,
    User,
    ChevronDown,
    ChevronUp,
    Shield,
    FileCheck,
    Check,
    Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { SpecialtyTemplateConfig, ObjectiveTemplate } from '@/lib/session-plans/types'

interface SessionPlanFormClientProps {
    patient: {
        id: string
        full_name: string
        birth_date?: string
        gender?: string
        cpf?: string
    }
    especialidade: string
    template: SpecialtyTemplateConfig
    initialSessao: any
}

export function SessionPlanFormClient({
    patient,
    especialidade,
    template,
    initialSessao,
}: SessionPlanFormClientProps) {
    const router = useRouter()

    // Form State
    const [sessao, setSessao] = useState(initialSessao)
    const [dataSessao, setDataSessao] = useState(
        initialSessao.data_sessao || new Date().toISOString().split('T')[0]
    )
    const [duracao, setDuracao] = useState(initialSessao.duracao_minutos || 50)
    const [contexto, setContexto] = useState(initialSessao.contexto || 'Clínica')
    const [formaMobilidade, setFormaMobilidade] = useState(
        initialSessao.forma_mobilidade || 'Marcha independente'
    )

    // Seção 1: Condição Inicial
    const [condicaoInicial, setCondicaoInicial] = useState<any>(
        initialSessao.condicao_inicial || {
            estados_gerais: ['Disponível para a sessão'],
            alteracoes_recentes: ['Nenhuma'],
            observacoes: '',
        }
    )

    // Seção 2: Objetivos Selecionados (Array de { code, values: Record<string, any> })
    const [objetivosSelecionados, setObjetivosSelecionados] = useState<any[]>(
        initialSessao.objetivos_selecionados || []
    )

    // Seção 17 & 21: Metas e Resultados
    const [registroDesempenho, setRegistroDesempenho] = useState<any[]>(
        initialSessao.registro_desempenho || []
    )

    // Seção 18: Nível de Assistência
    const [nivelAssistencia, setNivelAssistencia] = useState<string>(
        initialSessao.estrategias?.nivel_assistencia || 'independente'
    )

    // Seção 19: Estratégias de Intervenção
    const [estrategias, setEstrategias] = useState<string[]>(
        initialSessao.estrategias?.selecionadas || []
    )

    // Seção 20: Planejamento das Etapas
    const [planejamentoEtapas, setPlanejamentoEtapas] = useState<any[]>(
        initialSessao.planejamento_etapas?.length > 0
            ? initialSessao.planejamento_etapas
            : template.sessionStages.map((st) => ({
                  id: st.id,
                  nome: st.name,
                  minutos: st.defaultMinutes || 10,
                  dose: '',
              }))
    )

    // Seção 22: Qualidade do Movimento
    const [qualidadeMovimento, setQualidadeMovimento] = useState<any>(
        initialSessao.qualidade_movimento || {
            itens: [],
            descricao: '',
        }
    )

    // Seção 23: Análise Clínica
    const [analiseClinica, setAnaliseClinica] = useState<any>(
        initialSessao.analise_clinica || {
            limitador_principal: '',
            facilitador: '',
            diferenca_adaptacao: 'nao',
            qual_diferenca: '',
            transferencia_funcional: 'emergente',
            descricao_transferencia: '',
        }
    )

    // Seção 24: Decisão para Próxima Sessão
    const [decisaoProximaSessao, setDecisaoProximaSessao] = useState<any>(
        initialSessao.decisao_proxima_sessao || {
            decisoes: ['Manter objetivo e dose'],
            proxima_meta: '',
        }
    )

    // Seção 25: Orientação Família/Escola
    const [orientacaoFamilia, setOrientacaoFamilia] = useState<any>(
        initialSessao.orientacao_familia || {
            realizada: true,
            habilidade_priorizada: '',
            contextos: ['Casa'],
            orientacao: '',
        }
    )

    // Status e Salvamento
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(new Date())
    const [activeTab, setActiveTab] = useState<string>('MOB')
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Helper: Atualiza campos dinâmicos de um objetivo selecionado
    const handleObjectiveParamChange = (code: string, fieldId: string, value: any) => {
        setObjetivosSelecionados((prev) =>
            prev.map((item) => {
                if (item.code === code) {
                    return {
                        ...item,
                        values: {
                            ...(item.values || {}),
                            [fieldId]: value,
                        },
                    }
                }
                return item
            })
        )
    }

    // Toggle de seleção de objetivo (limite 2 a 4)
    const handleToggleObjective = (obj: ObjectiveTemplate) => {
        const exists = objetivosSelecionados.some((o) => o.code === obj.code)

        if (exists) {
            // Remove
            setObjetivosSelecionados((prev) => prev.filter((o) => o.code !== obj.code))
            setRegistroDesempenho((prev) => prev.filter((r) => r.code !== obj.code))
        } else {
            // Adiciona (valida limite máximo de 4)
            if (objetivosSelecionados.length >= template.maxObjectives) {
                toast.warning(`Recomendado selecionar de 2 a ${template.maxObjectives} objetivos por sessão.`)
            }

            const defaultVals: Record<string, any> = {}
            obj.fields.forEach((f) => {
                if (f.defaultValue !== undefined) defaultVals[f.id] = f.defaultValue
            })

            const newItem = {
                code: obj.code,
                title: obj.title,
                category: obj.category,
                categoryLabel: obj.categoryLabel,
                values: defaultVals,
            }

            setObjetivosSelecionados((prev) => [...prev, newItem])

            // Inicializa linha correspondente no registro de desempenho
            setRegistroDesempenho((prev) => [
                ...prev,
                {
                    code: obj.code,
                    title: obj.title,
                    baseline: '',
                    meta: '',
                    resultado: '',
                    assistencia: 'Independente',
                    qualidade: 'Adequada',
                    atingida: 'sim',
                    medicoes: ['% de independência'],
                },
            ])
        }
    }

    // Salvar Dados no Servidor
    const handleSaveSession = async (newStatus?: string) => {
        try {
            setIsSaving(true)

            const payload = {
                data_sessao: dataSessao,
                duracao_minutos: Number(duracao) || 50,
                contexto,
                forma_mobilidade: formaMobilidade,
                condicao_inicial: condicaoInicial,
                objetivos_selecionados: objetivosSelecionados,
                estrategias: {
                    nivel_assistencia: nivelAssistencia,
                    selecionadas: estrategias,
                },
                planejamento_etapas: planejamentoEtapas,
                registro_desempenho: registroDesempenho,
                qualidade_movimento: qualidadeMovimento,
                analise_clinica: analiseClinica,
                decisao_proxima_sessao: decisaoProximaSessao,
                orientacao_familia: orientacaoFamilia,
                status: newStatus || sessao.status || 'rascunho',
            }

            const res = await fetch(
                `/api/planos-sessao/${especialidade}/${patient.id}/sessoes/${sessao.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            )

            if (!res.ok) throw new Error('Falha ao salvar sessão')

            const data = await res.json()
            setSessao(data.sessao)
            setLastSaved(new Date())

            if (newStatus === 'assinado') {
                toast.success('Plano de Sessão assinado e finalizado com sucesso!')
                router.push(`/dashboard/pacientes/${patient.id}/planos-sessao/${especialidade}`)
            } else {
                toast.success('Rascunho salvo com sucesso!')
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar plano')
        } finally {
            setIsSaving(false)
        }
    }

    // Autosave com debounce a cada 30 segundos se houver alterações
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

        autoSaveTimerRef.current = setTimeout(() => {
            // Executa salvamento de fundo silencioso
            handleSaveSession()
        }, 30000)

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        }
    }, [
        dataSessao,
        duracao,
        contexto,
        formaMobilidade,
        condicaoInicial,
        objetivosSelecionados,
        registroDesempenho,
        nivelAssistencia,
        estrategias,
        planejamentoEtapas,
        qualidadeMovimento,
        analiseClinica,
        decisaoProximaSessao,
        orientacaoFamilia,
    ])

    // Renderizador de Frase de Objetivo com Inputs Reais
    const renderObjectiveInteractiveForm = (obj: ObjectiveTemplate) => {
        const selected = objetivosSelecionados.find((o) => o.code === obj.code)
        const isChecked = !!selected
        const currentVals = selected?.values || {}

        return (
            <div
                key={obj.code}
                className={`p-3.5 rounded-lg border transition-all space-y-2.5 ${
                    isChecked
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-border/70 hover:border-border bg-card'
                }`}
            >
                <div className="flex items-start gap-2.5">
                    <Checkbox
                        id={`obj_${obj.code}`}
                        checked={isChecked}
                        onCheckedChange={() => handleToggleObjective(obj)}
                        className="mt-0.5"
                    />
                    <div className="flex-1">
                        <Label
                            htmlFor={`obj_${obj.code}`}
                            className="font-bold text-xs cursor-pointer text-foreground flex items-center gap-1.5"
                        >
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                                {obj.code}
                            </span>
                            <span>– {obj.title}</span>
                        </Label>
                    </div>
                </div>

                {/* Subcampos Interativos Reais */}
                {isChecked && (
                    <div className="pl-6 pt-1 space-y-3 border-t border-emerald-200/60 dark:border-emerald-900/40 mt-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Parâmetros Clínicos da Sessão:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {obj.fields.map((field) => (
                                <div key={field.id} className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">
                                        {field.label}
                                    </Label>
                                    {field.type === 'radio' && field.options ? (
                                        <RadioGroup
                                            value={currentVals[field.id] || field.defaultValue || field.options[0].value}
                                            onValueChange={(val) =>
                                                handleObjectiveParamChange(obj.code, field.id, val)
                                            }
                                            className="flex flex-wrap gap-2 pt-0.5"
                                        >
                                            {field.options.map((opt) => (
                                                <div key={opt.value} className="flex items-center space-x-1.5">
                                                    <RadioGroupItem
                                                        value={opt.value}
                                                        id={`${obj.code}_${field.id}_${opt.value}`}
                                                    />
                                                    <Label
                                                        htmlFor={`${obj.code}_${field.id}_${opt.value}`}
                                                        className="text-xs cursor-pointer"
                                                    >
                                                        {opt.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    ) : (
                                        <Input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            placeholder={field.placeholder || ''}
                                            value={currentVals[field.id] || ''}
                                            onChange={(e) =>
                                                handleObjectiveParamChange(obj.code, field.id, e.target.value)
                                            }
                                            className="h-8 text-xs bg-background"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-6 py-4 pb-20">
            {/* Header com Navegação e Ações Rápidas */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-30 pt-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href={`/dashboard/pacientes/${patient.id}/planos-sessao/${especialidade}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-foreground">
                                Plano de Sessão — {template.name}
                            </h1>
                            {sessao.status === 'assinado' && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-semibold">
                                    Assinado
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Paciente: <strong className="text-foreground">{patient.full_name}</strong> • World Sensory
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {lastSaved && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSession('rascunho')}
                        disabled={isSaving}
                        className="h-9 text-xs"
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => handleSaveSession('assinado')}
                        disabled={isSaving}
                        className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        <FileCheck className="w-4 h-4 mr-1.5" />
                        Finalizar & Assinar
                    </Button>
                </div>
            </div>

            {/* Cabeçalho da Folha: Data, Duração, Contexto e Mobilidade */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Identificação da Sessão
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1.5">
                        <Label htmlFor="dt_sessao">Data da Sessão *</Label>
                        <Input
                            id="dt_sessao"
                            type="date"
                            value={dataSessao}
                            onChange={(e) => setDataSessao(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="dur_sessao">Duração (minutos) *</Label>
                        <Input
                            id="dur_sessao"
                            type="number"
                            value={duracao}
                            onChange={(e) => setDuracao(Number(e.target.value))}
                            className="h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="contexto_sessao">Contexto *</Label>
                        <Select value={contexto} onValueChange={setContexto}>
                            <SelectTrigger id="contexto_sessao" className="h-9 text-xs">
                                <SelectValue placeholder="Selecione o contexto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Clínica">Clínica</SelectItem>
                                <SelectItem value="Domicílio">Domicílio</SelectItem>
                                <SelectItem value="Escola">Escola</SelectItem>
                                <SelectItem value="Comunidade">Comunidade</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="forma_mob">Forma Predominante de Mobilidade</Label>
                        <Select value={formaMobilidade} onValueChange={setFormaMobilidade}>
                            <SelectTrigger id="forma_mob" className="h-9 text-xs">
                                <SelectValue placeholder="Selecione a mobilidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Marcha independente">Marcha independente</SelectItem>
                                <SelectItem value="Marcha com supervisão">Marcha com supervisão</SelectItem>
                                <SelectItem value="Marcha com dispositivo auxiliar">Marcha com disp. auxiliar</SelectItem>
                                <SelectItem value="Mobilidade no solo">Mobilidade no solo</SelectItem>
                                <SelectItem value="Cadeira de rodas manual">Cadeira de rodas manual</SelectItem>
                                <SelectItem value="Cadeira de rodas motorizada">Cadeira de rodas motorizada</SelectItem>
                                <SelectItem value="Mobilidade dependente">Mobilidade dependente</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* SEÇÃO 1: CONDIÇÃO INICIAL */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        1. Condição Inicial do Paciente
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                    <div>
                        <Label className="font-semibold text-foreground mb-1.5 block">
                            Estado Geral:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {template.initialConditions.generalStates.map((st) => {
                                const active = condicaoInicial.estados_gerais?.includes(st)
                                return (
                                    <Badge
                                        key={st}
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => {
                                            const current = condicaoInicial.estados_gerais || []
                                            const next = active
                                                ? current.filter((x: string) => x !== st)
                                                : [...current, st]
                                            setCondicaoInicial({ ...condicaoInicial, estados_gerais: next })
                                        }}
                                        className={`cursor-pointer px-2.5 py-1 text-xs select-none transition-colors ${
                                            active
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {st}
                                    </Badge>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <Label className="font-semibold text-foreground mb-1.5 block">
                            Alterações desde a última sessão:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {template.initialConditions.recentChanges.map((ch) => {
                                const active = condicaoInicial.alteracoes_recentes?.includes(ch)
                                return (
                                    <Badge
                                        key={ch}
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => {
                                            const current = condicaoInicial.alteracoes_recentes || []
                                            const next = active
                                                ? current.filter((x: string) => x !== ch)
                                                : [...current, ch]
                                            setCondicaoInicial({ ...condicaoInicial, alteracoes_recentes: next })
                                        }}
                                        className={`cursor-pointer px-2.5 py-1 text-xs select-none transition-colors ${
                                            active
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {ch}
                                    </Badge>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="obs_condicao">Observações Clínicas Iniciais</Label>
                        <Textarea
                            id="obs_condicao"
                            rows={2}
                            placeholder="Descreva detalhes observáveis relevantes ao início do atendimento..."
                            value={condicaoInicial.observacoes || ''}
                            onChange={(e) =>
                                setCondicaoInicial({ ...condicaoInicial, observacoes: e.target.value })
                            }
                            className="text-xs"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SEÇÃO 2: SELEÇÃO DOS OBJETIVOS DA SESSÃO */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                2. Seleção dos Objetivos da Sessão
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Selecione preferencialmente de 2 a 4 objetivos prioritários. Preencha todos os parâmetros interativos.
                            </CardDescription>
                        </div>
                        <Badge
                            variant={
                                objetivosSelecionados.length >= 2 && objetivosSelecionados.length <= 4
                                    ? 'default'
                                    : 'secondary'
                            }
                            className={`font-semibold text-xs ${
                                objetivosSelecionados.length >= 2 && objetivosSelecionados.length <= 4
                                    ? 'bg-emerald-600'
                                    : ''
                            }`}
                        >
                            {objetivosSelecionados.length} de {template.maxObjectives} selecionados
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Abas por Categoria Oficial (MOB, POS, EQU, MAR, etc.) */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="overflow-x-auto pb-2">
                            <TabsList className="h-9 inline-flex w-max p-1 bg-muted/50 border border-border">
                                {template.categories.map((cat) => {
                                    const count = objetivosSelecionados.filter(
                                        (o) => o.category === cat.id
                                    ).length
                                    return (
                                        <TabsTrigger
                                            key={cat.id}
                                            value={cat.id}
                                            className="text-xs px-3 py-1 gap-1.5 data-[state=active]:bg-background"
                                        >
                                            <span>{cat.id}</span>
                                            {count > 0 && (
                                                <span className="bg-emerald-600 text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center font-bold">
                                                    {count}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    )
                                })}
                            </TabsList>
                        </div>

                        {template.categories.map((cat) => (
                            <TabsContent key={cat.id} value={cat.id} className="space-y-3 pt-2">
                                <div className="border-b border-border pb-2 mb-3">
                                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                                        {cat.label}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {cat.objectives.map((obj) => renderObjectiveInteractiveForm(obj))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            {/* SEÇÃO 18 & 19: NÍVEL DE ASSISTÊNCIA E ESTRATÉGIAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 18. Padronização do Nível de Assistência */}
                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            18. Padronização do Nível de Assistência
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-2 text-xs">
                        <RadioGroup
                            value={nivelAssistencia}
                            onValueChange={setNivelAssistencia}
                            className="space-y-2"
                        >
                            {template.assistanceLevels.map((lvl) => (
                                <div
                                    key={lvl.id}
                                    className="flex items-start space-x-2.5 p-2 rounded-md hover:bg-muted/40 transition-colors"
                                >
                                    <RadioGroupItem value={lvl.id} id={`lvl_${lvl.id}`} className="mt-0.5" />
                                    <div className="flex-1 cursor-pointer">
                                        <Label htmlFor={`lvl_${lvl.id}`} className="font-semibold text-xs cursor-pointer">
                                            {lvl.label}
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">{lvl.description}</p>
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* 19. Estratégias de Intervenção */}
                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            19. Estratégias de Intervenção
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3 text-xs">
                        {template.strategies.map((group) => (
                            <div key={group.category} className="space-y-1.5">
                                <p className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                    {group.category}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.items.map((item) => {
                                        const active = estrategias.includes(item)
                                        return (
                                            <Badge
                                                key={item}
                                                variant={active ? 'default' : 'outline'}
                                                onClick={() => {
                                                    const next = active
                                                        ? estrategias.filter((x) => x !== item)
                                                        : [...estrategias, item]
                                                    setEstrategias(next)
                                                }}
                                                className={`cursor-pointer px-2 py-0.5 text-[11px] select-none transition-colors ${
                                                    active
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        : 'hover:bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {item}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* SEÇÃO 20: PLANEJAMENTO DA SESSÃO (ETAPAS E DOSES) */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                        20. Planejamento da Sessão (Etapas e Doses)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                    <div className="space-y-3 text-xs">
                        {planejamentoEtapas.map((etapa, idx) => (
                            <div
                                key={etapa.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-2.5 rounded-md bg-muted/20 border border-border/50"
                            >
                                <div className="sm:col-span-5 font-semibold text-foreground">
                                    {etapa.id} · {etapa.nome}
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        value={etapa.minutos}
                                        onChange={(e) => {
                                            const val = Number(e.target.value)
                                            setPlanejamentoEtapas((prev) =>
                                                prev.map((it) => (it.id === etapa.id ? { ...it, minutos: val } : it))
                                            )
                                        }}
                                        className="h-8 text-xs"
                                    />
                                    <span className="text-muted-foreground text-[11px]">min</span>
                                </div>
                                <div className="sm:col-span-5">
                                    <Input
                                        placeholder="Dose planejada / observações..."
                                        value={etapa.dose || ''}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setPlanejamentoEtapas((prev) =>
                                                prev.map((it) => (it.id === etapa.id ? { ...it, dose: val } : it))
                                            )
                                        }}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* SEÇÃO 21: REGISTRO DE RESULTADO COM CÁLCULOS AUTOMÁTICOS */}
            <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            21. Registro Objetivo de Resultado
                        </CardTitle>
                        <span className="text-[11px] text-muted-foreground italic">
                            * Cálculo derivado automático
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="pt-3">
                    {registroDesempenho.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3">
                            Selecione pelo menos 2 objetivos na Seção 2 acima para registrar os resultados.
                        </p>
                    ) : (
                        <div className="space-y-4 text-xs">
                            {registroDesempenho.map((reg, idx) => (
                                <div
                                    key={reg.code}
                                    className="p-3.5 rounded-lg border border-border/70 bg-card space-y-3"
                                >
                                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                        <span className="font-bold text-foreground">
                                            #{idx + 1} {reg.code} – {reg.title}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[11px] text-muted-foreground">Meta Atingida?</Label>
                                            <Select
                                                value={reg.atingida || 'sim'}
                                                onValueChange={(val) => {
                                                    setRegistroDesempenho((prev) =>
                                                        prev.map((r) => (r.code === reg.code ? { ...r, atingida: val } : r))
                                                    )
                                                }}
                                            >
                                                <SelectTrigger className="h-7 text-xs w-28">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="sim">Sim</SelectItem>
                                                    <SelectItem value="parcial">Parcial</SelectItem>
                                                    <SelectItem value="nao">Não</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Baseline Atual</Label>
                                            <Input
                                                placeholder="Ex: 5 rep / 2 min"
                                                value={reg.baseline || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setRegistroDesempenho((prev) =>
                                                        prev.map((r) => (r.code === reg.code ? { ...r, baseline: val } : r))
                                                    )
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Meta da Sessão</Label>
                                            <Input
                                                placeholder="Ex: 8 rep / 4 min"
                                                value={reg.meta || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setRegistroDesempenho((prev) =>
                                                        prev.map((r) => (r.code === reg.code ? { ...r, meta: val } : r))
                                                    )
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Resultado Observado</Label>
                                            <Input
                                                placeholder="Ex: 7 rep / 3.5 min"
                                                value={reg.resultado || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setRegistroDesempenho((prev) =>
                                                        prev.map((r) => (r.code === reg.code ? { ...r, resultado: val } : r))
                                                    )
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Qualidade do Movimento</Label>
                                            <Select
                                                value={reg.qualidade || 'Adequada'}
                                                onValueChange={(val) => {
                                                    setRegistroDesempenho((prev) =>
                                                        prev.map((r) => (r.code === reg.code ? { ...r, qualidade: val } : r))
                                                    )
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Adequada">Adequada</SelectItem>
                                                    <SelectItem value="Pequenas compensações">Pequenas compensações</SelectItem>
                                                    <SelectItem value="Compensações moderadas">Compensações moderadas</SelectItem>
                                                    <SelectItem value="Compensações importantes">Compensações importantes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SEÇÃO 22 & 23: QUALIDADE E ANÁLISE CLÍNICA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            22. Qualidade do Movimento
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                            {template.movementQualityOptions?.map((item) => {
                                const active = qualidadeMovimento.itens?.includes(item)
                                return (
                                    <Badge
                                        key={item}
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => {
                                            const current = qualidadeMovimento.itens || []
                                            const next = active
                                                ? current.filter((x: string) => x !== item)
                                                : [...current, item]
                                            setQualidadeMovimento({ ...qualidadeMovimento, itens: next })
                                        }}
                                        className={`cursor-pointer px-2 py-0.5 text-[11px] select-none transition-colors ${
                                            active
                                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {item}
                                    </Badge>
                                )
                            })}
                        </div>
                        <Textarea
                            placeholder="Descrição complementar da qualidade do movimento..."
                            rows={2}
                            value={qualidadeMovimento.descricao || ''}
                            onChange={(e) =>
                                setQualidadeMovimento({ ...qualidadeMovimento, descricao: e.target.value })
                            }
                            className="text-xs"
                        />
                    </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            23. Análise Clínica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3 text-xs">
                        <div className="space-y-1">
                            <Label className="text-[11px]">Principal Limitador do Desempenho</Label>
                            <Select
                                value={analiseClinica.limitador_principal || ''}
                                onValueChange={(val) =>
                                    setAnaliseClinica({ ...analiseClinica, limitador_principal: val })
                                }
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Selecione o limitador" />
                                </SelectTrigger>
                                <SelectContent>
                                    {template.clinicalLimiters?.map((lim) => (
                                        <SelectItem key={lim} value={lim}>
                                            {lim}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px]">Transferência para Atividade Funcional</Label>
                            <Select
                                value={analiseClinica.transferencia_funcional || 'emergente'}
                                onValueChange={(val) =>
                                    setAnaliseClinica({ ...analiseClinica, transferencia_funcional: val })
                                }
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nao_observada">Não observada</SelectItem>
                                    <SelectItem value="emergente">Emergente</SelectItem>
                                    <SelectItem value="parcial">Parcial</SelectItem>
                                    <SelectItem value="consistente">Consistente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* SEÇÃO 24 & 25: DECISÃO PRÓXIMA SESSÃO E ORIENTAÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            24. Decisão para a Próxima Sessão
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                            {template.nextSessionDecisions.map((dec) => {
                                const active = decisaoProximaSessao.decisoes?.includes(dec)
                                return (
                                    <Badge
                                        key={dec}
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => {
                                            const current = decisaoProximaSessao.decisoes || []
                                            const next = active
                                                ? current.filter((x: string) => x !== dec)
                                                : [...current, dec]
                                            setDecisaoProximaSessao({ ...decisaoProximaSessao, decisoes: next })
                                        }}
                                        className={`cursor-pointer px-2 py-0.5 text-[11px] select-none transition-colors ${
                                            active
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {dec}
                                    </Badge>
                                )
                            })}
                        </div>
                        <Input
                            placeholder="Próxima meta detalhada..."
                            value={decisaoProximaSessao.proxima_meta || ''}
                            onChange={(e) =>
                                setDecisaoProximaSessao({
                                    ...decisaoProximaSessao,
                                    proxima_meta: e.target.value,
                                })
                            }
                            className="h-8 text-xs"
                        />
                    </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wide text-foreground">
                            25. Orientação à Família / Escola
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-3 text-xs">
                        <div className="flex flex-wrap gap-1.5">
                            {template.generalizationContexts.map((ctx) => {
                                const active = orientacaoFamilia.contextos?.includes(ctx)
                                return (
                                    <Badge
                                        key={ctx}
                                        variant={active ? 'default' : 'outline'}
                                        onClick={() => {
                                            const current = orientacaoFamilia.contextos || []
                                            const next = active
                                                ? current.filter((x: string) => x !== ctx)
                                                : [...current, ctx]
                                            setOrientacaoFamilia({ ...orientacaoFamilia, contextos: next })
                                        }}
                                        className={`cursor-pointer px-2 py-0.5 text-[11px] select-none transition-colors ${
                                            active
                                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {ctx}
                                    </Badge>
                                )
                            })}
                        </div>
                        <Textarea
                            placeholder="Descreva a orientação funcional compartilhada com os cuidadores..."
                            rows={2}
                            value={orientacaoFamilia.orientacao || ''}
                            onChange={(e) =>
                                setOrientacaoFamilia({ ...orientacaoFamilia, orientacao: e.target.value })
                            }
                            className="text-xs"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* SEÇÃO 27: ASSINATURA DO PROFISSIONAL */}
            <Card className="border border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
                <CardContent className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-emerald-600 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-foreground">
                                27. Responsabilidade e Autoria Clínica ({template.councilName})
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Registro eletrônico em conformidade com as diretrizes do manual World Sensory e LGPD.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleSaveSession('rascunho')}
                            disabled={isSaving}
                            className="text-xs h-9"
                        >
                            Salvar Rascunho
                        </Button>
                        <Button
                            onClick={() => handleSaveSession('assinado')}
                            disabled={isSaving}
                            className="text-xs h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            <FileCheck className="w-4 h-4 mr-1.5" />
                            Finalizar e Assinar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
