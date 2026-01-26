'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, CreditCard, Building, ShieldCheck, Zap, Mail } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { uploadClinicLogo } from '@/app/actions/white-label'
import { Sparkles } from 'lucide-react'
import { PlanAndBilling } from './components/PlanAndBilling'
import { SMTPSettings } from './components/SMTPSettings'
import { createClient } from '@/lib/supabase/client'

// ... existing code ...

const clinicSettingsSchema = z.object({
    name: z.string().min(3, 'Nome muito curto'),
    email: z.string().email(),
    phone: z.string().min(10, 'Telefone inválido'),
    address: z.string().min(5, 'Endereço muito curto'),
    primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor inválida'),
    logo_url: z.string().optional().nullable(),
    whatsapp_number: z.string()
        .optional()
        .refine(
            (val) => !val || /^55\d{10,11}$/.test(val.replace(/\D/g, '')),
            'Formato inválido. Use: 5511999999999'
        ),
})

type ClinicSettingsData = z.infer<typeof clinicSettingsSchema>

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [previewLogo, setPreviewLogo] = useState<string | null>(null)
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<ClinicSettingsData>({
        resolver: zodResolver(clinicSettingsSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            address: '',
            primary_color: '#3b82f6',
            whatsapp_number: '',
            logo_url: null,
        },
    })

    const activeColor = watch('primary_color')

    // Load clinic data from database
    useEffect(() => {
        async function loadClinicData() {
            try {
                const supabase = createClient()

                // Get current user
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    toast.error('Usuário não autenticado')
                    return
                }

                // Get user's clinic
                const { data: userData } = await supabase
                    .from('users')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                if (!userData?.clinic_id) {
                    toast.error('Clínica não encontrada')
                    return
                }

                setClinicId(userData.clinic_id)

                // Fetch clinic data
                const { data: clinicData, error } = await supabase
                    .from('clinics')
                    .select('name, email, phone, address, primary_color, logo_url, whatsapp_number')
                    .eq('id', userData.clinic_id)
                    .single()

                if (error) {
                    console.error('Error loading clinic:', error)
                    toast.error('Erro ao carregar dados da clínica')
                    return
                }

                if (clinicData) {
                    // Update form with real data
                    reset({
                        name: clinicData.name || '',
                        email: clinicData.email || '',
                        phone: clinicData.phone || '',
                        address: clinicData.address || '',
                        primary_color: clinicData.primary_color || '#3b82f6',
                        whatsapp_number: clinicData.whatsapp_number || '',
                        logo_url: clinicData.logo_url || null,
                    })

                    // Set logo preview if exists
                    if (clinicData.logo_url) {
                        setPreviewLogo(clinicData.logo_url)
                    }
                }
            } catch (error) {
                console.error('Error:', error)
                toast.error('Erro ao carregar configurações')
            } finally {
                setLoading(false)
            }
        }

        loadClinicData()
    }, [reset])

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!clinicId) {
            toast.error('ID da clínica não encontrado')
            return
        }

        try {
            setUploadingLogo(true)
            const formData = new FormData()
            formData.append('file', file)
            formData.append('clinicId', clinicId)

            const result = await uploadClinicLogo(formData)

            if (result.success && result.url) {
                setPreviewLogo(result.url)
                setValue('logo_url', result.url, { shouldDirty: true })
                toast.success('Logo enviado com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao enviar logo')
            }
        } catch (error) {
            toast.error('Erro ao processar imagem')
        } finally {
            setUploadingLogo(false)
        }
    }

    const onSubmit = async (data: ClinicSettingsData) => {
        if (!clinicId) {
            toast.error('ID da clínica não encontrado')
            return
        }

        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('clinics')
                .update({
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    primary_color: data.primary_color,
                    whatsapp_number: data.whatsapp_number,
                    logo_url: data.logo_url,
                })
                .eq('id', clinicId)

            if (error) {
                console.error('Error updating clinic:', error)
                toast.error('Erro ao salvar configurações')
                return
            }

            toast.success('Configurações salvas com sucesso!')
            reset(data) // Reset form with new values to clear dirty state
        } catch (error) {
            console.error('Error:', error)
            toast.error('Erro ao salvar configurações')
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h1 className="text-2xl font-bold">Configurações da Clínica</h1>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Configurações da Clínica</h1>
                <p className="text-muted-foreground">
                    Gerencie as informações e preferências da sua clínica
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
                    <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                    <TabsTrigger value="plan">Plano e Assinatura</TabsTrigger>
                    <TabsTrigger value="smtp" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        E-mail (SMTP)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Informações Gerais</CardTitle>
                                        <CardDescription>
                                            Estes dados serão exibidos na página de agendamento.
                                        </CardDescription>
                                    </div>
                                    <Building className="w-8 h-8 text-primary/50" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Brand Identity Section */}
                                <div className="p-4 bg-muted/30 rounded-lg space-y-4 border">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Identidade Visual
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Logo da Clínica</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-background flex items-center justify-center">
                                                    {previewLogo ? (
                                                        <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground text-center p-2">Sem Logo</span>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        className="w-full max-w-xs"
                                                        onChange={handleLogoUpload}
                                                        disabled={uploadingLogo}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Recomendado: 500x500px, max 2MB (PNG/JPG)
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="primary_color">Cor Principal da Marca</Label>
                                            <div className="flex gap-3 items-center">
                                                <div className="relative">
                                                    <Input
                                                        type="color"
                                                        id="primary_color_picker"
                                                        className="w-12 h-12 p-1 absolute opacity-0 cursor-pointer"
                                                        {...register('primary_color')}
                                                    />
                                                    <div
                                                        className="w-12 h-12 rounded-lg border shadow-sm cursor-pointer"
                                                        style={{ backgroundColor: activeColor }}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <Input
                                                        id="primary_color"
                                                        {...register('primary_color')}
                                                        className="font-mono"
                                                        placeholder="#000000"
                                                        maxLength={7}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Utilizada em botões e destaques na página pública.
                                                    </p>
                                                </div>
                                            </div>
                                            {errors.primary_color && (
                                                <p className="text-xs text-destructive">{errors.primary_color.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome da Clínica</Label>
                                        <Input id="name" {...register('name')} error={!!errors.name} />
                                        {errors.name && (
                                            <p className="text-xs text-destructive">{errors.name.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email de Contato</Label>
                                        <Input id="email" {...register('email')} error={!!errors.email} />
                                        {errors.email && (
                                            <p className="text-xs text-destructive">{errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                        <Input id="phone" {...register('phone')} error={!!errors.phone} />
                                        {errors.phone && (
                                            <p className="text-xs text-destructive">{errors.phone.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp_number">WhatsApp da Clínica</Label>
                                        <Input
                                            id="whatsapp_number"
                                            {...register('whatsapp_number')}
                                            placeholder="5511999999999"
                                            maxLength={13}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Formato: 55 + DDD + Número. Usado nos botões de compartilhamento WhatsApp.
                                        </p>
                                        {errors.whatsapp_number && (
                                            <p className="text-xs text-destructive">{errors.whatsapp_number.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Endereço Completo</Label>
                                    <Textarea id="address" {...register('address')} />
                                    {errors.address && (
                                        <p className="text-xs text-destructive">{errors.address.message}</p>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={!isDirty}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </TabsContent>

                <TabsContent value="plan" className="mt-6">
                    <PlanAndBilling />
                </TabsContent>

                <TabsContent value="smtp" className="mt-6">
                    <SMTPSettings />
                </TabsContent>
            </Tabs>
        </div>
    )
}

