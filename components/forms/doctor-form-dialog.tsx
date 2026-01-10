'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateDoctor, useUpdateDoctor } from '@/lib/hooks/use-doctors'
import { doctorFormSchema, type DoctorFormData } from '@/lib/validations'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, EyeOff, Clock, DollarSign, Star, Video, Shield } from 'lucide-react'
import type { Doctor } from '@/lib/api-client'

interface DoctorFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    doctorToEdit?: Doctor | null
}

const SPECIALTIES = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Neurologia',
    'Oftalmologia',
    'Ortopedia',
    'Pediatria',
    'Psiquiatria',
    'Urologia',
    'Clínica Geral',
]

const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// Extended schema with display settings
const extendedDoctorFormSchema = doctorFormSchema.extend({
    is_accepting_appointments: z.boolean().default(true),
    show_consultation_duration: z.boolean().default(true),
    show_consultation_price: z.boolean().default(true),
    show_rating: z.boolean().default(true),
    show_teleconsulta_badge: z.boolean().default(true),
    show_convenio_badge: z.boolean().default(false),
    consultation_duration: z.number().min(15).max(120).optional(),
})

type ExtendedDoctorFormData = z.infer<typeof extendedDoctorFormSchema>

export function DoctorFormDialog({
    open,
    onOpenChange,
    doctorToEdit,
}: DoctorFormDialogProps) {
    const createDoctor = useCreateDoctor()
    const updateDoctor = useUpdateDoctor()
    const isEditing = !!doctorToEdit
    const [showDisplaySettings, setShowDisplaySettings] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<ExtendedDoctorFormData>({
        resolver: zodResolver(extendedDoctorFormSchema),
        defaultValues: {
            full_name: doctorToEdit?.user.full_name || '',
            email: doctorToEdit?.user.email || '',
            password: '',
            crm: doctorToEdit?.crm || '',
            crm_state: doctorToEdit?.crm_state || '',
            specialty: doctorToEdit?.specialty || '',
            consultation_price: doctorToEdit?.consultation_price || 0,
            bio: doctorToEdit?.bio || '',
            is_accepting_appointments: doctorToEdit?.is_accepting_appointments ?? true,
            show_consultation_duration: (doctorToEdit as any)?.display_settings?.show_duration ?? true,
            show_consultation_price: (doctorToEdit as any)?.display_settings?.show_price ?? true,
            show_rating: (doctorToEdit as any)?.display_settings?.show_rating ?? true,
            show_teleconsulta_badge: (doctorToEdit as any)?.display_settings?.show_teleconsulta ?? true,
            show_convenio_badge: (doctorToEdit as any)?.display_settings?.show_convenio ?? false,
            consultation_duration: (doctorToEdit as any)?.consultation_duration || 30,
        },
    })

    // Reset form when doctorToEdit changes
    useEffect(() => {
        if (open) {
            reset({
                full_name: doctorToEdit?.user.full_name || '',
                email: doctorToEdit?.user.email || '',
                password: '',
                crm: doctorToEdit?.crm || '',
                crm_state: doctorToEdit?.crm_state || '',
                specialty: doctorToEdit?.specialty || '',
                consultation_price: doctorToEdit?.consultation_price || 0,
                bio: doctorToEdit?.bio || '',
                is_accepting_appointments: doctorToEdit?.is_accepting_appointments ?? true,
                show_consultation_duration: (doctorToEdit as any)?.display_settings?.show_duration ?? true,
                show_consultation_price: (doctorToEdit as any)?.display_settings?.show_price ?? true,
                show_rating: (doctorToEdit as any)?.display_settings?.show_rating ?? true,
                show_teleconsulta_badge: (doctorToEdit as any)?.display_settings?.show_teleconsulta ?? true,
                show_convenio_badge: (doctorToEdit as any)?.display_settings?.show_convenio ?? false,
                consultation_duration: (doctorToEdit as any)?.consultation_duration || 30,
            })
        }
    }, [open, doctorToEdit, reset])

    const onSubmit = (data: ExtendedDoctorFormData) => {
        // Build display settings object
        const displaySettings = {
            show_duration: data.show_consultation_duration,
            show_price: data.show_consultation_price,
            show_rating: data.show_rating,
            show_teleconsulta: data.show_teleconsulta_badge,
            show_convenio: data.show_convenio_badge,
        }

        if (isEditing) {
            updateDoctor.mutate(
                {
                    doctorId: doctorToEdit!.id,
                    data: {
                        crm: data.crm,
                        crm_state: data.crm_state,
                        specialty: data.specialty,
                        consultation_price: data.consultation_price,
                        bio: data.bio,
                        is_accepting_appointments: data.is_accepting_appointments,
                        consultation_duration: data.consultation_duration,
                        display_settings: displaySettings,
                    },
                },
                {
                    onSuccess: () => {
                        onOpenChange(false)
                        reset()
                    },
                }
            )
        } else {
            createDoctor.mutate({
                ...data,
                consultation_duration: data.consultation_duration as any,
                display_settings: displaySettings as any,
            } as any, {
                onSuccess: () => {
                    onOpenChange(false)
                    reset()
                },
            })
        }
    }

    const isLoading = createDoctor.isPending || updateDoctor.isPending
    const isAccepting = watch('is_accepting_appointments')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>
                    {isEditing ? 'Editar Médico' : 'Cadastrar Novo Médico'}
                </DialogTitle>
                <DialogHeader>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações do médico e configure o que será exibido na página pública.'
                            : 'Preencha os dados para adicionar um novo médico à clínica.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* ======= STATUS PRINCIPAL ======= */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isAccepting ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                                <p className="font-medium">Status na Página Pública</p>
                                <p className="text-sm text-muted-foreground">
                                    {isAccepting ? 'Disponível para agendamentos' : 'Indisponível para agendamentos'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={isAccepting}
                            onCheckedChange={(val) => setValue('is_accepting_appointments', val)}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Personal Info */}
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input
                                id="full_name"
                                {...register('full_name')}
                                error={!!errors.full_name}
                                disabled={isEditing}
                            />
                            {errors.full_name && (
                                <p className="text-xs text-destructive">
                                    {errors.full_name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                error={!!errors.email}
                                disabled={isEditing}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        {!isEditing && (
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="password">Senha Inicial</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register('password')}
                                    error={!!errors.password}
                                />
                                <p className="text-xs text-muted-foreground">
                                    O médico deverá alterar esta senha no primeiro acesso.
                                </p>
                                {errors.password && (
                                    <p className="text-xs text-destructive">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Professional Info */}
                        <div className="space-y-2">
                            <Label htmlFor="crm">CRM</Label>
                            <Input id="crm" {...register('crm')} error={!!errors.crm} />
                            {errors.crm && (
                                <p className="text-xs text-destructive">{errors.crm.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="crm_state">Estado (UF)</Label>
                            <Select
                                value={watch('crm_state')}
                                onValueChange={(val) => setValue('crm_state', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="UF" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATES.map((uf) => (
                                        <SelectItem key={uf} value={uf}>
                                            {uf}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.crm_state && (
                                <p className="text-xs text-destructive">
                                    {errors.crm_state.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="specialty">Especialidade</Label>
                            <Select
                                value={watch('specialty')}
                                onValueChange={(val) => setValue('specialty', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {SPECIALTIES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.specialty && (
                                <p className="text-xs text-destructive">
                                    {errors.specialty.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="consultation_price">Preço da Consulta (R$)</Label>
                            <Input
                                id="consultation_price"
                                type="number"
                                step="0.01"
                                {...register('consultation_price', { valueAsNumber: true })}
                                error={!!errors.consultation_price}
                            />
                            {errors.consultation_price && (
                                <p className="text-xs text-destructive">
                                    {errors.consultation_price.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="consultation_duration">Duração da Consulta (min)</Label>
                            <Select
                                value={String(watch('consultation_duration') || 30)}
                                onValueChange={(val) => setValue('consultation_duration', Number(val))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 minutos</SelectItem>
                                    <SelectItem value="20">20 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos (1h)</SelectItem>
                                    <SelectItem value="90">90 minutos (1h30)</SelectItem>
                                    <SelectItem value="120">120 minutos (2h)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="bio">Biografia / Sobre</Label>
                            <Textarea
                                id="bio"
                                {...register('bio')}
                                placeholder="Breve descrição sobre o médico..."
                                className="h-24"
                            />
                            {errors.bio && (
                                <p className="text-xs text-destructive">{errors.bio.message}</p>
                            )}
                        </div>
                    </div>

                    {/* ======= CONTROLE DE EXIBIÇÃO ======= */}
                    <div className="border rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {showDisplaySettings ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                <div className="text-left">
                                    <p className="font-medium">Configurações de Exibição Pública</p>
                                    <p className="text-sm text-muted-foreground">
                                        Controle o que aparece no card do médico na página de agendamento
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                                {showDisplaySettings ? 'Ocultar' : 'Configurar'}
                            </Badge>
                        </button>

                        {showDisplaySettings && (
                            <div className="p-4 space-y-4 border-t bg-background">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Escolha quais informações serão exibidas no card público deste médico:
                                </p>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {/* Tempo de consulta */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-purple-500" />
                                            <div>
                                                <p className="text-sm font-medium">Tempo de Consulta</p>
                                                <p className="text-xs text-muted-foreground">Ex: "30 min"</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={watch('show_consultation_duration')}
                                            onCheckedChange={(val) => setValue('show_consultation_duration', val)}
                                        />
                                    </div>

                                    {/* Preço */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                            <div>
                                                <p className="text-sm font-medium">Preço da Consulta</p>
                                                <p className="text-xs text-muted-foreground">Ex: "R$ 200,00"</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={watch('show_consultation_price')}
                                            onCheckedChange={(val) => setValue('show_consultation_price', val)}
                                        />
                                    </div>

                                    {/* Rating */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Star className="w-4 h-4 text-amber-500" />
                                            <div>
                                                <p className="text-sm font-medium">Badge "Top Rated"</p>
                                                <p className="text-xs text-muted-foreground">Selo de destaque</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={watch('show_rating')}
                                            onCheckedChange={(val) => setValue('show_rating', val)}
                                        />
                                    </div>

                                    {/* Teleconsulta */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Video className="w-4 h-4 text-blue-500" />
                                            <div>
                                                <p className="text-sm font-medium">Badge "Teleconsulta"</p>
                                                <p className="text-xs text-muted-foreground">Atende online</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={watch('show_teleconsulta_badge')}
                                            onCheckedChange={(val) => setValue('show_teleconsulta_badge', val)}
                                        />
                                    </div>

                                    {/* Convênio */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg sm:col-span-2">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-4 h-4 text-indigo-500" />
                                            <div>
                                                <p className="text-sm font-medium">Badge "Aceita Convênios"</p>
                                                <p className="text-xs text-muted-foreground">Mostra que aceita planos de saúde</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={watch('show_convenio_badge')}
                                            onCheckedChange={(val) => setValue('show_convenio_badge', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? 'Salvar Alterações' : 'Cadastrar Médico'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
