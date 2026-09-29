/**
 * Saneamento e Desafogamento do Banco de Dados - Supabase
 * Data: 2026-09-29
 * Objetivo: Remover registros obsoletos de sessões inativas e notificações antigas
 * REQUISITO: Exige confirmação explícita do usuário antes de rodar
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=')
  if (idx !== -1) {
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    env[k] = v
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanup() {
  console.log('Iniciando saneamento seguro de tabelas obsoletas...')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Remover sessões inativas com mais de 30 dias
  const { data: delSessions, error: errSessions } = await supabase
    .from('active_sessions')
    .delete()
    .eq('is_active', false)
    .lt('last_active_at', thirtyDaysAgo)
    .select('id')

  if (errSessions) {
    console.error('Erro ao limpar active_sessions:', errSessions)
  } else {
    console.log(`active_sessions: ${delSessions?.length || 0} sessoes inativas antigas removidas com sucesso.`)
  }

  // 2. Remover notificações com mais de 60 dias (libera espaco no banco)
  const { data: delNotifs, error: errNotifs } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', sixtyDaysAgo)
    .select('id')

  if (errNotifs) {
    console.error('Erro ao limpar notifications:', errNotifs)
  } else {
    console.log(`notifications: ${delNotifs?.length || 0} notificacoes com mais de 60 dias removidas com sucesso.`)
  }

  console.log('Saneamento concluido.')
}

cleanup().catch(console.error)
