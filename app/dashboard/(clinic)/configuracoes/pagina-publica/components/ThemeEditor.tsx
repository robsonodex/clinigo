'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ClinicTheme, FontFamily, getTierFeatures } from '@/types/clinic-theme'
import { Upload, Palette, Loader2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface ThemeEditorProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
    initialLogoUrl?: string | null
}

function ColorInput({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">{label}</Label>
            <div className="flex items-center gap-2.5">
                <div
                    className="w-11 h-11 rounded-lg border border-border cursor-pointer relative overflow-hidden shrink-0"
                    style={{ backgroundColor: value }}
                >
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        aria-label={`Selecionar ${label}`}
                    />
                </div>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 font-mono text-sm uppercase min-h-[44px]"
                    placeholder="#155E4B"
                />
            </div>
        </div>
    )
}

export function ThemeEditor({ theme, onChange, planType, initialLogoUrl }: ThemeEditorProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl || theme.logo_url || null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [removingLogo, setRemovingLogo] = useState(false)
    const tierFeatures = getTierFeatures(planType)

    useEffect(() => {
        const persisted = initialLogoUrl ?? theme.logo_url ?? null
        setLogoPreview(persisted)
    }, [initialLogoUrl, theme.logo_url])

    const handleColorChange = (colorKey: keyof ClinicTheme['colors'], value: string) => {
        onChange({
            colors: {
                ...theme.colors,
                [colorKey]: value,
            },
        })
    }

    const handleFontChange = (fontFamily: FontFamily) => {
        onChange({
            typography: {
                ...theme.typography,
                fontFamily,
            },
        })
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Arquivo muito grande. O tamanho máximo permitido é 2MB.')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            setLogoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        setUploadingLogo(true)
        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            const { data: userData } = await (supabase
                .from('users') as any)
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) throw new Error('Clínica não encontrada')

            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
            const filePath = `${userData.clinic_id}/logo.${fileExt}`

            const { error: uploadError } = await supabase
                .storage
                .from('clinic-assets')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase
                .storage
                .from('clinic-assets')
                .getPublicUrl(filePath)

            const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`

            const { error: clinicUpdateError } = await (supabase
                .from('clinics') as any)
                .update({ logo_url: cacheBustedUrl })
                .eq('id', userData.clinic_id)

            if (clinicUpdateError) throw clinicUpdateError

            setLogoPreview(cacheBustedUrl)
            onChange({ logo_url: cacheBustedUrl })
            toast.success('Logo enviado e atualizado com sucesso.')
        } catch (error: any) {
            console.error('Logo upload error:', error)
            toast.error(error?.message || 'Não foi possível enviar o logo. Tente novamente.')
            setLogoPreview(initialLogoUrl || theme.logo_url || null)
        } finally {
            setUploadingLogo(false)
            e.target.value = ''
        }
    }

    const handleRemoveLogo = async () => {
        setRemovingLogo(true)
        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()

            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: userData } = await (supabase
                    .from('users') as any)
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                if (userData?.clinic_id) {
                    await (supabase
                        .from('clinics') as any)
                        .update({ logo_url: null })
                        .eq('id', userData.clinic_id)
                }
            }

            setLogoPreview(null)
            onChange({ logo_url: null })
            toast.success('Logo removido.')
        } catch {
            toast.error('Erro ao remover o logo.')
        } finally {
            setRemovingLogo(false)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Paleta de Cores */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Palette className="w-5 h-5 text-primary" />
                        Paleta de Cores
                    </CardTitle>
                    <CardDescription>
                        Personalize as cores da sua página pública
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ColorInput
                        label="Cor Primária"
                        value={theme.colors.primary}
                        onChange={(v) => handleColorChange('primary', v)}
                    />
                    <ColorInput
                        label="Cor Secundária"
                        value={theme.colors.secondary}
                        onChange={(v) => handleColorChange('secondary', v)}
                    />
                    <ColorInput
                        label="Cor de Destaque (CTA)"
                        value={theme.colors.accent}
                        onChange={(v) => handleColorChange('accent', v)}
                    />

                    <div className="pt-4 border-t border-border space-y-4">
                        <ColorInput
                            label="Cor de Fundo"
                            value={theme.colors.background}
                            onChange={(v) => handleColorChange('background', v)}
                        />
                        <ColorInput
                            label="Cor do Texto"
                            value={theme.colors.text}
                            onChange={(v) => handleColorChange('text', v)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Identidade Visual */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Identidade Visual</CardTitle>
                    <CardDescription>
                        Logo e tipografia da sua clínica
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>Logo da Clínica</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/40 transition-colors">
                            {uploadingLogo ? (
                                <div className="py-4 flex flex-col items-center gap-2">
                                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground">Enviando logo...</span>
                                </div>
                            ) : logoPreview ? (
                                <div className="space-y-3">
                                    <img
                                        src={logoPreview}
                                        alt="Pré-visualização do logo da clínica"
                                        className="h-16 mx-auto object-contain"
                                    />
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        <label className="inline-flex">
                                            <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted cursor-pointer min-h-[44px]">
                                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                                Trocar Logo
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                        </label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={removingLogo}
                                            className="min-h-[44px] text-destructive border-destructive/30 hover:bg-destructive/10"
                                            onClick={handleRemoveLogo}
                                        >
                                            {removingLogo ? (
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer block py-2">
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <span className="text-sm font-medium text-foreground block">
                                        Clique para fazer upload do logo
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        PNG, SVG, JPG ou WEBP (máx. 2MB)
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Fonte */}
                    <div className="space-y-2">
                        <Label>Fonte</Label>
                        <Select
                            value={theme.typography.fontFamily}
                            onValueChange={(v) => handleFontChange(v as FontFamily)}
                        >
                            <SelectTrigger className="min-h-[44px]">
                                <SelectValue placeholder="Selecione uma fonte" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Inter">Inter (Editorial)</SelectItem>
                                <SelectItem value="Poppins">Poppins (Arredondada)</SelectItem>
                                <SelectItem value="Montserrat">Montserrat (Geométrica)</SelectItem>
                                <SelectItem value="Roboto">Roboto (Clássica)</SelectItem>
                                <SelectItem value="Outfit">Outfit (Contemporânea)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div
                            className="mt-3 p-4 bg-muted/50 border border-border rounded-lg"
                            style={{ fontFamily: theme.typography.fontFamily }}
                        >
                            <p className="font-semibold text-base text-foreground">Pré-visualização da Fonte</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Assim ficará o texto institucional na sua página pública
                            </p>
                        </div>
                    </div>

                    {!tierFeatures.canUseCustomFonts && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">PRO</Badge>
                            <span>Fontes personalizadas avançadas disponíveis no plano Professional</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview das cores */}
            <Card className="md:col-span-2 border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Pré-visualização das Cores</CardTitle>
                    <CardDescription>
                        Confira o contraste dos botões e textos aplicados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            className="px-5 py-2.5 min-h-[44px] rounded-md font-semibold text-sm text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            Botão Primário
                        </button>

                        <button
                            type="button"
                            className="px-5 py-2.5 min-h-[44px] rounded-md font-semibold text-sm text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: theme.colors.secondary }}
                        >
                            Botão Secundário
                        </button>

                        <button
                            type="button"
                            className="px-5 py-2.5 min-h-[44px] rounded-md font-semibold text-sm text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: theme.colors.accent }}
                        >
                            CTA Destaque
                        </button>

                        <div
                            className="flex-1 p-4 rounded-lg border border-border min-w-[200px]"
                            style={{
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                fontFamily: theme.typography.fontFamily,
                            }}
                        >
                            <p className="font-semibold text-sm">Exemplo de título institucional</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.colors.muted }}>
                                Atendimento multidisciplinar focado no desenvolvimento do paciente
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
