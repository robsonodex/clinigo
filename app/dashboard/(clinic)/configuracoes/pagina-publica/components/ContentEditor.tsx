'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ClinicTheme } from '@/types/clinic-theme'
import { Video, Image as ImageIcon, X, Type, LayoutGrid, BarChart3, Rows3 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ContentEditorProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
}

export function ContentEditor({ theme, onChange }: ContentEditorProps) {
    const [videoPreview, setVideoPreview] = useState<string | null>(theme.hero.video_url || null)
    const [imagePreview, setImagePreview] = useState<string | null>(theme.hero.background_image_url || null)

    useEffect(() => {
        setVideoPreview(theme.hero.video_url || null)
        setImagePreview(theme.hero.background_image_url || null)
    }, [theme.hero.video_url, theme.hero.background_image_url])

    const handleHeroChange = (key: keyof ClinicTheme['hero'], value: string | null) => {
        onChange({
            hero: {
                ...theme.hero,
                [key]: value,
            },
        })
    }

    const handleContentChange = (key: keyof ClinicTheme['content'], value: string | null) => {
        onChange({
            content: {
                ...theme.content,
                [key]: value,
            },
        })
    }

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Type className="w-5 h-5 text-primary" />
                            Textos do Topo (Hero)
                        </CardTitle>
                        <CardDescription>
                            Título e subtítulo exibidos no topo da página pública
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="hero-tag">Tag de Destaque</Label>
                            <Input
                                id="hero-tag"
                                value={theme.content.hero_tag || ''}
                                onChange={(e) => handleContentChange('hero_tag', e.target.value || null)}
                                placeholder="Clínica Multidisciplinar"
                                className="min-h-[44px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Pequena etiqueta acima do título principal
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="hero-title">Título Principal</Label>
                            <Input
                                id="hero-title"
                                value={theme.hero.title || ''}
                                onChange={(e) => handleHeroChange('title', e.target.value || null)}
                                placeholder="Cuidado terapêutico integrado para cada fase."
                                className="min-h-[44px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Deixe em branco para usar o nome da clínica
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="hero-subtitle">Subtítulo / Apresentação</Label>
                            <Textarea
                                id="hero-subtitle"
                                value={theme.hero.subtitle || ''}
                                onChange={(e) => handleHeroChange('subtitle', e.target.value || null)}
                                placeholder="Psicologia, Fonoaudiologia, Terapia Ocupacional e acompanhamento especializado com agendamento simples."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="cta-text">Texto do Botão Principal</Label>
                            <Input
                                id="cta-text"
                                value={theme.hero.cta_text}
                                onChange={(e) => handleHeroChange('cta_text', e.target.value)}
                                placeholder="Agendar Sessão"
                                className="min-h-[44px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hero Media Card */}
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Mídia do Topo</CardTitle>
                        <CardDescription>
                            Vídeo ou imagem de fundo (opcional)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-primary" />
                                URL do Vídeo
                            </Label>
                            <Input
                                value={theme.hero.video_url || ''}
                                onChange={(e) => {
                                    handleHeroChange('video_url', e.target.value || null)
                                    setVideoPreview(e.target.value || null)
                                }}
                                placeholder="https://exemplo.com/video.mp4"
                                className="min-h-[44px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                MP4 leve recomendado, máximo 15 segundos
                            </p>

                            {videoPreview && (
                                <div className="relative mt-2 rounded-lg overflow-hidden bg-black">
                                    <video
                                        src={videoPreview}
                                        className="w-full h-32 object-cover"
                                        muted
                                        loop
                                        autoPlay
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2 min-h-[36px] min-w-[36px]"
                                        onClick={() => {
                                            handleHeroChange('video_url', null)
                                            setVideoPreview(null)
                                        }}
                                        aria-label="Remover vídeo"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">ou</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-primary" />
                                Imagem de Fundo
                            </Label>
                            <Input
                                value={theme.hero.background_image_url || ''}
                                onChange={(e) => {
                                    handleHeroChange('background_image_url', e.target.value || null)
                                    setImagePreview(e.target.value || null)
                                }}
                                placeholder="https://exemplo.com/imagem.jpg"
                                className="min-h-[44px]"
                            />

                            {imagePreview && !videoPreview && (
                                <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                                    <img
                                        src={imagePreview}
                                        alt="Pré-visualização da imagem de fundo"
                                        className="w-full h-32 object-cover"
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2 min-h-[36px] min-w-[36px]"
                                        onClick={() => {
                                            handleHeroChange('background_image_url', null)
                                            setImagePreview(null)
                                        }}
                                        aria-label="Remover imagem"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-3.5 bg-accent/50 border border-primary/15 rounded-lg text-xs sm:text-sm text-foreground">
                            <p className="font-semibold text-primary">Dica</p>
                            <p className="text-muted-foreground mt-0.5">
                                Se nenhuma mídia for configurada, aplicaremos automaticamente o fundo editorial com as suas cores personalizadas.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Cards de Funcionalidades */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        Cards de Diferenciais
                    </CardTitle>
                    <CardDescription>
                        Os 4 cards de destaque exibidos na página inicial
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            {
                                idx: '01',
                                titleKey: 'feature1_title' as const,
                                descKey: 'feature1_description' as const,
                                titlePlaceholder: 'Atendimento Presencial',
                                descPlaceholder: 'Salas estruturadas para terapias individuais e em grupo',
                            },
                            {
                                idx: '02',
                                titleKey: 'feature2_title' as const,
                                descKey: 'feature2_description' as const,
                                titlePlaceholder: 'Equipe Multidisciplinar',
                                descPlaceholder: 'Psicologia, Fonoaudiologia, TO e Psicomotricidade integradas',
                            },
                            {
                                idx: '03',
                                titleKey: 'feature3_title' as const,
                                descKey: 'feature3_description' as const,
                                titlePlaceholder: 'Plano Terapêutico Individual',
                                descPlaceholder: 'Acompanhamento contínuo de metas e evolução clínica',
                            },
                            {
                                idx: '04',
                                titleKey: 'feature4_title' as const,
                                descKey: 'feature4_description' as const,
                                titlePlaceholder: 'Lembretes Automáticos',
                                descPlaceholder: 'Confirmação de sessões via WhatsApp para maior assiduidade',
                            },
                        ].map((item) => (
                            <div key={item.idx} className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                        {item.idx}
                                    </span>
                                    Card {Number(item.idx)}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Título</Label>
                                    <Input
                                        value={theme.content[item.titleKey] || ''}
                                        onChange={(e) => handleContentChange(item.titleKey, e.target.value || null)}
                                        placeholder={item.titlePlaceholder}
                                        className="min-h-[44px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Descrição</Label>
                                    <Input
                                        value={theme.content[item.descKey] || ''}
                                        onChange={(e) => handleContentChange(item.descKey, e.target.value || null)}
                                        placeholder={item.descPlaceholder}
                                        className="min-h-[44px]"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Rótulos das Estatísticas
                    </CardTitle>
                    <CardDescription>
                        Textos exibidos abaixo dos números de destaque
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label>Estatística 1</Label>
                            <Input
                                value={theme.content.stat1_label || ''}
                                onChange={(e) => handleContentChange('stat1_label', e.target.value || null)}
                                placeholder="Terapeutas Especialistas"
                                className="min-h-[44px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Estatística 2</Label>
                            <Input
                                value={theme.content.stat2_label || ''}
                                onChange={(e) => handleContentChange('stat2_label', e.target.value || null)}
                                placeholder="Especialidades"
                                className="min-h-[44px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Estatística 3</Label>
                            <Input
                                value={theme.content.stat3_label || ''}
                                onChange={(e) => handleContentChange('stat3_label', e.target.value || null)}
                                placeholder="Famílias Atendidas"
                                className="min-h-[44px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Títulos das Seções */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Rows3 className="w-5 h-5 text-primary" />
                        Títulos das Seções
                    </CardTitle>
                    <CardDescription>
                        Personalize os títulos de cada seção da página
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 p-4 border border-border rounded-lg">
                            <h4 className="font-semibold text-sm text-foreground">Seção Especialidades</h4>
                            <div className="space-y-1.5">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.specialties_title || ''}
                                    onChange={(e) => handleContentChange('specialties_title', e.target.value || null)}
                                    placeholder="Nossas Especialidades"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.specialties_subtitle || ''}
                                    onChange={(e) => handleContentChange('specialties_subtitle', e.target.value || null)}
                                    placeholder="Atendimento multidisciplinar focado em resultados clínicos"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 p-4 border border-border rounded-lg">
                            <h4 className="font-semibold text-sm text-foreground">Seção Equipe</h4>
                            <div className="space-y-1.5">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.doctors_title || ''}
                                    onChange={(e) => handleContentChange('doctors_title', e.target.value || null)}
                                    placeholder="Nossa Equipe Clínica"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.doctors_subtitle || ''}
                                    onChange={(e) => handleContentChange('doctors_subtitle', e.target.value || null)}
                                    placeholder="Profissionais especializados para acompanhar cada paciente"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 p-4 border border-border rounded-lg">
                            <h4 className="font-semibold text-sm text-foreground">Seção Sobre</h4>
                            <div className="space-y-1.5">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.about_title || ''}
                                    onChange={(e) => handleContentChange('about_title', e.target.value || null)}
                                    placeholder="Sobre a Clínica"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 p-4 border border-border rounded-lg">
                            <h4 className="font-semibold text-sm text-foreground">Seção Contato</h4>
                            <div className="space-y-1.5">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.contact_title || ''}
                                    onChange={(e) => handleContentChange('contact_title', e.target.value || null)}
                                    placeholder="Entre em Contato"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.contact_subtitle || ''}
                                    onChange={(e) => handleContentChange('contact_subtitle', e.target.value || null)}
                                    placeholder="Nossa recepção está pronta para atender você"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
