'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, type Appointment } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { getInitials, formatDate, cn } from '@/lib/utils'
import {
    Video,
    FileText,
    Clock,
    User,
    CheckCircle,
    Phone,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function ConsultationRoomPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()
    const [notes, setNotes] = useState('')
    const [activeTab, setActiveTab] = useState<'video' | 'notes'>('video')
    const [showCompletionModal, setShowCompletionModal] = useState(false)
    const [completionNotes, setCompletionNotes] = useState('')

    // Fetch consultation
    const { data: consultation, isLoading } = useQuery({
        queryKey: ['consultation', id],
        queryFn: () => api.get<Appointment>(`/appointments/${id}`),
    })

    // Start consultation mutation (if not started)
    const startMutation = useMutation({
        mutationFn: () => api.patch(`/consultations/${id}`, { status: 'IN_PROGRESS' }),
        onSuccess: () => toast.success('Consulta iniciada'),
    })

    // Complete consultation mutation
    const completeMutation = useMutation({
        mutationFn: async () => {
            // Update appointment status to COMPLETED
            await fetch(`/api/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    notes: completionNotes || notes
                })
            })
        },
        onSuccess: () => {
            toast.success('Consulta finalizada com sucesso!')
            setShowCompletionModal(false)
            router.push('/dashboard/minha-agenda')
        },
        onError: () => {
            toast.error('Erro ao finalizar consulta')
        }
    })

    if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>

    if (!consultation) return <div className="p-6">Consulta não encontrada</div>

    return (
        <>
            <div className="h-[calc(100vh-6rem)] -m-4 lg:-m-6 flex flex-col lg:flex-row">
                {/* Main Area (Video) */}
                <div className="flex-1 bg-black relative flex items-center justify-center">
                    {consultation.video_link && !consultation.video_link.includes('localhost') ? (
                        <iframe
                            src={consultation.video_link}
                            className="w-full h-full border-0"
                            allow="camera; microphone; fullscreen; display-capture"
                            onLoad={() => {
                                // Listen for when video call ends
                                window.addEventListener('message', (event) => {
                                    if (event.data?.type === 'VIDEO_CALL_ENDED') {
                                        setShowCompletionModal(true)
                                    }
                                })
                            }}
                        />
                    ) : (
                        <div className="text-center text-white">
                            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h2 className="text-xl font-medium">
                                {consultation.video_link?.includes('localhost')
                                    ? 'Link inválido (localhost)'
                                    : 'Link da videochamada não disponível'}
                            </h2>
                            <p className="text-gray-400 mt-2 mb-4">Clique no botão abaixo para gerar o link correto</p>
                            <Button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/appointments/${id}/video-link`, {
                                            method: 'PATCH',
                                        })
                                        if (!res.ok) throw new Error('Falha ao gerar link')
                                        const data = await res.json()
                                        toast.success('Link gerado! Atualizando página...')
                                        window.location.reload()
                                    } catch (err) {
                                        toast.error('Erro ao gerar link de vídeo')
                                    }
                                }}
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Video className="w-4 h-4 mr-2" />
                                {consultation.video_link ? 'Regenerar Link de Vídeo' : 'Gerar Link de Vídeo'}
                            </Button>
                        </div>
                    )}

                    {/* Overlay Controls - Only show when NOT in video mode */}
                    {(!consultation.video_link || consultation.video_link.includes('localhost')) && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                            <Button
                                variant="destructive"
                                size="lg"
                                className="rounded-full px-8 shadow-lg"
                                onClick={() => completeMutation.mutate()}
                            >
                                <Phone className="w-5 h-5 mr-2 rotate-[135deg]" />
                                Encerrar Atendimento
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sidebar (Patient Info & Notes) */}
                <div className="w-full lg:w-96 bg-white border-l flex flex-col shadow-xl z-20">
                    {/* Header */}
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-12 w-12 border-2 border-primary/10">
                                <AvatarFallback className="bg-primary/5 text-primary">
                                    {getInitials(consultation.patient.full_name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="font-bold text-lg leading-tight">
                                    {consultation.patient.full_name}
                                </h2>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" /> 28 anos
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {consultation.appointment_time}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <Badge variant="outline" className="font-normal">
                                Primeira consulta
                            </Badge>
                            <Badge variant="success" className="font-normal">
                                Confirmado
                            </Badge>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b">
                        <button
                            className={cn(
                                "flex-1 p-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'notes' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setActiveTab('notes')}
                        >
                            Anotações
                        </button>
                        <button
                            className={cn(
                                "flex-1 p-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'video' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setActiveTab('video')}
                        >
                            Histórico
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-4 space-y-4">
                        {activeTab === 'notes' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Queixa Principal</Label>
                                    <Textarea
                                        placeholder="Descreva a queixa principal..."
                                        className="min-h-[80px] bg-yellow-50/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Evolução / Anotações</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Registre aqui as observações da consulta..."
                                        className="min-h-[200px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Prescrição</Label>
                                    <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        Clique para adicionar medicamentos
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Nenhuma consulta anterior encontrada.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t bg-gray-50 space-y-2">
                        <Button className="w-full" variant="secondary" onClick={() => toast.info('Anotações salvas')}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Salvar Rascunho
                        </Button>
                    </div>
                </div>
            </div>

            {/* Completion Modal */}
            <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Finalizar Atendimento</DialogTitle>
                        <DialogDescription>
                            Marque esta consulta como concluída e adicione observações sobre o atendimento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="completion-notes">Observações e Anotações</Label>
                            <Textarea
                                id="completion-notes"
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                placeholder="Resumo da consulta, prescrições, orientações passadas..."
                                className="min-h-[150px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">Status: Consulta Realizada</p>
                                <p className="text-xs text-blue-700">O agendamento será marcado como concluído</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowCompletionModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => completeMutation.mutate()}
                            disabled={completeMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {completeMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Finalizando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Finalizar Consulta
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
