'use client'

import { use, Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { patientFormSchema, type PatientFormData } from '@/lib/validations'
import { api, type Doctor, createAppointment } from '@/lib/api-client'
import { formatCurrency, formatCPF, formatPhone } from '@/lib/utils'
import {
    ArrowLeft,
    User,
    Calendar,
    Clock,
    CreditCard,
    Shield,
    Loader2,
    CheckCircle2
} from 'lucide-react'
import type { DoctorHealthInsurance } from '@/lib/types/health-insurance'

interface PageProps {
    params: Promise<{ clinic_slug: string; doctor_id: string }>
}

function ConfirmBookingContent({ params }: PageProps) {
    const { clinic_slug, doctor_id } = use(params)
    const router = useRouter()
    const searchParams = useSearchParams()

    const date = searchParams.get('date')
    const time = searchParams.get('time')

    // Validate required params
    if (!date || !time) {
        router.push(`/${clinic_slug}/agendar/${doctor_id}`)
        return null
    }

    // Fetch doctor
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor', doctor_id],
        queryFn: () => api.get<Doctor>(`/doctors/${doctor_id}`),
    })

    // Fetch doctor insurances
    const { data: insurancesResponse } = useQuery({
        queryKey: ['doctor-insurances', doctor_id],
        queryFn: () => api.getFull<DoctorHealthInsurance[]>(`/doctors/${doctor_id}/health-insurances`, {
            status: 'ACTIVE'
        }),
        enabled: !!doctor_id
    })
    const insurances = insurancesResponse?.data || []

    // Form
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        trigger,
        control,
        formState: { errors },
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            terms: false,
            payment_type: 'PRIVATE'
        },
    })

    const paymentType = watch('payment_type')
    const selectedPlanId = watch('health_insurance_plan_id')

    // Calculate price
    const [currentPrice, setCurrentPrice] = useState(0)

    useEffect(() => {
        if (doctor) {
            if (paymentType === 'PRIVATE') {
                setCurrentPrice(doctor.consultation_price)
            } else if (selectedPlanId) {
                const insurance = insurances.find(i => i.health_insurance_plan_id === selectedPlanId)
                if (insurance) {
                    setCurrentPrice(insurance.consultation_price)
                }
            } else {
                // If health insurance selected but no plan yet, maybe show 0 or keep private price?
                // Better to show "A partir de..." or just handle when selected.
                setCurrentPrice(0) // Invalid state effectively, waiting for selection
            }
        }
    }, [doctor, paymentType, selectedPlanId, insurances])


    // Mutation
    const { mutate: submitBooking, isPending } = useMutation({
        mutationFn: (data: PatientFormData) =>
            createAppointment({
                clinic_slug,
                doctor_id,
                appointment_date: date,
                appointment_time: time,
                payment_type: data.payment_type,
                health_insurance_plan_id: data.health_insurance_plan_id,
                insurance_card_number: data.insurance_card_number,
                insurance_card_validity: data.insurance_card_validity,
                patient: {
                    cpf: data.cpf.replace(/\D/g, ''),
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone.replace(/\D/g, ''),
                    date_of_birth: data.date_of_birth,
                },
            }),
        onSuccess: (response) => {
            if (response.payment_url) {
                // Redirect to Mercado Pago
                window.location.href = response.payment_url
            } else {
                // Success without payment URL (maybe insurance or free)
                toast.success('Agendamento realizado com sucesso!')
                router.push(`/${clinic_slug}/agendar/sucesso?appointmentId=${response.appointment_id}`)
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao criar agendamento')
        },
    })

    const onSubmit = (data: PatientFormData) => {
        submitBooking(data)
    }

    // Format inputs
    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
        setValue('cpf', formatCPF(value))
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11)
        setValue('phone', formatPhone(value))
    }

    const formattedDate = format(
        parse(date, 'yyyy-MM-dd', new Date()),
        "EEEE, d 'de' MMMM 'de' yyyy",
        { locale: ptBR }
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-10">
                <div className="container mx-auto px-4 h-14 flex items-center">
                    <Link
                        href={`/${clinic_slug}/agendar/${doctor_id}`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                <h1 className="text-2xl font-bold mb-6">Confirme seus dados</h1>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dados do paciente</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Nome completo *</Label>
                                        <Input
                                            id="full_name"
                                            placeholder="Seu nome completo"
                                            error={!!errors.full_name}
                                            {...register('full_name')}
                                        />
                                        {errors.full_name && (
                                            <p className="text-xs text-destructive">
                                                {errors.full_name.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* CPF */}
                                    <div className="space-y-2">
                                        <Label htmlFor="cpf">CPF *</Label>
                                        <Input
                                            id="cpf"
                                            placeholder="000.000.000-00"
                                            error={!!errors.cpf}
                                            {...register('cpf')}
                                            onChange={handleCPFChange}
                                        />
                                        {errors.cpf && (
                                            <p className="text-xs text-destructive">
                                                {errors.cpf.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="seu@email.com"
                                            error={!!errors.email}
                                            {...register('email')}
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-destructive">
                                                {errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone *</Label>
                                        <Input
                                            id="phone"
                                            placeholder="(11) 99999-9999"
                                            error={!!errors.phone}
                                            {...register('phone')}
                                            onChange={handlePhoneChange}
                                        />
                                        {errors.phone && (
                                            <p className="text-xs text-destructive">
                                                {errors.phone.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="space-y-2">
                                        <Label htmlFor="date_of_birth">
                                            Data de nascimento (opcional)
                                        </Label>
                                        <Input
                                            id="date_of_birth"
                                            type="date"
                                            {...register('date_of_birth')}
                                        />
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Payment Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Forma de Pagamento</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <RadioGroup
                                    defaultValue="PRIVATE"
                                    className="grid grid-cols-2 gap-4"
                                    onValueChange={(val) => setValue('payment_type', val as 'PRIVATE' | 'HEALTH_INSURANCE')}
                                >
                                    <div>
                                        <RadioGroupItem value="PRIVATE" id="private" className="peer sr-only" />
                                        <Label
                                            htmlFor="private"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                                        >
                                            <CreditCard className="mb-3 h-6 w-6" />
                                            <span className="font-semibold px-1 text-center">Particular</span>
                                            {doctor && (
                                                <span className="text-sm text-muted-foreground mt-1">
                                                    {formatCurrency(doctor.consultation_price)}
                                                </span>
                                            )}
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="HEALTH_INSURANCE" id="insurance" className="peer sr-only" />
                                        <Label
                                            htmlFor="insurance"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                                        >
                                            <Shield className="mb-3 h-6 w-6" />
                                            <span className="font-semibold px-1 text-center">Convênio</span>
                                            <span className="text-sm text-muted-foreground mt-1">
                                                {insurances.length} opções
                                            </span>
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {paymentType === 'HEALTH_INSURANCE' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                        <div className="space-y-2">
                                            <Label>Plano de Convênio *</Label>
                                            <Select
                                                onValueChange={(val) => {
                                                    setValue('health_insurance_plan_id', val)
                                                    trigger('health_insurance_plan_id')
                                                }}
                                            >
                                                <SelectTrigger className={errors.health_insurance_plan_id ? "border-destructive" : ""}>
                                                    <SelectValue placeholder="Selecione seu convênio" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {insurances.map((ins) => (
                                                        <SelectItem key={ins.health_insurance_plan_id} value={ins.health_insurance_plan_id}>
                                                            {ins.insurance_name} - {ins.plan_name}
                                                            {ins.consultation_price > 0 && ` (${formatCurrency(ins.consultation_price)})`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.health_insurance_plan_id && (
                                                <p className="text-xs text-destructive">
                                                    {errors.health_insurance_plan_id.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="card_number">Número da Carteirinha *</Label>
                                                <Input
                                                    id="card_number"
                                                    placeholder="000000000000"
                                                    {...register('insurance_card_number')}
                                                    error={!!errors.insurance_card_number}
                                                />
                                                {errors.insurance_card_number && (
                                                    <p className="text-xs text-destructive">
                                                        {errors.insurance_card_number.message}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="validity">Validade *</Label>
                                                <Input
                                                    id="validity"
                                                    type="date"
                                                    {...register('insurance_card_validity')}
                                                    error={!!errors.insurance_card_validity}
                                                />
                                                {errors.insurance_card_validity && (
                                                    <p className="text-xs text-destructive">
                                                        {errors.insurance_card_validity.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Terms and Submit */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <Controller
                                        control={control}
                                        name="terms"
                                        render={({ field }) => (
                                            <Checkbox
                                                id="terms"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="terms"
                                            className="text-sm font-medium cursor-pointer select-none"
                                        >
                                            Concordo com os termos de uso
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Ao prosseguir, você concorda com os{' '}
                                            <a href="#" className="text-primary underline hover:text-primary/80">
                                                termos de uso
                                            </a>{' '}
                                            e{' '}
                                            <a href="#" className="text-primary underline hover:text-primary/80">
                                                política de privacidade
                                            </a>
                                            .
                                        </p>
                                        {errors.terms && (
                                            <p className="text-xs text-destructive mt-1">
                                                {errors.terms.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmit(onSubmit)}
                                    size="xl"
                                    className="w-full mt-6"
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" />
                                            Processando...
                                        </>
                                    ) : paymentType === 'HEALTH_INSURANCE' ? (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                            Confirmar Agendamento
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5 mr-2" />
                                            Ir para pagamento
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary */}
                    <div className="md:col-span-1">
                        <Card className="sticky top-20">
                            <CardHeader>
                                <CardTitle>Resumo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {doctorLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : doctor ? (
                                    <>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{doctor.user.full_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    CRM {doctor.crm}/{doctor.crm_state}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {doctor.specialty}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="py-3 border-t flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Data</p>
                                                <p className="font-medium capitalize">{formattedDate}</p>
                                            </div>
                                        </div>

                                        <div className="py-3 border-t flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Horário</p>
                                                <p className="font-medium">{time}</p>
                                            </div>
                                        </div>

                                        <div className="py-3 border-t">
                                            <p className="text-sm text-muted-foreground">
                                                Valor da consulta
                                                {paymentType === 'HEALTH_INSURANCE' && ' (Convênio)'}
                                            </p>
                                            <p className="text-3xl font-bold text-primary">
                                                {currentPrice > 0 ? formatCurrency(currentPrice) : 'Sob Consulta'}
                                            </p>
                                        </div>
                                    </>
                                ) : null}

                                {/* Security badge */}
                                {paymentType === 'PRIVATE' && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-xs">Pagamento seguro via Mercado Pago</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function ConfirmBookingPage({ params }: PageProps) {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ConfirmBookingContent params={params} />
        </Suspense>
    )
}
