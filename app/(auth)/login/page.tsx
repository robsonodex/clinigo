'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
    Building2, 
    Stethoscope, 
    User, 
    ArrowRight, 
    Shield, 
    ArrowLeft, 
    Loader2, 
    Lock, 
    Mail, 
    X 
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    const [showSuperAdminModal, setShowSuperAdminModal] = useState(false)
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [isLoadingAdmin, setIsLoadingAdmin] = useState(false)

    // Redirecionamento automatico se usuario ja autenticado
    useEffect(() => {
        let isMounted = true

        async function checkExistingAuth() {
            try {
                // 1. Verificar sessao do portal do paciente
                if (typeof document !== 'undefined' && document.cookie.includes('patient_token=')) {
                    router.replace('/paciente/meu-painel')
                    return
                }

                // 2. Verificar sessao Supabase (clinica, corpo clinico ou super admin)
                const { data: { session } } = await supabase.auth.getSession()
                if (session && isMounted) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .maybeSingle()

                    const userRole = profile?.role

                    if (userRole === 'DOCTOR') {
                        router.replace('/dashboard')
                    } else if (userRole === 'SUPER_ADMIN') {
                        router.replace('/dashboard')
                    } else {
                        router.replace('/dashboard')
                    }
                    return
                }
            } catch {
                // Em caso de instabilidade na checagem, mantem na central de acesso
            } finally {
                if (isMounted) {
                    setIsCheckingSession(false)
                }
            }
        }

        checkExistingAuth()

        return () => {
            isMounted = false
        }
    }, [router, supabase])

    // Fechamento do modal por tecla Escape
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSuperAdminModal(false)
        }
    }, [])

    useEffect(() => {
        if (showSuperAdminModal) {
            window.addEventListener('keydown', handleKeyDown)
        } else {
            window.removeEventListener('keydown', handleKeyDown)
        }
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showSuperAdminModal, handleKeyDown])

    const handleSuperAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!adminEmail || !adminPassword) {
            toast.error('Preencha email e senha.')
            return
        }

        setIsLoadingAdmin(true)
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            })

            if (authError) throw authError

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profile?.role !== 'SUPER_ADMIN') {
                await supabase.auth.signOut()
                throw new Error('Acesso restrito: Este login e exclusivo para Super Administradores da plataforma.')
            }

            try {
                await fetch('/api/auth/session/register', { method: 'POST', credentials: 'include' })
            } catch {
                // Non-blocking
            }

            toast.success('Autenticado com sucesso.')
            router.push('/dashboard')
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Credenciais invalidas.'
            )
        } finally {
            setIsLoadingAdmin(false)
        }
    }

    const portals = [
        {
            title: 'Portal da Clinica',
            description: 'Acesso para diretores, administradores de unidade e equipe de recepcao.',
            href: '/clinica',
            icon: Building2,
            badge: 'Gestao e Recepcao',
            actionText: 'Acessar Portal da Clinica',
        },
        {
            title: 'Portal do Medico',
            description: 'Acesso profissional para medicos, terapeutas, psicologos e especialistas.',
            href: '/medico',
            icon: Stethoscope,
            badge: 'Corpo Clinico e Terapeutas',
            actionText: 'Acessar Portal do Medico',
        },
        {
            title: 'Portal do Paciente',
            description: 'Area do paciente e responsaveis para agendamentos, documentos e historico.',
            href: '/paciente',
            icon: User,
            badge: 'Pacientes e Responsaveis',
            actionText: 'Acessar Portal do Paciente',
        },
    ]

    if (isCheckingSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
                <Link href="/" className="inline-flex items-center gap-2 focus:outline-none min-h-[44px]">
                    <Image
                        src="/logo_black.svg"
                        alt="CliniGo"
                        width={180}
                        height={46}
                        className="h-10 sm:h-12 w-auto"
                        priority
                    />
                </Link>
                <Link
                    href="/"
                    className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 font-medium transition-colors min-h-[44px] px-2 py-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao inicio
                </Link>
            </header>

            <main className="w-full max-w-5xl mx-auto my-auto py-8">
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                        Central de Acesso CliniGo
                    </h1>
                    <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
                        Selecione o portal correspondente ao seu perfil de usuario para realizar login com seguranca.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                    {portals.map((portal) => {
                        const Icon = portal.icon
                        return (
                            <Link
                                key={portal.href}
                                href={portal.href}
                                className="group relative flex flex-col justify-between bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[220px]"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                            {portal.badge}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                        {portal.title}
                                    </h2>
                                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                        {portal.description}
                                    </p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-medium text-emerald-700 group-hover:text-emerald-800 min-h-[44px]">
                                    <span>{portal.actionText}</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </main>

            <footer className="w-full max-w-5xl mx-auto py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                <p>CliniGo Plataforma Medica e Gestao Clinica. Todos os direitos reservados.</p>
                <button
                    type="button"
                    onClick={() => setShowSuperAdminModal(true)}
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors underline-offset-4 hover:underline focus:outline-none min-h-[44px] px-2"
                >
                    <Shield className="w-3.5 h-3.5" />
                    Acesso Super Administrador
                </button>
            </footer>

            {showSuperAdminModal && (
                <div 
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowSuperAdminModal(false)
                        }
                    }}
                >
                    <div 
                        className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        <button
                            type="button"
                            onClick={() => setShowSuperAdminModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 focus:outline-none p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Fechar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-slate-700" />
                            <h3 className="text-lg font-bold text-slate-900">Acesso Tecnico Restrito</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-6">
                            Exclusivo para Super Administradores da infraestrutura CliniGo.
                        </p>
                        <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-700">Email institucional</Label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                    <Input
                                        id="admin-email"
                                        type="email"
                                        placeholder="admin@clinigo.app"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        className="pl-9 text-sm h-11"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-password" className="text-xs font-semibold text-slate-700">Chave de acesso</Label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                    <Input
                                        id="admin-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="pl-9 text-sm h-11"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoadingAdmin}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium h-11 mt-2"
                            >
                                {isLoadingAdmin ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Autenticando...
                                    </>
                                ) : (
                                    'Entrar no Painel Global'
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
