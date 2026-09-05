'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
    BookOpen,
    ArrowLeft,
    Search,
    Copy,
    Check,
    CheckSquare,
    Square,
    Shield,
    FileText,
    Sparkles,
    AlertCircle,
    ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function ManualEvolucaoReader() {
    const [search, setSearch] = useState('')
    const [activeSection, setActiveSection] = useState('16')
    const [copied, setCopied] = useState(false)

    // Checklist interativo da Seção 17
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

    const toggleCheck = (index: number) => {
        setCheckedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }))
    }

    const copyFormula = () => {
        const text = `Sessão direcionada a [OBJETIVO]. Foram utilizados [PROCEDIMENTOS / ESTRATÉGIAS]. O paciente realizou / apresentou [RESPOSTA OBSERVÁVEL E DADOS]. Os dados indicam / observa-se [INTERPRETAÇÃO CLÍNICA]. Conduta: [MANTER / MODIFICAR / REAVALIAR].`
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Modelo em 5 frases copiado para a área de transferência!')
        setTimeout(() => setCopied(false), 2500)
    }

    const sections = [
        { id: '0', title: '0. Apresentação & Regra Central' },
        { id: '2', title: '2. O que é uma Evolução Clínica' },
        { id: '4', title: '4. Os 7 Componentes da Boa Evolução' },
        { id: '5', title: '5. Objetivo vs Atividade vs Procedimento' },
        { id: '6', title: '6. Escrita Observável e Mensurável' },
        { id: '7', title: '7. Registro de Nível de Ajuda' },
        { id: '8', title: '8. Comportamentos, Crises e Intercorrências' },
        { id: '11', title: '11. O Que NÃO Deve Aparecer' },
        { id: '13', title: '13. Sigilo, LGPD e Uso de IA' },
        { id: '14', title: '14. Exemplos por Área Profissional' },
        { id: '15', title: '15. Antes e Depois (Transformações)' },
        { id: '16', title: '16. Estrutura em 5 Frases (Fórmula)' },
        { id: '17', title: '17. Checklist e Auditoria de Qualidade' },
        { id: '18', title: '18. Referências Normativas & Prazos' },
    ]

    const filteredSections = sections.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-6 py-4 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                        <Link href="/dashboard/prontuarios">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                                Manual Institucional de Evolução Terapêutica
                            </h1>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold text-xs">
                                World Sensory · v1.0
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Diretrizes para registro com clareza, objetividade, valor clínico e conformidade legal.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={copyFormula}
                        className="h-9 gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>Copiar Estrutura em 5 Frases</span>
                    </Button>
                </div>
            </div>

            {/* Layout em 2 Colunas: Navegador de Seções à Esquerda e Conteúdo à Direita */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Coluna Lateral: Índice e Busca */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border border-border/80 shadow-xs">
                        <CardHeader className="p-3 pb-2 border-b border-border/50">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar tópicos do manual..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-8 text-xs pl-8 bg-background"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1 text-xs max-h-[600px] overflow-y-auto">
                            {filteredSections.map((sec) => (
                                <button
                                    key={sec.id}
                                    onClick={() => setActiveSection(sec.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md font-medium text-xs transition-colors flex items-center justify-between group ${
                                        activeSection === sec.id
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-semibold'
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate">{sec.title}</span>
                                    <ChevronRight
                                        className={`w-3 h-3 shrink-0 transition-transform ${
                                            activeSection === sec.id ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                    />
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Destaque: Regra de Ouro */}
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/40 space-y-2">
                        <p className="font-bold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Regra Central
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                            "Se outro profissional ler apenas as evoluções do último mês, ele deve conseguir compreender o que está sendo tratado, como o paciente está respondendo e por que a conduta foi mantida ou modificada."
                        </p>
                    </div>
                </div>

                {/* Coluna Central: Conteúdo da Seção Ativa */}
                <div className="lg:col-span-3 space-y-6">
                    {/* SEÇÃO 16: ESTRUTURA EM 5 FRASES (A MAIS UTILIZADA) */}
                    {activeSection === '16' && (
                        <Card className="border border-indigo-200 dark:border-indigo-900/60 shadow-sm">
                            <CardHeader className="pb-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-200">
                                        16. Modelo Institucional de Evolução (Estrutura em 5 Frases)
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={copyFormula}
                                        className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copiar
                                    </Button>
                                </div>
                                <CardDescription className="text-xs">
                                    Versão rápida recomendada para o prontuário diário. Garante todos os elementos essenciais sem engessamento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-xs">
                                <div className="space-y-2.5">
                                    <div className="p-3 bg-card rounded-md border border-border">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400">1. Objetivo:</span>
                                        <p className="text-foreground mt-0.5 italic">“Sessão direcionada a...” (habilidade, função ou comportamento-alvo)</p>
                                    </div>

                                    <div className="p-3 bg-card rounded-md border border-border">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400">2. Procedimento:</span>
                                        <p className="text-foreground mt-0.5 italic">“Foram utilizados...” (intervenções, estratégias e mediações aplicadas)</p>
                                    </div>

                                    <div className="p-3 bg-card rounded-md border border-border">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400">3. Resposta / Dados:</span>
                                        <p className="text-foreground mt-0.5 italic">“O paciente realizou / apresentou...” (desempenho observável, acurácia, latência, nível de ajuda)</p>
                                    </div>

                                    <div className="p-3 bg-card rounded-md border border-border">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400">4. Interpretação:</span>
                                        <p className="text-foreground mt-0.5 italic">“Os dados indicam / observa-se...” (significado clínico do desempenho em relação às sessões anteriores)</p>
                                    </div>

                                    <div className="p-3 bg-card rounded-md border border-border">
                                        <span className="font-bold text-indigo-700 dark:text-indigo-400">5. Conduta:</span>
                                        <p className="text-foreground mt-0.5 italic">“Manter / modificar / iniciar...” (decisão clínica para a continuidade do cuidado)</p>
                                    </div>
                                </div>

                                {/* Exemplo Real Preenchido */}
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                                    <p className="font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wide">
                                        Exemplo Clínico Preenchido (Modelo Rápido)
                                    </p>
                                    <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed font-sans">
                                        “Sessão direcionada ao seguimento de instruções de dois passos. Foram utilizadas instruções graduadas, apoio visual e reforçamento diferencial. O paciente respondeu independentemente em 8/10 oportunidades, necessitando de pista gestual nas demais. Os dados indicam aumento da independência, ainda com dificuldade quando há mudança de contexto. Manter o objetivo e iniciar generalização em diferentes ambientes.”
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* SEÇÃO 17: CHECKLIST INTERATIVO E AUDITORIA */}
                    {activeSection === '17' && (
                        <Card className="border border-border/80 shadow-xs">
                            <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                    17. Checklist de Qualidade Antes de Concluir
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Audite mentalmente sua evolução marcando os itens abaixo para certificar que o registro é tecnicamente sólido e auditável.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-xs">
                                <div className="space-y-2.5">
                                    {[
                                        'Está claro qual habilidade ou função foi trabalhada?',
                                        'Registrei o procedimento, e não apenas a atividade/material?',
                                        'Descrevi o desempenho de modo observável?',
                                        'Usei algum indicador objetivo quando ele era pertinente?',
                                        'Registrei o nível de ajuda quando isso influencia a interpretação?',
                                        'Minha interpretação é sustentada pelos dados registrados?',
                                        'A conduta para a próxima sessão é coerente com os resultados?',
                                        'Registrei intercorrências ou orientações relevantes?',
                                        'Evitei julgamentos, informações íntimas desnecessárias e hipóteses apresentadas como fatos?',
                                        'O texto corresponde exatamente ao atendimento realizado?',
                                        'Outro profissional conseguiria compreender a sessão sem precisar me perguntar o que aconteceu?',
                                    ].map((item, idx) => {
                                        const isChecked = !!checkedItems[idx]
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleCheck(idx)}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                    isChecked
                                                        ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                                                        : 'hover:bg-muted/40 border-border/70'
                                                }`}
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                )}
                                                <span
                                                    className={`font-medium ${
                                                        isChecked
                                                            ? 'text-emerald-900 dark:text-emerald-300'
                                                            : 'text-foreground'
                                                    }`}
                                                >
                                                    {item}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* SEÇÃO 6: ESCRITA OBSERVÁVEL (TABELA EVITE X PREFIRA) */}
                    {activeSection === '6' && (
                        <Card className="border border-border/80 shadow-xs">
                            <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                                <CardTitle className="text-base font-bold">
                                    6. Como Escrever de Forma Observável e Mensurável
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Substitua adjetivos isolados e expressões vagas por comportamentos observáveis.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-xs">
                                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                                    <div className="grid grid-cols-2 bg-muted/50 p-2.5 font-bold uppercase text-[10px] tracking-wider text-muted-foreground">
                                        <span className="text-rose-600">Evite Isoladamente</span>
                                        <span className="text-emerald-600">Prefira</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2">
                                        <span className="text-rose-700 font-medium">“Foi bem.”</span>
                                        <span className="text-emerald-800">“Realizou 8/10 oportunidades independentemente.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2 bg-muted/10">
                                        <span className="text-rose-700 font-medium">“Teve muita dificuldade.”</span>
                                        <span className="text-emerald-800">“Necessitou de dica verbal em 6/10 oportunidades.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2">
                                        <span className="text-rose-700 font-medium">“Estava desregulado.”</span>
                                        <span className="text-emerald-800">“Apresentou choro por aproximadamente 4 minutos e tentou sair da sala 3 vezes.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2 bg-muted/10">
                                        <span className="text-rose-700 font-medium">“Melhorou a atenção.”</span>
                                        <span className="text-emerald-800">“Permaneceu na atividade por 12 minutos, com 1 redirecionamento.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2">
                                        <span className="text-rose-700 font-medium">“Melhorou a fala.”</span>
                                        <span className="text-emerald-800">“Produziu o alvo corretamente em 16/20 tentativas.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2 bg-muted/10">
                                        <span className="text-rose-700 font-medium">“Não colaborou.”</span>
                                        <span className="text-emerald-800">“Recusou 3 das 5 demandas apresentadas.”</span>
                                    </div>
                                    <div className="grid grid-cols-2 p-3 gap-2">
                                        <span className="text-rose-700 font-medium">“Ficou agressivo.”</span>
                                        <span className="text-emerald-800">“Apresentou 2 episódios de bater com a mão aberta no terapeuta.”</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* SEÇÃO 14: EXEMPLOS POR ÁREA PROFISSIONAL */}
                    {activeSection === '14' && (
                        <Card className="border border-border/80 shadow-xs">
                            <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                                <CardTitle className="text-base font-bold">
                                    14. Exemplos por Área Profissional
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Modelos de referência redigidos de acordo com as especificidades de cada conselho.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-xs">
                                <div className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                                        Fisioterapia
                                    </Badge>
                                    <p className="text-foreground leading-relaxed italic">
                                        “Intervenção direcionada ao controle postural, transferência sentado-em-pé e equilíbrio dinâmico. Foram realizadas oito transferências a partir de banco baixo: cinco independentes e três com auxílio mínimo para estabilização. Durante percurso com mudança de direção, apresentou duas perdas de equilíbrio com recuperação mediante apoio manual. Observa-se melhora na transferência funcional, permanecendo instabilidade nas mudanças rápidas de direção. Manter treino e aumentar gradualmente a variabilidade das superfícies.”
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-bold">
                                        Fonoaudiologia
                                    </Badge>
                                    <p className="text-foreground leading-relaxed italic">
                                        “Atendimento direcionado ao aumento de pedidos funcionais e à expansão de enunciados de duas palavras. Foram utilizados ensino em ambiente naturalístico, modelação verbal e atraso de dica. O paciente realizou pedidos espontâneos em 7/10 oportunidades e produziu combinações de duas palavras em cinco ocasiões. Nas demais oportunidades, necessitou de modelo verbal parcial. Observa-se aumento de emissões espontâneas, ainda com dependência de pista para expansão. Manter o objetivo, reduzindo gradualmente as pistas e ampliando parceiros comunicativos.”
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold">
                                        Psicologia / ABA
                                    </Badge>
                                    <p className="text-foreground leading-relaxed italic">
                                        “Sessão direcionada à tolerância à espera e solicitação funcional de pausa. Foram programadas 10 oportunidades de espera de 30 segundos. O paciente completou sete sem comportamento interferente e utilizou solicitação funcional de pausa em quatro ocasiões. Em três oportunidades tentou abandonar a atividade e foi redirecionado conforme o plano. Observa-se aumento do uso da resposta comunicativa funcional. Manter o procedimento e ampliar gradualmente o intervalo de espera conforme estabilidade.”
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-lg border border-border bg-card space-y-1.5">
                                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-300 font-bold">
                                        Terapia Ocupacional
                                    </Badge>
                                    <p className="text-foreground leading-relaxed italic">
                                        “Sessão direcionada à independência no vestir e à participação na rotina de autocuidado. Durante treino de colocação de camiseta, realizou 3/5 etapas independentemente, necessitando assistência física parcial para orientação e passagem do membro superior pela manga. Com apoio visual, completou a sequência sem interrupção. Observa-se aumento de independência nas etapas iniciais. Manter análise de tarefa e reduzir progressivamente a assistência nas etapas já adquiridas.”
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* SEÇÃO 11: O QUE NÃO DEVE APARECER */}
                    {activeSection === '11' && (
                        <Card className="border border-rose-200 dark:border-rose-900/60 shadow-xs">
                            <CardHeader className="pb-3 bg-rose-50/50 dark:bg-rose-950/20 border-b border-border/50">
                                <CardTitle className="text-base font-bold text-rose-950 dark:text-rose-300">
                                    11. O Que NÃO Deve Aparecer no Prontuário
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-2.5 text-xs text-foreground">
                                {[
                                    'Julgamentos morais: "preguiçoso", "mal-educado", "manipulador", "mãe difícil", "família desorganizada".',
                                    'Diagnósticos ou conclusões fora do escopo profissional ou sem avaliação que os sustente.',
                                    'Hipóteses apresentadas como fatos incontestáveis.',
                                    'Informações íntimas, familiares ou sociais sem pertinência para o cuidado clínico.',
                                    'Comentários depreciativos sobre familiares, escola, colegas ou outros profissionais.',
                                    'Expressões vagas como única descrição: "foi bem", "foi mal", "participou", "evoluiu", "teve dificuldade".',
                                    'Cópia e cola de evoluções anteriores sem correspondência com o atendimento daquele dia.',
                                    'Procedimentos, orientações ou dados que não aconteceram.',
                                    'Informações de outros pacientes ou terceiros.',
                                    'Abreviações internas que possam tornar o registro incompreensível ou ambíguo.',
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60">
                                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                        <span className="font-medium text-rose-950 dark:text-rose-200">{item}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* SEÇÕES GERAIS / DEMAIS */}
                    {['0', '2', '4', '5', '7', '8', '13', '15', '18'].includes(activeSection) && (
                        <Card className="border border-border/80 shadow-xs">
                            <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                                <CardTitle className="text-base font-bold">
                                    {sections.find((s) => s.id === activeSection)?.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-xs leading-relaxed text-foreground">
                                {activeSection === '0' && (
                                    <div className="space-y-3">
                                        <p>Este manual foi elaborado para orientar os profissionais da World Sensory na produção de evoluções terapêuticas tecnicamente úteis, objetivas, éticas e compatíveis com a lógica do cuidado multiprofissional.</p>
                                        <p>A evolução terapêutica não é um resumo informal da sessão e não deve existir apenas para comprovar presença. Ela integra o prontuário, sustenta a continuidade do cuidado, documenta o raciocínio clínico, permite acompanhar resultados e registra decisões profissionais.</p>
                                    </div>
                                )}
                                {activeSection === '2' && (
                                    <div className="space-y-3">
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">EVOLUIR = registrar objetivo + procedimento + resposta + interpretação + conduta.</p>
                                        <p>Evolução terapêutica é o registro técnico e sistemático do atendimento realizado e das mudanças observadas no paciente ao longo do processo de cuidado. Deve documentar tanto o que foi feito quanto a resposta do paciente e a decisão clínica decorrente.</p>
                                    </div>
                                )}
                                {activeSection === '4' && (
                                    <div className="space-y-2">
                                        <p><strong>1. Identificação temporal:</strong> Data e horário do atendimento, além da identificação profissional exigida.</p>
                                        <p><strong>2. Condição inicial relevante:</strong> Registrar apenas condições que possam interferir na sessão (dor, sono, febre, etc.).</p>
                                        <p><strong>3. Objetivo(s):</strong> Qual habilidade ou função estava sendo trabalhada?</p>
                                        <p><strong>4. Procedimentos:</strong> O que o profissional fez para produzir aprendizagem ou mudança?</p>
                                        <p><strong>5. Resposta/dados:</strong> O que o paciente fez? Com que frequência, independência ou ajuda?</p>
                                        <p><strong>6. Interpretação:</strong> O que os dados significam em relação às sessões anteriores?</p>
                                        <p><strong>7. Conduta:</strong> O que será mantido, modificado ou reavaliado?</p>
                                    </div>
                                )}
                                {activeSection === '13' && (
                                    <div className="space-y-3">
                                        <p>Informações de saúde são dados pessoais sensíveis protegidos pela LGPD (Lei nº 13.709/2018). Nunca exponha fotos, nomes ou dados em grupos de WhatsApp ou ferramentas não autorizadas.</p>
                                        <p><strong>Uso de Inteligência Artificial:</strong> Ferramentas de IA auxiliam na organização da linguagem, mas nunca substituem o julgamento clínico nem a responsabilidade pessoal de quem assina o prontuário. Revise sempre integralmente qualquer texto gerado.</p>
                                    </div>
                                )}
                                {activeSection === '18' && (
                                    <div className="space-y-2">
                                        <p><strong>Resoluções e Legislação:</strong> LGPD (Lei nº 13.709/2018), Lei do Prontuário Eletrônico (Lei nº 13.787/2018), Resolução CFFa nº 777/2025, Resolução CFP nº 001/2009, Resoluções COFFITO nº 414/2012 e 415/2012.</p>
                                        <p><strong>Prazos de guarda:</strong> Eliminação somente após o prazo mínimo legal de 20 anos para prontuários eletrônicos.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
