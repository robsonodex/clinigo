'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ClinicTheme, getTierFeatures } from '@/types/clinic-theme'
import { Search, Globe, Lock } from 'lucide-react'

interface SEOSettingsProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
    clinicSlug?: string
}

export function SEOSettings({ theme, onChange, planType, clinicSlug }: SEOSettingsProps) {
    const tierFeatures = getTierFeatures(planType)

    const handleSEOChange = (key: keyof ClinicTheme['seo'], value: string | string[] | null) => {
        onChange({
            seo: {
                ...theme.seo,
                [key]: value,
            },
        })
    }

    const handleKeywordsChange = (value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(Boolean)
        handleSEOChange('keywords', keywords)
    }

    const previewUrl = theme.seo.custom_domain?.trim()
        ? theme.seo.custom_domain.trim()
        : `clinigo.app/${clinicSlug || 'sua-clinica'}`

    return (
        <div className="space-y-6">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Search className="w-5 h-5 text-primary" />
                        Meta Tags e Buscadores
                    </CardTitle>
                    <CardDescription>
                        Otimize como sua clínica aparece no Google e ao compartilhar o link no WhatsApp
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="meta-title">Título da Página (meta title)</Label>
                        <Input
                            id="meta-title"
                            value={theme.seo.meta_title || ''}
                            onChange={(e) => handleSEOChange('meta_title', e.target.value || null)}
                            placeholder="Clínica Exemplo Terapias | Agende sua Sessão"
                            maxLength={60}
                            className="min-h-[44px]"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Ideal: 50 a 60 caracteres</span>
                            <span className="tabular-nums">{(theme.seo.meta_title || '').length}/60</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="meta-description">Descrição (meta description)</Label>
                        <Textarea
                            id="meta-description"
                            value={theme.seo.meta_description || ''}
                            onChange={(e) => handleSEOChange('meta_description', e.target.value || null)}
                            placeholder="Clínica multidisciplinar com Psicologia, Fonoaudiologia, Terapia Ocupacional e ABA. Agende seu atendimento online."
                            maxLength={160}
                            rows={3}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Ideal: 120 a 160 caracteres</span>
                            <span className="tabular-nums">{(theme.seo.meta_description || '').length}/160</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="keywords">Palavras-chave</Label>
                        <Input
                            id="keywords"
                            value={theme.seo.keywords.join(', ')}
                            onChange={(e) => handleKeywordsChange(e.target.value)}
                            placeholder="psicologia, fonoaudiologia, terapia ocupacional, aba, autismo"
                            className="min-h-[44px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Separe as palavras-chave por vírgula
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="og-image">Imagem de Compartilhamento (Open Graph)</Label>
                        <Input
                            id="og-image"
                            value={theme.seo.og_image_url || ''}
                            onChange={(e) => handleSEOChange('og_image_url', e.target.value || null)}
                            placeholder="https://exemplo.com/capa-clinica.jpg"
                            className="min-h-[44px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Imagem exibida ao enviar o link no WhatsApp ou redes sociais (1200x630px recomendado)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Preview no Google */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Pré-visualização no Google</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-card border border-border rounded-lg max-w-xl">
                        <p className="text-[#1a0dab] text-lg font-medium truncate">
                            {theme.seo.meta_title || 'Nome da Clínica | Agende seu Atendimento'}
                        </p>
                        <p className="text-primary text-sm truncate mt-0.5">
                            https://{previewUrl}
                        </p>
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                            {theme.seo.meta_description || 'Agende atendimentos terapêuticos online. Equipe multidisciplinar especializada e acolhimento humanizado.'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Domínio Próprio */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Globe className="w-5 h-5 text-primary" />
                        Domínio Próprio
                        <Badge variant="outline">Enterprise</Badge>
                    </CardTitle>
                    <CardDescription>
                        Utilize o endereço próprio da sua clínica para a página pública
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tierFeatures.canUseCustomDomain ? (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="custom-domain">Domínio desejado</Label>
                                <Input
                                    id="custom-domain"
                                    value={theme.seo.custom_domain || ''}
                                    onChange={(e) => handleSEOChange('custom_domain', e.target.value.trim() || null)}
                                    placeholder="agendamento.suaclinica.com.br"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Salve o domínio desejado acima e acione nosso suporte para finalizar o apontamento DNS e o certificado SSL.
                            </p>
                        </div>
                    ) : (
                        <div className="p-5 bg-muted/40 border border-border rounded-lg text-center space-y-1.5">
                            <Lock className="w-7 h-7 mx-auto text-muted-foreground" />
                            <p className="font-medium text-sm text-foreground">Recurso do plano Enterprise</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Faça upgrade para o plano Enterprise para conectar seu próprio domínio personalizado.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
