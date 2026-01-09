'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, User, Lock, Mail, Stethoscope, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const registerSchema = z.object({
    cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

function formatCPF(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export default function PatientRegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    })

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value)
        setValue('cpf', formatted)
    }

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true)
        try {
            const cpf = data.cpf.replace(/\D/g, '')

            const response = await fetch('/api/patient/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpf,
                    email: data.email,
                    password: data.password,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao criar conta')
            }

            toast.success('Conta criada com sucesso!')
            router.push('/paciente/entrar')

        } catch (error: any) {
            toast.error(error.message || 'Erro ao criar conta')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Criar Conta</CardTitle>
                    <CardDescription>
                        Cadastre-se para acessar o Portal do Paciente
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <strong>Importante:</strong> Você precisa ter sido atendido em uma clínica CliniGo para criar sua conta.
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="cpf"
                                    placeholder="000.000.000-00"
                                    className="pl-10"
                                    {...register('cpf')}
                                    onChange={handleCPFChange}
                                />
                            </div>
                            {errors.cpf && (
                                <p className="text-xs text-destructive">{errors.cpf.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-10"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    className="pl-10"
                                    {...register('password')}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Repita a senha"
                                    className="pl-10"
                                    {...register('confirmPassword')}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando conta...
                                </>
                            ) : (
                                'Criar Conta'
                            )}
                        </Button>

                        <Link
                            href="/paciente/entrar"
                            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Já tenho conta
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

