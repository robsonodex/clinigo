'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/hooks/use-auth';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    FileSpreadsheet,
    FileText,
    HelpCircle,
    Layers,
    Lightbulb,
    MessageSquare,
    Search,
    ShieldCheck,
    Stethoscope,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    HELP_MODULES,
    KNOWLEDGE_BASE_ARTICLES,
    searchKnowledgeArticles,
    type HelpModuleId,
    type HelpRole,
    type KnowledgeArticle,
} from '@/lib/help/knowledge-base';

const MODULE_ICONS: Record<HelpModuleId, any> = {
    'tiss-glosas': Layers,
    agenda: Calendar,
    recepcao: Users,
    prontuario: Stethoscope,
    financeiro: Wallet,
    'crm-whatsapp': MessageSquare,
    configuracoes: ShieldCheck,
};

const ROLE_LABELS: Record<HelpRole | 'ALL', string> = {
    ALL: 'Todos os Perfis',
    CLINIC_ADMIN: 'Administradores',
    FINANCIAL: 'Financeiro / Faturamento',
    RECEPTIONIST: 'Recepção',
    DOCTOR: 'Corpo Clínico',
};

const LEGACY_ANCHOR_ALIASES: Record<string, string> = {
    'faturamento-tiss': 'tiss-elaboracao-contas',
    tiss: 'tiss-elaboracao-contas',
    'lotes-tiss': 'tiss-remessas-xml',
    lotes: 'tiss-remessas-xml',
    remessas: 'tiss-remessas-xml',
    convenios: 'tiss-configuracao-convenios',
    glosas: 'tiss-controle-glosas',
    'glosas-e-recursos': 'tiss-controle-glosas',
    prontuarios: 'prontuarios-relatorio-evolucao-excel',
    'prontuario-eletronico': 'prontuario-eletronico-evolucao',
    evolucoes: 'prontuario-eletronico-evolucao',
    'evolucao-por-sessao': 'prontuario-eletronico-evolucao',
    prescricoes: 'prescricoes-documentos-clinicos',
    recepcao: 'recepcao-checkin-painel-tv',
    'pre-cadastros': 'pre-cadastro-remoto-pacientes',
    pacientes: 'pre-cadastro-remoto-pacientes',
    financeiro: 'financeiro-repasses-medicos',
    'meu-financeiro': 'financeiro-repasses-medicos',
    agenda: 'agenda-agendamento-atendimento',
    'minha-agenda': 'agenda-agendamento-atendimento',
    horarios: 'fila-espera-horarios',
    'mural-de-recados': 'crm-whatsapp-automacoes',
    whatsapp: 'crm-whatsapp-automacoes',
    crm: 'crm-whatsapp-automacoes',
    configuracoes: 'configuracoes-rbac-lgpd',
    contratos: 'configuracoes-rbac-lgpd',
    medicos: 'configuracoes-rbac-lgpd',
    terapeutas: 'configuracoes-rbac-lgpd',
};

export default function HelpKnowledgeCenterPage() {
    const { role: currentRole } = useRole();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState<HelpModuleId | 'all'>('all');
    const [selectedRole, setSelectedRole] = useState<HelpRole | 'ALL'>('ALL');
    const [expandedArticleIds, setExpandedArticleIds] = useState<string[]>([
        'tiss-elaboracao-contas',
        'tiss-controle-glosas',
        'prontuarios-relatorio-evolucao-excel',
    ]);
    const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const syncFromHash = () => {
            const rawHash = window.location.hash.replace(/^#/, '').trim();
            if (!rawHash) return;
            const resolvedAnchor = LEGACY_ANCHOR_ALIASES[rawHash] || rawHash;
            const target = KNOWLEDGE_BASE_ARTICLES.find((a) => a.anchor === resolvedAnchor || a.id === resolvedAnchor);
            if (target) {
                setSelectedModule('all');
                setSelectedRole('ALL');
                setSearchQuery('');
                setExpandedArticleIds((prev) => Array.from(new Set([...prev, target.id])));
                setHighlightedAnchor(target.anchor);
                setTimeout(() => {
                    const el = document.getElementById(target.anchor);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
            }
        };
        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const filteredArticles = useMemo(() => {
        return searchKnowledgeArticles({
            query: searchQuery,
            module: selectedModule,
            role: selectedRole,
        });
    }, [searchQuery, selectedModule, selectedRole]);

    const toggleArticle = (id: string) => {
        setExpandedArticleIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const quickIntentSuggestions = [
        { label: 'Relatório de Evolução em Excel', query: 'excel evolucao' },
        { label: 'Elaboração de Contas (Ctrl+L)', query: 'ctrl+l elaboracao' },
        { label: 'Controle de Glosas 3 Níveis', query: '3 niveis glosa' },
        { label: 'Alternar Particular / Convênio', query: 'particular convenio' },
        { label: 'Dossiê Probatório e Recurso', query: 'dossie recurso' },
    ];

    const expandAllFiltered = () => {
        setExpandedArticleIds(filteredArticles.map((a) => a.id));
    };

    const collapseAll = () => {
        setExpandedArticleIds([]);
    };

    return (
        <div className="space-y-6 max-w-[1440px] mx-auto px-2 sm:px-4 py-4">
            {/* Cabeçalho Corporativo */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                            <BookOpen className="w-4 h-4" />
                            <span>Base de Conhecimento e Central de Treinamento CliniGo</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                            Manual Operacional Passo a Passo
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-3xl">
                            Guias práticos clique a clique para treinamento integral da equipe em Faturamento TISS, Controle de Glosas, Recepção, Prontuário Eletrônico, Relatórios Excel, Repasses e Governança LGPD.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button asChild variant="outline" className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium">
                            <Link href="/dashboard/tiss">
                                <Layers className="w-4 h-4" />
                                <span>Ir para Faturamento TISS</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-10 min-h-[40px] px-4 gap-2 text-xs font-medium">
                            <Link href="/dashboard/prontuarios">
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Ir para Prontuários (Excel)</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Busca por Intenção */}
                <div className="space-y-3 pt-1">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Como eu faço para... (ex: tirar relatório de evolução em Excel, liberar conta Ctrl+L, registrar glosa parcial, alternar particular ou convênio)"
                            className="h-11 pl-10 pr-10 text-sm"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Limpar busca"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Buscas rápidas:</span>
                        {quickIntentSuggestions.map((item) => (
                            <Button
                                key={item.label}
                                type="button"
                                variant="outline"
                                onClick={() => setSearchQuery(item.query)}
                                className="h-8 px-3.5 rounded-full text-xs font-medium"
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filtro por Perfil e Módulos */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                            Perfil:
                        </span>
                        {(Object.keys(ROLE_LABELS) as Array<HelpRole | 'ALL'>).map((roleKey) => (
                            <Button
                                key={roleKey}
                                type="button"
                                variant={selectedRole === roleKey ? 'default' : 'outline'}
                                onClick={() => setSelectedRole(roleKey)}
                                className="h-9 px-3.5 text-xs font-medium"
                            >
                                {ROLE_LABELS[roleKey]}
                            </Button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={expandAllFiltered}
                            className="h-9 px-3.5 text-xs font-medium"
                        >
                            Expandir Todos ({filteredArticles.length})
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={collapseAll}
                            className="h-9 px-3.5 text-xs font-medium"
                        >
                            Recolher Todos
                        </Button>
                    </div>
                </div>

                {/* Cards de Módulos Padronizados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                        type="button"
                        onClick={() => setSelectedModule('all')}
                        className={`min-h-[92px] flex flex-col justify-between text-left rounded-lg border p-4 transition-colors ${
                            selectedModule === 'all'
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-border bg-card hover:bg-muted/40'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-semibold">Todos os Módulos</span>
                            <Badge variant="secondary" className="text-[11px] font-mono shrink-0">
                                {KNOWLEDGE_BASE_ARTICLES.length}
                            </Badge>
                        </div>
                        <p className={`text-[11px] mt-1.5 line-clamp-2 ${selectedModule === 'all' ? 'text-slate-200' : 'text-muted-foreground'}`}>
                            Visualizar catálogo completo de treinamentos operacionais do sistema.
                        </p>
                    </button>

                    {HELP_MODULES.map((mod) => {
                        const Icon = MODULE_ICONS[mod.id] || FileText;
                        const modCount = KNOWLEDGE_BASE_ARTICLES.filter((a) => a.module === mod.id).length;
                        const active = selectedModule === mod.id;
                        return (
                            <button
                                key={mod.id}
                                type="button"
                                onClick={() => setSelectedModule(mod.id)}
                                className={`min-h-[92px] flex flex-col justify-between text-left rounded-lg border p-4 transition-colors ${
                                    active
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : mod.featured
                                        ? 'border-slate-400 bg-slate-50/80 hover:bg-slate-100/80'
                                        : 'border-border bg-card hover:bg-muted/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="line-clamp-1">{mod.label}</span>
                                    </span>
                                    <Badge variant="secondary" className="text-[11px] font-mono shrink-0">
                                        {modCount}
                                    </Badge>
                                </div>
                                <p className={`text-[11px] mt-1.5 line-clamp-2 ${active ? 'text-slate-200' : 'text-muted-foreground'}`}>
                                    {mod.shortDescription}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lista de Guias Passo a Passo */}
            <div className="space-y-4">
                {filteredArticles.length === 0 ? (
                    <Card className="border border-border shadow-none">
                        <CardContent className="py-12 text-center space-y-2">
                            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                            <p className="text-sm font-medium text-foreground">
                                Nenhum guia encontrado para &ldquo;{searchQuery}&rdquo;.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Tente termos como Excel, Glosa, Remessa, Carteirinha, Repasse ou limpe os filtros.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 px-4 mt-2 text-xs font-medium"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedModule('all');
                                    setSelectedRole('ALL');
                                }}
                            >
                                Mostrar Todos os Guias
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    filteredArticles.map((article: KnowledgeArticle) => {
                        const isExpanded = expandedArticleIds.includes(article.id);
                        const modMeta = HELP_MODULES.find((m) => m.id === article.module);
                        const isHighlighted = highlightedAnchor === article.anchor;

                        return (
                            <Card
                                key={article.id}
                                id={article.anchor}
                                className={`border transition-all shadow-none scroll-mt-20 ${
                                    isHighlighted
                                        ? 'border-slate-900 ring-1 ring-slate-900/20'
                                        : 'border-border'
                                }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="text-[11px] font-medium">
                                                    {modMeta?.label || article.module}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[11px]">
                                                    Plano {article.minPlan}
                                                </Badge>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {article.estimatedMinutes} min
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Perfis: {article.roles.map((r) => ROLE_LABELS[r]).join(', ')}
                                                </span>
                                            </div>

                                            <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                                                {article.title}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">{article.subtitle}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {(!currentRole || currentRole === 'SUPER_ADMIN' || currentRole === 'CLINIC_ADMIN' || article.roles.includes(currentRole as any)) && (
                                                <Button asChild className="h-9 px-3.5 gap-2 text-xs font-medium">
                                                    <Link href={article.route} prefetch={false}>
                                                        <span>Ir para esta tela agora</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => toggleArticle(article.id)}
                                                className="h-9 px-3.5 gap-1.5 text-xs font-medium"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        <span>Recolher Passo a Passo</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        <span>Ver Passo a Passo ({article.steps.length})</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="space-y-5 pt-3 border-t border-border">
                                        {/* Objetivo / Quando Usar / Pré-requisitos */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                            <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-1">
                                                <p className="text-xs font-semibold text-foreground">Objetivo</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{article.objective}</p>
                                            </div>
                                            <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-1">
                                                <p className="text-xs font-semibold text-foreground">Quando Utilizar</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{article.whenToUse}</p>
                                            </div>
                                            <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-1">
                                                <p className="text-xs font-semibold text-foreground">Pré-requisitos</p>
                                                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                                                    {article.prerequisites.map((pre, idx) => (
                                                        <li key={idx}>{pre}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Passos Numerados Clique a Clique */}
                                        <div className="space-y-2.5">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                Passo a Passo Operacional
                                            </h3>
                                            <div className="space-y-2.5">
                                                {article.steps.map((step) => (
                                                    <div
                                                        key={step.number}
                                                        className="rounded-md border border-border p-3.5 bg-card flex items-start gap-3"
                                                    >
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-semibold shrink-0 mt-0.5">
                                                            {step.number}
                                                        </span>
                                                        <div className="space-y-1.5 flex-1">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                Passo {step.number} — {step.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {step.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                {step.uiPathBadges.map((badgeText) => (
                                                                    <Badge
                                                                        key={badgeText}
                                                                        variant="outline"
                                                                        className="text-[11px] font-mono bg-slate-50 text-slate-800 border-slate-300"
                                                                    >
                                                                        {badgeText}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dicas de Ouro e FAQ Rápido */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                                                    <Lightbulb className="w-4 h-4 text-emerald-700" />
                                                    <span>Dicas de Ouro (Boas Práticas)</span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {article.tips.map((tip, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-xs text-emerald-900/90 leading-relaxed">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                    <HelpCircle className="w-4 h-4 text-slate-600" />
                                                    <span>Perguntas Frequentes (FAQ Rápido)</span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    {article.faqs.map((faq, i) => (
                                                        <div key={i} className="space-y-0.5">
                                                            <p className="text-xs font-semibold text-foreground">{faq.question}</p>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
