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
          arg.includes('AuthRetryableFetchError') ||
          arg.includes('Unexpected token') ||
          arg.includes('<!DOCTYPE')
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
          code === 'supabase_gateway_timeout' ||
          name === 'AuthRetryableFetchError' ||
          name === 'AuthUnknownError' ||
          msg.includes('Refresh Token Not Found') ||
          msg.includes('refresh_token_not_found') ||
          msg.includes('Already Used') ||
          msg.includes('concurrent token refresh') ||
          msg.includes('AuthRetryableFetchError') ||
          msg.includes('<!DOCTYPE') ||
          ((arg as any).__isAuthError && (status === 409 || status === 502 || status === 503 || status === 504 || status === 522 || status === 524 || status === 0 || status === undefined))
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

function buildGatewayTimeoutResponse(status: number, baseHeaders?: HeadersInit): Response {
  const safeStatus = status >= 500 && status <= 599 ? status : 504
  const headers = new Headers(baseHeaders)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.delete('content-length')
  headers.delete('content-encoding')

  return new Response(
    JSON.stringify({
      error: 'supabase_gateway_timeout',
      error_description: `Gateway do banco indisponível (HTTP ${safeStatus})`,
      message: `Gateway do banco indisponível (HTTP ${safeStatus})`,
      code: 'supabase_gateway_timeout',
      status: safeStatus,
    }),
    {
      status: safeStatus,
      statusText: 'Gateway Timeout',
      headers,
    }
  )
}

/**
 * Normaliza respostas HTML de gateway (ex.: Cloudflare 522/524 ou 502/503/504)
 * e timeouts de transporte para JSON estruturado, evitando SyntaxError (`Unexpected token '<'`) no SDK Supabase.
 */
export const loggingFetch: typeof fetch = async (input, init) => {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch (networkErr: any) {
    if (init?.signal?.aborted) {
      throw networkErr
    }
    const causeCode = networkErr?.cause?.code || networkErr?.code || ''
    const errMsg = networkErr instanceof Error ? networkErr.message : String(networkErr)
    const isTimeoutOrFetchFail =
      causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
      causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
      errMsg.includes('HeadersTimeoutError') ||
      errMsg.includes('fetch failed')

    if (!isTimeoutOrFetchFail) {
      throw networkErr
    }
    return buildGatewayTimeoutResponse(504)
  }

  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const endpoint = url.split('?')[0]

  const isGatewayHtmlError =
    res.status >= 500 &&
    !(res.headers.get('content-type') || '').toLowerCase().includes('application/json')

  let normalizedResponse: Response = res
  let rawText: string | null = null

  if (isGatewayHtmlError) {
    try {
      rawText = await res.clone().text()
    } catch {
      rawText = null
    }
  }

  try {
    // "Refresh Token Already Used" e oscilações transitórias 502/503/504/522/524 no /auth/v1 são tratadas por fallback
    const ruido =
      url.includes('/auth/v1/token') ||
      (url.includes('/auth/v1/') && [502, 503, 504, 522, 524].includes(res.status))

    if (!ruido && (res.status >= 500 || [400, 414, 429].includes(res.status))) {
      let code: string | undefined
      let message: string | undefined
      try {
        const text = rawText ?? (await res.clone().text())
        const j = JSON.parse(text)
        code = j.code
        message = j.message
      } catch {
        if (isGatewayHtmlError) {
          code = 'supabase_gateway_timeout'
          message = `Supabase gateway error (${res.status})`
        }
      }

      const log = new Logger()
      log.error('supabase_error', {
        status: res.status,
        endpoint, // sem query string
        code,
        message,
      })
      await log.flush()
    }
  } catch {
    // o log nunca pode derrubar a requisição
  }

  if (
    isGatewayHtmlError &&
    rawText !== null &&
    rawText.trimStart().startsWith('<')
  ) {
    normalizedResponse = buildGatewayTimeoutResponse(res.status, res.headers)
  }

  return normalizedResponse
}
