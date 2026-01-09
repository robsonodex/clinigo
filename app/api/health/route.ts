import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface HealthCheck {
    service: string
    status: 'healthy' | 'degraded' | 'down'
    latency?: number
    lastCheck: string
    details?: string
}

export async function GET() {
    const checks: HealthCheck[] = []
    const startTime = Date.now()

    // 1. Check Supabase Database
    try {
        const dbStart = Date.now()
        const supabase = await createClient()
        const { error } = await supabase.from('clinics').select('id').limit(1)
        const dbLatency = Date.now() - dbStart

        checks.push({
            service: 'Supabase Database',
            status: error ? 'down' : dbLatency > 1000 ? 'degraded' : 'healthy',
            latency: dbLatency,
            lastCheck: new Date().toISOString(),
            details: error ? error.message : `PostgreSQL OK - ${dbLatency}ms`,
        })
    } catch (err) {
        checks.push({
            service: 'Supabase Database',
            status: 'down',
            lastCheck: new Date().toISOString(),
            details: 'Connection failed',
        })
    }

    // 2. Check Supabase Auth
    try {
        const authStart = Date.now()
        const supabase = await createClient()
        await supabase.auth.getSession()
        const authLatency = Date.now() - authStart

        checks.push({
            service: 'Supabase Auth',
            status: authLatency > 500 ? 'degraded' : 'healthy',
            latency: authLatency,
            lastCheck: new Date().toISOString(),
            details: 'Auth service operational',
        })
    } catch (err) {
        checks.push({
            service: 'Supabase Auth',
            status: 'down',
            lastCheck: new Date().toISOString(),
            details: 'Auth check failed',
        })
    }

    // 3. Check Redis (Upstash)
    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL
        if (redisUrl) {
            const redisStart = Date.now()
            const res = await fetch(`${redisUrl}/ping`, {
                headers: {
                    Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                },
            })
            const redisLatency = Date.now() - redisStart

            checks.push({
                service: 'Redis Cache (Upstash)',
                status: res.ok ? (redisLatency > 100 ? 'degraded' : 'healthy') : 'down',
                latency: redisLatency,
                lastCheck: new Date().toISOString(),
                details: res.ok ? 'Cache operational' : 'Redis unreachable',
            })
        } else {
            checks.push({
                service: 'Redis Cache (Upstash)',
                status: 'down',
                lastCheck: new Date().toISOString(),
                details: 'Not configured - using fallback',
            })
        }
    } catch (err) {
        checks.push({
            service: 'Redis Cache (Upstash)',
            status: 'down',
            lastCheck: new Date().toISOString(),
            details: 'Connection failed',
        })
    }

    // 4. Check Mercado Pago
    try {
        const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
        if (mpToken) {
            const mpStart = Date.now()
            const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
                headers: {
                    Authorization: `Bearer ${mpToken}`,
                },
            })
            const mpLatency = Date.now() - mpStart

            checks.push({
                service: 'Mercado Pago API',
                status: res.ok ? (mpLatency > 500 ? 'degraded' : 'healthy') : 'down',
                latency: mpLatency,
                lastCheck: new Date().toISOString(),
                details: res.ok ? 'Payment gateway operational' : 'API error',
            })
        } else {
            checks.push({
                service: 'Mercado Pago API',
                status: 'down',
                lastCheck: new Date().toISOString(),
                details: 'Not configured',
            })
        }
    } catch (err) {
        checks.push({
            service: 'Mercado Pago API',
            status: 'down',
            lastCheck: new Date().toISOString(),
            details: 'Connection failed',
        })
    }

    // 5. Check Email Service
    const resendKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
    checks.push({
        service: 'Email Service',
        status: resendKey ? 'healthy' : 'down',
        lastCheck: new Date().toISOString(),
        details: resendKey ? 'Email service configured' : 'Not configured',
    })

    const totalLatency = Date.now() - startTime

    return NextResponse.json({
        data: checks,
        summary: {
            total: checks.length,
            healthy: checks.filter(c => c.status === 'healthy').length,
            degraded: checks.filter(c => c.status === 'degraded').length,
            down: checks.filter(c => c.status === 'down').length,
            totalLatency,
        },
        generatedAt: new Date().toISOString(),
    })
}
