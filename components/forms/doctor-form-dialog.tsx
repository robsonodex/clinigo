'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Loader2 } from 'lucide-react'
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

export function DoctorFormDialog({
    open,
    onOpenChange,
    doctorToEdit,
}: DoctorFormDialogProps) {
    const createDoctor = useCreateDoctor()
    const updateDoctor = useUpdateDoctor()
    const isEditing = !!doctorToEdit

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<DoctorFormData>({
        resolver: zodResolver(doctorFormSchema),
        defaultValues: {
            full_name: doctorToEdit?.user.full_name || '',
            email: doctorToEdit?.user.email || '',
            password: '', // Password not filled on edit
            crm: doctorToEdit?.crm || '',
            crm_state: doctorToEdit?.crm_state || '',
            specialty: doctorToEdit?.specialty || '',
            consultation_price: doctorToEdit?.consultation_price || 0,
            bio: doctorToEdit?.bio || '',
        },
    })

    // Improve this to use useEffect for resetting when doctorToEdit changes
    // In a real app, we'd handle this better

    const onSubmit = (data: DoctorFormData) => {
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
                        // Note: email and password updates usually require separate flows or special handling
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
            createDoctor.mutate(data, {
                onSuccess: () => {
                    onOpenChange(false)
                    reset()
                },
            })
        }
    }

    const isLoading = createDoctor.isPending || updateDoctor.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>
                    {isEditing ? 'Editar Médico' : 'Cadastrar Novo Médico'}
                </DialogTitle>
                <DialogHeader>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações do médico.'
                            : 'Preencha os dados para adicionar um novo médico à clínica.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Personal Info */}
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input
                                id="full_name"
                                {...register('full_name')}
                                error={!!errors.full_name}
                                disabled={isEditing} // Often names are locked or need special permission
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
