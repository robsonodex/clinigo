import { Logger } from 'next-axiom'

// Silencia ruído de falsos positivos do SDK GoTrue/Supabase em Edge (Middleware) e Node (Server)
// quando sessões antigas são rotacionadas ou quando o gateway da Supabase oscila com 502/503/504 (AuthRetryableFetchError)
if (typeof console !== 'undefined' && !(globalThis as any).__clinigo_auth_logger_patched) {
  ;(globalThis as any).__clinigo_auth_logger_patched = true
  const originalConsoleError = console.error.bind(console)
  console.error = (...args: any[]) => {
    const isAuthNoise = args.some((arg) => {
      if (!arg) return false
      if (typeof arg === 'string') {
        return (
          arg.includes('Refresh Token Not Found') ||
          arg.includes('refresh_token_not_found') ||
          arg.includes('Already Used') ||
          arg.includes('concurrent token refresh') ||
          arg.includes('AuthRetryableFetchError')
        )
      }
      if (typeof arg === 'object') {
        const name = (arg as any).name || (arg as any).constructor?.name || ''
        const msg = (arg as any).message || ''
        const code = (arg as any).code || ''
        const status = (arg as any).status
        if (
          code === 'refresh_token_not_found' ||
          code === 'refresh_token_already_used' ||
          code === 'conflict' ||
          name === 'AuthRetryableFetchError' ||
          msg.includes('Refresh Token Not Found') ||
          msg.includes('refresh_token_not_found') ||
          msg.includes('Already Used') ||
          msg.includes('concurrent token refresh') ||
          msg.includes('AuthRetryableFetchError') ||
          ((arg as any).__isAuthError && (status === 409 || status === 502 || status === 503 || status === 504 || status === 0))
        ) {
          return true
        }
      }
      return false
    })

    if (isAuthNoise) {
      return
    }
    originalConsoleError(...args)
  }
}

export const loggingFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init)
  try {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // "Refresh Token Already Used" e oscilações transitórias 502/503/504 no /auth/v1 são ruído externo
    const ruido =
      url.includes('/auth/v1/token') ||
      (url.includes('/auth/v1/') && [502, 503, 504].includes(res.status))

    if (!ruido && (res.status >= 500 || [400, 414, 429].includes(res.status))) {
      let code: string | undefined
      let message: string | undefined
      try {
        const j = JSON.parse(await res.clone().text())
        code = j.code
        message = j.message
      } catch {}

      const log = new Logger()
      log.error('supabase_error', {
        status: res.status,
        endpoint: url.split('?')[0], // sem query string
        code,
        message,
      })
      await log.flush()
    }
  } catch {} // o log nunca pode derrubar a requisição
  return res
}
