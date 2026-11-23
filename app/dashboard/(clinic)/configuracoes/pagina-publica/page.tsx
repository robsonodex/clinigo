'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
    Palette,
    Type,
    Layout,
    Search,
    Save,
    Eye,
    Loader2,
    ExternalLink,
    RefreshCw,
    LayoutGrid,
    Globe,
    Copy,
    Check,
} from 'lucide-react'
import { ThemeEditor } from './components/ThemeEditor'
import { ContentEditor } from './components/ContentEditor'
import { DisplaySettings } from './components/DisplaySettings'
import { SEOSettings } from './components/SEOSettings'
import { PreviewModal } from './components/PreviewModal'
import { TemplateSelector } from './components/TemplateSelector'
import { ClinicTheme, DEFAULT_THEME, mergeWithDefaultTheme, PageTemplate } from '@/types/clinic-theme'

interface ClinicThemePayload {
    theme: Partial<ClinicTheme>
    slug: string
    plan_type: string
    logo_url?: string | null
}

async function fetchClinicTheme(): Promise<ClinicThemePayload> {
    const res = await fetch('/api/settings/theme', {
        credentials: 'include',
    })
    if (!res.ok) throw new Error('Erro ao carregar configurações da página pública')
    const json = await res.json()
    // successResponse() encapsula em { success: true, data: { theme, slug, plan_type, logo_url } }
    const payload = json?.data ?? json
    return {
        theme: payload?.theme || {},
        slug: payload?.slug || '',
        plan_type: payload?.plan_type || 'BASICO',
        logo_url: payload?.logo_url || payload?.theme?.logo_url || null,
    }
}

async function updateClinicTheme(theme: Partial<ClinicTheme>): Promise<void> {
    const res = await fetch('/api/settings/theme', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || err?.error || 'Erro ao salvar tema')
    }
}

export default function PublicPageConfigPage() {
    const queryClient = useQueryClient()
    const [showPreview, setShowPreview] = useState(false)
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState(false)

    const [localTheme, setLocalTheme] = useState<ClinicTheme>(DEFAULT_THEME)

    const { data, isLoading, error } = useQuery({
        queryKey: ['clinic-theme'],
        queryFn: fetchClinicTheme,
    })

    useEffect(() => {
        if (data?.theme) {
            const merged = mergeWithDefaultTheme({
                ...data.theme,
                logo_url: data.logo_url ?? data.theme.logo_url ?? null,
            })
            setLocalTheme(merged)
            setHasChanges(false)
        }
    }, [data])

    const saveMutation = useMutation({
        mutationFn: updateClinicTheme,
        onSuccess: async () => {
            setHasChanges(false)
            queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })

            try {
                const refreshed = await fetchClinicTheme()
                const slug = refreshed.slug?.trim()
                if (slug) {
                    const publicUrl = `https://clinigo.app/${slug}`
                    toast.success('Página pública salva e publicada com sucesso.', {
                        description: publicUrl,
                    })
                } else {
                    toast.warning('Configurações salvas, mas o slug da clínica ainda não está configurado.', {
                        description: 'Configure o endereço em Configurações → Minha Clínica.',
                    })
                }
            } catch {
                toast.success('Configurações da página pública salvas com sucesso.')
            }
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Erro ao salvar configurações da página pública.')
        },
    })

    const handleThemeChange = (partial: Partial<ClinicTheme>) => {
        setLocalTheme(prev => ({
            ...prev,
            ...partial,
            colors: { ...prev.colors, ...partial.colors },
            typography: { ...prev.typography, ...partial.typography },
            hero: { ...prev.hero, ...partial.hero },
            content: { ...prev.content, ...partial.content },
            display: { ...prev.display, ...partial.display },
            seo: { ...prev.seo, ...partial.seo },
        }))
        setHasChanges(true)
    }

    const handleSave = () => {
        saveMutation.mutate(localTheme)
    }

    const handleConfirmReset = () => {
        setLocalTheme({
            ...DEFAULT_THEME,
            logo_url: localTheme.logo_url ?? null,
        })
        setHasChanges(true)
        setResetDialogOpen(false)
        toast.info('Padrão visual restaurado. Clique em "Salvar e Publicar" para confirmar.')
    }

    const handleCopyPublicLink = async () => {
        if (!data?.slug) return
        const url = `https://clinigo.app/${data.slug.trim()}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedUrl(true)
            toast.success('Link da página pública copiado.')
            setTimeout(() => setCopiedUrl(false), 2500)
        } catch {
            toast.error('Não foi possível copiar o link automaticamente.')
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando personalização da página pública...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto py-8 px-4">
                <Card className="border-border shadow-sm">
                    <CardContent className="py-10 text-center space-y-4">
                        <p className="text-destructive font-medium">Erro ao carregar configurações da página pública.</p>
                        <Button
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const clinicSlug = data?.slug?.trim() || ''

    return (
        <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 space-y-6">
            {/* Cabeçalho editorial padrão CliniGo */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Página Pública</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {clinicSlug
                                ? `Personalize o portal de agendamento online em clinigo.app/${clinicSlug}`
                                : 'Personalize a página institucional e o agendamento online da sua clínica'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {clinicSlug ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyPublicLink}
                                className="min-h-[44px] px-3"
                            >
                                {copiedUrl ? (
                                    <Check className="w-4 h-4 mr-1.5 text-primary" />
                                ) : (
                                    <Copy className="w-4 h-4 mr-1.5" />
                                )}
                                {copiedUrl ? 'Copiado' : 'Copiar Link'}
                            </Button>
                            <Button asChild variant="outline" size="sm" className="min-h-[44px] px-3">
                                <a href={`/${clinicSlug}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-1.5" />
                                    Ver Página
                                </a>
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" disabled className="min-h-[44px] px-3">
                            <ExternalLink className="w-4 h-4 mr-1.5" />
                            Ver Página
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="min-h-[44px] px-3"
                    >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Visualizar
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetDialogOpen(true)}
                        disabled={saveMutation.isPending}
                        className="min-h-[44px] px-3 text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        Padrão
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!hasChanges || saveMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-4 font-medium"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar e Publicar
                    </Button>
                </div>
            </div>

            {/* Aviso de alterações não salvas */}
            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-600 rounded-full shrink-0" />
                        <span>Você possui alterações pendentes. Clique em <strong>Salvar e Publicar</strong> para aplicar na página pública.</span>
                    </div>
                </div>
            )}

            {/* Abas */}
            <Tabs defaultValue="template" className="space-y-6">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-flex w-max min-w-full sm:w-auto">
                        <TabsTrigger value="template" className="gap-2 min-h-[40px] px-4">
                            <LayoutGrid className="w-4 h-4" />
                            Template
                        </TabsTrigger>
                        <TabsTrigger value="visual" className="gap-2 min-h-[40px] px-4">
                            <Palette className="w-4 h-4" />
                            Visual
                        </TabsTrigger>
                        <TabsTrigger value="content" className="gap-2 min-h-[40px] px-4">
                            <Type className="w-4 h-4" />
                            Conteúdo
                        </TabsTrigger>
                        <TabsTrigger value="display" className="gap-2 min-h-[40px] px-4">
                            <Layout className="w-4 h-4" />
                            Exibição
                        </TabsTrigger>
                        <TabsTrigger value="seo" className="gap-2 min-h-[40px] px-4">
                            <Search className="w-4 h-4" />
                            SEO
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="template">
                    <TemplateSelector
                        selectedTemplate={localTheme.template}
                        onSelect={(template: PageTemplate) => handleThemeChange({ template })}
                    />
                </TabsContent>

                <TabsContent value="visual">
                    <ThemeEditor
                        theme={localTheme}
                        onChange={handleThemeChange}
                        planType={data?.plan_type || 'BASICO'}
                        initialLogoUrl={data?.logo_url ?? localTheme.logo_url ?? null}
                    />
                </TabsContent>

                <TabsContent value="content">
                    <ContentEditor
                        theme={localTheme}
                        onChange={handleThemeChange}
                    />
                </TabsContent>

                <TabsContent value="display">
                    <DisplaySettings
                        theme={localTheme}
                        onChange={handleThemeChange}
                        planType={data?.plan_type || 'BASICO'}
                    />
                </TabsContent>

                <TabsContent value="seo">
                    <SEOSettings
                        theme={localTheme}
                        onChange={handleThemeChange}
                        planType={data?.plan_type || 'BASICO'}
                        clinicSlug={clinicSlug}
                    />
                </TabsContent>
            </Tabs>

            {/* Preview Modal */}
            <PreviewModal
                open={showPreview}
                onClose={() => setShowPreview(false)}
                theme={localTheme}
                clinicSlug={clinicSlug}
            />

            {/* Confirmação de Restauração do Padrão */}
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="max-w-md w-[95vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar configurações padrão?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Todas as personalizações de cores, textos e seções voltarão ao padrão editorial do CliniGo. Você ainda precisará clicar em <strong>Salvar e Publicar</strong> para aplicar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmReset}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px]"
                        >
                            Restaurar Padrão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
