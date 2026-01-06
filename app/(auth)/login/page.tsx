'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginFormSchema, type LoginFormData } from '@/lib/validations'
import { useAuth } from '@/lib/hooks/use-auth'
import { Stethoscope, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const { signIn } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginFormSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            await signIn(data.email, data.password)
            toast.success('Login realizado com sucesso!')
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Email ou senha incorretos'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-2xl font-bold text-primary"
                    >
                        <Stethoscope className="w-8 h-8" />
                        CliniGo
                    </Link>
                    <p className="text-muted-foreground mt-2">
                        Teleconsultoria médica
                    </p>
                </div>

                {/* Login Card */}
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Entrar</CardTitle>
                        <CardDescription>
                            Acesse o painel de gestão
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    autoComplete="email"
                                    error={!!errors.email}
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Senha</Label>
                                    <Link
                                        href="/recuperar-senha"
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    error={!!errors.password}
                                    {...register('password')}
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    'Entrar'
                                )}
                            </Button>
                        </form>
                        <div className="mt-4 text-center text-sm">
                            <span className="text-muted-foreground">Não tem uma conta? </span>
                            <Link
                                href="/sign-up"
                                className="text-primary hover:underline font-medium"
                            >
                                Cadastre-se
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Back link */}
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
