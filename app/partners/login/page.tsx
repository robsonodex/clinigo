'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Eye, EyeOff, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória')
})

type LoginData = z.infer<typeof loginSchema>

export default function PartnerLoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginData>({
        resolver: zodResolver(loginSchema)
    })

    const onSubmit = async (data: LoginData) => {
        setIsLoading(true)

        try {
            const supabase = createClient()

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
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
                // Fetch partner_id from database using user_id
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

            toast.success('Login realizado com sucesso!')
            router.push(`/partners/${partnerId}/dashboard`)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-navy-deep">
            {/* Header */}
            <div className="border-b border-slate-800">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center">
                        <img src="/logo_white.svg" alt="CliniGo" className="h-8 w-auto" />
                    </Link>
                    <Link href="/partners" className="text-sm text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Voltar
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-73px)]">
                <div className="w-full max-w-md">
                    {/* Logo/Icon */}
                    <div className="text-center mb-8">
                        <div className="mx-auto bg-teal-vibrant/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-teal-vibrant" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Área do Parceiro</h1>
                        <p className="text-slate-400">
                            Acesse seu painel para acompanhar suas vendas e comissões
                        </p>
                    </div>

                    {/* Login Form */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Entrar</CardTitle>
                            <CardDescription className="text-slate-400">
                                Use seu email e senha cadastrados
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-400">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-300">Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Sua senha"
                                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs text-red-400">{errors.password.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-teal-vibrant hover:bg-teal-vibrant/90 text-navy-deep font-bold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Entrando...
                                        </>
                                    ) : (
                                        'Entrar'
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                                <p className="text-sm text-slate-400">
                                    Ainda não é parceiro?{' '}
                                    <Link href="/partners/register" className="text-teal-vibrant hover:underline">
                                        Cadastre-se aqui
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
