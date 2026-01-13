import { useEffect, useRef, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'

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

    const socketRef = useRef<Socket | null>(null)
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const remoteSocketIdRef = useRef<string | null>(null)

    const ICE_SERVERS = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ]
    }

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
                console.error('Error accessing media:', error)
                onError?.('Não foi possível acessar câmera/microfone. Verifique as permissões.')
            }
        }

        initMedia()

        return () => {
            localStreamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [])

    // Initialize socket
    useEffect(() => {
        if (!token) return

        const socket = io(process.env.NEXT_PUBLIC_SIGNALING_URL!, {
            auth: { token }
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Socket connected')
            setIsConnecting(true)
            socket.emit('join-room', { roomId, appointmentId, role })
        })

        socket.on('room-users', async (data: any) => {
            console.log('👥 Room users:', data)
            setIsConnecting(false)

            const otherUser = data.users.find((u: any) => u.socketId !== data.mySocketId)
            if (otherUser) {
                remoteSocketIdRef.current = otherUser.socketId
                await createOffer(otherUser.socketId)
            }
        })

        socket.on('user-joined', async (data: any) => {
            console.log('👋 User joined:', data)
            remoteSocketIdRef.current = data.socketId
            onUserJoined?.(data.userId, data.role)
        })

        socket.on('user-left', (data: any) => {
            console.log('👋 User left:', data)
            setRemoteStream(null)
            setIsConnected(false)
            peerConnectionRef.current?.close()
            peerConnectionRef.current = null
            onUserLeft?.(data.userId)
        })

        socket.on('webrtc-offer', handleReceiveOffer)
        socket.on('webrtc-answer', handleReceiveAnswer)
        socket.on('webrtc-ice-candidate', handleReceiveIceCandidate)

        socket.on('chat-message', (data: any) => {
            setChatMessages(prev => [...prev, data])
        })

        socket.on('error', (data: any) => {
            console.error('Socket error:', data)
            onError?.(data.message)
        })

        return () => {
            socket.disconnect()
        }
    }, [token, roomId, appointmentId, role])

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(ICE_SERVERS)

        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!)
        })

        pc.ontrack = (event) => {
            console.log('🎥 Received remote track')
            const [stream] = event.streams
            setRemoteStream(stream)
            onRemoteStream?.(stream)
            setIsConnected(true)
            setIsConnecting(false)
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && remoteSocketIdRef.current) {
                socketRef.current?.emit('webrtc-ice-candidate', {
                    targetSocketId: remoteSocketIdRef.current,
                    candidate: event.candidate
                })
            }
        }

        pc.oniceconnectionstatechange = () => {
            console.log('ICE state:', pc.iceConnectionState)

            switch (pc.iceConnectionState) {
                case 'connected':
                case 'completed':
                    setConnectionQuality('good')
                    setIsConnected(true)
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
    }, [onRemoteStream])

    const createOffer = async (targetSocketId: string) => {
        try {
            const pc = createPeerConnection()

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            socketRef.current?.emit('webrtc-offer', {
                targetSocketId,
                offer
            })
        } catch (error) {
            console.error('Error creating offer:', error)
        }
    }

    const handleReceiveOffer = async (data: any) => {
        try {
            remoteSocketIdRef.current = data.senderSocketId
            const pc = createPeerConnection()

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            socketRef.current?.emit('webrtc-answer', {
                targetSocketId: data.senderSocketId,
                answer
            })
        } catch (error) {
            console.error('Error handling offer:', error)
        }
    }

    const handleReceiveAnswer = async (data: any) => {
        try {
            await peerConnectionRef.current?.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            )
        } catch (error) {
            console.error('Error handling answer:', error)
        }
    }

    const handleReceiveIceCandidate = async (data: any) => {
        try {
            if (peerConnectionRef.current?.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                )
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error)
        }
    }

    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsAudioEnabled(audioTrack.enabled)
                socketRef.current?.emit('toggle-audio', audioTrack.enabled)
            }
        }
    }, [])

    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setIsVideoEnabled(videoTrack.enabled)
                socketRef.current?.emit('toggle-video', videoTrack.enabled)
            }
        }
    }, [])

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
                socketRef.current?.emit('share-screen', true)
            } else {
                const videoTrack = localStreamRef.current?.getVideoTracks()[0]
                const sender = peerConnectionRef.current?.getSenders().find(
                    s => s.track?.kind === 'video'
                )

                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack)
                }

                setIsScreenSharing(false)
                socketRef.current?.emit('share-screen', false)
            }
        } catch (error) {
            console.error('Error toggling screen share:', error)
        }
    }, [isScreenSharing])

    const sendChatMessage = useCallback((message: string) => {
        socketRef.current?.emit('chat-message', message)
        setChatMessages(prev => [...prev, {
            userId: 'me',
            message,
            timestamp: new Date()
        }])
    }, [])

    const endCall = useCallback(() => {
        localStreamRef.current?.getTracks().forEach(track => track.stop())
        peerConnectionRef.current?.close()
        socketRef.current?.emit('leave-room')
        socketRef.current?.disconnect()
    }, [])

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
