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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
            })

            chunksRef.current = []
            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
                const ext = mediaRecorder.mimeType.includes('webm') ? 'webm' : 'ogg'
                const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: mediaRecorder.mimeType })

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
        <div className="border-t border-gray-200 bg-white px-4 py-3">
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
                        className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                        title="Cancelar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-medium text-red-600">
                            Gravando {formatTime(recordingTime)}
                        </span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="p-2.5 rounded-full bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
                        title="Enviar áudio"
                    >
                        <StopCircle className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="flex items-end gap-2">
                    {/* Attachment menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                showAttachMenu ? "bg-sky-100 text-sky-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                            disabled={isUploading}
                            title="Anexar"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        {showAttachMenu && (
                            <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-44 z-10">
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                                >
                                    <Image className="w-4 h-4 text-sky-600" />
                                    Foto
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-emerald-600" />
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
                            className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 max-h-32"
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
                            className="p-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
                            title="Enviar"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={startRecording}
                            disabled={isUploading}
                            className="p-2.5 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-50"
                            title="Gravar áudio"
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    )}

                    {/* Upload indicator */}
                    {isUploading && (
                        <div className="p-2">
                            <div className="animate-spin w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full" />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
