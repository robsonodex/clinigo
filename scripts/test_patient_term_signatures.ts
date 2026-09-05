import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testSignaturesFlow() {
    console.log('🧪 [TEST] Iniciando validação completa da Central de Contratos & Assinaturas Digitais...')

    // 1. Verificar templates da clínica World Sensory
    const { data: templates, error: tErr } = await supabase
        .from('clinic_document_templates')
        .select('*')
        .limit(5)

    if (tErr || !templates || templates.length === 0) {
        console.error('❌ Falha ao consultar templates da clínica:', tErr)
        process.exit(1)
    }
    console.log(`✅ Templates de documentos encontrados no banco: ${templates.length} modelos disponíveis`)

    const sampleTemplate = templates[0]

    // 2. Buscar um paciente existente para emitir termo de teste
    const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('id, full_name, cpf, clinic_id')
        .eq('clinic_id', sampleTemplate.clinic_id)
        .limit(1)
        .single()

    if (pErr || !patient) {
        console.error('❌ Paciente não encontrado para a clínica do template:', pErr)
        process.exit(1)
    }
    console.log(`✅ Paciente de teste selecionado: ${patient.full_name} (${patient.id})`)

    // 3. Emitir termo para o paciente com substituição de tags
    const renderedContent = sampleTemplate.content
        .replace(/{{nome_paciente}}/g, patient.full_name)
        .replace(/{{cpf_paciente}}/g, patient.cpf || '111.222.333-44')
        .replace(/{{nome_responsavel}}/g, 'Maria da Silva (Mãe)')
        .replace(/{{cpf_responsavel}}/g, '999.888.777-66')
        .replace(/{{nome_clinica}}/g, 'WorldSensory')
        .replace(/{{data_atual}}/g, '05 de setembro de 2026')

    const { data: newSig, error: sErr } = await supabase
        .from('patient_term_signatures')
        .insert({
            clinic_id: patient.clinic_id,
            patient_id: patient.id,
            template_id: sampleTemplate.id,
            title: sampleTemplate.title,
            category: sampleTemplate.category,
            document_content: renderedContent,
            signer_name: 'Maria da Silva (Mãe)',
            signer_cpf: '999.888.777-66',
            signer_phone: '11999998888',
            status: 'PENDING',
        })
        .select()
        .single()

    if (sErr || !newSig) {
        console.error('❌ Falha ao criar registro de termo para assinatura:', sErr)
        process.exit(1)
    }
    console.log(`✅ Termo emitido com sucesso! Token gerado: ${newSig.signing_token}`)
    console.log(`   Status inicial verificado: ${newSig.status}`)

    // 4. Simular validação da rota pública via token
    const { data: fetchedSig, error: fErr } = await supabase
        .from('patient_term_signatures')
        .select('*')
        .eq('signing_token', newSig.signing_token)
        .single()

    if (fErr || !fetchedSig || fetchedSig.status !== 'PENDING') {
        console.error('❌ Falha ao consultar termo pelo token público:', fErr)
        process.exit(1)
    }
    console.log('✅ Rota pública: Busca por token único aprovada com status PENDING')

    // 5. Simular assinatura digital com coleta de evidências de auditoria (Lei 14.063/2020)
    const mockSignatureCanvasDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const clientIp = '187.54.120.33'
    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    const signedAt = new Date().toISOString()

    const hashPayload = [
        fetchedSig.id,
        fetchedSig.document_content,
        'Maria da Silva (Mãe)',
        '999.888.777-66',
        signedAt,
        clientIp,
        userAgent,
    ].join('|')
    const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

    const { data: signedRecord, error: signErr } = await supabase
        .from('patient_term_signatures')
        .update({
            status: 'SIGNED',
            signature_data_url: mockSignatureCanvasDataUrl,
            signed_at: signedAt,
            signed_ip: clientIp,
            signed_user_agent: userAgent,
            security_hash: securityHash,
            updated_at: signedAt,
        })
        .eq('id', fetchedSig.id)
        .select()
        .single()

    if (signErr || !signedRecord || signedRecord.status !== 'SIGNED') {
        console.error('❌ Falha ao atualizar assinatura:', signErr)
        process.exit(1)
    }
    console.log('✅ Assinatura Digital registrada com sucesso:')
    console.log(`   - Status final: ${signedRecord.status}`)
    console.log(`   - Data/Hora: ${signedRecord.signed_at}`)
    console.log(`   - IP de origem: ${signedRecord.signed_ip}`)
    console.log(`   - Hash SHA-256 de integridade: ${signedRecord.security_hash}`)

    // 6. Teste de isolamento de segurança: token inexistente
    const fakeToken = '00000000-0000-0000-0000-000000000000'
    const { data: fakeCheck } = await supabase
        .from('patient_term_signatures')
        .select('id')
        .eq('signing_token', fakeToken)
        .maybeSingle()

    if (fakeCheck === null) {
        console.log('✅ Teste de isolamento de segurança: Token inexistente retorna 0 registros (APROVADO)')
    } else {
        console.error('❌ Falha no teste de isolamento')
        process.exit(1)
    }

    // 7. Limpeza do registro de teste
    await supabase.from('patient_term_signatures').delete().eq('id', newSig.id)
    console.log('✅ Registro de teste limpo com sucesso')

    console.log('🎉 TODOS OS TESTES DE ASSINATURA DIGITAL FORAM APROVADOS COM 100% DE SUCESSO!')
}

testSignaturesFlow().catch((err) => {
    console.error('Erro fatal no teste:', err)
    process.exit(1)
})
