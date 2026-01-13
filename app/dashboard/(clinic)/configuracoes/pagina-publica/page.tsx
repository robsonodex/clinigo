'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    RefreshCw
} from 'lucide-react'
import { ThemeEditor } from './components/ThemeEditor'
import { ContentEditor } from './components/ContentEditor'
import { DisplaySettings } from './components/DisplaySettings'
import { SEOSettings } from './components/SEOSettings'
import { PreviewModal } from './components/PreviewModal'
import { ClinicTheme, DEFAULT_THEME, mergeWithDefaultTheme } from '@/types/clinic-theme'

// =============================================================================
// API Functions
// =============================================================================

async function fetchClinicTheme(): Promise<{ theme: Partial<ClinicTheme>; slug: string; plan_type: string }> {
    const res = await fetch('/api/settings/theme', {
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Erro ao carregar tema')
    return res.json()
}

async function updateClinicTheme(theme: Partial<ClinicTheme>): Promise<void> {
    const res = await fetch('/api/settings/theme', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
    })
    if (!res.ok) throw new Error('Erro ao salvar tema')
}

// =============================================================================
// Main Component
// =============================================================================

export default function PublicPageConfigPage() {
    const queryClient = useQueryClient()
    const [showPreview, setShowPreview] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Local theme state for editing
    const [localTheme, setLocalTheme] = useState<ClinicTheme>(DEFAULT_THEME)

    // Fetch current theme
    const { data, isLoading, error } = useQuery({
        queryKey: ['clinic-theme'],
        queryFn: fetchClinicTheme,
    })

    // Update local state when data loads
    useEffect(() => {
        if (data?.theme) {
            setLocalTheme(mergeWithDefaultTheme(data.theme))
        }
    }, [data])

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: updateClinicTheme,
        onSuccess: () => {
            toast.success('Configurações salvas com sucesso!')
            setHasChanges(false)
            queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })
        },
        onError: () => {
            toast.error('Erro ao salvar configurações')
        }
    })

    // Handle theme changes
    const handleThemeChange = (partial: Partial<ClinicTheme>) => {
        setLocalTheme(prev => ({
            ...prev,
            ...partial,
            colors: { ...prev.colors, ...partial.colors },
            typography: { ...prev.typography, ...partial.typography },
            hero: { ...prev.hero, ...partial.hero },
            display: { ...prev.display, ...partial.display },
            seo: { ...prev.seo, ...partial.seo },
        }))
        setHasChanges(true)
    }

    // Handle save
    const handleSave = () => {
        saveMutation.mutate(localTheme)
    }

    // Reset to defaults
    const handleReset = () => {
        setLocalTheme(DEFAULT_THEME)
        setHasChanges(true)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-10 text-center">
                    <p className="text-red-500">Erro ao carregar configurações</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })}
                    >
                        Tentar novamente
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Página Pública</h1>
                    <p className="text-muted-foreground">
                        Personalize a experiência dos seus pacientes
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Page */}
                    {data?.slug ? (
                        <a
                            href={`/${data.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver Página
                            </Button>
                        </a>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Página
                        </Button>
                    )}

                    {/* Preview */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                    </Button>

                    {/* Reset */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={saveMutation.isPending}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Padrão
                    </Button>

                    {/* Save */}
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saveMutation.isPending}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar
                    </Button>
                </div>
            </div>

            {/* Unsaved Changes Warning */}
            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Você tem alterações não salvas
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="visual" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="visual" className="gap-2">
                        <Palette className="w-4 h-4 hidden sm:inline" />
                        Visual
                    </TabsTrigger>
                    <TabsTrigger value="content" className="gap-2">
                        <Type className="w-4 h-4 hidden sm:inline" />
                        Conteúdo
                    </TabsTrigger>
                    <TabsTrigger value="display" className="gap-2">
                        <Layout className="w-4 h-4 hidden sm:inline" />
                        Exibição
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="gap-2">
                        <Search className="w-4 h-4 hidden sm:inline" />
                        SEO
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="visual">
                    <ThemeEditor
                        theme={localTheme}
                        onChange={handleThemeChange}
                        planType={data?.plan_type || 'BASIC'}
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
                        planType={data?.plan_type || 'BASIC'}
                    />
                </TabsContent>

                <TabsContent value="seo">
                    <SEOSettings
                        theme={localTheme}
                        onChange={handleThemeChange}
                        planType={data?.plan_type || 'BASIC'}
                    />
                </TabsContent>
            </Tabs>

            {/* Preview Modal */}
            <PreviewModal
                open={showPreview}
                onClose={() => setShowPreview(false)}
                theme={localTheme}
                clinicSlug={data?.slug || ''}
            />
        </div>
    )
}
