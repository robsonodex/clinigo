'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle, Loader2, Calendar, Clock, User, Stethoscope, Building2 } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Form validation schema
const preRegistrationSchema = z.object({
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    cpf: z.string().optional(),
    date_of_birth: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
    address_zipcode: z.string().optional(),
    emergency_contact: z.string().optional(),
    emergency_phone: z.string().optional(),
    health_insurance: z.string().optional(),
    insurance_card_number: z.string().optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    previous_conditions: z.string().optional()
})

type PreRegistrationData = z.infer<typeof preRegistrationSchema>

interface AppointmentInfo {
    token: string
    preRegistrationCompleted: boolean
    appointment: {
        id: string
        scheduledAt: string
        status: string
    }
    patient: {
        id: string
        fullName: string
        email: string
        phone: string
        cpf: string
        dateOfBirth: string
        gender: string
        addressStreet: string
        addressNumber: string
        addressCity: string
        addressState: string
        addressZipcode: string
    } | null
    doctor: {
        id: string
        fullName: string
        specialty: string
    }
    clinic: {
        id: string
        name: string
        phone: string
        address: string
    }
}

export default function PreCadastroPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [appointmentData, setAppointmentData] = useState<AppointmentInfo | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm<PreRegistrationData>({
        resolver: zodResolver(preRegistrationSchema)
    })

    // Fetch appointment data
    useEffect(() => {
        async function fetchAppointment() {
            try {
                const response = await fetch(`/api/pre-registration/${token}`)
                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'QR Code inválido ou expirado')
                }

                setAppointmentData(data)

                // Pre-fill form if patient data exists
                if (data.patient) {
                    const p = data.patient
                    if (p.fullName) setValue('full_name', p.fullName)
                    if (p.cpf) setValue('cpf', p.cpf)
                    if (p.dateOfBirth) setValue('date_of_birth', p.dateOfBirth)
                    if (p.phone) setValue('phone', p.phone)
                    if (p.email) setValue('email', p.email)
                    if (p.gender) setValue('gender', p.gender as any)
                    if (p.addressStreet) setValue('address_street', p.addressStreet)
                    if (p.addressNumber) setValue('address_number', p.addressNumber)
                    if (p.addressCity) setValue('address_city', p.addressCity)
                    if (p.addressState) setValue('address_state', p.addressState)
                    if (p.addressZipcode) setValue('address_zipcode', p.addressZipcode)
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchAppointment()
    }, [token, setValue])

    // Submit pre-registration
    const onSubmit = async (data: PreRegistrationData) => {
        setSubmitting(true)
        setError(null)

        try {
            const response = await fetch(`/api/pre-registration/${token}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao enviar dados')
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        )
    }

    // Error state (no appointment data)
    if (error && !appointmentData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-center text-red-700">Link Inválido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <p className="text-center text-muted-foreground mt-4">
                            Este link pode ter expirado ou já foi utilizado.
                            Entre em contato com a clínica para obter um novo QR Code.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                        <CardTitle className="text-center text-emerald-700">Cadastro Concluído!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-gray-600 mb-4">
                            Seus dados foram enviados com sucesso.
                        </p>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <p className="text-emerald-800 font-medium mb-2">
                                📱 Guarde este QR Code!
                            </p>
                            <p className="text-sm text-emerald-700">
                                Apresente-o na recepção da clínica no dia da consulta para fazer check-in rápido.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Already completed
    if (appointmentData?.preRegistrationCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <CardTitle className="text-center text-blue-700">Pré-cadastro já realizado</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-gray-600">
                            Você já completou seu pré-cadastro para esta consulta.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-blue-700">
                                Lembre-se de apresentar o QR Code na recepção no dia da consulta.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Form view
    const scheduledDate = appointmentData?.appointment?.scheduledAt
        ? new Date(appointmentData.appointment.scheduledAt)
        : null

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Pré-Cadastro</h1>
                    <p className="text-gray-600">{appointmentData?.clinic.name}</p>
                </div>

                {/* Appointment Info Card */}
                <Card className="mb-6 border-emerald-200 bg-white/80 backdrop-blur">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-emerald-600" />
                                <span className="text-gray-600">Médico:</span>
                                <span className="font-medium">Dr(a). {appointmentData?.doctor.fullName}</span>
                            </div>
                            {scheduledDate && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-emerald-600" />
                                        <span className="text-gray-600">Data:</span>
                                        <span className="font-medium">
                                            {scheduledDate.toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-emerald-600" />
                                        <span className="text-gray-600">Horário:</span>
                                        <span className="font-medium">
                                            {scheduledDate.toLocaleTimeString('pt-BR', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-gray-600">Local:</span>
                                <span className="font-medium">{appointmentData?.clinic.name}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Complete seus dados</CardTitle>
                        <CardDescription>
                            Preencha as informações para agilizar seu atendimento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Personal Data */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Dados Pessoais
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Label htmlFor="full_name">Nome Completo *</Label>
                                        <Input id="full_name" {...register('full_name')} />
                                        {errors.full_name && (
                                            <p className="text-sm text-red-500 mt-1">{errors.full_name.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="cpf">CPF</Label>
                                        <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                                        <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="phone">Telefone</Label>
                                        <Input id="phone" placeholder="(00) 00000-0000" {...register('phone')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input id="email" type="email" {...register('email')} />
                                        {errors.email && (
                                            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="gender">Gênero</Label>
                                        <Select onValueChange={(v) => setValue('gender', v as any)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MALE">Masculino</SelectItem>
                                                <SelectItem value="FEMALE">Feminino</SelectItem>
                                                <SelectItem value="OTHER">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Endereço</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <Label htmlFor="address_street">Rua</Label>
                                        <Input id="address_street" {...register('address_street')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="address_number">Número</Label>
                                        <Input id="address_number" {...register('address_number')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="address_complement">Complemento</Label>
                                        <Input id="address_complement" {...register('address_complement')} />
                                    </div>

                                    <div>
                                        <Label htmlFor="address_city">Cidade</Label>
                                        <Input id="address_city" {...register('address_city')} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor="address_state">UF</Label>
                                            <Input id="address_state" maxLength={2} {...register('address_state')} />
                                        </div>
                                        <div>
                                            <Label htmlFor="address_zipcode">CEP</Label>
                                            <Input id="address_zipcode" placeholder="00000-000" {...register('address_zipcode')} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Contato de Emergência</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="emergency_contact">Nome</Label>
                                        <Input id="emergency_contact" {...register('emergency_contact')} />
                                    </div>
                                    <div>
                                        <Label htmlFor="emergency_phone">Telefone</Label>
                                        <Input id="emergency_phone" placeholder="(00) 00000-0000" {...register('emergency_phone')} />
                                    </div>
                                </div>
                            </div>

                            {/* Health Info */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Informações de Saúde (Opcional)</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="health_insurance">Convênio</Label>
                                        <Input id="health_insurance" {...register('health_insurance')} />
                                    </div>
                                    <div>
                                        <Label htmlFor="insurance_card_number">Número da Carteirinha</Label>
                                        <Input id="insurance_card_number" {...register('insurance_card_number')} />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="allergies">Alergias</Label>
                                    <Textarea id="allergies" placeholder="Descreva suas alergias, se houver" {...register('allergies')} />
                                </div>

                                <div>
                                    <Label htmlFor="medications">Medicamentos em Uso</Label>
                                    <Textarea id="medications" placeholder="Liste os medicamentos que está tomando" {...register('medications')} />
                                </div>

                                <div>
                                    <Label htmlFor="previous_conditions">Condições Pré-Existentes</Label>
                                    <Textarea id="previous_conditions" placeholder="Diabetes, hipertensão, etc." {...register('previous_conditions')} />
                                </div>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                size="lg"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Concluir Cadastro'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
