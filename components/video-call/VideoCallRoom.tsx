'use client'

import { useRef, useEffect, useState } from 'react'
import { useVideoCall } from '@/lib/hooks/use-video-call'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Monitor, MessageSquare, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoCallRoomProps {
    roomId: string
    appointmentId: string
    role: 'doctor' | 'patient'
    token: string
    onEndCall?: () => void
}

export function VideoCallRoom({
    roomId,
    appointmentId,
    role,
    token,
    onEndCall
}: VideoCallRoomProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const [showChat, setShowChat] = useState(false)
    const [chatInput, setChatInput] = useState('')

    const {
        localStream,
        remoteStream,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        isConnected,
        isConnecting,
        connectionQuality,
        chatMessages,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        sendChatMessage,
        endCall
    } = useVideoCall({
        roomId,
        appointmentId,
        role,
        token,
        onError: (error) => {
            alert(error)
        }
    })

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    const handleEndCall = () => {
        endCall()
        onEndCall?.()
    }

    const handleSendMessage = () => {
        if (chatInput.trim()) {
            sendChatMessage(chatInput)
            setChatInput('')
        }
    }

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            {/* Header */}
            <div className="h-16 bg-gray-900/95 backdrop-blur-sm flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-3 h-3 rounded-full",
                        connectionQuality === 'good' && 'bg-green-500',
                        connectionQuality === 'poor' && 'bg-yellow-500',
                        connectionQuality === 'bad' && 'bg-red-500'
                    )} />
                    <span className="text-white text-sm font-medium">
                        {isConnecting ? 'Conectando...' :
                            isConnected ? 'Conectado' :
                                'Aguardando...'}
                    </span>
                    {isConnected && (
                        <Badge variant="outline" className="text-white border-white/20">
                            {role === 'doctor' ? '👨‍⚕️ Médico' : '👤 Paciente'}
                        </Badge>
                    )}
                </div>

                <Button variant="ghost" size="icon" onClick={handleEndCall} className="text-white">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Videos */}
            <div className="flex-1 relative">
                {/* Remote Video */}
                {remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                            <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Video className="w-12 h-12 text-gray-600" />
                            </div>
                            <p className="text-xl mb-2">
                                {isConnecting ? 'Conectando...' :
                                    `Aguardando ${role === 'doctor' ? 'paciente' : 'médico'}`}
                            </p>
                            <p className="text-sm text-gray-400 mb-6">
                                A chamada iniciará automaticamente
                            </p>
                            {/* Connection Status */}
                            <div className="flex justify-center gap-8 mt-4">
                                <div className="text-center">
                                    <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${role === 'doctor' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                    <span className="text-xs text-gray-400">Médico</span>
                                    {role === 'doctor' && <span className="block text-xs text-green-400">Você</span>}
                                </div>
                                <div className="text-center">
                                    <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${role === 'patient' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                    <span className="text-xs text-gray-400">Paciente</span>
                                    {role === 'patient' && <span className="block text-xs text-green-400">Você</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Local Video (PiP) */}
                <div className="absolute top-4 right-4 w-64 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-10">
                    {localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={cn(
                                "w-full h-full object-cover",
                                !isScreenSharing && "mirror"
                            )}
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <Video className="w-12 h-12 text-gray-600" />
                        </div>
                    )}
                    {!isVideoEnabled && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                            <VideoOff className="w-12 h-12 text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col z-10">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">Chat</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={cn(
                                    "rounded-lg p-3",
                                    msg.userId === 'me' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-gray-100 max-w-[80%]'
                                )}>
                                    <p className="text-sm">{msg.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t flex gap-2">
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Digite sua mensagem..."
                            />
                            <Button onClick={handleSendMessage}>Enviar</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-24 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center gap-4 z-20">
                <Button
                    size="lg"
                    variant={isAudioEnabled ? 'default' : 'destructive'}
                    className="rounded-full w-14 h-14"
                    onClick={toggleAudio}
                >
                    {isAudioEnabled ? <Mic /> : <MicOff />}
                </Button>

                <Button
                    size="lg"
                    variant={isVideoEnabled ? 'default' : 'destructive'}
                    className="rounded-full w-14 h-14"
                    onClick={toggleVideo}
                >
                    {isVideoEnabled ? <Video /> : <VideoOff />}
                </Button>

                <Button
                    size="lg"
                    variant={isScreenSharing ? 'secondary' : 'ghost'}
                    className="rounded-full w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white border-0"
                    onClick={toggleScreenShare}
                >
                    <Monitor className="w-6 h-6" />
                </Button>

                <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-full w-14 h-14 bg-gray-700 hover:bg-gray-600 text-white border-0 relative"
                    onClick={() => setShowChat(!showChat)}
                >
                    <MessageSquare className="w-6 h-6" />
                    {chatMessages.filter(m => m.userId !== 'me').length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                            {chatMessages.filter(m => m.userId !== 'me').length}
                        </span>
                    )}
                </Button>

                <div className="w-px h-8 bg-white/20" />

                <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-14 h-14"
                    onClick={handleEndCall}
                >
                    <PhoneOff />
                </Button>
            </div>
        </div>
    )
}
