// lib/realtime/broadcast.ts
// Utilitario server-side para envio de eventos via Supabase Realtime Broadcast (sem JWT/RLS)

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function sendRealtimeBroadcast(
    channelName: string,
    event: string,
    payload: Record<string, any>
): Promise<boolean> {
    try {
        const supabase = createServiceRoleClient()
        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { ack: true }
            }
        })

        return await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(async () => {
                try {
                    await supabase.removeChannel(channel)
                } catch {}
                resolve(false)
            }, 4000)

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event,
                            payload,
                        })
                        clearTimeout(timeout)
                        await supabase.removeChannel(channel)
                        resolve(true)
                    } catch (sendError) {
                        clearTimeout(timeout)
                        try {
                            await supabase.removeChannel(channel)
                        } catch {}
                        resolve(false)
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    clearTimeout(timeout)
                    try {
                        await supabase.removeChannel(channel)
                    } catch {}
                    resolve(false)
                }
            })
        })
    } catch (err) {
        console.warn('[Realtime Broadcast] Falha no disparo de broadcast:', channelName, event, err)
        return false
    }
}
