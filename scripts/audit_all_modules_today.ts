import http from 'http'

interface AuditTarget {
    name: string
    url: string
    expectedStatus: number
    keywordMustContain?: string
    keywordMustNotContain?: string
}

const TARGETS: AuditTarget[] = [
    // 1. Dashboard & Aniversariantes
    {
        name: 'Dashboard Principal',
        url: 'http://localhost:3000/dashboard',
        expectedStatus: 200,
        keywordMustContain: 'Aniversariantes do Mês',
        keywordMustNotContain: 'Aguardando Pagamento',
    },
    {
        name: 'Recepção (Widget de Aniversários)',
        url: 'http://localhost:3000/dashboard/recepcao',
        expectedStatus: 200,
        keywordMustContain: 'Aniversários',
    },

    // 2. Pacientes (Tabela e Detalhes)
    {
        name: 'Lista Geral de Pacientes',
        url: 'http://localhost:3000/dashboard/pacientes',
        expectedStatus: 200,
        keywordMustContain: 'Pacientes',
    },
    {
        name: 'Ficha do Paciente (com Aba e Botão de Contratos)',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb',
        expectedStatus: 200,
        keywordMustContain: 'Contratos & Termos',
    },
    {
        name: 'Ficha do Paciente Direto na Aba de Contratos (?tab=signatures)',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb?tab=signatures',
        expectedStatus: 200,
        keywordMustContain: 'Contratos & Termos',
    },

    // 3. Planos de Sessão (5 Módulos sem 404)
    {
        name: 'Planos de Sessão — Fisioterapia',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb/planos-sessao/fisioterapia',
        expectedStatus: 200,
        keywordMustNotContain: 'Página não encontrada',
    },
    {
        name: 'Planos de Sessão — Fonoaudiologia',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb/planos-sessao/fonoaudiologia',
        expectedStatus: 200,
        keywordMustNotContain: 'Página não encontrada',
    },
    {
        name: 'Planos de Sessão — Intervenção Precoce (ABA)',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb/planos-sessao/intervencao-precoce-aba',
        expectedStatus: 200,
        keywordMustNotContain: 'Página não encontrada',
    },
    {
        name: 'Planos de Sessão — Psicologia',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb/planos-sessao/psicologia',
        expectedStatus: 200,
        keywordMustNotContain: 'Página não encontrada',
    },
    {
        name: 'Planos de Sessão — Terapia Ocupacional',
        url: 'http://localhost:3000/dashboard/pacientes/a594e0b5-b5ba-4c58-91af-a2a0f510bedb/planos-sessao/terapia-ocupacional',
        expectedStatus: 200,
        keywordMustNotContain: 'Página não encontrada',
    },

    // 4. Configuração de Modelos de Documentos
    {
        name: 'Modelos de Documentos & Validade Jurídica',
        url: 'http://localhost:3000/dashboard/configuracoes/modelos-documentos',
        expectedStatus: 200,
        keywordMustContain: 'Validade Jurídica Assegurada',
    },

    // 5. Guia de Ajuda Integrado
    {
        name: 'Guia de Ajuda Integrado',
        url: 'http://localhost:3000/dashboard/help',
        expectedStatus: 200,
        keywordMustContain: 'Modelos de Termos & Contratos',
    },

    // 6. Outros Módulos Essenciais (Garantia de Regressão Zero)
    {
        name: 'Módulo Agenda',
        url: 'http://localhost:3000/dashboard/agenda',
        expectedStatus: 200,
        keywordMustNotContain: 'Application error',
    },
    {
        name: 'Módulo Prontuários',
        url: 'http://localhost:3000/dashboard/prontuarios',
        expectedStatus: 200,
        keywordMustNotContain: 'Application error',
    },
]

async function fetchUrl(target: AuditTarget): Promise<{ success: boolean; error?: string; bodyLength: number }> {
    return new Promise((resolve) => {
        const req = http.get(target.url, (res) => {
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                if (res.statusCode !== target.expectedStatus) {
                    return resolve({
                        success: false,
                        error: `Status HTTP incorreto: recebido ${res.statusCode}, esperado ${target.expectedStatus}`,
                        bodyLength: data.length,
                    })
                }

                if (data.length < 500) {
                    return resolve({
                        success: false,
                        error: `Página com conteúdo suspeito de estar em branco (tamanho: ${data.length} bytes)`,
                        bodyLength: data.length,
                    })
                }

                if (target.keywordMustContain && !data.includes(target.keywordMustContain)) {
                    return resolve({
                        success: false,
                        error: `Conteúdo obrigatório "${target.keywordMustContain}" não encontrado no corpo da página`,
                        bodyLength: data.length,
                    })
                }

                if (target.keywordMustNotContain && data.includes(target.keywordMustNotContain)) {
                    return resolve({
                        success: false,
                        error: `Conteúdo proibido "${target.keywordMustNotContain}" foi detectado no corpo da página`,
                        bodyLength: data.length,
                    })
                }

                resolve({ success: true, bodyLength: data.length })
            })
        })

        req.on('error', (err) => {
            resolve({ success: false, error: err.message, bodyLength: 0 })
        })

        req.setTimeout(10000, () => {
            req.destroy()
            resolve({ success: false, error: 'Timeout de 10s excedido', bodyLength: 0 })
        })
    })
}

async function runAudit() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 AUDITORIA GERAL DO SISTEMA — VARREDURA COMPLETA (05/09/2026)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    let passed = 0
    let failed = 0

    for (const target of TARGETS) {
        process.stdout.write(`⏳ Testando: ${target.name}... `)
        const result = await fetchUrl(target)

        if (result.success) {
            console.log(`✅ [OK] (${result.bodyLength} bytes)`)
            passed++
        } else {
            console.log(`❌ [FALHA] ${result.error}`)
            failed++
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📊 RESULTADO DA AUDITORIA: ${passed}/${passed + failed} PÁGINAS E MÓDULOS APROVADOS`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (failed > 0) {
        process.exit(1)
    } else {
        console.log('🎉 SISTEMA 1000% ESTÁVEL! NENHUMA PÁGINA EM BRANCO OU ERRO DETECTADO.')
    }
}

runAudit()
