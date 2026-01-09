/**
 * Daily.co Video Service
 * Serviço para criar salas de videochamada usando Daily.co
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY || '4652e888fe11b718bea5546994ee307719d52774606b56375c904263343c4d67'
const DAILY_API_URL = 'https://api.daily.co/v1'

export interface CreateRoomParams {
    appointment_id: string
    doctor_name: string
    patient_name: string
    clinic_name: string
    duration_minutes?: number
}

export interface DailyRoom {
    url: string
    name: string
    id: string
}

/**
 * Criar sala de videochamada no Daily.co
 */
export async function createDailyRoom(params: CreateRoomParams): Promise<DailyRoom> {
    const roomName = `consulta-${params.appointment_id}`

    try {
        const response = await fetch(`${DAILY_API_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DAILY_API_KEY}`,
            },
            body: JSON.stringify({
                name: roomName,
                properties: {
                    // Configurações da sala
                    enable_screenshare: true,
                    enable_chat: true,
                    enable_knocking: false, // Sem sala de espera
                    start_video_off: false,
                    start_audio_off: false,

                    // Expiração: consulta + 30min de margem
                    exp: Math.floor(Date.now() / 1000) + ((params.duration_minutes || 30) + 30) * 60,

                    // Máximo de participantes
                    max_participants: 2,

                    // Auto-deletar sala quando vazia por 5min
                    eject_at_room_exp: true,
                    autojoin: true,
                },
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Erro ao criar sala Daily.co:', error)
            throw new Error(`Falha ao criar sala: ${error.error || response.statusText}`)
        }

        const room = await response.json()

        return {
            url: room.url,
            name: room.name,
            id: room.id,
        }
    } catch (error: any) {
        console.error('Erro no createDailyRoom:', error)
        throw new Error(`Erro ao criar sala Daily.co: ${error.message}`)
    }
}

/**
 * Deletar sala de videochamada
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
    try {
        const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`,
            },
        })

        if (!response.ok && response.status !== 404) {
            const error = await response.json()
            console.error('Erro ao deletar sala Daily.co:', error)
            throw new Error(`Falha ao deletar sala: ${error.error || response.statusText}`)
        }
    } catch (error: any) {
        console.error('Erro no deleteDailyRoom:', error)
        // Não lança erro para não bloquear outras operações
    }
}

/**
 * Obter informações de uma sala
 */
export async function getDailyRoom(roomName: string): Promise<DailyRoom | null> {
    try {
        const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`,
            },
        })

        if (response.status === 404) {
            return null
        }

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Falha ao buscar sala: ${error.error || response.statusText}`)
        }

        const room = await response.json()

        return {
            url: room.url,
            name: room.name,
            id: room.id,
        }
    } catch (error: any) {
        console.error('Erro no getDailyRoom:', error)
        return null
    }
}

/**
 * Listar todas as salas (útil para debug)
 */
export async function listDailyRooms(): Promise<DailyRoom[]> {
    try {
        const response = await fetch(`${DAILY_API_URL}/rooms`, {
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`,
            },
        })

        if (!response.ok) {
            throw new Error('Falha ao listar salas')
        }

        const data = await response.json()

        return data.data.map((room: any) => ({
            url: room.url,
            name: room.name,
            id: room.id,
        }))
    } catch (error: any) {
        console.error('Erro no listDailyRooms:', error)
        return []
    }
}

