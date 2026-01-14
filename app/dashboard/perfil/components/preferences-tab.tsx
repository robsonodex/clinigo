'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function PreferencesTab() {
    const [loading, setLoading] = useState(false)
    const [preferences, setPreferences] = useState<any>(null)

    useEffect(() => {
        loadPreferences()
    }, [])

    async function loadPreferences() {
        try {
            const res = await fetch('/api/profile/preferences')
            if (res.ok) {
                const data = await res.json()
                setPreferences(data.preferences)
            }
        } catch (error) {
            toast.error('Erro ao carregar')
        }
    }

    async function savePreferences() {
        setLoading(true)
        try {
            const res = await fetch('/api/profile/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences),
            })

            if (res.ok) {
                toast.success('Preferências salvas!')
            } else {
                toast.error('Erro ao salvar')
            }
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setLoading(false)
        }
    }

    if (!preferences) {
        return (
            <Card>
                <CardContent className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Interface</CardTitle>
                    <CardDescription>Personalize a aparência do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tema</Label>
                        <Select
                            value={preferences.theme}
                            onValueChange={(value) => setPreferences({ ...preferences, theme: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Claro</SelectItem>
                                <SelectItem value="dark">Escuro</SelectItem>
                                <SelectItem value="auto">Automático</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Idioma</Label>
                        <Select
                            value={preferences.language}
                            onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="es-ES">Español</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Formato de Data</Label>
                        <Select
                            value={preferences.date_format}
                            onValueChange={(value) => setPreferences({ ...preferences, date_format: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Formato de Hora</Label>
                        <Select
                            value={preferences.time_format}
                            onValueChange={(value) => setPreferences({ ...preferences, time_format: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">24 horas</SelectItem>
                                <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Acessibilidade</CardTitle>
                    <CardDescription>Configurações de acessibilidade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tamanho da Fonte</Label>
                        <Select
                            value={preferences.font_size}
                            onValueChange={(value) => setPreferences({ ...preferences, font_size: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small">Pequeno</SelectItem>
                                <SelectItem value="medium">Médio</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="high_contrast">Alto Contraste</Label>
                        <Switch
                            id="high_contrast"
                            checked={preferences.high_contrast}
                            onCheckedChange={(checked) => setPreferences({ ...preferences, high_contrast: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="reduce_animations">Reduzir Animações</Label>
                        <Switch
                            id="reduce_animations"
                            checked={preferences.reduce_animations}
                            onCheckedChange={(checked) => setPreferences({ ...preferences, reduce_animations: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={savePreferences} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Preferências
                </Button>
            </div>
        </div>
    )
}
