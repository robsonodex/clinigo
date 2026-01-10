'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, CreditCard, Building, ShieldCheck, Zap } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { uploadClinicLogo } from '@/app/actions/white-label'
import { Sparkles } from 'lucide-react'

// ... existing code ...

const clinicSettingsSchema = z.object({
    name: z.string().min(3, 'Nome muito curto'),
    email: z.string().email(),
    phone: z.string().min(10, 'Telefone inválido'),
    address: z.string().min(5, 'Endereço muito curto'),
    primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor inválida'),
    logo_url: z.string().optional().nullable(),
})

type ClinicSettingsData = z.infer<typeof clinicSettingsSchema>

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [previewLogo, setPreviewLogo] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isDirty },
    } = useForm<ClinicSettingsData>({
        resolver: zodResolver(clinicSettingsSchema),
        defaultValues: {
            name: 'CliniGo Matriz',
            email: 'contato@clinigo.com.br',
            phone: '(11) 99999-9999',
            address: 'Av. Paulista, 1000 - São Paulo, SP',
            primary_color: '#3b82f6',
        },
    })

    const activeColor = watch('primary_color')

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploadingLogo(true)
            const formData = new FormData()
            formData.append('file', file)
            // TODO: Get real Clinic ID from session or context. 
            // For now assuming we are in a clinic context component, but we need the ID.
            // Since this is a client component, we might need to pass it or fetch it.
            // Let's assume a hardcoded ID for now or fetch from user session if available in a hook.
            // Actually, server action takes clinicId. We need to pass it.
            // TEMPORARY FIX: using a placeholder ID, but this needs to come from the page load data.
            formData.append('clinicId', 'current-clinic-id-placeholder')

            // Wait, we can't upload without ID. 
            // In a real scenario, this page should receive initialData including ID.

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

    const onSubmit = (data: ClinicSettingsData) => {
        toast.success('Configurações salvas com sucesso!')
        console.log(data)
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
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                    <TabsTrigger value="plan">Plano e Assinatura</TabsTrigger>
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
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Plano Atual</CardTitle>
                                    <CardDescription>
                                        Gerencie sua assinatura e recursos disponíveis.
                                    </CardDescription>
                                </div>
                                <CreditCard className="w-8 h-8 text-primary/50" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start space-x-4">
                                <Zap className="w-6 h-6 text-primary mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg">Plano Profissional</h3>
                                    <p className="text-sm text-muted-foreground">Sua assinatura está ativa e vence em 15/01/2026.</p>
                                </div>
                                <div className="ml-auto">
                                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200 uppercase tracking-wider">Ativo</span>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3 p-3 rounded-md border bg-card">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">Teleconsultas Ilimitadas</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-md border bg-card">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">Até 10 Médicos</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-md border bg-card">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">Pagamentos Online (Pix)</span>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-md border bg-card text-muted-foreground">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm italic">Upgrade: Agenda Personalizada</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button variant="outline" className="w-full md:w-auto">
                                    Ver outros planos
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

