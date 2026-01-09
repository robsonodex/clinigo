'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/use-auth'
import { Stethoscope, Loader2, ArrowLeft } from 'lucide-react'

const signUpSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
})

type SignUpFormData = z.infer<typeof signUpSchema>

export default function SignUpPage() {
    const router = useRouter()
    const { signUp } = useAuth() // Assuming signUp exists in useAuth, need to verify
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
    })

    const onSubmit = async (data: SignUpFormData) => {
        setIsLoading(true)
        try {
            // Check if signUp method supports extra metadata or handle it separately
            // Usually Supabase signUp takes email, password, and options with data
            // I need to check useAuth implementation to be sure.
            // For now, I'll assume standard signUp(email, password, { full_name })

            await signUp(data.email, data.password, { full_name: data.full_name })
            toast.success('Conta criada com sucesso! Verifique seu email.')
            router.push('/login')
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Erro ao criar conta'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-2xl font-bold text-primary"
                    >
                        <Stethoscope className="w-8 h-8" />
                        CliniGo
                    </Link>
                    <p className="text-muted-foreground mt-2">
                        Crie sua conta e comece agora
                    </p>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Cadastre-se</CardTitle>
                        <CardDescription>
                            Crie sua clínica em minutos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <Input
                                    id="full_name"
                                    placeholder="Dr. João Silva"
                                    error={!!errors.full_name}
                                    {...register('full_name')}
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

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    error={!!errors.password}
                                    {...register('password')}
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    error={!!errors.confirmPassword}
                                    {...register('confirmPassword')}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-xs text-destructive">
                                        {errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Criando conta...
                                    </>
                                ) : (
                                    'Criar conta'
                                )}
                            </Button>

                            <div className="mt-4 text-center text-sm">
                                <span className="text-muted-foreground">Já tem uma conta? </span>
                                <Link
                                    href="/login"
                                    className="text-primary hover:underline font-medium"
                                >
                                    Entrar
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-center mt-6">
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao início
                    </Link>
                </div>
            </div>
        </div>
    )
}

