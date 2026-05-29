'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, Mic, X, Image, FileText, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
    conversationId: string
    onSend: (content: string, messageType: string, attachmentData?: {
        url: string; name: string; size: number
    }) => void
}

export function MessageInput({ conversationId, onSend }: MessageInputProps) {
    const [text, setText] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSend = () => {
        if (!text.trim()) return
        onSend(text.trim(), 'text')
        setText('')
        textareaRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const uploadFile = async (file: File): Promise<{ url: string; name: string; size: number; type: string } | null> => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('conversation_id', conversationId)

            const res = await fetch('/api/chat/upload', {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                const result = await res.json()
                return result.data
            }
            return null
        } catch (error) {
            console.error('[Chat] Upload error:', error)
            return null
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
        const file = e.target.files?.[0]
        if (!file) return
        setShowAttachMenu(false)

        const result = await uploadFile(file)
        if (result) {
            const msgType = type === 'image' ? 'image' : 'document'
            const label = type === 'image' ? '📷 Foto' : `📎 ${file.name}`
            onSend(label, msgType, {
                url: result.url,
                name: result.name,
                size: result.size,
            })
        }

        // Reset input
        e.target.value = ''
    }

    // Audio recording
    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Seu navegador não suporta gravação de áudio.')
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            
            // Determine best supported mime type
            const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac']
            let mimeType = ''
            for (const t of types) {
                if (MediaRecorder.isTypeSupported(t)) {
                    mimeType = t
                    break
                }
            }

            const options = mimeType ? { mimeType } : undefined
            const mediaRecorder = new MediaRecorder(stream, options)

            chunksRef.current = []
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
                let ext = 'webm'
                if (mediaRecorder.mimeType.includes('ogg')) ext = 'ogg'
                else if (mediaRecorder.mimeType.includes('mp4')) ext = 'm4a'
                else if (mediaRecorder.mimeType.includes('aac')) ext = 'aac'
                
                const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type })

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())

                // Upload
                const result = await uploadFile(file)
                if (result) {
                    onSend('🎙️ Áudio', 'audio', {
                        url: result.url,
                        name: result.name,
                        size: result.size,
                    })
                }
            }

            mediaRecorder.start(200) // Collect data every 200ms
            setIsRecording(true)
            setRecordingTime(0)

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)
        } catch (error) {
            console.error('[Chat] Microphone error:', error)
            alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    const cancelRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.ondataavailable = null
            mediaRecorderRef.current.onstop = null
            mediaRecorderRef.current.stop()
            // Stop all tracks
            mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
        }
        chunksRef.current = []
        setIsRecording(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4.5 relative shadow-lg shadow-slate-100/50 dark:shadow-none">
            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'document')}
            />

            {/* Recording state */}
            {isRecording ? (
                <div className="flex items-center gap-3">
                    <button
                        onClick={cancelRecording}
                        className="w-9.5 h-9.5 flex items-center justify-center rounded-xl text-red-500 hover:text-red-650 hover:bg-red-500/10 active:scale-90 transition-all duration-150 cursor-pointer"
                        title="Cancelar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-xl">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            Gravando {formatTime(recordingTime)}
                        </span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-all duration-200 shadow-md shadow-emerald-500/15 active:scale-90 cursor-pointer"
                        title="Enviar áudio"
                    >
                        <StopCircle className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="flex items-end gap-3">
                    {/* Attachment menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={cn(
                                "w-9.5 h-9.5 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer active:scale-90 border",
                                showAttachMenu 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                    : "border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-805"
                            )}
                            disabled={isUploading}
                            title="Anexar"
                        >
                            <Paperclip className="w-4.5 h-4.5" />
                        </button>

                        {showAttachMenu && (
                            <div className="absolute bottom-13.5 left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl shadow-slate-250/20 dark:shadow-none border border-slate-200/50 dark:border-slate-800/80 py-1.5 w-44 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                >
                                    <Image className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                    Foto
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                    Documento
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Text input */}
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem..."
                            className="w-full resize-none border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 bg-slate-50/50 dark:bg-slate-950/40 text-slate-850 dark:text-slate-100 placeholder:text-slate-400 max-h-32 transition-all duration-200"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement
                                target.style.height = 'auto'
                                target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                            }}
                        />
                    </div>

                    {/* Send or Mic button */}
                    {text.trim() ? (
                        <button
                            onClick={handleSend}
                            disabled={isUploading}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-650 transition-all duration-205 shadow-md shadow-emerald-500/15 disabled:opacity-40 active:scale-90 cursor-pointer shrink-0"
                            title="Enviar"
                        >
                            <Send className="w-4.5 h-4.5" />
                        </button>
                    ) : (
                        <button
                            onClick={startRecording}
                            disabled={isUploading}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-805 transition-all duration-205 disabled:opacity-40 active:scale-90 cursor-pointer border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40 shrink-0"
                            title="Gravar áudio"
                        >
                            <Mic className="w-4.5 h-4.5" />
                        </button>
                    )}

                    {/* Upload indicator */}
                    {isUploading && (
                        <div className="p-2 shrink-0">
                            <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full shadow-md shadow-emerald-500/10" />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
