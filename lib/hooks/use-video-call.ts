import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseVideoCallOptions {
    roomId: string
    appointmentId: string
    role: 'doctor' | 'patient'
    token: string
    onRemoteStream?: (stream: MediaStream) => void
    onUserJoined?: (userId: string, role: string) => void
    onUserLeft?: (userId: string) => void
    onError?: (error: string) => void
}

const getIceConfiguration = (): RTCConfiguration => {
    const iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]

    const turnUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL
    if (turnUrl) {
        const turnServer: RTCIceServer = { urls: turnUrl }
        if (process.env.NEXT_PUBLIC_TURN_USERNAME) {
            turnServer.username = process.env.NEXT_PUBLIC_TURN_USERNAME
        }
        if (process.env.NEXT_PUBLIC_TURN_CREDENTIAL) {
            turnServer.credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL
        }
        iceServers.push(turnServer)
    }

    return {
        iceServers,
        iceCandidatePoolSize: 10,
    }
}

export function useVideoCall({
    roomId,
    appointmentId,
    role,
    token,
    onRemoteStream,
    onUserJoined,
    onUserLeft,
    onError
}: UseVideoCallOptions) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
    const [isAudioEnabled, setIsAudioEnabled] = useState(true)
    const [isVideoEnabled, setIsVideoEnabled] = useState(true)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'bad'>('good')
    const [chatMessages, setChatMessages] = useState<Array<{
        userId: string
        message: string
        timestamp: Date
    }>>([])

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
    const hasOfferedRef = useRef(false)
    const isCallActiveRef = useRef(true)

    // Initialize local media
    useEffect(() => {
        async function initMedia() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                })

                localStreamRef.current = stream
                setLocalStream(stream)
            } catch (error) {
                console.error('[WebRTC] Error accessing media devices:', error)
                onError?.('Não foi possível acessar câmera/microfone. Verifique as permissões do navegador.')
            }
        }

        initMedia()

        return () => {
            localStreamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [onError])

    const createPeerConnection = useCallback(() => {
        if (peerConnectionRef.current) {
            return peerConnectionRef.current
        }

        const pc = new RTCPeerConnection(getIceConfiguration())

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!)
            })
        }

        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track:', event.track.kind)
            const [stream] = event.streams
            if (stream) {
                setRemoteStream(stream)
                onRemoteStream?.(stream)
                setIsConnected(true)
                setIsConnecting(false)
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-ice-candidate',
                    payload: {
                        candidate: event.candidate.toJSON(),
                        senderRole: role
                    }
                })
            }
        }

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState)
            if (pc.connectionState === 'connected') {
                setIsConnected(true)
                setIsConnecting(false)
                setConnectionQuality('good')
            } else if (pc.connectionState === 'disconnected') {
                setConnectionQuality('poor')
            } else if (pc.connectionState === 'failed') {
                setIsConnected(false)
                setIsConnecting(false)
                setConnectionQuality('bad')
            }
        }

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState)
            switch (pc.iceConnectionState) {
                case 'connected':
                case 'completed':
                    setConnectionQuality('good')
                    setIsConnected(true)
                    setIsConnecting(false)
                    break
                case 'disconnected':
                    setConnectionQuality('poor')
                    break
                case 'failed':
                    setConnectionQuality('bad')
                    setIsConnected(false)
                    break
                case 'closed':
                    setIsConnected(false)
                    break
            }
        }

        peerConnectionRef.current = pc
        return pc
    }, [onRemoteStream, role])

    const initiateOffer = useCallback(async () => {
        if (!isCallActiveRef.current) return
        try {
            setIsConnecting(true)
            const pc = createPeerConnection()
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })
            await pc.setLocalDescription(offer)
            hasOfferedRef.current = true

            channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: {
                    offer: {
                        type: offer.type,
                        sdp: offer.sdp
                    },
                    senderRole: role
                }
            })
        } catch (error) {
            console.error('[WebRTC] Error creating offer:', error)
            onError?.('Falha ao iniciar conexão de vídeo.')
        }
    }, [createPeerConnection, onError, role])

    const handleReceiveOffer = useCallback(async (data: { offer: RTCSessionDescriptionInit; senderRole: string }) => {
        if (data.senderRole === role || !isCallActiveRef.current) return
        try {
            setIsConnecting(true)
            const pc = createPeerConnection()
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))

            // Flush pending ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift()
                if (cand) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand))
                }
            }

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            channelRef.current?.send({
                type: 'broadcast',
                event: 'webrtc-answer',
                payload: {
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp
                    },
                    senderRole: role
                }
            })
        } catch (error) {
            console.error('[WebRTC] Error handling offer:', error)
            onError?.('Erro ao negociar sala de vídeo.')
        }
    }, [createPeerConnection, onError, role])

    const handleReceiveAnswer = useCallback(async (data: { answer: RTCSessionDescriptionInit; senderRole: string }) => {
        if (data.senderRole === role || !isCallActiveRef.current) return
        try {
            const pc = peerConnectionRef.current
            if (pc && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer))

                while (pendingCandidatesRef.current.length > 0) {
                    const cand = pendingCandidatesRef.current.shift()
                    if (cand) {
                        await pc.addIceCandidate(new RTCIceCandidate(cand))
                    }
                }
            }
        } catch (error) {
            console.error('[WebRTC] Error handling answer:', error)
        }
    }, [role])

    const handleReceiveIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit; senderRole: string }) => {
        if (data.senderRole === role || !isCallActiveRef.current) return
        try {
            const pc = peerConnectionRef.current
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            } else {
                pendingCandidatesRef.current.push(data.candidate)
            }
        } catch (error) {
            console.error('[WebRTC] Error adding ICE candidate:', error)
        }
    }, [role])

    // Supabase Realtime Signaling setup
    useEffect(() => {
        if (!token || !roomId) return
        isCallActiveRef.current = true

        const supabase = createClient()
        const channelName = `teleconsulta_${roomId}`

        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: false },
                presence: { key: role }
            }
        })

        channelRef.current = channel

        channel
            .on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
                handleReceiveOffer(payload)
            })
            .on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
                handleReceiveAnswer(payload)
            })
            .on('broadcast', { event: 'webrtc-ice-candidate' }, ({ payload }) => {
                handleReceiveIceCandidate(payload)
            })
            .on('broadcast', { event: 'peer-announce' }, ({ payload }) => {
                if (payload?.senderRole && payload.senderRole !== role) {
                    onUserJoined?.(payload.senderRole, payload.senderRole)
                    if (role === 'doctor') {
                        initiateOffer()
                    }
                }
            })
            .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
                setChatMessages((prev) => [
                    ...prev,
                    {
                        userId: payload.userId === role ? 'me' : payload.userId,
                        message: payload.message,
                        timestamp: new Date(payload.timestamp)
                    }
                ])
            })
            .on('broadcast', { event: 'user-left' }, ({ payload }) => {
                if (payload?.senderRole !== role) {
                    setRemoteStream(null)
                    setIsConnected(false)
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.close()
                        peerConnectionRef.current = null
                    }
                    onUserLeft?.(payload?.senderRole)
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState()
                const otherRole = role === 'doctor' ? 'patient' : 'doctor'
                const otherPresence = presenceState[otherRole]

                if (otherPresence && otherPresence.length > 0) {
                    onUserJoined?.(otherRole, otherRole)
                    if (role === 'doctor' && !hasOfferedRef.current) {
                        initiateOffer()
                    }
                }
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                if (key !== role) {
                    onUserJoined?.(key, key)
                    if (role === 'doctor') {
                        initiateOffer()
                    }
                }
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                if (key !== role) {
                    setRemoteStream(null)
                    setIsConnected(false)
                    if (peerConnectionRef.current) {
                        peerConnectionRef.current.close()
                        peerConnectionRef.current = null
                    }
                    onUserLeft?.(key)
                }
            })

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                setIsConnecting(true)
                await channel.track({
                    role,
                    token,
                    online_at: new Date().toISOString()
                })

                channel.send({
                    type: 'broadcast',
                    event: 'peer-announce',
                    payload: { senderRole: role, token }
                })
            }
        })

        return () => {
            isCallActiveRef.current = false
            channel.send({
                type: 'broadcast',
                event: 'user-left',
                payload: { senderRole: role }
            })
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [
        roomId,
        token,
        role,
        appointmentId,
        handleReceiveOffer,
        handleReceiveAnswer,
        handleReceiveIceCandidate,
        initiateOffer,
        onUserJoined,
        onUserLeft
    ])

    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsAudioEnabled(audioTrack.enabled)
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'toggle-audio',
                    payload: { enabled: audioTrack.enabled, senderRole: role }
                })
            }
        }
    }, [role])

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setIsVideoEnabled(videoTrack.enabled)
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'toggle-video',
                    payload: { enabled: videoTrack.enabled, senderRole: role }
                })
            }
        }
    }, [role])

    const toggleScreenShare = useCallback(async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                })

                const screenTrack = screenStream.getVideoTracks()[0]
                const sender = peerConnectionRef.current?.getSenders().find(
                    s => s.track?.kind === 'video'
                )

                if (sender) {
                    sender.replaceTrack(screenTrack)
                }

                screenTrack.onended = () => {
                    toggleScreenShare()
                }

                setIsScreenSharing(true)
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'share-screen',
                    payload: { active: true, senderRole: role }
                })
            } else {
                const videoTrack = localStreamRef.current?.getVideoTracks()[0]
                const sender = peerConnectionRef.current?.getSenders().find(
                    s => s.track?.kind === 'video'
                )

                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack)
                }

                setIsScreenSharing(false)
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'share-screen',
                    payload: { active: false, senderRole: role }
                })
            }
        } catch (error) {
            console.error('[WebRTC] Error toggling screen share:', error)
        }
    }, [isScreenSharing, role])

    const sendChatMessage = useCallback((message: string) => {
        if (!message.trim() || !channelRef.current) return
        channelRef.current.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: {
                userId: role,
                message,
                timestamp: new Date().toISOString()
            }
        })
        setChatMessages(prev => [...prev, {
            userId: 'me',
            message,
            timestamp: new Date()
        }])
    }, [role])

    const endCall = useCallback(() => {
        isCallActiveRef.current = false
        localStreamRef.current?.getTracks().forEach(track => track.stop())
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'user-left',
                payload: { senderRole: role }
            })
            const supabase = createClient()
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }
        setIsConnected(false)
        setIsConnecting(false)
    }, [role])

    return {
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
    }
}
