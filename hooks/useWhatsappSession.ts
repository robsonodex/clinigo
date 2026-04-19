/**
 * useWhatsappSession Hook
 * Manages WhatsApp session state with polling fallback
 * Connects to /api/whatsapp-session/* endpoints
 */
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface WhatsappSessionState {
  status: 'idle' | 'loading' | 'qr_ready' | 'connected' | 'disconnected' | 'error'
  qrBase64: string | null
  connectedPhone: string | null
  error: string | null
}

interface UseWhatsappSessionReturn {
  state: WhatsappSessionState
  startSession: () => Promise<void>
  disconnect: () => Promise<void>
  sendMessage: (to: string, message: string, pdfUrl?: string) => Promise<boolean>
  refreshStatus: () => Promise<void>
}

const POLL_INTERVAL = 5000 // 5 seconds

export function useWhatsappSession(): UseWhatsappSessionReturn {
  const [state, setState] = useState<WhatsappSessionState>({
    status: 'idle',
    qrBase64: null,
    connectedPhone: null,
    error: null,
  })

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  /**
   * Fetch current session status from API
   */
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp-session/status')
      const data = await response.json()

      if (data.connected) {
        setState({
          status: 'connected',
          qrBase64: null,
          connectedPhone: data.phone || null,
          error: null,
        })
      } else if (state.status !== 'loading' && state.status !== 'qr_ready') {
        setState((prev) => ({
          ...prev,
          status: prev.status === 'loading' || prev.status === 'qr_ready' ? prev.status : 'disconnected',
          connectedPhone: null,
        }))
      }
    } catch {
      // Silently fail on status check
    }
  }, [state.status])

  /**
   * Start WhatsApp session — triggers QR code generation
   */
  const startSession = useCallback(async () => {
    setState({
      status: 'loading',
      qrBase64: null,
      connectedPhone: null,
      error: null,
    })

    try {
      const response = await fetch('/api/whatsapp-session/start', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setState({
          status: 'error',
          qrBase64: null,
          connectedPhone: null,
          error: data.error || 'Falha ao iniciar sessão',
        })
        return
      }

      if (data.status === 'already_connected') {
        setState({
          status: 'connected',
          qrBase64: null,
          connectedPhone: data.phone || null,
          error: null,
        })
        return
      }

      if (data.qr_code) {
        setState({
          status: 'qr_ready',
          qrBase64: data.qr_code,
          connectedPhone: null,
          error: null,
        })

        // Start polling for connection status (QR scan detection)
        startPolling()
      } else {
        setState({
          status: 'error',
          qrBase64: null,
          connectedPhone: null,
          error: 'Serviço respondeu, mas falhou ao gerar o código. Tente novamente.',
        })
      }
    } catch (err: any) {
      setState({
        status: 'error',
        qrBase64: null,
        connectedPhone: null,
        error: 'Serviço WhatsApp indisponível. Verifique se o microserviço está rodando.',
      })
    }
  }, [])

  /**
   * Disconnect WhatsApp session
   */
  const disconnect = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp-session/disconnect', {
        method: 'DELETE',
      })

      if (response.ok) {
        setState({
          status: 'disconnected',
          qrBase64: null,
          connectedPhone: null,
          error: null,
        })
        stopPolling()
      } else {
        const data = await response.json()
        setState((prev) => ({
          ...prev,
          error: data.error || 'Falha ao desconectar',
        }))
      }
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Erro ao desconectar',
      }))
    }
  }, [])

  /**
   * Send a WhatsApp message
   * Returns true if sent successfully, false otherwise
   */
  const sendMessage = useCallback(
    async (to: string, message: string, pdfUrl?: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message, pdf_url: pdfUrl }),
        })

        const data = await response.json()
        return data.success === true
      } catch {
        return false
      }
    },
    []
  )

  /**
   * Start polling for status changes (used after QR display)
   */
  const startPolling = useCallback(() => {
    stopPolling()

    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/whatsapp-session/status')
        const data = await response.json()

        if (data.connected) {
          setState({
            status: 'connected',
            qrBase64: null,
            connectedPhone: data.phone || null,
            error: null,
          })
          stopPolling()
        }
      } catch {
        // Continue polling
      }
    }, POLL_INTERVAL)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Try to connect to WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WHATSAPP_WS_URL
    if (!wsUrl) return

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        // Subscribe to events (clinic_id will be handled by the proxy)
        ws.send(JSON.stringify({ type: 'subscribe' }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.event) {
            case 'qr':
              setState((prev) => ({
                ...prev,
                status: 'qr_ready',
                qrBase64: data.qr_base64,
              }))
              break
            case 'connected':
              setState({
                status: 'connected',
                qrBase64: null,
                connectedPhone: data.phone || null,
                error: null,
              })
              stopPolling()
              break
            case 'disconnected':
              setState({
                status: 'disconnected',
                qrBase64: null,
                connectedPhone: null,
                error: null,
              })
              break
          }
        } catch {
          // Ignore invalid messages
        }
      }

      ws.onerror = () => {
        // WebSocket failed, polling will handle it
      }

      ws.onclose = () => {
        wsRef.current = null
      }
    } catch {
      // WebSocket not available, polling fallback
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [stopPolling])

  // Initial status check
  useEffect(() => {
    refreshStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return {
    state,
    startSession,
    disconnect,
    sendMessage,
    refreshStatus,
  }
}
