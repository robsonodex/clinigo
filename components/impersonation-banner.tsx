'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Eye,
    EyeOff,
    LogOut,
    Loader2,
    Shield,
    Users,
    ChevronUp,
    Search,
    Check,
    X,
} from 'lucide-react'
import { clearAuthCache } from '@/components/providers/AuthProvider'

interface ClinicUserOption {
    id: string
    full_name: string | null
    email: string | null
    role: string
    is_coordinator?: boolean
}

const ROLE_LABELS: Record<string, string> = {
    CLINIC_ADMIN: 'Admin',
    DOCTOR: 'Profissional',
    RECEPTIONIST: 'Recepção',
    FINANCIAL: 'Financeiro',
    READONLY: 'Leitura',
}

const QUICK_ROLES = [
    { key: 'CLINIC_ADMIN', label: 'Admin' },
    { key: 'RECEPTIONIST', label: 'Recepção' },
    { key: 'DOCTOR', label: 'Profissional' },
    { key: 'FINANCIAL', label: 'Financeiro' },
    { key: 'READONLY', label: 'Leitura' },
]

function readCookiesMap(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    return document.cookie.split(';').reduce((acc, cookie) => {
        const idx = cookie.indexOf('=')
        if (idx === -1) return acc
        const key = cookie.slice(0, idx).trim()
        const value = cookie.slice(idx + 1).trim()
        if (key) acc[key] = decodeURIComponent(value || '')
        return acc
    }, {} as Record<string, string>)
}

/**
 * ImpersonationBanner (Dock Flutuante Discreto Super Admin 2.0)
 *
 * - ZERO barra no topo: preserva 100% o layout original da clínica sem deslocamento visual.
 * - Visível exclusivamente no navegador do Super Admin quando há sessão de espelho ativa.
 * - Permite:
 *   1. Trocar de perfil/usuário ao vivo (Hot-Switch) sem voltar ao Master Hub;
 *   2. Minimizar para um ícone mínimo discreto (Modo Invisível para prints/vídeos);
 *   3. Encerrar a sessão silenciosamente em 1 clique.
 */
export function ImpersonationBanner() {
    const router = useRouter()
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [clinicName, setClinicName] = useState<string | null>(null)
    const [targetName, setTargetName] = useState<string | null>(null)
    const [targetRole, setTargetRole] = useState<string>('CLINIC_ADMIN')
    const [targetUserId, setTargetUserId] = useState<string | null>(null)

    const [minimized, setMinimized] = useState(false)
    const [switcherOpen, setSwitcherOpen] = useState(false)
    const [ending, setEnding] = useState(false)
    const [switching, setSwitching] = useState(false)

    const [clinicUsers, setClinicUsers] = useState<ClinicUserOption[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('ALL')

    useEffect(() => {
        const c = readCookiesMap()
        if (c['impersonation_active'] === 'true' && c['impersonation_clinic_id']) {
            setClinicId(c['impersonation_clinic_id'])
            setClinicName(c['impersonation_clinic_name'] || 'Clínica')
            setTargetRole(c['impersonation_target_role'] || 'CLINIC_ADMIN')
            setTargetName(c['impersonation_target_name'] || null)
            setTargetUserId(c['impersonation_target_user_id'] || null)

            try {
                if (sessionStorage.getItem('clinigo_imp_dock_min') === '1') {
                    setMinimized(true)
                }
            } catch {
                // ignore
            }
        }
    }, [])

    const toggleMinimized = (next: boolean) => {
        setMinimized(next)
        if (next) setSwitcherOpen(false)
        try {
            sessionStorage.setItem('clinigo_imp_dock_min', next ? '1' : '0')
        } catch {
            // ignore
        }
    }

    const loadClinicUsers = useCallback(async () => {
        if (!clinicId || clinicUsers.length > 0) return
        setLoadingUsers(true)
        try {
            const res = await fetch(`/api/super-admin/impersonation?clinic_users_for=${encodeURIComponent(clinicId)}`, {
                cache: 'no-store',
            })
            if (res.ok) {
                const json = await res.json()
                setClinicUsers(json.data?.users || [])
            }
        } catch {
            // ignore
        } finally {
            setLoadingUsers(false)
        }
    }, [clinicId, clinicUsers.length])

    const handleOpenSwitcher = () => {
        const next = !switcherOpen
        setSwitcherOpen(next)
        if (next) {
            loadClinicUsers()
        }
    }

    const handleHotSwitch = async (params: { target_user_id?: string | null; target_role?: string | null }) => {
        setSwitching(true)
        try {
            const res = await fetch('/api/super-admin/impersonation', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            })
            if (res.ok) {
                clearAuthCache()
                window.location.href = '/dashboard'
            }
        } catch (err) {
            console.error('[ImpersonationDock] Erro ao trocar perfil:', err)
        } finally {
            setSwitching(false)
        }
    }

    const handleEndSession = async () => {
        setEnding(true)
        try {
            await fetch('/api/super-admin/impersonation/current', {
                method: 'DELETE',
            })
        } catch {
            // fallback abaixo limpa cookies
        }

        const expired = 'path=/; max-age=0'
        document.cookie = `impersonation_clinic_id=; ${expired}`
        document.cookie = `impersonation_clinic_name=; ${expired}`
        document.cookie = `impersonation_active=; ${expired}`
        document.cookie = `impersonation_target_user_id=; ${expired}`
        document.cookie = `impersonation_target_role=; ${expired}`
        document.cookie = `impersonation_target_name=; ${expired}`

        clearAuthCache()
        setEnding(false)
        router.push('/system-master-hub')
        router.refresh()
    }

    const filteredUsers = useMemo(() => {
        const q = userSearch.trim().toLowerCase()
        return clinicUsers.filter((u) => {
            if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
            if (!q) return true
            return (
                (u.full_name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            )
        })
    }, [clinicUsers, userSearch, roleFilter])

    if (!clinicId || !clinicName) return null

    // Modo Invisível / Minimizado: apenas um ponto discreto de 36px no canto inferior direito
    if (minimized) {
        return (
            <button
                type="button"
                onClick={() => toggleMinimized(false)}
                title={`Espelho ativo: ${clinicName} (${ROLE_LABELS[targetRole] || targetRole}) — Clique para expandir`}
                className="fixed bottom-4 right-4 z-[60] w-9 h-9 rounded-full bg-[#0F1F1B]/85 hover:bg-[#0F1F1B] text-white border border-white/15 shadow-lg backdrop-blur flex items-center justify-center transition-all cursor-pointer mb-[env(safe-area-inset-bottom)]"
            >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)] mb-[env(safe-area-inset-bottom)]">
            {/* Popover de Troca de Perfil Ao Vivo */}
            {switcherOpen && (
                <div className="w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-[#D8DFDC] rounded-xl shadow-2xl overflow-hidden text-[#0F1F1B]">
                    <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E4E7E4] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0F1F1B] truncate">{clinicName}</p>
                            <p className="text-[11px] text-[#4B5B56]">Trocar perfil silenciosamente em 1 clique</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSwitcherOpen(false)}
                            className="p-1 rounded hover:bg-[#E4E7E4]/60 text-[#4B5B56] cursor-pointer"
                            aria-label="Fechar seletor de perfil"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Atalhos rápidos por papel */}
                    <div className="px-3 pt-3 pb-2 border-b border-[#E4E7E4] flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setRoleFilter('ALL')}
                            className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                                roleFilter === 'ALL'
                                    ? 'bg-[#0F1F1B] text-white border-[#0F1F1B]'
                                    : 'bg-white text-[#4B5B56] border-[#D8DFDC] hover:bg-[#FAFAF8]'
                            }`}
                        >
                            Todos
                        </button>
                        {QUICK_ROLES.map((r) => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => setRoleFilter(r.key)}
                                className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                                    roleFilter === r.key
                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                        : 'bg-white text-[#4B5B56] border-[#D8DFDC] hover:bg-[#FAFAF8]'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Busca */}
                    <div className="p-3 pb-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[#6B7B76] absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Buscar usuário desta clínica..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAF8] border border-[#D8DFDC] rounded-md focus:outline-none focus:border-[#155E4B]"
                            />
                        </div>
                    </div>

                    {/* Lista de usuários reais */}
                    <div className="max-h-60 overflow-y-auto px-2 pb-2 space-y-1">
                        {loadingUsers ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#4B5B56]">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Carregando perfis...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="py-4 px-2 text-center space-y-2">
                                <p className="text-xs text-[#6B7B76]">Nenhum usuário listado para este filtro.</p>
                                {roleFilter !== 'ALL' && (
                                    <button
                                        type="button"
                                        disabled={switching}
                                        onClick={() => handleHotSwitch({ target_user_id: null, target_role: roleFilter })}
                                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#155E4B] text-white hover:bg-[#0F493A] cursor-pointer"
                                    >
                                        Simular perfil {ROLE_LABELS[roleFilter] || roleFilter}
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredUsers.map((u) => {
                                const isCurrent = targetUserId === u.id
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        disabled={switching}
                                        onClick={() =>
                                            handleHotSwitch({ target_user_id: u.id, target_role: u.role })
                                        }
                                        className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                            isCurrent
                                                ? 'bg-[#EEF5F2] border border-[#C5DDD3]'
                                                : 'hover:bg-[#FAFAF8] border border-transparent'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-[#0F1F1B] truncate">
                                                {u.full_name || u.email || 'Usuário'}
                                            </p>
                                            <p className="text-[11px] text-[#6B7B76] truncate">{u.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F3F4F2] text-[#4B5B56] border border-[#E4E7E4]">
                                                {ROLE_LABELS[u.role] || u.role}
                                            </span>
                                            {isCurrent && <Check className="w-3.5 h-3.5 text-[#155E4B]" />}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>

                    <div className="px-3 py-2.5 bg-[#FAFAF8] border-t border-[#E4E7E4] flex items-center justify-between gap-2">
                        <a
                            href="/system-master-hub"
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#155E4B] hover:underline"
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Abrir Master Hub
                        </a>
                        <button
                            type="button"
                            disabled={ending}
                            onClick={handleEndSession}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                        >
                            {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                            Encerrar Espelho
                        </button>
                    </div>
                </div>
            )}

            {/* Pill Flutuante Discreto */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0F1F1B]/92 text-white border border-white/15 shadow-xl backdrop-blur-md">
                <button
                    type="button"
                    onClick={handleOpenSwitcher}
                    disabled={switching}
                    className="flex items-center gap-2 pl-1 pr-1.5 py-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer max-w-[230px]"
                    title="Clique para trocar de perfil nesta clínica"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs font-medium truncate">{clinicName}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-emerald-200 shrink-0">
                        {ROLE_LABELS[targetRole] || targetRole}
                    </span>
                    {switching ? (
                        <Loader2 className="w-3 h-3 animate-spin shrink-0 text-white/80" />
                    ) : (
                        <ChevronUp
                            className={`w-3.5 h-3.5 shrink-0 text-white/70 transition-transform ${
                                switcherOpen ? 'rotate-180' : ''
                            }`}
                        />
                    )}
                </button>

                <span className="w-px h-4 bg-white/15" />

                <button
                    type="button"
                    onClick={handleOpenSwitcher}
                    title={targetName ? `Perfil atual: ${targetName} — Trocar perfil` : 'Trocar perfil'}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                    <Users className="w-3.5 h-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => toggleMinimized(true)}
                    title="Ocultar dock discreto (Modo Invisível)"
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                    <EyeOff className="w-3.5 h-3.5" />
                </button>

                <button
                    type="button"
                    onClick={handleEndSession}
                    disabled={ending}
                    title="Sair do modo espelho e voltar ao Master Hub"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/12 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                    {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                    <span>Sair</span>
                </button>
            </div>
        </div>
    )
}
