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
                    <div className="space-y-1">
                        {message.attachment_url && (
                            <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={message.attachment_url}
                                    alt={message.attachment_name || 'Imagem'}
                                    className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                    >
                        <Download className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                                {message.attachment_name || 'Documento'}
                            </p>
                            {message.attachment_size && (
                                <p className="text-[10px] opacity-60">
                                    {(message.attachment_size / 1024).toFixed(0)} KB
                                </p>
                            )}
                        </div>
                    </a>
                )

            case 'audio':
                return (
                    <div className="min-w-[200px]">
                        {message.attachment_url && (
                            <audio
                                controls
                                className="w-full h-8"
                                preload="metadata"
                            >
                                <source src={message.attachment_url} />
                                Seu navegador não suporta áudio.
                            </audio>
                        )}
                    </div>
                )

            default:
                return (
                    <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                )
        }
    }

    return (
        <div
            className={cn(
                "flex gap-2 group",
                isOwn ? "justify-end" : "justify-start",
                showAvatar ? "mt-3" : "mt-0.5"
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar (left - other users) */}
            {!isOwn && showAvatar && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                    {initials}
                </div>
            )}
            {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}

            <div className={cn("max-w-[70%] min-w-[80px]", isOwn && "order-first")}>
                {/* Sender name */}
                {!isOwn && showAvatar && (
                    <p className="text-xs font-medium text-gray-500 mb-0.5 ml-1">
                        {senderName}
                    </p>
                )}

                {/* Bubble */}
                <div className="relative">
                    <div
                        className={cn(
                            "rounded-2xl px-3.5 py-2 relative",
                            isOwn
                                ? "bg-sky-600 text-white rounded-tr-md"
                                : "bg-white border border-gray-200 text-gray-900 rounded-tl-md shadow-sm"
                        )}
                    >
                        {renderContent()}

                        {/* Time + edited indicator */}
                        <div className={cn(
                            "flex items-center gap-1 mt-0.5 justify-end",
                            isOwn ? "text-sky-200" : "text-gray-400"
                        )}>
                            {message.is_edited && (
                                <span className="text-[10px] italic">editado</span>
                            )}
                            <span className="text-[10px]">{time}</span>
                        </div>
                    </div>

                    {/* Actions menu */}
                    {showActions && isOwn && !isEditing && !message.is_deleted && (
                        <div className={cn(
                            "absolute top-0 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-md px-1 py-0.5 z-10",
                            isOwn ? "right-full mr-1" : "left-full ml-1"
                        )}>
                            {message.message_type === 'text' && (
                                <button
                                    onClick={onStartEdit}
                                    className="p-1 rounded text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
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
                                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Copiar"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
