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
} from "@/components/ui/select"
import { ClinicTheme, FontFamily, getTierFeatures } from '@/types/clinic-theme'
import { Upload, Palette } from 'lucide-react'
import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface ThemeEditorProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
}

// =============================================================================
// Color Input Component
// =============================================================================

function ColorInput({
    label,
    value,
    onChange
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <div className="flex items-center gap-2">
                <div
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer relative overflow-hidden"
                    style={{ backgroundColor: value }}
                >
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                </div>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 font-mono text-sm uppercase"
                    placeholder="#000000"
                />
            </div>
        </div>
    )
}

// =============================================================================
// Main Component
// =============================================================================

export function ThemeEditor({ theme, onChange, planType }: ThemeEditorProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const tierFeatures = getTierFeatures(planType)

    const handleColorChange = (colorKey: keyof ClinicTheme['colors'], value: string) => {
        onChange({
            colors: {
                ...theme.colors,
                [colorKey]: value,
            }
        })
    }

    const handleFontChange = (fontFamily: FontFamily) => {
        onChange({
            typography: {
                ...theme.typography,
                fontFamily,
            }
        })
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create preview
        const reader = new FileReader()
        reader.onload = () => {
            setLogoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // TODO: Upload to Supabase Storage and get URL
        // For now, just show preview
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Colors Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
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

                    <div className="pt-4 border-t">
                        <ColorInput
                            label="Cor de Fundo"
                            value={theme.colors.background}
                            onChange={(v) => handleColorChange('background', v)}
                        />
                        <div className="mt-4">
                            <ColorInput
                                label="Cor do Texto"
                                value={theme.colors.text}
                                onChange={(v) => handleColorChange('text', v)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Typography & Logo Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Identidade Visual</CardTitle>
                    <CardDescription>
                        Logo e tipografia da sua clínica
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                            {logoPreview ? (
                                <div className="space-y-3">
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="h-16 mx-auto object-contain"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLogoPreview(null)}
                                    >
                                        Remover
                                    </Button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">
                                        Clique para fazer upload
                                    </span>
                                    <p className="text-xs text-gray-400 mt-1">
                                        PNG, SVG ou JPG (max. 2MB)
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/png,image/svg+xml,image/jpeg"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Font Selection */}
                    <div className="space-y-2">
                        <Label>Fonte</Label>
                        <Select
                            value={theme.typography.fontFamily}
                            onValueChange={(v) => handleFontChange(v as FontFamily)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma fonte" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Inter">Inter (Moderna)</SelectItem>
                                <SelectItem value="Poppins">Poppins (Arredondada)</SelectItem>
                                <SelectItem value="Montserrat">Montserrat (Elegante)</SelectItem>
                                <SelectItem value="Roboto">Roboto (Clássica)</SelectItem>
                                <SelectItem value="Outfit">Outfit (Contemporânea)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div
                            className="mt-3 p-4 bg-gray-50 rounded-lg"
                            style={{ fontFamily: theme.typography.fontFamily }}
                        >
                            <p className="font-bold text-lg">Preview da Fonte</p>
                            <p className="text-gray-600">
                                Assim ficará o texto na sua página pública
                            </p>
                        </div>
                    </div>

                    {/* Custom Font (Premium) */}
                    {!tierFeatures.canUseCustomFonts && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">PRO</Badge>
                            <span>Fontes personalizadas disponíveis no plano Professional</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Live Preview */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                        Visualização das cores aplicadas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        {/* Primary Button */}
                        <button
                            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            Botão Primário
                        </button>

                        {/* Secondary Button */}
                        <button
                            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: theme.colors.secondary }}
                        >
                            Botão Secundário
                        </button>

                        {/* Accent Button */}
                        <button
                            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: theme.colors.accent }}
                        >
                            CTA Destaque
                        </button>

                        {/* Text preview */}
                        <div
                            className="flex-1 p-4 rounded-lg min-w-[200px]"
                            style={{
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                fontFamily: theme.typography.fontFamily,
                            }}
                        >
                            <p className="font-bold">Texto de exemplo</p>
                            <p style={{ color: theme.colors.muted }}>Texto secundário</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
