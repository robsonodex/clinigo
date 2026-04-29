'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  name: string
  email: string
  role: string
  clinic_name: string
  plan_type: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/m/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('name, role, clinic_id')
        .eq('id', user.id)
        .single() as any

      let clinicName = ''
      let planType = ''
      if (userData?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('name, plan_type')
          .eq('id', userData.clinic_id)
          .single() as any
        clinicName = clinic?.name || ''
        planType = clinic?.plan_type || 'BASICO'
      }

      setProfile({
        name: userData?.name || user.user_metadata?.name || 'Usuário',
        email: user.email || '',
        role: userData?.role || 'DOCTOR',
        clinic_name: clinicName,
        plan_type: planType,
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/m/login')
  }

  const roleLabels: Record<string, string> = {
    DOCTOR: 'Médico(a)',
    CLINIC_ADMIN: 'Administrador',
    RECEPTIONIST: 'Recepcionista',
    SUPER_ADMIN: 'Super Admin',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-white">Perfil</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* User card */}
        <div className="bg-zinc-900 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white">
            {(profile?.name || 'U').charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{profile?.name}</h2>
            <p className="text-sm text-teal-400">{roleLabels[profile?.role || ''] || profile?.role}</p>
            <p className="text-xs text-zinc-500">{profile?.email}</p>
          </div>
        </div>

        {/* Clinic info */}
        <div className="bg-zinc-900 rounded-2xl divide-y divide-zinc-800">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-zinc-400">Clínica</span>
            <span className="text-sm font-medium text-white">{profile?.clinic_name || '-'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-zinc-400">Plano</span>
            <span className="text-sm font-semibold text-emerald-400">{profile?.plan_type}</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-zinc-900 rounded-2xl divide-y divide-zinc-800">
          <button
            onClick={() => window.open('https://clinigo.app/dashboard', '_blank')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-zinc-800 transition"
          >
            <span className="text-sm text-zinc-300">Abrir Dashboard Completo</span>
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>

        {/* Version & Logout */}
        <div className="space-y-3 pt-4">
          <button
            onClick={handleLogout}
            className="w-full h-12 bg-red-500/10 text-red-400 font-semibold rounded-2xl border border-red-500/20 active:bg-red-500/20 transition"
          >
            Sair da conta
          </button>
          <p className="text-center text-xs text-zinc-700">CliniGo PWA v5.0 · © 2026</p>
        </div>
      </div>
    </div>
  )
}
