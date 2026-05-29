'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Plus, Search, Users, Headphones, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatConversation } from './ChatLayout'
import { createClient } from '@/lib/supabase/client'

interface ConversationListProps {
    conversations: ChatConversation[]
    selectedId: string | null
    onSelect: (id: string) => void
    onNewConversation: (type: string, participantIds: string[], title?: string, clinicId?: string) => void
    isLoading: boolean
    isSuperAdmin?: boolean
    currentUserId: string
    onlineUsers?: Set<string>
}

function formatMessageTime(dateStr: string): string {
    const date = new Date(dateStr)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return 'Ontem'
    return format(date, 'dd/MM', { locale: ptBR })
}

function getConversationIcon(type: string) {
    switch (type) {
        case 'support': return Headphones
        case 'admin_to_clinic': return Building2
        default: return Users
    }
}

function getConversationTitle(conv: ChatConversation, currentUserId: string): string {
    if (conv.title) return conv.title
    if (conv.type === 'support') return 'Suporte CliniGo'
    const others = conv.participants
        .filter(p => p.user_id !== currentUserId)
        .map(p => p.users?.full_name || 'Usuário')
    return others.join(', ') || 'Conversa'
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    onNewConversation,
    isLoading,
    isSuperAdmin = false,
    currentUserId,
    onlineUsers = new Set(),
}: ConversationListProps) {
    const [search, setSearch] = useState('')
    const [showNewChat, setShowNewChat] = useState(false)
    const [clinicUsers, setClinicUsers] = useState<Array<{ id: string; full_name: string; role: string }>>([])
    const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    
    // Group creation state
    const [showNewGroupModal, setShowNewGroupModal] = useState(false)
    const [groupName, setGroupName] = useState('')
    const [groupSearch, setGroupSearch] = useState('')
    const [selectedGroupUsers, setSelectedGroupUsers] = useState<Set<string>>(new Set())

    const filtered = conversations.filter(c => {
        if (!search) return true
        const title = getConversationTitle(c, currentUserId).toLowerCase()
        return title.includes(search.toLowerCase())
    })

    const loadClinicUsers = async () => {
        setLoadingUsers(true)
        try {
            const supabase = createClient()
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', currentUserId)
                .single()

            if (profile?.clinic_id) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, full_name, role')
                    .eq('clinic_id', profile.clinic_id)
                    .neq('id', currentUserId)
                    .eq('is_active', true)

                setClinicUsers(users || [])
            }

            // If super admin, load clinics
            if (isSuperAdmin) {
                const { data: allClinics } = await supabase
                    .from('clinics')
                    .select('id, name')
                    .eq('is_active', true)
                    .order('name')

                setClinics(allClinics || [])
            }
        } catch (error) {
            console.error('[Chat] Error loading users:', error)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleNewInternal = (userId: string, userName: string) => {
        // Check if conversation already exists with this user
        const existing = conversations.find(c =>
            c.type === 'internal' &&
            c.participants.some(p => p.user_id === userId)
        )
        if (existing) {
            onSelect(existing.id)
        } else {
            onNewConversation('internal', [userId], `Chat com ${userName}`)
        }
        setShowNewChat(false)
    }

    const handleNewSupport = () => {
        // Check if support conversation already exists
        const existing = conversations.find(c => c.type === 'support')
        if (existing) {
            onSelect(existing.id)
        } else {
            onNewConversation('support', [], 'Suporte CliniGo')
        }
        setShowNewChat(false)
    }

    const handleCreateGroup = () => {
        if (selectedGroupUsers.size === 0) return
        onNewConversation('internal', Array.from(selectedGroupUsers), groupName || 'Novo Grupo')
        setShowNewGroupModal(false)
        setShowNewChat(false)
        setSelectedGroupUsers(new Set())
        setGroupName('')
        setGroupSearch('')
    }

    const handleAdminToClinic = async (clinicId: string, clinicName: string) => {
        // Get clinic admin users
        const supabase = createClient()
        const { data: clinicAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('role', 'CLINIC_ADMIN')
            .eq('is_active', true)

        const participantIds = clinicAdmins?.map(u => u.id) || []

        // Check if conversation already exists
        const existing = conversations.find(c =>
            c.type === 'admin_to_clinic' && c.clinic_id === clinicId
        )
        if (existing) {
            onSelect(existing.id)
        } else {
            onNewConversation('admin_to_clinic', participantIds, `Chat com ${clinicName}`, clinicId)
        }
        setShowNewChat(false)
    }

    return (
        <>
            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                        <MessageCircle className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-500 animate-pulse" />
                        Chat Interno
                    </h2>
                    <button
                        onClick={() => {
                            setShowNewChat(!showNewChat)
                            if (!showNewChat) loadClinicUsers()
                        }}
                        className={cn(
                            "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 shadow-md active:scale-95 cursor-pointer",
                            showNewChat 
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-350 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-slate-200/20" 
                                : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-emerald-500/10"
                        )}
                        title="Nova conversa"
                    >
                        <Plus className={cn("w-5 h-5 transition-transform duration-300", showNewChat && "rotate-45")} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar conversa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/80 transition-all text-slate-850 dark:text-slate-100 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* New Chat Panel */}
            {showNewChat && (
                <div className="border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/30 p-4 space-y-3 max-h-64 overflow-y-auto animate-in slide-in-from-top duration-300">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nova Conversa</p>

                    {/* Support button (for non-super-admins) */}
                    {!isSuperAdmin && (
                        <button
                            onClick={handleNewSupport}
                            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 hover:border-emerald-500/20 active:scale-[0.99] transition-all text-left shadow-sm shadow-slate-100/40 dark:shadow-none"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Headphones className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-850 dark:text-slate-100">Falar com Suporte</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Contato com a equipe CliniGo</p>
                            </div>
                        </button>
                    )}

                    {/* New Group Button */}
                    {!isSuperAdmin && clinicUsers.length > 0 && (
                        <button
                            onClick={() => setShowNewGroupModal(true)}
                            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 hover:border-emerald-500/20 active:scale-[0.99] transition-all text-left shadow-sm shadow-slate-100/40 dark:shadow-none"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-850 dark:text-slate-100">Criar Grupo</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Conversa com múltiplos membros</p>
                            </div>
                        </button>
                    )}

                    {/* Clinic users for internal chat */}
                    {clinicUsers.length > 0 && (
                        <>
                            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-3 mb-1">Membros da Clínica</p>
                            <div className="space-y-1.5">
                                {clinicUsers.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleNewInternal(u.id, u.full_name)}
                                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.99] transition-all text-left shadow-sm shadow-slate-100/30 dark:shadow-none"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-500/10 uppercase">
                                            {u.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.full_name}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                                                {(u.role || '').replace('_', ' ').toLowerCase()}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Super admin: choose clinic */}
                    {isSuperAdmin && clinics.length > 0 && (
                        <>
                            <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-3 mb-1">Enviar para Clínica</p>
                            <div className="space-y-1.5">
                                {clinics.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleAdminToClinic(c.id, c.name)}
                                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.99] transition-all text-left shadow-sm shadow-slate-100/30 dark:shadow-none"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {loadingUsers && (
                        <div className="flex items-center justify-center py-4">
                            <span className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                    <div className="h-2.5 bg-slate-100 dark:bg-slate-900/60 rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-3">
                            <MessageCircle className="w-6 h-6 text-slate-400 opacity-60" />
                        </div>
                        <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
                        <p className="text-xs text-slate-400/80 dark:text-slate-500/80 mt-1">Clique em + para iniciar um chat</p>
                    </div>
                ) : (
                    filtered.map(conv => {
                        const Icon = getConversationIcon(conv.type)
                        const title = getConversationTitle(conv, currentUserId)
                        const isSelected = conv.id === selectedId

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className={cn(
                                    "w-full flex items-center gap-3.5 px-4.5 py-4 text-left transition-all border-b border-slate-100/50 dark:border-slate-800/40 relative active:bg-slate-100/50 dark:active:bg-slate-800/40",
                                    isSelected 
                                        ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-l-4 border-emerald-500 shadow-inner" 
                                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <div className={cn(
                                        "w-11 h-11 rounded-full flex items-center justify-center shadow-inner",
                                        conv.type === 'support' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10" :
                                        conv.type === 'admin_to_clinic' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10" :
                                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10"
                                    )}>
                                        <Icon className="w-5.5 h-5.5" />
                                    </div>
                                    
                                    {/* Indicador de presença online com halo pulsante */}
                                    {conv.participants.some(p => p.user_id !== currentUserId && onlineUsers.has(p.user_id)) && (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping duration-1000 opacity-75" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={cn(
                                            "text-sm truncate",
                                            conv.unread_count > 0 
                                                ? "font-bold text-slate-900 dark:text-slate-100" 
                                                : "font-semibold text-slate-700 dark:text-slate-350"
                                        )}>
                                            {title}
                                        </p>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                                            {formatMessageTime(conv.last_message_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className={cn(
                                            "text-xs truncate max-w-[85%]",
                                            conv.unread_count > 0 
                                                ? "text-slate-800 dark:text-slate-200 font-bold" 
                                                : "text-slate-450 dark:text-slate-500"
                                        )}>
                                            {conv.last_message_preview || 'Nova conversa'}
                                        </p>
                                        {conv.unread_count > 0 && (
                                            <span className="shrink-0 ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-bold bg-emerald-600 text-white rounded-full shadow-md shadow-emerald-500/20 animate-bounce">
                                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>

            {/* New Group Modal */}
            {showNewGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Novo Grupo</h3>
                            <button 
                                onClick={() => setShowNewGroupModal(false)} 
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-105 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome do Grupo</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Ex: Equipe Recepção"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-250 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-2">Selecione os Participantes</label>
                                <div className="relative mb-2.5">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        value={groupSearch}
                                        onChange={(e) => setGroupSearch(e.target.value)}
                                        placeholder="Buscar por nome..."
                                        className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950/50 border border-slate-250 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/30 dark:bg-slate-950/10">
                                    {clinicUsers.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">Nenhum usuário disponível.</p>
                                    ) : (
                                        clinicUsers
                                            .filter(user => user.full_name.toLowerCase().includes(groupSearch.toLowerCase()))
                                            .map(user => (
                                                <label key={user.id} className="flex items-center gap-3 p-2.5 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 rounded-xl cursor-pointer transition-colors active:scale-[0.99]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGroupUsers.has(user.id)}
                                                        onChange={(e) => {
                                                            const next = new Set(selectedGroupUsers)
                                                            if (e.target.checked) next.add(user.id)
                                                            else next.delete(user.id)
                                                            setSelectedGroupUsers(next)
                                                        }}
                                                        className="w-4.5 h-4.5 text-emerald-600 focus:ring-emerald-500/30 dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{(user.role || '').replace('_', ' ').toLowerCase()}</p>
                                                    </div>
                                                </label>
                                            ))
                                    )}
                                    {clinicUsers.length > 0 && clinicUsers.filter(user => user.full_name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Nenhum usuário encontrado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewGroupModal(false)}
                                className="px-4.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 active:scale-95 min-h-[44px]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={selectedGroupUsers.size === 0}
                                className="px-4.5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-650 rounded-xl disabled:opacity-40 transition-all duration-200 active:scale-95 min-h-[44px] shadow-md shadow-emerald-650/10"
                            >
                                Criar Grupo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
