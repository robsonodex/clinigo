'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
})

type LoginData = z.infer<typeof loginSchema>

export default function PartnerLoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginData) => {
        setIsLoading(true)

        try {
            const supabase = createClient()

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email ou senha incorretos')
                }
                throw new Error(error.message)
            }

            // Check if user is a partner
            const role = authData.user?.user_metadata?.role
            if (role !== 'PARTNER') {
                await supabase.auth.signOut()
                throw new Error('Esta conta não é de parceiro. Use o login correto.')
            }

            // Get partner_id from metadata or fetch from database
            let partnerId = authData.user?.user_metadata?.partner_id

            if (!partnerId) {
                const { data: partner } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('user_id', authData.user?.id)
                    .single()

                partnerId = partner?.id
            }

            if (!partnerId) {
                await supabase.auth.signOut()
                throw new Error('Parceiro não encontrado. Entre em contato com o suporte.')
            }

            // Register single session (invalidate other devices)
            try {
                await fetch('/api/auth/session/register', { method: 'POST', credentials: 'include' })
            } catch {
                // Non-blocking
            }

            toast.success('Login realizado com sucesso!')
            router.push('/partners/me/dashboard')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <EditorialShell
            minimal
            backHref="/partners"
            backLabel="Voltar para Parceiros"
            rightAction={{ label: 'Quero ser parceiro', href: '/partners/register', accent: true }}
            compactFooter
        >
            <main className="flex-1 flex items-center justify-center px-5 py-12">
                <div className="w-full max-w-md">
                    <div className="text-center mb-7">
                        <div className="mx-auto bg-[#E6F2EE] w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-[#155E4B]" strokeWidth={1.75} />
                        </div>
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-1">
                            PROGRAMA DE PARCEIROS
                        </p>
                        <h1 className="text-2xl font-semibold text-[#0F1F1B] tracking-tight mb-1.5">
                            Área do Parceiro
                        </h1>
                        <p className="text-sm text-[#4B5B56]">
                            Acompanhe suas indicações, clínicas ativas e repasses via Pix
                        </p>
                    </div>

                    <Card className="bg-white border border-[#E6E8E5] shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-[#0F1F1B]">Entrar</CardTitle>
                            <CardDescription className="text-[#4B5B56]">
                                Use o e-mail e a senha cadastrados no programa
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[#0F1F1B]">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="seu@email.com.br"
                                        className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B]"
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-600">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-[#0F1F1B]">Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Sua senha"
                                            className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B] pr-11"
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs text-red-600">{errors.password.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Entrando...
                                        </>
                                    ) : (
                                        'Entrar no Painel do Parceiro'
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 pt-5 border-t border-[#E6E8E5] text-center">
                                <p className="text-sm text-[#4B5B56]">
                                    Ainda não é parceiro?{' '}
                                    <Link href="/partners/register" className="text-[#155E4B] font-semibold hover:underline">
                                        Cadastre-se aqui
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </EditorialShell>
    )
}
