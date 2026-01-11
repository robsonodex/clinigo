'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Stethoscope, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginFormSchema, type LoginFormData } from '@/lib/validations'
import { useAuth } from '@/lib/hooks/use-auth'

export default function MedicoLoginPage() {
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
            // Redirect is handled by auth state change or middleware usually, 
            // but we can push to dashboard just in case
            router.push('/dashboard')
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-2xl font-bold text-white"
                    >
                        <Stethoscope className="w-8 h-8" />
                        CliniGo
                    </Link>
                </div>

                {/* Login Card */}
                <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-gray-900">Portal do Médico</CardTitle>
                        <CardDescription>
                            Acesse sua agenda e prontuários
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
                                        className="text-xs text-emerald-600 hover:underline"
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
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" />
                                        Entrando...
                                    </>
                                ) : (
                                    'Acessar Portal'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Back link */}
                <div className="text-center mt-6">
                    <Link
                        href="/"
                        className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao início
                    </Link>
                </div>
            </div>
        </div>
    )
}
