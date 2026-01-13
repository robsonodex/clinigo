'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCPF, formatPhone } from '@/lib/utils'

const quickPatientSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    phone: z.string().min(10, 'Telefone inválido'),
    date_of_birth: z.string().optional(),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
})

type QuickPatientFormData = z.infer<typeof quickPatientSchema>

interface QuickPatientFormProps {
    onSubmit: (data: QuickPatientFormData) => void
    onBack: () => void
    isSubmitting?: boolean
}

export function QuickPatientForm({
    onSubmit,
    onBack,
    isSubmitting,
}: QuickPatientFormProps) {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<QuickPatientFormData>({
        resolver: zodResolver(quickPatientSchema),
    })

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
        setValue('cpf', formatCPF(value))
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
        setValue('phone', formatPhone(value))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar
                </Button>
                <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Cadastro Rápido de Paciente</h3>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="full_name">
                            Nome Completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="full_name"
                            placeholder="João da Silva Santos"
                            {...register('full_name')}
                            error={!!errors.full_name}
                        />
                        {errors.full_name && (
                            <p className="text-xs text-destructive">{errors.full_name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">
                            Telefone <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="phone"
                            placeholder="(11) 99999-9999"
                            {...register('phone')}
                            onChange={handlePhoneChange}
                            error={!!errors.phone}
                        />
                        {errors.phone && (
                            <p className="text-xs text-destructive">{errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date_of_birth">
                            Data de Nascimento <span className="text-muted-foreground text-xs">(recomendado)</span>
                        </Label>
                        <Input
                            id="date_of_birth"
                            type="date"
                            {...register('date_of_birth')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cpf">
                            CPF <span className="text-muted-foreground text-xs">(pode preencher depois)</span>
                        </Label>
                        <Input
                            id="cpf"
                            placeholder="000.000.000-00"
                            {...register('cpf')}
                            onChange={handleCPFChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">
                            Email <span className="text-muted-foreground text-xs">(pode preencher depois)</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="paciente@email.com"
                            {...register('email')}
                            error={!!errors.email}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                    ℹ️ Você pode completar o cadastro do paciente depois
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onBack}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar e Continuar
                    </Button>
                </div>
            </form>
        </div>
    )
}
