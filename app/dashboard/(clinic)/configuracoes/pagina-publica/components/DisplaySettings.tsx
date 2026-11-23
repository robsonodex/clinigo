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
    Lock,
} from 'lucide-react'

interface DisplaySettingsProps {
    theme: ClinicTheme
    onChange: (updates: Partial<ClinicTheme>) => void
    planType: string
}

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
        <div
            className={`flex items-start justify-between gap-4 p-4 rounded-lg border border-border transition-colors ${
                disabled ? 'opacity-65 bg-muted/40' : 'hover:bg-muted/30'
            }`}
        >
            <div className="flex gap-3">
                <Icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label className="font-medium text-foreground">{label}</Label>
                        {badge && (
                            <Badge variant="outline" className="text-xs">
                                {badge}
                            </Badge>
                        )}
                        {disabled && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
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

export function DisplaySettings({ theme, onChange, planType }: DisplaySettingsProps) {
    const tierFeatures = getTierFeatures(planType)

    const handleDisplayChange = (key: keyof ClinicTheme['display'], value: boolean) => {
        onChange({
            display: {
                ...theme.display,
                [key]: value,
            },
        })
    }

    return (
        <div className="space-y-6">
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Seções Visíveis</CardTitle>
                    <CardDescription>
                        Escolha quais seções aparecem na página pública
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    <ToggleItem
                        icon={Grid}
                        label="Grade de Especialidades"
                        description="Exibe as terapias e especialidades disponíveis em cards clicáveis"
                        checked={theme.display.show_specialties_grid}
                        onChange={(v) => handleDisplayChange('show_specialties_grid', v)}
                    />

                    <ToggleItem
                        icon={Star}
                        label="Seção de Avaliações"
                        description="Exibe avaliações e depoimentos de pacientes e responsáveis"
                        checked={theme.display.show_reviews}
                        onChange={(v) => handleDisplayChange('show_reviews', v)}
                    />

                    <ToggleItem
                        icon={Map}
                        label="Mapa e Localização"
                        description="Exibe o mapa com endereço e orientações de como chegar"
                        checked={theme.display.show_map}
                        onChange={(v) => handleDisplayChange('show_map', v)}
                    />

                    <ToggleItem
                        icon={HelpCircle}
                        label="FAQ / Perguntas Frequentes"
                        description="Exibe as perguntas frequentes em formato expansível"
                        checked={theme.display.show_faq}
                        onChange={(v) => handleDisplayChange('show_faq', v)}
                    />
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Cards dos Profissionais</CardTitle>
                    <CardDescription>
                        Configure como os terapeutas e especialistas são exibidos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    <ToggleItem
                        icon={UserCircle}
                        label="Fotos dos Profissionais"
                        description="Exibe a foto profissional nos cards da equipe"
                        checked={theme.display.show_doctor_photos}
                        onChange={(v) => handleDisplayChange('show_doctor_photos', v)}
                    />

                    <ToggleItem
                        icon={DollarSign}
                        label="Valores das Sessões"
                        description="Exibe o valor da sessão particular nos cards dos profissionais"
                        checked={theme.display.show_prices}
                        onChange={(v) => handleDisplayChange('show_prices', v)}
                    />
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Marca Branca (White-Label)</CardTitle>
                    <CardDescription>
                        Controle de exibição da assinatura do CliniGo no rodapé
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ToggleItem
                        icon={Building2}
                        label="Assinatura Powered by CliniGo"
                        description="Exibe a assinatura do CliniGo no rodapé da página pública"
                        checked={theme.display.show_clinigo_branding}
                        onChange={(v) => handleDisplayChange('show_clinigo_branding', v)}
                        disabled={!tierFeatures.canRemoveBranding}
                        badge={!tierFeatures.canRemoveBranding ? 'PRO' : undefined}
                    />

                    {!tierFeatures.canRemoveBranding && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                            <p className="font-semibold">Disponível a partir do plano Professional</p>
                            <p className="text-amber-800 mt-0.5 text-xs sm:text-sm">
                                Faça upgrade para remover a assinatura do CliniGo e manter sua página 100% com a identidade da clínica.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
