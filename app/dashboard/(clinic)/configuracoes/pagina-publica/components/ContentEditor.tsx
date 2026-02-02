'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ClinicTheme } from '@/types/clinic-theme'
import { Upload, Video, Image, X, Type, LayoutGrid, BarChart3, Rows3 } from 'lucide-react'
import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface ContentEditorProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
}

// =============================================================================
// Main Component
// =============================================================================

export function ContentEditor({ theme, onChange }: ContentEditorProps) {
    const [videoPreview, setVideoPreview] = useState<string | null>(theme.hero.video_url || null)
    const [imagePreview, setImagePreview] = useState<string | null>(theme.hero.background_image_url || null)

    const handleHeroChange = (key: keyof ClinicTheme['hero'], value: string | null) => {
        onChange({
            hero: {
                ...theme.hero,
                [key]: value,
            }
        })
    }

    const handleContentChange = (key: keyof ClinicTheme['content'], value: string | null) => {
        onChange({
            content: {
                ...theme.content,
                [key]: value,
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Hero Text Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Type className="w-5 h-5" />
                            Textos do Hero
                        </CardTitle>
                        <CardDescription>
                            Título e subtítulo exibidos no topo da página
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Hero Tag */}
                        <div className="space-y-2">
                            <Label htmlFor="hero-tag">Tag do Hero</Label>
                            <Input
                                id="hero-tag"
                                value={theme.content.hero_tag || ''}
                                onChange={(e) => handleContentChange('hero_tag', e.target.value || null)}
                                placeholder="Saúde Digital"
                            />
                            <p className="text-xs text-muted-foreground">
                                Pequena tag acima do título principal
                            </p>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="hero-title">Título Principal</Label>
                            <Input
                                id="hero-title"
                                value={theme.hero.title || ''}
                                onChange={(e) => handleHeroChange('title', e.target.value || null)}
                                placeholder="Medicina do futuro, hoje."
                                className="text-lg"
                            />
                            <p className="text-xs text-muted-foreground">
                                Deixe em branco para usar o nome da clínica
                            </p>
                        </div>

                        {/* Subtitle */}
                        <div className="space-y-2">
                            <Label htmlFor="hero-subtitle">Subtítulo / Tagline</Label>
                            <Textarea
                                id="hero-subtitle"
                                value={theme.hero.subtitle || ''}
                                onChange={(e) => handleHeroChange('subtitle', e.target.value || null)}
                                placeholder="Conectamos você aos melhores especialistas. Agendamento simples, atendimento humanizado."
                                rows={3}
                            />
                        </div>

                        {/* CTA Text */}
                        <div className="space-y-2">
                            <Label htmlFor="cta-text">Texto do Botão Principal</Label>
                            <Input
                                id="cta-text"
                                value={theme.hero.cta_text}
                                onChange={(e) => handleHeroChange('cta_text', e.target.value)}
                                placeholder="Agendar Consulta"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hero Media Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mídia do Hero</CardTitle>
                        <CardDescription>
                            Vídeo ou imagem de fundo (opcional)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Video URL */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                URL do Vídeo
                            </Label>
                            <Input
                                value={theme.hero.video_url || ''}
                                onChange={(e) => {
                                    handleHeroChange('video_url', e.target.value || null)
                                    setVideoPreview(e.target.value || null)
                                }}
                                placeholder="https://exemplo.com/video.mp4"
                            />
                            <p className="text-xs text-muted-foreground">
                                MP4 recomendado, máximo 15 segundos
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
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                            handleHeroChange('video_url', null)
                                            setVideoPreview(null)
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">ou</span>
                            </div>
                        </div>

                        {/* Background Image */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Imagem de Fundo
                            </Label>
                            <Input
                                value={theme.hero.background_image_url || ''}
                                onChange={(e) => {
                                    handleHeroChange('background_image_url', e.target.value || null)
                                    setImagePreview(e.target.value || null)
                                }}
                                placeholder="https://exemplo.com/imagem.jpg"
                            />

                            {imagePreview && !videoPreview && (
                                <div className="relative mt-2 rounded-lg overflow-hidden">
                                    <img
                                        src={imagePreview}
                                        alt="Background preview"
                                        className="w-full h-32 object-cover"
                                    />
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                            handleHeroChange('background_image_url', null)
                                            setImagePreview(null)
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Upload hint */}
                        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <p className="font-medium">💡 Dica</p>
                            <p>
                                Se nenhuma mídia for configurada, usaremos um gradiente com suas cores personalizadas.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Feature Cards Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" />
                        Cards de Funcionalidades
                    </CardTitle>
                    <CardDescription>
                        Os 4 cards de destaque exibidos na página inicial
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Feature 1 */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs">01</span>
                                Card 1
                            </div>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.feature1_title || ''}
                                    onChange={(e) => handleContentChange('feature1_title', e.target.value || null)}
                                    placeholder="Consultas Presenciais"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={theme.content.feature1_description || ''}
                                    onChange={(e) => handleContentChange('feature1_description', e.target.value || null)}
                                    placeholder="Atendimento tradicional com os melhores profissionais"
                                />
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs">02</span>
                                Card 2
                            </div>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.feature2_title || ''}
                                    onChange={(e) => handleContentChange('feature2_title', e.target.value || null)}
                                    placeholder="Teleconsulta 24h"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={theme.content.feature2_description || ''}
                                    onChange={(e) => handleContentChange('feature2_description', e.target.value || null)}
                                    placeholder="Atendimento online de qualquer lugar"
                                />
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs">03</span>
                                Card 3
                            </div>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.feature3_title || ''}
                                    onChange={(e) => handleContentChange('feature3_title', e.target.value || null)}
                                    placeholder="Prontuário Digital"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={theme.content.feature3_description || ''}
                                    onChange={(e) => handleContentChange('feature3_description', e.target.value || null)}
                                    placeholder="Seu histórico médico sempre acessível"
                                />
                            </div>
                        </div>

                        {/* Feature 4 */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-xs">04</span>
                                Card 4
                            </div>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.feature4_title || ''}
                                    onChange={(e) => handleContentChange('feature4_title', e.target.value || null)}
                                    placeholder="Lembretes Inteligentes"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={theme.content.feature4_description || ''}
                                    onChange={(e) => handleContentChange('feature4_description', e.target.value || null)}
                                    placeholder="Nunca perca uma consulta importante"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Labels */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Labels das Estatísticas
                    </CardTitle>
                    <CardDescription>
                        Textos exibidos abaixo dos números de estatísticas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Estatística 1</Label>
                            <Input
                                value={theme.content.stat1_label || ''}
                                onChange={(e) => handleContentChange('stat1_label', e.target.value || null)}
                                placeholder="Médicos Parceiros"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Estatística 2</Label>
                            <Input
                                value={theme.content.stat2_label || ''}
                                onChange={(e) => handleContentChange('stat2_label', e.target.value || null)}
                                placeholder="Especialidades"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Estatística 3</Label>
                            <Input
                                value={theme.content.stat3_label || ''}
                                onChange={(e) => handleContentChange('stat3_label', e.target.value || null)}
                                placeholder="Satisfação"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section Titles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Rows3 className="w-5 h-5" />
                        Títulos das Seções
                    </CardTitle>
                    <CardDescription>
                        Personalize os títulos de cada seção da página
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Especialidades */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <h4 className="font-medium text-sm">Seção Especialidades</h4>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.specialties_title || ''}
                                    onChange={(e) => handleContentChange('specialties_title', e.target.value || null)}
                                    placeholder="Nossas Especialidades"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.specialties_subtitle || ''}
                                    onChange={(e) => handleContentChange('specialties_subtitle', e.target.value || null)}
                                    placeholder="Oferecemos atendimento em diversas especialidades médicas"
                                />
                            </div>
                        </div>

                        {/* Médicos */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <h4 className="font-medium text-sm">Seção Médicos</h4>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.doctors_title || ''}
                                    onChange={(e) => handleContentChange('doctors_title', e.target.value || null)}
                                    placeholder="Nossa Equipe Médica"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.doctors_subtitle || ''}
                                    onChange={(e) => handleContentChange('doctors_subtitle', e.target.value || null)}
                                    placeholder="Profissionais qualificados para cuidar da sua saúde"
                                />
                            </div>
                        </div>

                        {/* Sobre */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <h4 className="font-medium text-sm">Seção Sobre</h4>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.about_title || ''}
                                    onChange={(e) => handleContentChange('about_title', e.target.value || null)}
                                    placeholder="Sobre a Clínica"
                                />
                            </div>
                        </div>

                        {/* Contato */}
                        <div className="space-y-3 p-4 border rounded-lg">
                            <h4 className="font-medium text-sm">Seção Contato</h4>
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input
                                    value={theme.content.contact_title || ''}
                                    onChange={(e) => handleContentChange('contact_title', e.target.value || null)}
                                    placeholder="Entre em Contato"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtítulo</Label>
                                <Input
                                    value={theme.content.contact_subtitle || ''}
                                    onChange={(e) => handleContentChange('contact_subtitle', e.target.value || null)}
                                    placeholder="Estamos prontos para atendê-lo"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

