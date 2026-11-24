'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth, useRole } from '@/lib/hooks/use-auth';
import { usePlan } from '@/lib/hooks/use-plan';
import { useClinic } from '@/lib/hooks/use-clinic';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Brain,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    HelpCircle,
    Layers,
    LayoutDashboard,
    Lightbulb,
    Loader2,
    Lock,
    MessageSquare,
    Search,
    Shield,
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
    KNOWLEDGE_BASE_ARTICLES,
    searchKnowledgeArticles,
    type HelpModuleId,
    type HelpRole,
    type KnowledgeArticle,
} from '@/lib/help/knowledge-base';
import {
    canAccessHelpRoute,
    canFilterOtherRolesInHelp,
    getAccessibleHelpArticles,
    getAccessibleHelpModules,
    getPermittedHeaderShortcuts,
    getPermittedQuickSuggestions,
    resolveHelpHashToAnchor,
    type HelpAccessContext,
    type HelpHeaderShortcut,
} from '@/lib/help/help-access';
import { CliniGoAcademy } from '@/components/help/academy/CliniGoAcademy';

const MODULE_ICONS: Record<HelpModuleId, any> = {
    principal: LayoutDashboard,
    'tiss-glosas': Layers,
    agenda: Calendar,
    recepcao: Users,
    prontuario: Stethoscope,
    terapia: Brain,
    financeiro: Wallet,
    'crm-whatsapp': MessageSquare,
    gestao: BarChart3,
    configuracoes: ShieldCheck,
    plataforma: Shield,
};

const SHORTCUT_ICONS: Record<HelpHeaderShortcut['icon'], any> = {
    layers: Layers,
    spreadsheet: FileSpreadsheet,
    calendar: Calendar,
    users: Users,
    wallet: Wallet,
    stethoscope: Stethoscope,
};

const ROLE_LABELS: Record<HelpRole | 'ALL', string> = {
    ALL: 'Todos os Perfis',
    SUPER_ADMIN: 'Super Admin',
    CLINIC_ADMIN: 'Administradores',
    FINANCIAL: 'Financeiro / Faturamento',
    RECEPTIONIST: 'Recepção',
    DOCTOR: 'Corpo Clínico',
    NURSE: 'Enfermagem',
    STAFF: 'Equipe Operacional',
    READONLY: 'Somente Leitura',
};

const PROFILE_SUBTITLES: Record<string, string> = {
    SUPER_ADMIN: 'Guias operacionais passo a passo da plataforma, organizados por módulo e perfil de acesso.',
    CLINIC_ADMIN: 'Guias práticos clique a clique para treinamento da equipe nos módulos ativos da sua clínica.',
    FINANCIAL: 'Guias práticos passo a passo exclusivos do seu perfil financeiro: lançamentos, convênios, repasses e faturamento.',
    DOCTOR: 'Guias práticos passo a passo exclusivos do seu perfil clínico: Minha Agenda, Prontuários, Evoluções, Planos Terapêuticos e acompanhamento individual.',
    RECEPTIONIST: 'Guias práticos passo a passo exclusivos do seu perfil de recepção: Agenda, Horários, Recepção, Pré-cadastros e Pacientes.',
    STAFF: 'Guias práticos passo a passo exclusivos do seu perfil operacional: Agenda, Horários, Recepção e Pacientes.',
    NURSE: 'Guias práticos passo a passo exclusivos do seu perfil assistencial: Diretório e acompanhamento de pacientes.',
    READONLY: 'Manual operacional filtrado estritamente conforme as permissões do seu perfil de acesso.',
};

const PROFILE_SEARCH_PLACEHOLDERS: Record<string, string> = {
    DOCTOR: 'Como eu faço para... (ex: preencher evolução SOAP, criar plano terapêutico, usar teleconsulta, ver Minha Agenda)',
    RECEPTIONIST: 'Como eu faço para... (ex: fazer check-in, gerar QR Code de pré-cadastro, agendar recorrente, alternar particular ou convênio)',
    FINANCIAL: 'Como eu faço para... (ex: liberar conta Ctrl+L, registrar glosa parcial, gerar remessa XML, fechar folha de repasse)',
    STAFF: 'Como eu faço para... (ex: agendar paciente, configurar horários, chamar no Painel de TV)',
    NURSE: 'Como eu faço para... (ex: buscar paciente no diretório A-Z, exportar lista)',
};

export default function HelpKnowledgeCenterPage() {
    const { role, isCoordinator, isSuperAdmin, isImpersonating, clinicId, loading: roleLoading } = useRole();
    const currentRole = isSuperAdmin && !isImpersonating ? 'SUPER_ADMIN' : role;
    const { user, profile } = useAuth();
    const { planType, isLoading: planLoading, permissions } = usePlan();
    const { clinic } = useClinic();

    const [activeView, setActiveView] = useState<'academy' | 'manual'>('academy');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState<HelpModuleId | 'all'>('all');
    const [selectedRole, setSelectedRole] = useState<HelpRole | 'ALL'>('ALL');
    const [expandedArticleIds, setExpandedArticleIds] = useState<string[]>([]);
    const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null);
    const [hashAccessDenied, setHashAccessDenied] = useState(false);

    const isLoadingPermissions = roleLoading || planLoading;

    const effectiveClinicId = clinicId || clinic?.id;
    const effectiveClinicSlug = clinic?.slug;
    const effectiveClinicName = clinic?.name;
    const effectiveClinicTheme = ((clinic as any)?.theme as Record<string, unknown> | null) ?? null;
    const effectiveClinicIsDemo = (clinic as any)?.is_demo === true;

    const accessContext = useMemo<HelpAccessContext>(
        () => ({
            role: currentRole,
            isCoordinator,
            clinicId: effectiveClinicId,
            clinicSlug: effectiveClinicSlug,
            clinicName: effectiveClinicName,
            clinicTheme: effectiveClinicTheme,
            isDemo: effectiveClinicIsDemo,
            planType,
            permissions,
            userId: user?.id,
            userEmail: user?.email || profile?.email,
        }),
        [
            currentRole,
            isCoordinator,
            effectiveClinicId,
            effectiveClinicSlug,
            effectiveClinicName,
            effectiveClinicTheme,
            effectiveClinicIsDemo,
            planType,
            permissions,
            user?.id,
            user?.email,
            profile?.email,
        ]
    );

    const isAdminViewer = canFilterOtherRolesInHelp(currentRole);

    // 1. Filtra ESTRITAMENTE os artigos permitidos ao perfil + allowlist + plano + overrides
    const accessibleArticles = useMemo(() => {
        if (isLoadingPermissions || !currentRole) return [];
        return getAccessibleHelpArticles(accessContext);
    }, [isLoadingPermissions, currentRole, accessContext]);

    // 2. Filtra apenas módulos que contenham ao menos 1 artigo permitido
    const accessibleModules = useMemo(() => {
        return getAccessibleHelpModules(accessibleArticles);
    }, [accessibleArticles]);

    // 3. Filtra atalhos do cabeçalho estritamente autorizados
    const headerShortcuts = useMemo(() => {
        if (isLoadingPermissions || !currentRole) return [];
        return getPermittedHeaderShortcuts(accessContext);
    }, [isLoadingPermissions, currentRole, accessContext]);

    // 4. Filtra buscas rápidas apenas para guias permitidos
    const quickIntentSuggestions = useMemo(() => {
        return getPermittedQuickSuggestions(accessibleArticles);
    }, [accessibleArticles]);

    // 5. Opções do filtro de perfil (somente para CLINIC_ADMIN / SUPER_ADMIN, apenas perfis com artigos ativos)
    const availableRoleFilters = useMemo<Array<HelpRole | 'ALL'>>(() => {
        if (!isAdminViewer) return [];
        const rolesPresent = new Set<HelpRole>();
        accessibleArticles.forEach((article) => {
            article.roles.forEach((r) => rolesPresent.add(r));
        });
        const orderedRoles: HelpRole[] = [
            'CLINIC_ADMIN',
            'FINANCIAL',
            'RECEPTIONIST',
            'DOCTOR',
            'NURSE',
            'STAFF',
            ...(currentRole === 'SUPER_ADMIN' ? (['SUPER_ADMIN'] as HelpRole[]) : []),
        ];
        return ['ALL', ...orderedRoles.filter((r) => rolesPresent.has(r))];
    }, [isAdminViewer, accessibleArticles, currentRole]);

    // Garante que não-administradores nunca fiquem com selectedRole apontando para outro perfil
    useEffect(() => {
        if (!isAdminViewer && selectedRole !== 'ALL') {
            setSelectedRole('ALL');
        }
    }, [isAdminViewer, selectedRole]);

    // Garante que selectedModule selecionado continua acessível caso plano/perfil mude
    useEffect(() => {
        if (selectedModule !== 'all' && !accessibleModules.some((m) => m.id === selectedModule)) {
            setSelectedModule('all');
        }
    }, [selectedModule, accessibleModules]);

    // Chave estável + ref para impedir loops infinitos de useEffect quando referências de objetos mudam
    const accessibleArticlesRef = useRef(accessibleArticles);
    accessibleArticlesRef.current = accessibleArticles;
    const accessibleArticlesKey = useMemo(
        () => accessibleArticles.map((a) => a.id).join('|'),
        [accessibleArticles]
    );

    // Expande os primeiros 2 artigos permitidos por padrão caso não haja #hash ativo na URL
    useEffect(() => {
        const currentArticles = accessibleArticlesRef.current;
        if (!isLoadingPermissions && currentArticles.length > 0) {
            const hasHash = typeof window !== 'undefined' && Boolean(window.location.hash.replace(/^#/, '').trim());
            if (hasHash) return;
            setExpandedArticleIds((prev) => {
                const validPrev = prev.filter((id) => currentArticles.some((a) => a.id === id));
                const next = validPrev.length > 0
                    ? validPrev
                    : currentArticles.slice(0, 2).map((a) => a.id);
                if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
                    return prev;
                }
                return next;
            });
        }
    }, [isLoadingPermissions, accessibleArticlesKey]);

    // Sincronização por #hash na URL — abre e rola EXATAMENTE para o guia permitido; bloqueia guias de outros perfis
    useEffect(() => {
        if (typeof window === 'undefined' || isLoadingPermissions) return;
        const syncFromHash = () => {
            const currentArticles = accessibleArticlesRef.current;
            const rawHash = window.location.hash.replace(/^#/, '').trim();
            if (!rawHash) {
                setHashAccessDenied((prev) => (prev ? false : prev));
                return;
            }
            const resolvedAnchor = resolveHelpHashToAnchor(rawHash);
            const target = currentArticles.find(
                (a) => a.anchor === resolvedAnchor || a.id === resolvedAnchor
            );
            if (target) {
                setActiveView('manual');
                setHashAccessDenied(false);
                setSelectedModule('all');
                setSelectedRole('ALL');
                setSearchQuery('');
                // Foca exclusivamente no guia clicado no (?) para leitura imediata sem distrações
                setExpandedArticleIds((prev) =>
                    prev.length === 1 && prev[0] === target.id ? prev : [target.id]
                );
                setHighlightedAnchor(target.anchor);
                window.requestAnimationFrame(() => {
                    setTimeout(() => {
                        const el = document.getElementById(target.anchor);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 180);
                });
            } else {
                const existsInCatalog = KNOWLEDGE_BASE_ARTICLES.some(
                    (a) => a.anchor === resolvedAnchor || a.id === resolvedAnchor
                );
                if (existsInCatalog) {
                    setActiveView('manual');
                }
                setHighlightedAnchor(null);
                setHashAccessDenied(existsInCatalog);
            }
        };
        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, [isLoadingPermissions, accessibleArticlesKey]);

    const filteredArticles = useMemo(() => {
        return searchKnowledgeArticles({
            query: searchQuery,
            module: selectedModule,
            role: isAdminViewer ? selectedRole : 'ALL',
            articles: accessibleArticles,
        });
    }, [searchQuery, selectedModule, selectedRole, isAdminViewer, accessibleArticles]);

    const toggleArticle = (id: string) => {
        setExpandedArticleIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const expandAllFiltered = () => {
        setExpandedArticleIds(filteredArticles.map((a) => a.id));
    };

    const collapseAll = () => {
        setExpandedArticleIds([]);
    };

    const handleOpenManualAnchor = (anchor: string) => {
        setActiveView('manual');
        const resolvedAnchor = resolveHelpHashToAnchor(anchor);
        const target = accessibleArticles.find(
            (a) => a.anchor === resolvedAnchor || a.id === resolvedAnchor
        );
        if (target) {
            setHashAccessDenied(false);
            setSelectedModule('all');
            setSelectedRole('ALL');
            setSearchQuery('');
            setExpandedArticleIds([target.id]);
            setHighlightedAnchor(target.anchor);
            if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', `/dashboard/help#${target.anchor}`);
                window.requestAnimationFrame(() => {
                    setTimeout(() => {
                        const el = document.getElementById(target.anchor);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 180);
                });
            }
        } else {
            setSearchQuery('');
            setSelectedModule('all');
        }
    };

    // Fail-closed: exibe estado de carregamento até que perfil e plano estejam validados
    if (isLoadingPermissions) {
        return (
            <div className="max-w-[1440px] mx-auto px-2 sm:px-4 py-12">
                <Card className="border border-border shadow-none">
                    <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                            Carregando guias autorizados para o seu perfil...
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Validando permissões de acesso e módulos habilitados na clínica.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentRoleLabel =
        (currentRole && ROLE_LABELS[currentRole as keyof typeof ROLE_LABELS]) || 'Perfil Restrito';
    const headerSubtitle =
        (currentRole && PROFILE_SUBTITLES[currentRole]) ||
        'Guias práticos passo a passo filtrados conforme as permissões do seu perfil.';
    const searchPlaceholder =
        (currentRole && PROFILE_SEARCH_PLACEHOLDERS[currentRole]) ||
        'Como eu faço para... (pesquise por tela, rotina ou recurso disponível ao seu perfil)';

    return (
        <div className="space-y-6 max-w-[1440px] mx-auto px-1 sm:px-2 py-2">
            {/* Aviso discreto quando o usuário tenta abrir #hash de módulo fora do seu perfil/plano */}
            {hashAccessDenied && (
                <div className="rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <Lock className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <span>
                            O guia solicitado não está disponível para o seu perfil de acesso, plano atual ou módulos habilitados da clínica.
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setHashAccessDenied(false);
                            if (typeof window !== 'undefined') {
                                window.history.replaceState(null, '', '/dashboard/help');
                            }
                        }}
                        className="h-8 px-3 rounded-md text-xs font-medium shadow-none shrink-0"
                    >
                        Fechar
                    </Button>
                </div>
            )}

            {/* Cabeçalho Editorial */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <GraduationCap className="w-4 h-4 shrink-0" />
                            <span>CliniGo Academy & Central de Ajuda</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            {activeView === 'academy'
                                ? 'CliniGo Academy'
                                : 'Manual Operacional Passo a Passo'}
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                            {headerSubtitle}
                        </p>
                    </div>

                    {headerShortcuts.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {headerShortcuts.map((shortcut) => {
                                const ShortcutIcon = SHORTCUT_ICONS[shortcut.icon] || ArrowRight;
                                return (
                                    <Button
                                        key={shortcut.id}
                                        asChild
                                        variant="outline"
                                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                                    >
                                        <Link href={shortcut.href} prefetch={false}>
                                            <ShortcutIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                            <span>{shortcut.label}</span>
                                        </Link>
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Navegação Principal: CliniGo Academy (Visual) vs Manual Completo (Busca) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                    <Button
                        type="button"
                        variant={activeView === 'academy' ? 'default' : 'outline'}
                        onClick={() => setActiveView('academy')}
                        className={`min-h-[44px] sm:min-h-[40px] px-4 gap-2 text-xs sm:text-sm font-semibold rounded-md shadow-none ${
                            activeView === 'academy'
                                ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                : ''
                        }`}
                    >
                        <GraduationCap className="w-4 h-4 shrink-0" />
                        <span>CliniGo Academy (Treinamento Visual)</span>
                    </Button>
                    <Button
                        type="button"
                        variant={activeView === 'manual' ? 'default' : 'outline'}
                        onClick={() => setActiveView('manual')}
                        className={`min-h-[44px] sm:min-h-[40px] px-4 gap-2 text-xs sm:text-sm font-semibold rounded-md shadow-none ${
                            activeView === 'manual'
                                ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                : ''
                        }`}
                    >
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span>Manual Completo e Busca ({accessibleArticles.length})</span>
                    </Button>
                </div>

                {/* Busca por Intenção (exibida no modo Manual Completo) */}
                {activeView === 'manual' && accessibleArticles.length > 0 && (
                    <div className="space-y-3 pt-1">
                        <div className="relative">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="h-11 pl-10 pr-10 text-sm rounded-md"
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

                        {quickIntentSuggestions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Buscas rápidas:
                                </span>
                                {quickIntentSuggestions.map((item) => (
                                    <Button
                                        key={item.label}
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSearchQuery(item.query)}
                                        className="h-8 min-h-[36px] sm:min-h-[32px] px-3 rounded-md text-xs font-medium shadow-none hover:border-primary/40 hover:bg-accent/50"
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activeView === 'academy' ? (
                <CliniGoAcademy
                    accessContext={accessContext}
                    onOpenManualAnchor={handleOpenManualAnchor}
                />
            ) : accessibleArticles.length === 0 ? (
                <Card className="border border-border shadow-none">
                    <CardContent className="py-12 text-center space-y-3">
                        <Lock className="w-10 h-10 text-muted-foreground mx-auto opacity-60" />
                        <p className="text-sm font-semibold text-foreground">
                            Nenhum guia operacional adicional disponível para o perfil {currentRoleLabel}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Por segurança e conformidade LGPD, a Central de Ajuda exibe somente módulos e atalhos autorizados para o seu perfil de acesso.
                        </p>
                        <Button asChild variant="outline" className="h-9 px-4 rounded-md text-xs font-medium shadow-none">
                            <Link href="/dashboard" prefetch={false}>
                                Voltar para o Painel Inicial
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Filtro por Perfil (somente Admins) / Selo do Perfil Atual (operacionais) e Módulos */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {isAdminViewer ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                                        Perfil:
                                    </span>
                                    {availableRoleFilters.map((roleKey) => (
                                        <Button
                                            key={roleKey}
                                            type="button"
                                            variant={selectedRole === roleKey ? 'default' : 'outline'}
                                            onClick={() => setSelectedRole(roleKey)}
                                            className="h-9 px-3.5 rounded-md text-xs font-medium shadow-none"
                                        >
                                            {ROLE_LABELS[roleKey]}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/20 bg-accent/50 text-xs text-foreground">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="font-medium">
                                        Exibindo exclusivamente guias do seu perfil: <strong>{currentRoleLabel}</strong>
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={expandAllFiltered}
                                    className="h-9 px-3.5 rounded-md text-xs font-medium shadow-none"
                                >
                                    Expandir Todos ({filteredArticles.length})
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={collapseAll}
                                    className="h-9 px-3.5 rounded-md text-xs font-medium shadow-none"
                                >
                                    Recolher Todos
                                </Button>
                            </div>
                        </div>

                        {/* Cards de Módulos Padronizados — Apenas módulos com artigos permitidos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setSelectedModule('all')}
                                className={`min-h-[96px] flex flex-col justify-between text-left rounded-xl border p-4 transition-all ${
                                    selectedModule === 'all'
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                                }`}
                            >
                            <div className="flex items-center justify-between gap-2 w-full">
                                <span className="text-sm font-semibold">Todos os Seus Módulos</span>
                                <Badge
                                    variant="secondary"
                                    className={`text-xs font-semibold tabular-nums shrink-0 ${selectedModule === 'all'
                                        ? 'bg-primary-foreground/15 text-primary-foreground border-0'
                                        : ''
                                        }`}
                                >
                                    {accessibleArticles.length}
                                </Badge>
                            </div>
                            <p className={`text-xs mt-1.5 line-clamp-2 ${selectedModule === 'all' ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                                Visualizar todos os treinamentos operacionais liberados para o seu perfil.
                            </p>
                        </button>

                        {accessibleModules.map((mod) => {
                            const Icon = MODULE_ICONS[mod.id] || FileText;
                            const modArticles = accessibleArticles.filter((a) => a.module === mod.id);
                            const modCount = modArticles.length;
                            const active = selectedModule === mod.id;

                            const isReceptionOnlyTiss =
                                mod.id === 'tiss-glosas' &&
                                !isAdminViewer &&
                                currentRole === 'RECEPTIONIST';

                            const displayLabel = isReceptionOnlyTiss
                                ? 'Convênios na Recepção'
                                : mod.label;
                            const displayDesc = isReceptionOnlyTiss
                                ? 'Check-in de convênios, alternância Particular ou Convênio e conclusão no balcão.'
                                : mod.shortDescription;

                            return (
                                <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => setSelectedModule(mod.id)}
                                    className={`min-h-[96px] flex flex-col justify-between text-left rounded-xl border p-4 transition-all ${active
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : mod.featured && isAdminViewer
                                            ? 'border-primary/35 bg-accent/35 hover:bg-accent/60'
                                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary-foreground' : 'text-primary'}`} />
                                            <span className="line-clamp-1">{displayLabel}</span>
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs font-semibold tabular-nums shrink-0 ${active
                                                ? 'bg-primary-foreground/15 text-primary-foreground border-0'
                                                : ''
                                                }`}
                                        >
                                            {modCount}
                                        </Badge>
                                    </div>
                                    <p className={`text-xs mt-1.5 line-clamp-2 ${active ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                                        {displayDesc}
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
                                {searchQuery
                                    ? `Nenhum guia encontrado para "${searchQuery}".`
                                    : 'Nenhum guia disponível para o filtro selecionado.'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Tente outro termo de busca ou limpe os filtros para ver todos os guias do seu perfil.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 px-4 mt-2 rounded-md text-xs font-medium shadow-none"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedModule('all');
                                    setSelectedRole('ALL');
                                }}
                            >
                                Limpar Filtros e Mostrar Guias
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    filteredArticles.map((article: KnowledgeArticle) => {
                        const isExpanded = expandedArticleIds.includes(article.id);
                        const modMeta = accessibleModules.find((m) => m.id === article.module);
                        const isHighlighted = highlightedAnchor === article.anchor;
                        const canOpenTargetRoute = canAccessHelpRoute(article.route, accessContext, {
                            featureKey: article.featureKey,
                        });
                        const moduleLabel =
                            article.module === 'tiss-glosas' &&
                                !isAdminViewer &&
                                currentRole === 'RECEPTIONIST'
                                ? 'Convênios na Recepção'
                                : modMeta?.label || article.module;

                        return (
                            <Card
                                key={article.id}
                                id={article.anchor}
                                className={`border transition-all scroll-mt-24 ${isHighlighted
                                    ? 'border-primary ring-2 ring-primary/20'
                                    : 'border-border'
                                    }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="text-[11px] font-medium border-primary/25 bg-accent/40 text-accent-foreground">
                                                    {moduleLabel}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[11px]">
                                                    Plano {article.minPlan}
                                                </Badge>
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {article.estimatedMinutes} min
                                                </span>
                                                {isAdminViewer ? (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Perfis: {article.roles.map((r) => ROLE_LABELS[r]).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Perfil: {currentRoleLabel}
                                                    </span>
                                                )}
                                            </div>

                                            <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                                                {article.title}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">{article.subtitle}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {canOpenTargetRoute && (
                                                <Button asChild className="h-9 px-3.5 gap-2 rounded-md text-xs font-medium shadow-none">
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
                                                className="h-9 px-3.5 gap-1.5 rounded-md text-xs font-medium shadow-none"
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
                                    <CardContent className="space-y-5 pt-4 border-t border-border">
                                        {/* Objetivo / Quando Usar / Pré-requisitos */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                            <div className="rounded-lg border border-border bg-muted/35 p-4 space-y-1.5">
                                                <p className="text-xs uppercase tracking-wider font-semibold text-primary">Objetivo</p>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{article.objective}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/35 p-4 space-y-1.5">
                                                <p className="text-xs uppercase tracking-wider font-semibold text-primary">Quando Utilizar</p>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{article.whenToUse}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/35 p-4 space-y-1.5">
                                                <p className="text-xs uppercase tracking-wider font-semibold text-primary">Pré-requisitos</p>
                                                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                                                    {article.prerequisites.map((pre, idx) => (
                                                        <li key={idx}>{pre}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Passos Numerados Clique a Clique */}
                                        <div className="space-y-2.5">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Passo a Passo Operacional
                                            </h3>
                                            <div className="space-y-2.5">
                                                {article.steps.map((step) => (
                                                    <div
                                                        key={step.number}
                                                        className="rounded-lg border border-border p-4 bg-background/60 flex items-start gap-3"
                                                    >
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5 tabular-nums">
                                                            {step.number}
                                                        </span>
                                                        <div className="space-y-1.5 flex-1">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                Passo {step.number} — {step.title}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                                {step.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                {step.uiPathBadges.map((badgeText) => (
                                                                    <Badge
                                                                        key={badgeText}
                                                                        variant="outline"
                                                                        className="text-xs font-medium bg-muted text-foreground border-border"
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

                                        {/* Boas Práticas e FAQ Rápido */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-primary/25 bg-accent/45 p-4 space-y-2">
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                    <Lightbulb className="w-4 h-4 text-primary" />
                                                    <span>Boas Práticas</span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {article.tips.map((tip, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                            <span>{tip}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                    <HelpCircle className="w-4 h-4 text-primary" />
                                                    <span>Perguntas Frequentes (FAQ Rápido)</span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    {article.faqs.map((faq, i) => (
                                                        <div key={i} className="space-y-0.5">
                                                            <p className="text-sm font-semibold text-foreground">{faq.question}</p>
                                                            <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
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
        </>
    )
}
        </div>
    );
}
