'use client'

/**
 * AiA Triage Chat Component
 * CliniGo - Sistema de Triagem Médica
 * 
 * Interactive chat interface for medical triage
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, AlertTriangle, Heart, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AIA_CONFIG } from '@/lib/aia/config'
import { TriageResultCard } from './triage-result-card'
import type { TriageResponse, TriageResult, PatientDemographics } from '@/lib/aia/triage-types'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isEmergency?: boolean
    triageResult?: TriageResult
}

interface TriageChatProps {
    clinicId?: string
    patientId?: string
    onComplete?: (result: TriageResult) => void
    className?: string
}

export function TriageChat({ clinicId, patientId, onComplete, className }: TriageChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [demographics, setDemographics] = useState<Partial<PatientDemographics>>({})
    const [showDemographicsForm, setShowDemographicsForm] = useState(false)
    const [triageResult, setTriageResult] = useState<TriageResult | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Start conversation
    useEffect(() => {
        if (messages.length === 0) {
            sendMessage('Olá', true)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const sendMessage = useCallback(async (content: string, isInitial = false) => {
        if (!content.trim() && !isInitial) return

        setIsLoading(true)

        // Add user message to chat (unless it's the initial greeting)
        if (!isInitial) {
            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: content.trim(),
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, userMessage])
        }

        try {
            const response = await fetch('/api/aia/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: content.trim(),
                    demographics: Object.keys(demographics).length > 0 ? demographics : undefined,
                    clinic_id: clinicId,
                    patient_id: patientId,
                }),
            })

            if (!response.ok) {
                throw new Error('Erro na comunicação com a AiA')
            }

            const data: TriageResponse = await response.json()

            // Update session ID
            if (data.session_id && !sessionId) {
                setSessionId(data.session_id)
            }

            // Check if demographics are needed
            if (data.requires_demographics) {
                setShowDemographicsForm(true)
            }

            // Add assistant message
            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
                isEmergency: data.is_emergency,
                triageResult: data.triage_result,
            }
            setMessages(prev => [...prev, assistantMessage])

            // Handle triage result
            if (data.triage_result) {
                setTriageResult(data.triage_result)
                onComplete?.(data.triage_result)
            }

        } catch (error) {
            console.error('Triage error:', error)
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro. Em caso de emergência, ligue **192 (SAMU)**.',
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
            setInputValue('')
            inputRef.current?.focus()
        }
    }, [sessionId, demographics, clinicId, patientId, onComplete])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoading && inputValue.trim()) {
            sendMessage(inputValue)
        }
    }

    const handleDemographicsSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (demographics.age && demographics.gender && demographics.location) {
            setShowDemographicsForm(false)
            sendMessage(`Tenho ${demographics.age} anos, sou ${demographics.gender}, moro em ${demographics.location}`)
        }
    }

    return (
        <Card className={cn('flex flex-col h-[600px]', className)}>
            <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-emerald-500 to-teal-600">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-white text-lg">
                            {AIA_CONFIG.name} - Triagem
                        </CardTitle>
                        <p className="text-white/80 text-sm">
                            Assistente Virtual do CliniGo
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}

                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">AiA está analisando...</span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Demographics Form */}
                {showDemographicsForm && (
                    <div className="border-t p-4 bg-muted/50">
                        <form onSubmit={handleDemographicsSubmit} className="space-y-3">
                            <p className="text-sm font-medium">Preencha seus dados:</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Input
                                    type="number"
                                    placeholder="Idade"
                                    min={0}
                                    max={120}
                                    value={demographics.age || ''}
                                    onChange={(e) => setDemographics(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                                    required
                                />
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={demographics.gender || ''}
                                    onChange={(e) => setDemographics(prev => ({ ...prev, gender: e.target.value as 'masculino' | 'feminino' }))}
                                    required
                                >
                                    <option value="">Sexo</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                </select>
                                <Input
                                    placeholder="Cidade"
                                    value={demographics.location || ''}
                                    onChange={(e) => setDemographics(prev => ({ ...prev, location: e.target.value }))}
                                    required
                                />
                            </div>
                            <Button type="submit" size="sm" className="w-full">
                                Continuar
                            </Button>
                        </form>
                    </div>
                )}

                {/* Triage Result */}
                {triageResult && (
                    <div className="border-t p-4">
                        <TriageResultCard result={triageResult} sessionId={sessionId || undefined} compact />
                    </div>
                )}

                {/* Input */}
                {!triageResult && (
                    <form onSubmit={handleSubmit} className="border-t p-4">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Descreva seus sintomas..."
                                disabled={isLoading || showDemographicsForm}
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !inputValue.trim() || showDemographicsForm}
                                size="icon"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ Em emergências, ligue 192 (SAMU)
                        </p>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'

    return (
        <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}

            <div className={cn(
                'max-w-[80%] rounded-lg p-3',
                isUser
                    ? 'bg-primary text-primary-foreground'
                    : message.isEmergency
                        ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                        : 'bg-muted'
            )}>
                {message.isEmergency && (
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <Badge variant="destructive">EMERGÊNCIA</Badge>
                    </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none">
                    {/* Simple markdown rendering */}
                    {message.content.split('\n').map((line, i) => {
                        const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        return (
                            <p
                                key={i}
                                className="mb-1 last:mb-0"
                                dangerouslySetInnerHTML={{ __html: boldLine }}
                            />
                        )
                    })}
                </div>

                <p className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                </div>
            )}
        </div>
    )
}
