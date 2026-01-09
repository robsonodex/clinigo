'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Loader2, Stethoscope } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PlanCard } from '@/components/plans/plan-card'
import { RegistrationStepper } from '@/components/registration/registration-stepper'
import { PLANS, PLAN_ORDER, type PlanType } from '@/lib/constants/plans'
import { generateSlug } from '@/lib/utils/slug'
import { maskCNPJ, validateCNPJ, cleanCNPJ } from '@/lib/utils/cnpj'

// Validation schemas for each step
const step2Schema = z.object({
    clinic_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cnpj: z.string().refine(validateCNPJ, 'CNPJ inválido'),
    phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
    email: z.string().email('Email inválido'),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug inválido'),
})

const step4Schema = z.object({
    admin_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    admin_email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirm_password: z.string(),
    accept_terms: z.boolean().refine(v => v, 'Você deve aceitar os termos'),
}).refine(data => data.password === data.confirm_password, {
    message: 'Senhas não conferem',
    path: ['confirm_password'],
})

const STEPS = [
    { id: 1, title: 'Plano', description: 'Escolha seu plano' },
    { id: 2, title: 'Clínica', description: 'Dados da clínica' },
    { id: 3, title: 'Endereço', description: 'Localização (opcional)' },
    { id: 4, title: 'Admin', description: 'Seus dados' },
    { id: 5, title: 'Revisão', description: 'Confirme os dados' },
]

type FormData = {
    // Step 1
    plan_type: PlanType
    // Step 2
    clinic_name: string
    cnpj: string
    phone: string
    email: string
    slug: string
    // Step 3
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zip?: string
    // Step 4
    admin_name: string
    admin_email: string
    password: string
    confirm_password: string
    accept_terms: boolean
}

function CadastroContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preselectedPlan = searchParams.get('plan') as PlanType | null

    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<Partial<FormData>>({
        plan_type: preselectedPlan || 'BASIC',
    })

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        defaultValues: formData,
    })

    // Auto-generate slug from clinic name
    const clinicName = watch('clinic_name')
    useEffect(() => {
        if (clinicName && currentStep === 2) {
            const slug = generateSlug(clinicName)
            setValue('slug', slug)
        }
    }, [clinicName, currentStep, setValue])

    const nextStep = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const onSubmitStep = async (data: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...data }))

        if (currentStep === STEPS.length) {
            // Final submission
            await handleFinalSubmit({ ...formData, ...data } as FormData)
        } else {
            nextStep()
        }
    }

    const handleFinalSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/clinics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.clinic_name,
                    slug: data.slug,
                    email: data.email,
                    cnpj: cleanCNPJ(data.cnpj),
                    phone: data.phone,
                    plan_type: data.plan_type,
                    address: {
                        street: data.street,
                        number: data.number,
                        complement: data.complement,
                        neighborhood: data.neighborhood,
                        city: data.city,
                        state: data.state,
                        zip: data.zip,
                    },
                    admin_email: data.admin_email,
                    admin_name: data.admin_name,
                    admin_password: data.password,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao criar clínica')
            }

            toast.success('Clínica criada com sucesso! Redirecionando...')

            // Redirect to success or login
            setTimeout(() => {
                router.push('/login?registered=true')
            }, 1500)
        } catch (error) {
            console.error('Registration error:', error)
            toast.error(error instanceof Error ? error.message : 'Erro ao criar clínica')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xl font-bold text-primary"
                    >
                        <Stethoscope className="w-6 h-6" />
                        CliniGo
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Stepper */}
                <RegistrationStepper
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                    loading={isSubmitting}
                />

                {/* Content */}
                <div className="max-w-5xl mx-auto mt-8">
                    <form onSubmit={handleSubmit(onSubmitStep)}>
                        {/* Step 1: Plan Selection */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold">Escolha seu plano</h2>
                                    <p className="text-muted-foreground mt-2">
                                        Selecione o plano ideal para sua clínica
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {PLAN_ORDER.map((planKey) => {
                                        const plan = PLANS[planKey]
                                        return (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                selected={formData.plan_type === plan.id}
                                                onSelect={() => setFormData(prev => ({ ...prev, plan_type: plan.id }))}
                                            />
                                        )
                                    })}
                                </div>

                                <div className="flex justify-end mt-8">
                                    <Button
                                        type="button"
                                        onClick={nextStep}
                                        size="lg"
                                        disabled={!formData.plan_type}
                                    >
                                        Continuar
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Clinic Data */}
                        {currentStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados da Clínica</CardTitle>
                                    <CardDescription>
                                        Informações básicas sobre sua clínica
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="clinic_name">Nome da Clínica *</Label>
                                            <Input
                                                id="clinic_name"
                                                placeholder="Clínica Exemplo"
                                                {...register('clinic_name', { required: true })}
                                                error={!!errors.clinic_name}
                                            />
                                            {errors.clinic_name && (
                                                <p className="text-xs text-destructive">{errors.clinic_name.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj">CNPJ *</Label>
                                            <Input
                                                id="cnpj"
                                                placeholder="00.000.000/0000-00"
                                                {...register('cnpj', {
                                                    required: true,
                                                    onChange: (e) => {
                                                        e.target.value = maskCNPJ(e.target.value)
                                                    }
                                                })}
                                                error={!!errors.cnpj}
                                            />
                                            {errors.cnpj && (
                                                <p className="text-xs text-destructive">{errors.cnpj.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Telefone *</Label>
                                            <Input
                                                id="phone"
                                                placeholder="11999999999"
                                                {...register('phone', { required: true })}
                                                error={!!errors.phone}
                                            />
                                            {errors.phone && (
                                                <p className="text-xs text-destructive">{errors.phone.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="contato@clinica.com"
                                                {...register('email', { required: true })}
                                                error={!!errors.email}
                                            />
                                            {errors.email && (
                                                <p className="text-xs text-destructive">{errors.email.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="slug">URL da Clínica *</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">clinigo.com/</span>
                                                <Input
                                                    id="slug"
                                                    placeholder="minha-clinica"
                                                    {...register('slug', { required: true })}
                                                    error={!!errors.slug}
                                                    className="flex-1"
                                                />
                                            </div>
                                            {errors.slug && (
                                                <p className="text-xs text-destructive">{errors.slug.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button type="submit" size="lg">
                                            Continuar
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Address (Optional) */}
                        {currentStep === 3 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Endereço</CardTitle>
                                    <CardDescription>
                                        Localização da clínica (opcional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="street">Rua</Label>
                                            <Input id="street" {...register('street')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="number">Número</Label>
                                            <Input id="number" {...register('number')} />
                                        </div>

                                        <div className="space-y-2 md:col-span-3">
                                            <Label htmlFor="complement">Complemento</Label>
                                            <Input id="complement" {...register('complement')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="neighborhood">Bairro</Label>
                                            <Input id="neighborhood" {...register('neighborhood')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="city">Cidade</Label>
                                            <Input id="city" {...register('city')} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="state">Estado</Label>
                                            <Input id="state" maxLength={2} {...register('state')} />
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="ghost" onClick={nextStep}>
                                                Pular
                                            </Button>
                                            <Button type="submit" size="lg">
                                                Continuar
                                                <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 4: Admin Data */}
                        {currentStep === 4 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dados do Administrador</CardTitle>
                                    <CardDescription>
                                        Suas informações de acesso
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="admin_name">Nome Completo *</Label>
                                            <Input
                                                id="admin_name"
                                                placeholder="Dr. João Silva"
                                                {...register('admin_name', { required: true })}
                                                error={!!errors.admin_name}
                                            />
                                            {errors.admin_name && (
                                                <p className="text-xs text-destructive">{errors.admin_name.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="admin_email">Email *</Label>
                                            <Input
                                                id="admin_email"
                                                type="email"
                                                placeholder="seu@email.com"
                                                {...register('admin_email', { required: true })}
                                                error={!!errors.admin_email}
                                            />
                                            {errors.admin_email && (
                                                <p className="text-xs text-destructive">{errors.admin_email.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Senha *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                {...register('password', { required: true })}
                                                error={!!errors.password}
                                            />
                                            {errors.password && (
                                                <p className="text-xs text-destructive">{errors.password.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password">Confirmar Senha *</Label>
                                            <Input
                                                id="confirm_password"
                                                type="password"
                                                placeholder="••••••••"
                                                {...register('confirm_password', { required: true })}
                                                error={!!errors.confirm_password}
                                            />
                                            {errors.confirm_password && (
                                                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="accept_terms"
                                                {...register('accept_terms')}
                                            />
                                            <Label htmlFor="accept_terms" className="text-sm cursor-pointer">
                                                Aceito os <Link href="/termos" className="text-primary hover:underline">termos de uso</Link> e <Link href="/privacidade" className="text-primary hover:underline">política de privacidade</Link>
                                            </Label>
                                        </div>
                                        {errors.accept_terms && (
                                            <p className="text-xs text-destructive">{errors.accept_terms.message}</p>
                                        )}
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button type="submit" size="lg">
                                            Continuar
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Revise seus dados</CardTitle>
                                    <CardDescription>
                                        Verifique se está tudo correto antes de finalizar
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Plan Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Plano Selecionado</h3>
                                        <div className="p-4 bg-muted rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{PLANS[formData.plan_type!].name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {PLANS[formData.plan_type!].tagline}
                                                    </p>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {PLANS[formData.plan_type!].priceLabel}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clinic Data Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Dados da Clínica</h3>
                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                            <p><strong>Nome:</strong> {formData.clinic_name}</p>
                                            <p><strong>CNPJ:</strong> {formData.cnpj}</p>
                                            <p><strong>Email:</strong> {formData.email}</p>
                                            <p><strong>Telefone:</strong> {formData.phone}</p>
                                            <p><strong>URL:</strong> clinigo.com/{formData.slug}</p>
                                        </div>
                                    </div>

                                    {/* Admin Data Summary */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Administrador</h3>
                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                            <p><strong>Nome:</strong> {formData.admin_name}</p>
                                            <p><strong>Email:</strong> {formData.admin_email}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                                            <ArrowLeft className="mr-2 w-4 h-4" />
                                            Voltar
                                        </Button>
                                        <Button type="submit" size="lg" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                    Criando...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="mr-2 w-4 h-4" />
                                                    Criar Minha Clínica
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function CadastroPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
            <CadastroContent />
        </Suspense>
    )
}

