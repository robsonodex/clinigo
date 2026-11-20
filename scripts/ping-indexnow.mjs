#!/usr/bin/env node
/**
 * Notificador IndexNow para Bing (ChatGPT Search / Copilot), Yandex e buscadores parceiros.
 *
 * Uso:
 *   node scripts/ping-indexnow.mjs
 */

const HOST = 'clinigo.app'
const KEY = '8f4c2b9e7a1d4e6f9c3b2a5d8e7f1a4c'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

const URLS = [
    `https://${HOST}/`,
    `https://${HOST}/solucoes`,
    `https://${HOST}/solucoes/clinica-multidisciplinar`,
    `https://${HOST}/solucoes/clinica-aba`,
    `https://${HOST}/solucoes/psicologia`,
    `https://${HOST}/solucoes/fonoaudiologia`,
    `https://${HOST}/solucoes/terapia-ocupacional`,
    `https://${HOST}/solucoes/psicomotricidade`,
    `https://${HOST}/solucoes/fisioterapia`,
    `https://${HOST}/solucoes/faturamento-tiss-terapias`,
    `https://${HOST}/comparativo`,
    `https://${HOST}/planos`,
    `https://${HOST}/trial`,
    `https://${HOST}/blog`,
    `https://${HOST}/blog/agenda-recorrente-co-terapia`,
    `https://${HOST}/blog/planos-terapeuticos-aba-evolucoes`,
    `https://${HOST}/blog/lgpd-sigilo-clinico-rbac`,
    `https://${HOST}/blog/faturamento-tiss-terapias-glosas`,
    `https://${HOST}/blog/repasse-profissional-regras-individuais`,
    `https://${HOST}/blog/confirmacao-whatsapp-reducao-faltas`,
    `https://${HOST}/blog/como-escolher-sistema-clinica-aba`,
    `https://${HOST}/blog/sigilo-prontuario-crp-crfa-crefito`,
    `https://${HOST}/sobre`,
    `https://${HOST}/contato`,
    `https://${HOST}/site`,
    `https://${HOST}/help`,
]

async function main() {
    const payload = {
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: URLS,
    }

    console.log(`[IndexNow] Enviando ${URLS.length} URLs de ${HOST} para api.indexnow.org...`)
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
    })

    const text = await res.text()
    console.log(`[IndexNow] Status HTTP: ${res.status} ${res.statusText}`)
    if (text) console.log(`[IndexNow] Resposta: ${text}`)

    if (res.status !== 200 && res.status !== 202) {
        process.exit(1)
    }
    console.log('[IndexNow] Notificação aceita com sucesso (Bing / ChatGPT Search / parceiros).')
}

main().catch((err) => {
    console.error('[IndexNow] Erro:', err)
    process.exit(1)
})

