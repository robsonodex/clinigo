'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ClinicTheme, getTierFeatures } from '@/types/clinic-theme'
import {
    DollarSign,
    Star,
    UserCircle,
    Grid,
    Map,
    HelpCircle,
    Building2,
    Lock
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface DisplaySettingsProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
}

// =============================================================================
// Toggle Item Component
// =============================================================================

function ToggleItem({
    icon: Icon,
    label,
    description,
    checked,
    onChange,
    disabled = false,
    badge,
}: {
    icon: React.FC<{ className?: string }>
    label: string
    description: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    badge?: string
}) {
    return (
        <div className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${disabled ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'}`}>
            <div className="flex gap-3">
                <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                    <div className="flex items-center gap-2">
                        <Label className="font-medium">{label}</Label>
                        {badge && (
                            <Badge variant="outline" className="text-xs">
                                {badge}
                            </Badge>
                        )}
                        {disabled && <Lock className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
            />
        </div>
    )
}

// =============================================================================
// Main Component
// =============================================================================

export function DisplaySettings({ theme, onChange, planType }: DisplaySettingsProps) {
    const tierFeatures = getTierFeatures(planType)

    const handleDisplayChange = (key: keyof ClinicTheme['display'], value: boolean) => {
        onChange({
            display: {
                ...theme.display,
                [key]: value,
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Sections Visibility */}
            <Card>
                <CardHeader>
                    <CardTitle>Seções Visíveis</CardTitle>
                    <CardDescription>
                        Escolha quais seções aparecem na página pública
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ToggleItem
                        icon={Grid}
                        label="Grid de Especialidades"
                        description="Exibe as especialidades disponíveis em cards clicáveis"
                        checked={theme.display.show_specialties_grid}
                        onChange={(v) => handleDisplayChange('show_specialties_grid', v)}
                    />

                    <ToggleItem
                        icon={Star}
                        label="Seção de Avaliações"
                        description="Exibe reviews e avaliações de pacientes"
                        checked={theme.display.show_reviews}
                        onChange={(v) => handleDisplayChange('show_reviews', v)}
                    />

                    <ToggleItem
                        icon={Map}
                        label="Mapa e Localização"
                        description="Exibe o mapa com endereço e como chegar"
                        checked={theme.display.show_map}
                        onChange={(v) => handleDisplayChange('show_map', v)}
                    />

                    <ToggleItem
                        icon={HelpCircle}
                        label="FAQ / Perguntas Frequentes"
                        description="Exibe as perguntas frequentes com accordion"
                        checked={theme.display.show_faq}
                        onChange={(v) => handleDisplayChange('show_faq', v)}
                    />
                </CardContent>
            </Card>

            {/* Doctor Cards */}
            <Card>
                <CardHeader>
                    <CardTitle>Cards dos Médicos</CardTitle>
                    <CardDescription>
                        Configure como os médicos são exibidos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ToggleItem
                        icon={UserCircle}
                        label="Fotos dos Médicos"
                        description="Exibe a foto profissional nos cards"
                        checked={theme.display.show_doctor_photos}
                        onChange={(v) => handleDisplayChange('show_doctor_photos', v)}
                    />

                    <ToggleItem
                        icon={DollarSign}
                        label="Preços das Consultas"
                        description="Exibe o valor da consulta nos cards dos médicos"
                        checked={theme.display.show_prices}
                        onChange={(v) => handleDisplayChange('show_prices', v)}
                    />
                </CardContent>
            </Card>

            {/* Branding */}
            <Card>
                <CardHeader>
                    <CardTitle>White-Label</CardTitle>
                    <CardDescription>
                        Controle de branding do CliniGo
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ToggleItem
                        icon={Building2}
                        label="Powered by CliniGo"
                        description="Exibe 'Powered by CliniGo' no rodapé"
                        checked={theme.display.show_clinigo_branding}
                        onChange={(v) => handleDisplayChange('show_clinigo_branding', v)}
                        disabled={!tierFeatures.canRemoveBranding}
                        badge={!tierFeatures.canRemoveBranding ? 'PRO' : undefined}
                    />

                    {!tierFeatures.canRemoveBranding && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <p className="font-medium">⚡ Faça upgrade para o plano Professional</p>
                            <p>
                                Remova a marca do CliniGo e tenha uma página 100% personalizada.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
