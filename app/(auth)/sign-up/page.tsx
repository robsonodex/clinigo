'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/use-auth'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const signUpSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
})

type SignUpFormData = z.infer<typeof signUpSchema>

export default function SignUpPage() {
    const router = useRouter()
    const { signUp } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

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
        <EditorialShell
            minimal
            backHref="/"
            backLabel="Voltar ao início"
            rightAction={{ label: 'Entrar', href: '/login' }}
            compactFooter
        >
            <main className="flex-1 flex items-center justify-center px-5 py-12">
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                        <Link href="/" className="inline-flex justify-center mb-4">
                            <Image
                                src="/logo_black.svg"
                                alt="CliniGo"
                                width={156}
                                height={48}
                                priority
                                unoptimized
                                className="h-[46px] w-auto object-contain"
                            />
                        </Link>
                        <p className="text-sm text-[#4B5B56]">
                            Crie sua conta de acesso à plataforma CliniGo
                        </p>
                    </div>

                    <Card className="bg-white border border-[#E6E8E5] shadow-sm">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-xl text-[#0F1F1B]">Cadastre-se</CardTitle>
                            <CardDescription className="text-[#4B5B56]">
                                Preencha seus dados para iniciar o acesso
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name" className="text-[#0F1F1B]">Nome Completo</Label>
                                    <Input
                                        id="full_name"
                                        placeholder="Mariana Alves"
                                        className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] focus-visible:ring-[#155E4B]"
                                        error={!!errors.full_name}
                                        {...register('full_name')}
                                    />
                                    {errors.full_name && (
                                        <p className="text-xs text-destructive">
                                            {errors.full_name.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[#0F1F1B]">E-mail</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com.br"
                                        className="min-h-[44px] bg-[#FAFAF8] border-[#E6E8E5] focus-visible:ring-[#155E4B]"
                                        error={!!errors.email}
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-destructive">
                                            {errors.email.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-[#0F1F1B]">Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Mínimo 6 caracteres"
                                            className="min-h-[44px] pr-11 bg-[#FAFAF8] border-[#E6E8E5] focus-visible:ring-[#155E4B]"
                                            error={!!errors.password}
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs text-destructive">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="confirmPassword" className="text-[#0F1F1B]">Confirmar Senha</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="Repita a senha"
                                            className="min-h-[44px] pr-11 bg-[#FAFAF8] border-[#E6E8E5] focus-visible:ring-[#155E4B]"
                                            error={!!errors.confirmPassword}
                                            {...register('confirmPassword')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-destructive">
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Criando conta...
                                        </>
                                    ) : (
                                        'Criar conta'
                                    )}
                                </Button>

                                <div className="mt-4 pt-4 border-t border-[#E6E8E5] text-center text-sm space-y-2">
                                    <p>
                                        <span className="text-[#4B5B56]">Já tem uma conta? </span>
                                        <Link
                                            href="/login"
                                            className="text-[#155E4B] hover:underline font-semibold"
                                        >
                                            Entrar
                                        </Link>
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">
                                        Quer testar a plataforma com sua clínica?{' '}
                                        <Link href="/trial" className="text-[#155E4B] hover:underline font-medium">
                                            Iniciar teste grátis de 7 dias
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="text-center mt-6">
                        <Link
                            href="/"
                            className="text-sm text-[#4B5B56] hover:text-[#0F1F1B] inline-flex items-center gap-1.5 min-h-[44px] px-3"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao início
                        </Link>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
