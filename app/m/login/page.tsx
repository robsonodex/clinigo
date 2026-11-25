'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function PWALoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        setError('Erro de resposta do servidor. Tente novamente.')
        return
      }

      if (!response.ok) {
        if (data?.error?.code === 'CLINIC_INACTIVE') {
          window.location.href = data?.error?.redirect_url || '/conta-bloqueada'
          return
        }
        setError(data?.error?.message || 'Email ou senha incorretos')
        return
      }

      if (data?.data?.session) {
        try {
          const supabase = createClient()
          await Promise.race([
            supabase.auth.setSession({
              access_token: data.data.session.access_token,
              refresh_token: data.data.session.refresh_token,
            }),
            new Promise(resolve => setTimeout(resolve, 800)),
          ])
        } catch {
          // Cookies already set by server
        }
      }

      router.push('/m/agenda')
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex justify-center" aria-label="CliniGo — página inicial">
            <Image
              src="/logo_white.svg"
              alt="CliniGo"
              width={168}
              height={48}
              priority
              unoptimized
              className="h-12 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-zinc-400">Acesso profissional mobile</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-400">Senha</label>
              <Link
                href="/recuperar-senha?portal=m"
                className="text-xs text-teal-400 hover:text-teal-300 transition"
              >
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-base placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-md shadow-lg shadow-teal-600/20 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600">
          Acesso exclusivo para profissionais cadastrados
        </p>
      </div>
    </div>
  )
}
