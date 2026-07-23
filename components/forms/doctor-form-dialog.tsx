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
import { Loader2, Eye, EyeOff, Clock, DollarSign, Star, Video, Shield, Dices, Copy } from 'lucide-react'
import type { Doctor } from '@/lib/api-client'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'
import { useCouncilLabel } from '@/lib/hooks/use-council-label'

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
    cnpj: z.string().max(18).optional().nullable(),
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
    const profLabel = useProfessionalLabel()
    const { councilLabel } = useCouncilLabel()

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
            cnpj: (doctorToEdit as any)?.cnpj || '',
        },
    })

    function generatePassword() {
        const length = 12
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        let password = ""
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n))
        }
        setValue('password', password)
    }

    function copyPassword() {
        const pass = watch('password')
        if (pass) {
            navigator.clipboard.writeText(pass)
            // toast is not imported directly in this file, wait, is it?
            // Actually, we can just use the navigator
        }
    }

    const [additionalSpecialties, setAdditionalSpecialties] = useState<string[]>([])
    const [newAdditionalSpecialty, setNewAdditionalSpecialty] = useState('')

    const handleAddAdditionalSpecialty = () => {
        const val = newAdditionalSpecialty.trim()
        if (!val) return
        if (!additionalSpecialties.includes(val)) {
            setAdditionalSpecialties(prev => [...prev, val])
        }
        setNewAdditionalSpecialty('')
    }

    const handleRemoveAdditionalSpecialty = (idx: number) => {
        setAdditionalSpecialties(prev => prev.filter((_, i) => i !== idx))
    }

    // Reset form when doctorToEdit changes
    useEffect(() => {
        if (open) {
            setAdditionalSpecialties((doctorToEdit as any)?.specialties_additional || [])
            setNewAdditionalSpecialty('')
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
                cnpj: (doctorToEdit as any)?.cnpj || '',
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
                        specialties_additional: additionalSpecialties,
                        consultation_price: data.consultation_price,
                        bio: data.bio,
                        is_accepting_appointments: data.is_accepting_appointments,
                        consultation_duration: data.consultation_duration,
                        display_settings: displaySettings,
                        cnpj: data.cnpj || null,
                    } as any,
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
                specialties_additional: additionalSpecialties,
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
                    {isEditing ? `Editar ${profLabel.singular}` : profLabel.cadastrarNovo}
                </DialogTitle>
                <DialogHeader>
                    <DialogDescription>
                        {isEditing
                            ? `Atualize as informações do ${profLabel.singular.toLowerCase()} e configure o que será exibido na página pública.`
                            : `Preencha os dados para adicionar um novo ${profLabel.singular.toLowerCase()} à clínica.`}
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
                                <div className="flex gap-2">
                                    <Input
                                        id="password"
                                        type="text"
                                        {...register('password')}
                                        error={!!errors.password}
                                        placeholder="Senha de acesso"
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={generatePassword} title="Gerar Senha Aleatória">
                                        <Dices className="w-4 h-4" />
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" onClick={copyPassword} disabled={!watch('password')} title="Copiar Senha">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    O {profLabel.singular.toLowerCase()} deverá alterar esta senha no primeiro acesso.
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
                            <Label htmlFor="crm">{councilLabel}</Label>
                            <Input id="crm" {...register('crm')} error={!!errors.crm} />
                            {errors.crm && (
                                <p className="text-xs text-destructive">{errors.crm.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="crm_state">Estado do {councilLabel} (UF)</Label>
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
                                value={SPECIALTIES.includes(watch('specialty') || '') ? watch('specialty') : '__custom__'}
                                onValueChange={(val) => {
                                    if (val === '__custom__') {
                                        setValue('specialty', '')
                                        return
                                    }
                                    setValue('specialty', val)
                                }}
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
                                    <SelectItem value="__custom__" className="text-primary font-medium">
                                        ➕ Cadastrar Nova Especialidade
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Custom Specialty Input */}
                            {!SPECIALTIES.includes(watch('specialty') || '') && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Label htmlFor="custom_specialty" className="text-blue-900">
                                        Nova Especialidade (personalizada)
                                    </Label>
                                    <Input
                                        id="custom_specialty"
                                        value={watch('specialty')}
                                        onChange={(e) => setValue('specialty', e.target.value)}
                                        placeholder="Digite a especialidade..."
                                        className="mt-2"
                                    />
                                    <p className="text-xs text-blue-700 mt-1">
                                        Esta especialidade será salva e poderá ser usada para outros {profLabel.plural.toLowerCase()}.
                                    </p>
                                </div>
                            )}

                            {errors.specialty && (
                                <p className="text-xs text-destructive">
                                    {errors.specialty.message}
                                </p>
                            )}
                        </div>

                        {/* ======= OUTRAS ESPECIALIDADES & FORMAÇÕES ADICIONAIS ======= */}
                        <div className="space-y-2 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                            <Label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                <span>Especialidades & Formações Adicionais</span>
                                <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300">
                                    Múltiplas Formações
                                </Badge>
                            </Label>
                            <p className="text-xs text-slate-500">
                                Cadastre todas as especialidades, certificações e formações que este profissional atende (ex: TCC, ABA, Denver, TO, Psicopedagogia). Evita criar múltiplos cadastros do mesmo terapeuta.
                            </p>
                            <div className="flex gap-2 items-center mt-2">
                                <Input
                                    value={newAdditionalSpecialty}
                                    onChange={(e) => setNewAdditionalSpecialty(e.target.value)}
                                    placeholder="Ex: TCC, ABA, Psicopedagogia, Denver..."
                                    className="min-h-[44px]"
                                    style={{ fontSize: '16px' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddAdditionalSpecialty()
                                        }
                                    }}
                                />
                                <Button type="button" variant="outline" onClick={handleAddAdditionalSpecialty} className="shrink-0 font-semibold min-h-[44px] px-4">
                                    <Plus className="w-4 h-4 mr-1 text-emerald-600" /> Adicionar
                                </Button>
                            </div>
                            {additionalSpecialties.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    {additionalSpecialties.map((spec, i) => (
                                        <Badge key={i} className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            {spec}
                                            <X className="w-3.5 h-3.5 cursor-pointer text-blue-600 dark:text-blue-400 hover:text-red-600 transition-colors" onClick={() => handleRemoveAdditionalSpecialty(i)} />
                                        </Badge>
                                    ))}
                                </div>
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
                                placeholder={`Breve descrição sobre o ${profLabel.singular.toLowerCase()}...`}
                                className="h-24"
                            />
                            {errors.bio && (
                                <p className="text-xs text-destructive">{errors.bio.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                            <Input
                                id="cnpj"
                                {...register('cnpj')}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                            <p className="text-xs text-muted-foreground">
                                CNPJ da pessoa jurídica do {profLabel.singular.toLowerCase()}, se houver.
                            </p>
                            {errors.cnpj && (
                                <p className="text-xs text-destructive">{errors.cnpj.message}</p>
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
                                        Controle o que aparece no card do {profLabel.singular.toLowerCase()} na página de agendamento
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
                                    Escolha quais informações serão exibidas no card público deste {profLabel.singular.toLowerCase()}:
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
                            {isEditing ? 'Salvar Alterações' : profLabel.cadastrar}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
