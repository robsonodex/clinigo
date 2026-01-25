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
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
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
            // Direct sign in to check role before redirecting
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (authError) throw authError

            // Check db role
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profile?.role !== 'SUPER_ADMIN') {
                await supabase.auth.signOut()
                throw new Error('Acesso restrito: Apenas Super Administradores.')
            }

            // Force reload to update auth state
            toast.success('Login realizado com sucesso!')
            router.push('/dashboard')
            router.refresh()

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
                        className="inline-flex items-center gap-2"
                    >
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={200}
                            height={52}
                            className="h-14 w-auto"
                        />
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
                                href="/cadastro"
                                className="text-primary hover:underline font-medium"
                            >
                                Cadastre sua clínica
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Notice for clinic users */}
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-sm text-amber-800">
                        <strong>Usuário de clínica?</strong>{' '}
                        <Link href="/clinica" className="text-amber-900 underline font-medium hover:text-amber-700">
                            Acesse aqui
                        </Link>
                    </p>
                </div>

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

