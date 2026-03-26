'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    Video,
    Mic,
    Camera,
    Settings,
    Clock,
    Shield,
    FileText,
    Save,
    RefreshCw,
    CheckCircle,
    AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TeleconsultaConfig {
    video_quality: 'auto' | 'hd' | 'sd'
    consent_required: boolean
    consent_text: string
    waiting_room_enabled: boolean
    waiting_room_message: string
    max_duration_minutes: number
    early_join_minutes: number
}

const DEFAULT_CONFIG: TeleconsultaConfig = {
    video_quality: 'auto',
    consent_required: true,
    consent_text: 'Autorizo a realização desta teleconsulta, conforme previsto na Resolução CFM nº 2.314/2022 e na LGPD.',
    waiting_room_enabled: true,
    waiting_room_message: 'Aguarde, o profissional irá atendê-lo em instantes.',
    max_duration_minutes: 60,
    early_join_minutes: 15,
}

export default function TeleconsultaConfigPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<TeleconsultaConfig>(DEFAULT_CONFIG)
    const [clinicId, setClinicId] = useState<string | null>(null)

    useEffect(() => {
        loadConfig()
    }, [])

    async function loadConfig() {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) return
            setClinicId(userData.clinic_id)

            // Load existing config
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('teleconsulta_config')
                .eq('id', userData.clinic_id)
                .single()

            if (clinicData?.teleconsulta_config) {
                setConfig({ ...DEFAULT_CONFIG, ...clinicData.teleconsulta_config })
            }
        } catch (error) {
            console.error('Error loading config:', error)
        } finally {
            setLoading(false)
        }
    }

    async function saveConfig() {
        if (!clinicId) return
        setSaving(true)

        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('clinics')
                .update({ teleconsulta_config: config })
                .eq('id', clinicId)

            if (error) throw error

            toast.success('Configurações salvas com sucesso!')
        } catch (error) {
            console.error('Error saving config:', error)
            toast.error('Erro ao salvar configurações')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Configurações de Teleconsulta</h1>
                    <p className="text-muted-foreground">
                        Configure qualidade de vídeo, consentimento e sala de espera virtual.
                    </p>
                </div>
                <Button onClick={saveConfig} disabled={saving}>
                    {saving ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Configurações
                </Button>
            </div>

            <Tabs defaultValue="video" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-xl">
                    <TabsTrigger value="video">
                        <Video className="w-4 h-4 mr-2" />
                        Vídeo
                    </TabsTrigger>
                    <TabsTrigger value="sala">
                        <Clock className="w-4 h-4 mr-2" />
                        Sala de Espera
                    </TabsTrigger>
                    <TabsTrigger value="consentimento">
                        <Shield className="w-4 h-4 mr-2" />
                        Consentimento
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Vídeo */}
                <TabsContent value="video" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="w-5 h-5" />
                                Qualidade de Vídeo
                            </CardTitle>
                            <CardDescription>
                                Configure a qualidade padrão das videochamadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { value: 'auto', label: 'Automático', desc: 'Ajusta conforme conexão' },
                                    { value: 'hd', label: 'HD (720p)', desc: 'Alta qualidade' },
                                    { value: 'sd', label: 'SD (480p)', desc: 'Economia de dados' },
                                ].map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => setConfig({ ...config, video_quality: option.value as any })}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${config.video_quality === option.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">{option.label}</span>
                                            {config.video_quality === option.value && (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label>Duração máxima da consulta (minutos)</Label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <Slider
                                            value={[config.max_duration_minutes]}
                                            onValueChange={([value]) => setConfig({ ...config, max_duration_minutes: value })}
                                            max={120}
                                            min={15}
                                            step={15}
                                            className="flex-1"
                                        />
                                        <span className="w-12 text-center font-medium">
                                            {config.max_duration_minutes}min
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label>Permitir entrada antecipada (minutos antes)</Label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <Slider
                                            value={[config.early_join_minutes]}
                                            onValueChange={([value]) => setConfig({ ...config, early_join_minutes: value })}
                                            max={30}
                                            min={5}
                                            step={5}
                                            className="flex-1"
                                        />
                                        <span className="w-12 text-center font-medium">
                                            {config.early_join_minutes}min
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>



                {/* TAB: Sala de Espera */}
                <TabsContent value="sala" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Sala de Espera Virtual
                            </CardTitle>
                            <CardDescription>
                                Configure a experiência do paciente enquanto aguarda
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label className="text-base">Ativar Sala de Espera</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Paciente aguarda até o médico iniciar a consulta
                                    </p>
                                </div>
                                <Switch
                                    checked={config.waiting_room_enabled}
                                    onCheckedChange={(checked) => setConfig({ ...config, waiting_room_enabled: checked })}
                                />
                            </div>

                            {config.waiting_room_enabled && (
                                <div className="space-y-3">
                                    <Label>Mensagem para o paciente</Label>
                                    <Textarea
                                        value={config.waiting_room_message}
                                        onChange={(e) => setConfig({ ...config, waiting_room_message: e.target.value })}
                                        placeholder="Mensagem exibida enquanto o paciente aguarda..."
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Esta mensagem será exibida para o paciente na sala de espera virtual.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Consentimento */}
                <TabsContent value="consentimento" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Termo de Consentimento
                            </CardTitle>
                            <CardDescription>
                                Configure o termo de consentimento para teleconsulta (LGPD/CFM)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label className="text-base">Exigir Consentimento</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Paciente deve aceitar antes de iniciar a consulta
                                    </p>
                                </div>
                                <Switch
                                    checked={config.consent_required}
                                    onCheckedChange={(checked) => setConfig({ ...config, consent_required: checked })}
                                />
                            </div>

                            {config.consent_required && (
                                <div className="space-y-3">
                                    <Label>Texto do Termo de Consentimento</Label>
                                    <Textarea
                                        value={config.consent_text}
                                        onChange={(e) => setConfig({ ...config, consent_text: e.target.value })}
                                        placeholder="Texto do termo de consentimento..."
                                        rows={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Este texto será exibido ao paciente para aceite antes da teleconsulta.
                                    </p>
                                </div>
                            )}

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-blue-800">Conformidade Legal</p>
                                        <p className="text-sm text-blue-700">
                                            De acordo com a Resolução CFM nº 2.314/2022 e a LGPD, o consentimento
                                            do paciente é obrigatório para teleconsultas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
