'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, User, Lock, Stethoscope } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
    cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(14, 'CPF inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

function formatCPF(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export default function PatientPortalPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value)
        setValue('cpf', formatted)
    }

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true)
        try {
            const cpf = data.cpf.replace(/\D/g, '')

            const response = await fetch('/api/patient/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpf,
                    password: data.password,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao fazer login')
            }

            toast.success(`Bem-vindo(a), ${result.patient.name}!`)
            router.push('/paciente/meu-painel')

        } catch (error: any) {
            toast.error(error.message || 'Erro ao fazer login')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-emerald-100">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-8 h-8 text-emerald-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Portal do Paciente</CardTitle>
                    <CardDescription>
                        Acesse seu histórico, consultas e agende atendimentos
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
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
                            <Label htmlFor="password">Senha</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Sua senha"
                                    className="pl-10"
                                    {...register('password')}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password.message}</p>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </Button>

                        <div className="text-center text-sm">
                            <span className="text-muted-foreground">Primeira vez aqui? </span>
                            <Link
                                href="/paciente/registro"
                                className="text-emerald-600 hover:underline font-medium"
                            >
                                Criar conta
                            </Link>
                        </div>

                        <Link
                            href="/"
                            className="text-xs text-muted-foreground hover:text-foreground text-center"
                        >
                            Voltar para o início
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
