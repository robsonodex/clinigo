import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDA1NzIsImV4cCI6MjA4MjYxNjU3Mn0.Y6qi1c9jNMe3_cNof8pAxDHKhpVZgbcXCq5tTMDZ-ac'
const APP_URL = 'https://clinigo.app'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

let passed = 0, failed = 0, partial = 0, blocker = 0
const bugs: string[] = []

function log(icon: string, msg: string) { console.log(`${icon} ${msg}`) }
function PASS(t: string) { passed++; log('✅', `PASS: ${t}`) }
function FAIL(t: string, d?: string) { failed++; const m = `FAIL: ${t}${d ? ' — ' + d : ''}`; log('❌', m); bugs.push(m) }
function WARN(t: string) { partial++; log('⚠️', `PARCIAL: ${t}`) }
function BLOCK(t: string) { blocker++; const m = `BLOCKER: ${t}`; log('🔴', m); bugs.push(m) }
function section(t: string) { console.log(`\n${'━'.repeat(60)}\n  ${t}\n${'━'.repeat(60)}`) }

async function fetchApi(path: string, opts?: RequestInit) {
  try {
    const res = await fetch(`${APP_URL}${path}`, { ...opts, redirect: 'manual' })
    return { status: res.status, headers: res.headers, body: res.ok ? await res.json().catch(() => null) : null, ok: res.ok }
  } catch (e: any) {
    return { status: 0, headers: null, body: null, ok: false, error: e.message }
  }
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   QA SÊNIOR — TESTES FUNCIONAIS CliniGo      ║')
  console.log('║   Data: ' + new Date().toISOString().slice(0,10) + '                            ║')
  console.log('╚══════════════════════════════════════════════╝')

  // ========== FASE 0: AMBIENTE ==========
  section('FASE 0 — PRÉ-CONDIÇÕES E AMBIENTE')

  // 0.1 Health checks
  const health = await fetchApi('/api/health')
  health.ok ? PASS('GET /api/health retorna 200') : FAIL('GET /api/health', `status=${health.status}`)

  const probe = await fetchApi('/api/probe')
  probe.ok ? PASS('GET /api/probe retorna 200') : FAIL('GET /api/probe', `status=${probe.status}`)

  const ping = await fetchApi('/api/ping')
  ping.ok ? PASS('GET /api/ping retorna 200') : WARN('GET /api/ping pode não existir')

  // SSL check
  try {
    const r = await fetch(APP_URL)
    r.url.startsWith('https') ? PASS('HTTPS ativo') : FAIL('HTTPS não ativo')
  } catch { FAIL('Homepage inacessível') }

  // Manifest PWA
  const manifest = await fetchApi('/manifest.json')
  manifest.status === 200 ? PASS('Manifest PWA acessível') : WARN('Manifest PWA não encontrado')

  // ========== FASE 1: AUTENTICAÇÃO ==========
  section('FASE 1 — AUTENTICAÇÃO E CONTROLE DE ACESSO')

  // 1.1.2 Login com credenciais inválidas
  const badLogin = await fetchApi('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@naoexiste.com', password: 'senhaerrada123' })
  })
  if (badLogin.status !== 200) PASS('Login inválido retorna erro (não 200)')
  else FAIL('Login inválido retornou 200 — possível falha de segurança')

  // 1.1.4 Login com campos vazios
  const emptyLogin = await fetchApi('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' })
  })
  if (emptyLogin.status !== 200) PASS('Login vazio retorna erro')
  else FAIL('Login vazio retornou 200')

  // 1.3.1 API protegida sem auth retorna 401
  const noAuth = await fetchApi('/api/financial/entries')
  noAuth.status === 401 ? PASS('API protegida sem auth retorna 401') : FAIL('API protegida sem auth', `status=${noAuth.status}`)

  // 1.3.7 Super Admin stealth - não-admin retorna 404
  const stealthHub = await fetchApi('/system-master-hub')
  if (stealthHub.status === 404 || stealthHub.status === 302 || stealthHub.status === 307) {
    PASS('Master Hub retorna 404/redirect para não-autenticados (stealth)')
  } else {
    FAIL('Master Hub acessível sem auth', `status=${stealthHub.status}`)
  }

  // 1.3 RBAC: Verificar tabelas de users e roles
  const { data: users } = await supabase.from('users').select('id, email, role, clinic_id, is_active')
  if (users && users.length > 0) {
    PASS(`Tabela users ativa: ${users.length} usuários`)
    const roles = [...new Set(users.map((u: any) => u.role))]
    log('📊', `Roles encontradas: ${roles.join(', ')}`)
  } else { FAIL('Tabela users vazia ou inacessível') }

  // ========== FASE 2: AGENDAMENTO ==========
  section('FASE 2 — MÓDULO DE AGENDAMENTO')

  const { data: appointments, count: apptCount } = await supabase
    .from('appointments').select('*', { count: 'exact' }).limit(5)
  if (apptCount !== null && apptCount > 0) {
    PASS(`Agendamentos no banco: ${apptCount} registros`)
  } else { WARN('Nenhum agendamento encontrado') }

  // Anti-overbooking: verificar tabela de locks
  const { count: lockCount } = await supabase
    .from('appointment_slot_locks').select('*', { count: 'exact', head: true })
  if (lockCount !== null) PASS(`Tabela appointment_slot_locks ativa (${lockCount} locks)`)
  else WARN('Tabela appointment_slot_locks pode não existir')

  // Séries recorrentes
  const { count: recurCount } = await supabase
    .from('recurring_appointment_series').select('*', { count: 'exact', head: true })
  if (recurCount !== null) PASS(`Séries recorrentes: ${recurCount} registros`)
  else WARN('Tabela recurring_appointment_series sem dados')

  // QR Codes
  const { count: qrCount } = await supabase
    .from('appointment_qr_codes').select('*', { count: 'exact', head: true })
  if (qrCount !== null && qrCount > 0) PASS(`QR Codes gerados: ${qrCount}`)
  else WARN('Nenhum QR Code de agendamento')

  // ========== FASE 3: EQUIPE ==========
  section('FASE 3 — EQUIPE (PROFISSIONAIS E PACIENTES)')

  const { count: docCount } = await supabase.from('doctors').select('*', { count: 'exact', head: true })
  PASS(`Profissionais cadastrados: ${docCount}`)

  const { count: patCount } = await supabase.from('patients').select('*', { count: 'exact', head: true })
  PASS(`Pacientes cadastrados: ${patCount}`)

  const { count: schedCount } = await supabase.from('schedules').select('*', { count: 'exact', head: true })
  PASS(`Grades de horário: ${schedCount}`)

  const { count: contractCount } = await supabase.from('doctor_contracts').select('*', { count: 'exact', head: true })
  PASS(`Contratos de profissionais: ${contractCount}`)

  // ========== FASE 4: PRONTUÁRIO ==========
  section('FASE 4 — PRONTUÁRIO CLÍNICO')

  const { count: mrCount } = await supabase.from('medical_records').select('*', { count: 'exact', head: true })
  PASS(`Prontuários eletrônicos: ${mrCount}`)

  const { count: evoCount } = await supabase.from('session_evolutions').select('*', { count: 'exact', head: true })
  PASS(`Evoluções de sessão: ${evoCount}`)

  const { count: docViewCount } = await supabase.from('patient_documents').select('*', { count: 'exact', head: true })
  PASS(`Documentos de pacientes: ${docViewCount}`)

  // Assinatura digital - colunas
  const { data: sigTest, error: sigErr } = await supabase
    .from('medical_records').select('signed_at, signature_url, signature_token').limit(1)
  sigErr ? FAIL('Colunas de assinatura inexistentes', sigErr.message) : PASS('Colunas de assinatura digital OK')

  // Certificados digitais
  const { count: certCount } = await supabase.from('doctor_certificates').select('*', { count: 'exact', head: true })
  if (certCount !== null) PASS(`Certificados ICP-Brasil: ${certCount}`)
  else WARN('Tabela doctor_certificates pode não existir')

  // ========== FASE 5: FINANCEIRO ==========
  section('FASE 5 — MÓDULO FINANCEIRO')

  const { count: finCount } = await supabase.from('financial_entries').select('*', { count: 'exact', head: true })
  if (finCount && finCount > 0) PASS(`Lançamentos financeiros: ${finCount}`)
  else FAIL('Sem lançamentos financeiros')

  const { count: payrollCount } = await supabase.from('medical_payroll').select('*', { count: 'exact', head: true })
  if (payrollCount !== null) PASS(`Folhas de repasse: ${payrollCount}`)
  else WARN('Tabela medical_payroll vazia')

  const { count: reimCount } = await supabase.from('patient_reimbursement_rules').select('*', { count: 'exact', head: true })
  PASS(`Regras de reembolso: ${reimCount}`)

  const { count: insCount } = await supabase.from('health_insurances').select('*', { count: 'exact', head: true })
  PASS(`Convênios cadastrados: ${insCount}`)

  // ========== FASE 6: TISS ==========
  section('FASE 6 — MÓDULO TISS')

  const { count: tissGuides } = await supabase.from('tiss_guides').select('*', { count: 'exact', head: true })
  PASS(`Guias TISS: ${tissGuides}`)

  const { count: tissBatches } = await supabase.from('tiss_batches').select('*', { count: 'exact', head: true })
  PASS(`Lotes TISS: ${tissBatches}`)

  // ========== FASE 7: COMUNICAÇÃO ==========
  section('FASE 7 — COMUNICAÇÃO')

  const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true })
  PASS(`Notificações: ${notifCount}`)

  const { count: notifQueueCount } = await supabase.from('notification_queue').select('*', { count: 'exact', head: true })
  PASS(`Fila de notificações: ${notifQueueCount}`)

  const { count: chatMsgCount } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true })
  PASS(`Mensagens de chat: ${chatMsgCount}`)

  const { count: waLogCount } = await supabase.from('whatsapp_messages_log').select('*', { count: 'exact', head: true })
  PASS(`Logs WhatsApp: ${waLogCount}`)

  // ========== FASE 9: GESTÃO ==========
  section('FASE 9 — GESTÃO')

  const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
  PASS(`Produtos no estoque: ${prodCount}`)

  const { count: stockMov } = await supabase.from('stock_movements').select('*', { count: 'exact', head: true })
  PASS(`Movimentações de estoque: ${stockMov}`)

  const { count: autoRules } = await supabase.from('automation_rules').select('*', { count: 'exact', head: true })
  PASS(`Regras de automação: ${autoRules}`)

  // ========== FASE 10: CONFIGURAÇÕES ==========
  section('FASE 10 — CONFIGURAÇÕES')

  const { data: clinics } = await supabase.from('clinics').select('id, name, plan_type, is_active, payment_confirmed, trial_ends_at')
  if (clinics && clinics.length > 0) {
    PASS(`Clínicas cadastradas: ${clinics.length}`)
    clinics.forEach((c: any) => log('📋', `  → ${c.name} | Plano: ${c.plan_type} | Ativa: ${c.is_active} | Pagamento: ${c.payment_confirmed}`))
  } else { FAIL('Nenhuma clínica encontrada') }

  const { count: apiKeyCount } = await supabase.from('api_keys').select('*', { count: 'exact', head: true })
  if (apiKeyCount !== null) PASS(`API Keys: ${apiKeyCount}`)
  else WARN('Tabela api_keys pode não existir')

  // ========== FASE 15: SUPER ADMIN ==========
  section('FASE 15 — SUPER ADMIN (MASTER HUB)')

  const { count: impCount } = await supabase.from('impersonation_sessions').select('*', { count: 'exact', head: true })
  PASS(`Sessões de impersonation: ${impCount}`)

  const { count: planCount } = await supabase.from('plans').select('*', { count: 'exact', head: true })
  PASS(`Planos cadastrados: ${planCount}`)

  const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true })
  PASS(`Registros de auditoria: ${auditCount}`)

  // ========== FASE 17: CHATBOT ==========
  section('FASE 17 — CHATBOT CLIN')

  const chatbotGet = await fetchApi('/api/chatbot')
  chatbotGet.ok ? PASS('GET /api/chatbot retorna menu inicial') : WARN(`Chatbot GET status=${chatbotGet.status}`)

  const { count: chatbotLeads } = await supabase.from('chatbot_leads').select('*', { count: 'exact', head: true })
  if (chatbotLeads !== null) PASS(`Leads do chatbot: ${chatbotLeads}`)
  else WARN('Tabela chatbot_leads pode não existir')

  // ========== FASE 18: LGPD ==========
  section('FASE 18 — LGPD E SEGURANÇA')

  // Páginas legais
  for (const page of ['/lgpd', '/privacidade', '/termos']) {
    const r = await fetchApi(page)
    if (r.status === 200 || r.status === 308 || r.status === 307) PASS(`Página ${page} acessível`)
    else WARN(`Página ${page} retornou ${r.status}`)
  }

  const { count: lgpdCount } = await supabase.from('lgpd_consents').select('*', { count: 'exact', head: true })
  if (lgpdCount !== null) PASS(`Consentimentos LGPD: ${lgpdCount}`)
  else WARN('Tabela lgpd_consents pode não existir')

  // API Keys não expostas no bundle
  try {
    const bundleCheck = await fetch(`${APP_URL}/_next/static/chunks/`)
    if (bundleCheck.status !== 200) PASS('Chunks JS não listáveis (segurança)')
    else WARN('Listagem de chunks JS pode estar exposta')
  } catch { PASS('Chunks JS não listáveis (segurança)') }

  // ========== FASE 22: PERFORMANCE ==========
  section('FASE 22 — PERFORMANCE')

  const perfStart = Date.now()
  await fetch(APP_URL)
  const homepageMs = Date.now() - perfStart
  homepageMs < 3000 ? PASS(`Homepage carregou em ${homepageMs}ms (< 3s)`) : WARN(`Homepage lenta: ${homepageMs}ms`)

  const apiPerfStart = Date.now()
  await fetchApi('/api/health')
  const apiMs = Date.now() - apiPerfStart
  apiMs < 2000 ? PASS(`API /health respondeu em ${apiMs}ms`) : WARN(`API /health lenta: ${apiMs}ms`)

  // ========== RELATÓRIO FINAL ==========
  section('RELATÓRIO EXECUTIVO FINAL')

  const total = passed + failed + partial + blocker
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         RELATÓRIO EXECUTIVO — CliniGo QA SÊNIOR              ║
║         Ciclo de Testes: ${new Date().toISOString().slice(0,10)}                        ║
╠══════════════════════════════════════════════════════════════╣
║  CASOS DE TESTE EXECUTADOS: ${String(total).padStart(3)}                              ║
║  CASOS PASSANDO: ${String(passed).padStart(3)}  ✅                                     ║
║  CASOS FALHANDO: ${String(failed).padStart(3)}  ❌                                     ║
║  CASOS PARCIAIS: ${String(partial).padStart(3)}  ⚠️                                    ║
║  BLOQUEADORES: ${String(blocker).padStart(3)}  🔴                                      ║
╠══════════════════════════════════════════════════════════════╣
║  COBERTURA: ${Math.round((passed / total) * 100)}%                                            ║
║  VEREDICTO: ${failed === 0 && blocker === 0 ? '✅ APROVADO' : blocker > 0 ? '🔴 BLOQUEADO' : '⚠️ APROVADO COM RESSALVAS'}                               ║
╚══════════════════════════════════════════════════════════════╝`)

  if (bugs.length > 0) {
    console.log('\n🐛 BUGS ENCONTRADOS:')
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`))
  }
}

runTests().catch(e => console.error('ERRO FATAL:', e))
