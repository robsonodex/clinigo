import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
})

// Wrapper or utility to use in API routes/Server Actions
export function captureError(error: unknown) {
    Sentry.captureException(error);
}

