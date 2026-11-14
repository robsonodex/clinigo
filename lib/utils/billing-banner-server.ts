import { revalidatePath } from 'next/cache'
import { invalidateClinicBannerCache } from '@/lib/utils/clinic-banner-cache'

/**
 * Purges server caches for the clinic's dashboard layout and notifies open browsers
 * via Supabase Realtime to run a non-disruptive router.refresh().
 */
export async function revalidateAndBroadcastClinicBanner(
    supabaseAdmin: any,
    clinicId: string
): Promise<void> {
    invalidateClinicBannerCache(clinicId)

    try {
        revalidatePath('/dashboard', 'layout')
        revalidatePath('/dashboard/configuracoes/assinatura', 'page')
    } catch {
        // Ignore outside Next.js request lifecycle (e.g. unit tests / scripts)
    }

    if (!supabaseAdmin || typeof supabaseAdmin.channel !== 'function') return

    try {
        await new Promise<void>((resolve) => {
            const channel = supabaseAdmin.channel(`clinic-cache-update-${clinicId}`)
            const timeout = setTimeout(() => {
                try {
                    supabaseAdmin.removeChannel(channel)
                } catch {
                    // Ignore cleanup error
                }
                resolve()
            }, 1500)

            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event: 'billing-banner-updated',
                            payload: { timestamp: Date.now(), clinicId },
                        })
                    } catch {
                        // Non-fatal broadcast error
                    } finally {
                        clearTimeout(timeout)
                        try {
                            await supabaseAdmin.removeChannel(channel)
                        } catch {
                            // Ignore cleanup error
                        }
                        resolve()
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    clearTimeout(timeout)
                    try {
                        supabaseAdmin.removeChannel(channel)
                    } catch {
                        // Ignore cleanup error
                    }
                    resolve()
                }
            })
        })
    } catch {
        // Non-fatal Realtime error
    }
}

