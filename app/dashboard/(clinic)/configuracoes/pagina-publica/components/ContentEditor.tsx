'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ClinicTheme } from '@/types/clinic-theme'
import { Upload, Video, Image, X } from 'lucide-react'
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

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Hero Text Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Textos do Hero</CardTitle>
                    <CardDescription>
                        Título e subtítulo exibidos no topo da página
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="hero-title">Título Principal</Label>
                        <Input
                            id="hero-title"
                            value={theme.hero.title || ''}
                            onChange={(e) => handleHeroChange('title', e.target.value || null)}
                            placeholder="Saúde com Excelência"
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
                            placeholder="Há 25 anos cuidando da sua saúde com dedicação e tecnologia de ponta"
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
    )
}
