'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ClinicTheme, getTierFeatures } from '@/types/clinic-theme'
import { Search, Globe, Lock } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface SEOSettingsProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
}

// =============================================================================
// Main Component
// =============================================================================

export function SEOSettings({ theme, onChange, planType }: SEOSettingsProps) {
    const tierFeatures = getTierFeatures(planType)

    const handleSEOChange = (key: keyof ClinicTheme['seo'], value: string | string[] | null) => {
        onChange({
            seo: {
                ...theme.seo,
                [key]: value,
            }
        })
    }

    const handleKeywordsChange = (value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(Boolean)
        handleSEOChange('keywords', keywords)
    }

    return (
        <div className="space-y-6">
            {/* Meta Tags */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Meta Tags
                    </CardTitle>
                    <CardDescription>
                        Otimize sua página para motores de busca
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Meta Title */}
                    <div className="space-y-2">
                        <Label htmlFor="meta-title">Título da Página (meta title)</Label>
                        <Input
                            id="meta-title"
                            value={theme.seo.meta_title || ''}
                            onChange={(e) => handleSEOChange('meta_title', e.target.value || null)}
                            placeholder="Clínica São Lucas | Agende sua Consulta Online"
                            maxLength={60}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Ideal: 50-60 caracteres</span>
                            <span>{(theme.seo.meta_title || '').length}/60</span>
                        </div>
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-2">
                        <Label htmlFor="meta-description">Descrição (meta description)</Label>
                        <Textarea
                            id="meta-description"
                            value={theme.seo.meta_description || ''}
                            onChange={(e) => handleSEOChange('meta_description', e.target.value || null)}
                            placeholder="Agende consultas médicas online na Clínica São Lucas. Médicos especializados, atendimento humanizado e teleconsulta disponível."
                            maxLength={160}
                            rows={3}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Ideal: 120-160 caracteres</span>
                            <span>{(theme.seo.meta_description || '').length}/160</span>
                        </div>
                    </div>

                    {/* Keywords */}
                    <div className="space-y-2">
                        <Label htmlFor="keywords">Palavras-chave</Label>
                        <Input
                            id="keywords"
                            value={theme.seo.keywords.join(', ')}
                            onChange={(e) => handleKeywordsChange(e.target.value)}
                            placeholder="clínica, médico, consulta, cardiologia, são paulo"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separe as palavras-chave por vírgula
                        </p>
                    </div>

                    {/* OG Image */}
                    <div className="space-y-2">
                        <Label htmlFor="og-image">Imagem de Compartilhamento (Open Graph)</Label>
                        <Input
                            id="og-image"
                            value={theme.seo.og_image_url || ''}
                            onChange={(e) => handleSEOChange('og_image_url', e.target.value || null)}
                            placeholder="https://exemplo.com/og-image.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                            Imagem exibida ao compartilhar nas redes sociais (1200x630px recomendado)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Preview nos Resultados do Google</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-white border rounded-lg max-w-xl">
                        <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                            {theme.seo.meta_title || 'Nome da Clínica | Agende sua Consulta'}
                        </p>
                        <p className="text-green-700 text-sm truncate">
                            clinigo.app/sua-clinica
                        </p>
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {theme.seo.meta_description || 'Agende sua consulta online. Médicos qualificados, atendimento humanizado.'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Custom Domain (Enterprise) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Domínio Próprio
                        <Badge variant="outline">Enterprise</Badge>
                    </CardTitle>
                    <CardDescription>
                        Use seu próprio domínio para a página pública
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tierFeatures.canUseCustomDomain ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-domain">Domínio</Label>
                                <Input
                                    id="custom-domain"
                                    placeholder="agendamento.suaclinica.com.br"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Entre em contato com nosso suporte para configurar o DNS e SSL.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <Lock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            <p className="font-medium text-gray-700">Recurso Enterprise</p>
                            <p className="text-sm text-gray-500">
                                Faça upgrade para o plano Enterprise para usar seu próprio domínio.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
