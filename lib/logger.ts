/**
 * Structured Logger
 * Production-ready logging with Pino
 */

import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    formatters: {
        level: (label) => ({ level: label }),
    },
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
})

// Specialized loggers for different domains
export function logBilling(event: string, data: Record<string, any>) {
    logger.info({ domain: 'BILLING', event, ...data })
}

export function logSecurity(event: string, data: Record<string, any>) {
    logger.warn({ domain: 'SECURITY', event, ...data })
}

export function logAI(event: string, data: Record<string, any>) {
    logger.info({ domain: 'AI', event, ...data })
}

export function logPlanGuard(event: string, data: Record<string, any>) {
    logger.info({ domain: 'PLAN_GUARD', event, ...data })
}

export function logRateLimit(event: string, data: Record<string, any>) {
    logger.warn({ domain: 'RATE_LIMIT', event, ...data })
}

export function logAudit(event: string, data: Record<string, any>) {
    logger.info({ domain: 'AUDIT', event, ...data })
}

