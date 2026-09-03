'use client'

import { useState } from 'react'
import { Check, Pencil, Trash2, Copy, Download, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { ChatMessage } from './ChatLayout'

interface MessageBubbleProps {
    message: ChatMessage
    isOwn: boolean
    showAvatar: boolean
    isEditing: boolean
    editContent: string
    onEditContentChange: (content: string) => void
    onStartEdit: () => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: () => void
}

export function MessageBubble({
    message,
    isOwn,
    showAvatar,
    isEditing,
    editContent,
    onEditContentChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false)

    if (message.is_deleted) {
        return (
            <div className={cn("flex", isOwn ? "justify-end" : "justify-start", !showAvatar && "ml-10")}>
                <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs italic max-w-xs">
                    🗑️ Mensagem apagada
                </div>
            </div>
        )
    }

    const time = format(new Date(message.created_at), 'HH:mm', { locale: ptBR })
    const senderName = message.sender?.full_name || 'Usuário'
    const initials = senderName.charAt(0).toUpperCase()

    const renderContent = () => {
        if (isEditing) {
            return (
                <div className="space-y-2">
                    <textarea
                        value={editContent}
                        onChange={e => onEditContentChange(e.target.value)}
                        className="w-full text-sm resize-none border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        rows={2}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                onSaveEdit()
                            }
                            if (e.key === 'Escape') onCancelEdit()
                        }}
                    />
                    <div className="flex items-center gap-1 justify-end">
                        <button
                            onClick={onCancelEdit}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={onSaveEdit}
                            className="p-1 rounded text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )
        }

        switch (message.message_type) {
            case 'image':
                return (
                    <div className="space-y-1 py-1">
                        {message.attachment_url && (
                            <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200/30 dark:border-slate-800/60 shadow-md">
                                <img
                                    src={message.attachment_url}
                                    alt={message.attachment_name || 'Imagem'}
                                    className="max-w-[280px] w-full rounded-xl cursor-pointer hover:scale-[1.03] active:scale-[0.99] transition-all duration-300 object-cover"
                                    loading="lazy"
                                />
                            </a>
                        )}
                    </div>
                )

            case 'document':
                return (
                    <a
                        href={message.attachment_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 shadow-sm max-w-xs",
                            isOwn 
                                ? "bg-white/10 border-white/20 hover:bg-white/15 text-white" 
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-250"
                        )}
                    >
                        <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-inner",
                            isOwn ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                            <Download className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">
                                {message.attachment_name || 'Documento'}
                            </p>
                            {message.attachment_size && (
                                <p className="text-[10px] opacity-75 mt-0.5">
                                    {(message.attachment_size / 1024).toFixed(0)} KB
                                </p>
                            )}
                        </div>
                    </a>
                )

            case 'audio':
                return (
                    <div className={cn(
                        "min-w-[240px] p-2.5 rounded-xl border flex items-center gap-3 shadow-inner",
                        isOwn 
                            ? "bg-white/10 border-white/10 text-white" 
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200/40 dark:border-slate-800/80 text-slate-800 dark:text-slate-250"
                    )}>
                        {message.attachment_url && (
                            <div className="w-full flex items-center gap-2">
                                <audio
                                    controls
                                    className="w-full h-8 custom-audio-player opacity-90"
                                    preload="metadata"
                                >
                                    <source src={message.attachment_url} />
                                    Seu navegador não suporta áudio.
                                </audio>
                            </div>
                        )}
                    </div>
                )

            default:
                return (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                    </p>
                )
        }
    }

    return (
        <div
            className={cn(
                "flex gap-3 group animate-in fade-in duration-300 slide-in-from-bottom-1 relative",
                isOwn ? "justify-end" : "justify-start",
                showAvatar ? "mt-4" : "mt-1"
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar (left - other users) */}
            {!isOwn && showAvatar && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/10 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 uppercase">
                    {initials}
                </div>
            )}
            {!isOwn && !showAvatar && <div className="w-9 shrink-0" />}

            <div className={cn("max-w-[70%] min-w-[100px]", isOwn && "order-first")}>
                {/* Sender name */}
                {!isOwn && showAvatar && (
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1 ml-1 uppercase">
                        {senderName}
                    </p>
                )}

                {/* Bubble */}
                <div className="relative">
                    <div
                        className={cn(
                            "rounded-2xl px-4 py-2.5 relative shadow-sm transition-all duration-300",
                            isOwn
                                ? "bg-gradient-to-tr from-emerald-600 to-teal-650 dark:from-emerald-500 dark:to-teal-600 text-white rounded-tr-sm shadow-emerald-500/5 hover:shadow-emerald-500/10"
                                : "bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm hover:border-slate-350 dark:hover:border-slate-700 shadow-slate-100/50 dark:shadow-none"
                        )}
                    >
                        {renderContent()}

                        {/* Time + edited indicator */}
                        <div className={cn(
                            "flex items-center gap-1 mt-1 justify-end select-none",
                            isOwn ? "text-emerald-100/80" : "text-slate-400 dark:text-slate-555"
                        )}>
                            {message.is_edited && (
                                <span className="text-[9px] italic font-medium opacity-80">editado</span>
                            )}
                            <span className="text-[9px] font-semibold">{time}</span>
                        </div>
                    </div>

                    {/* Actions menu */}
                    {showActions && isOwn && !isEditing && !message.is_deleted && (
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-250/60 dark:border-slate-800 rounded-xl shadow-lg px-1.5 py-1 z-10 animate-in fade-in zoom-in-95 duration-200",
                            isOwn ? "right-full mr-2" : "left-full ml-2"
                        )}>
                            {message.message_type === 'text' && (
                                <button
                                    onClick={onStartEdit}
                                    className="w-7.5 h-7.5 flex items-center justify-center rounded-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-90"
                                    title="Editar"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (message.content) {
                                        navigator.clipboard.writeText(message.content)
                                    }
                                }}
                                className="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 active:scale-90"
                                title="Copiar"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="w-7.5 h-7.5 flex items-center justify-center rounded-xs text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150 active:scale-90"
                                title="Deletar"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
