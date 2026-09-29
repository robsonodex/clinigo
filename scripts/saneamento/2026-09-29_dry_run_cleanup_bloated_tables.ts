/**
 * Saneamento e Desafogamento do Banco de Dados - Supabase
 * Data: 2026-09-29
 * Objetivo: Identificar registros obsoletos nas tabelas inchadas (notifications e active_sessions)
 * MODO: DRY-RUN (apenas contagem e simulação, NENHUMA alteração é feita)
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

async function dryRun() {
  console.log('====================================================')
  console.log('RELATÓRIO DE SANEAMENTO DRY-RUN - CLÍNIGO / SUPABASE')
  console.log('====================================================')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Notificações
  const { count: totalNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  const { count: notificationsOlder30Days } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', thirtyDaysAgo)

  const { count: notificationsOlder60Days } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', sixtyDaysAgo)

  const { count: notificationsReadOlder30Days } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', true)
    .lt('created_at', thirtyDaysAgo)

  console.log('\n--- TABELA: notifications ---')
  console.log(`Total de registros atual: ${totalNotifications}`)
  console.log(`Notificações com mais de 30 dias: ${notificationsOlder30Days}`)
  console.log(`Notificações com mais de 60 dias: ${notificationsOlder60Days}`)
  console.log(`Notificações já lidas com mais de 30 dias: ${notificationsReadOlder30Days}`)

  // 2. Sessões Ativas
  const { count: totalSessions } = await supabase
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })

  const { count: inactiveSessions } = await supabase
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false)

  const { count: sessionsOlder30Days } = await supabase
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .lt('last_active_at', thirtyDaysAgo)

  console.log('\n--- TABELA: active_sessions ---')
  console.log(`Total de registros atual: ${totalSessions}`)
  console.log(`Sessões já inativadas (is_active = false): ${inactiveSessions}`)
  console.log(`Sessões sem atividade há mais de 30 dias: ${sessionsOlder30Days}`)
  console.log('\n====================================================')
}

dryRun().catch(err => {
  console.error('Erro na execução do dry-run:', err)
  process.exit(1)
})
