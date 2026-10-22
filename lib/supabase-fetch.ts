import { Logger } from 'next-axiom'

export const loggingFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init)
  try {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // "Refresh Token Already Used" e afins são ruído, não bug
    const ruido = url.includes('/auth/v1/token')

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
