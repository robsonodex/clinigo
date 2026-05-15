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
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-sky-600" />
                        Chat
                    </h2>
                    <button
                        onClick={() => {
                            setShowNewChat(!showNewChat)
                            if (!showNewChat) loadClinicUsers()
                        }}
                        className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
                        title="Nova conversa"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar conversa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                </div>
            </div>

            {/* New Chat Panel */}
            {showNewChat && (
                <div className="border-b border-gray-200 bg-sky-50/60 p-3 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nova Conversa</p>

                    {/* Support button (for non-super-admins) */}
                    {!isSuperAdmin && (
                        <button
                            onClick={handleNewSupport}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-sky-50 hover:border-sky-300 transition-colors text-left"
                        >
                            <Headphones className="w-5 h-5 text-sky-600" />
                            <div>
                                <p className="text-sm font-medium">Falar com Suporte</p>
                                <p className="text-xs text-gray-500">Contato com a equipe CliniGo</p>
                            </div>
                        </button>
                    )}

                    {/* New Group Button */}
                    {!isSuperAdmin && clinicUsers.length > 0 && (
                        <button
                            onClick={() => setShowNewGroupModal(true)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-sky-50 hover:border-sky-300 transition-colors text-left"
                        >
                            <Users className="w-5 h-5 text-sky-600" />
                            <div>
                                <p className="text-sm font-medium">Criar Grupo</p>
                                <p className="text-xs text-gray-500">Conversa com múltiplos membros</p>
                            </div>
                        </button>
                    )}

                    {/* Clinic users for internal chat */}
                    {clinicUsers.length > 0 && (
                        <>
                            <p className="text-xs text-gray-500 mt-2">Membros da Clínica</p>
                            {clinicUsers.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleNewInternal(u.id, u.full_name)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                        {u.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{u.full_name}</p>
                                        <p className="text-xs text-gray-500">{u.role}</p>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}

                    {/* Super admin: choose clinic */}
                    {isSuperAdmin && clinics.length > 0 && (
                        <>
                            <p className="text-xs text-gray-500 mt-2">Enviar para Clínica</p>
                            {clinics.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleAdminToClinic(c.id, c.name)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                    <p className="text-sm font-medium">{c.name}</p>
                                </button>
                            ))}
                        </>
                    )}

                    {loadingUsers && (
                        <p className="text-xs text-gray-400 text-center py-2">Carregando...</p>
                    )}
                </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                    <div className="h-2 bg-gray-100 rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                        <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma conversa</p>
                        <p className="text-xs mt-1">Clique em + para iniciar</p>
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
                                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 hover:bg-gray-50",
                                    isSelected && "bg-sky-50 border-l-2 border-l-sky-500"
                                )}
                            >
                                <div className="relative">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                        conv.type === 'support' ? "bg-amber-100 text-amber-700" :
                                        conv.type === 'admin_to_clinic' ? "bg-emerald-100 text-emerald-700" :
                                        "bg-sky-100 text-sky-700"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    {/* Indicador de presença online */}
                                    {conv.participants.some(p => p.user_id !== currentUserId && onlineUsers.has(p.user_id)) && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={cn(
                                            "text-sm truncate",
                                            conv.unread_count > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                                        )}>
                                            {title}
                                        </p>
                                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                                            {formatMessageTime(conv.last_message_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className={cn(
                                            "text-xs truncate",
                                            conv.unread_count > 0 ? "text-gray-600 font-medium" : "text-gray-400"
                                        )}>
                                            {conv.last_message_preview || 'Nova conversa'}
                                        </p>
                                        {conv.unread_count > 0 && (
                                            <span className="shrink-0 ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-sky-600 text-white rounded-full">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-gray-900">Novo Grupo</h3>
                            <button onClick={() => setShowNewGroupModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Ex: Equipe Recepção"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione os Participantes</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={groupSearch}
                                        onChange={(e) => setGroupSearch(e.target.value)}
                                        placeholder="Buscar por nome..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                                    {clinicUsers.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário disponível.</p>
                                    ) : (
                                        clinicUsers
                                            .filter(user => user.full_name.toLowerCase().includes(groupSearch.toLowerCase()))
                                            .map(user => (
                                                <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-sky-50 rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedGroupUsers.has(user.id)}
                                                        onChange={(e) => {
                                                            const next = new Set(selectedGroupUsers)
                                                            if (e.target.checked) next.add(user.id)
                                                            else next.delete(user.id)
                                                            setSelectedGroupUsers(next)
                                                        }}
                                                        className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{(user.role || '').replace('_', ' ').toLowerCase()}</p>
                                                    </div>
                                                </label>
                                            ))
                                    )}
                                    {clinicUsers.length > 0 && clinicUsers.filter(user => user.full_name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário encontrado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewGroupModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={selectedGroupUsers.size === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 transition-colors"
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
