import { getStorageService } from '../lib/services/storage/storage-service'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testR2() {
    console.log('=============================================================================')
    console.log('TESTANDO CONEXAO COM CLOUDFLARE R2 VIA STORAGE SERVICE')
    console.log('=============================================================================')
    
    const service = getStorageService('patient-documents')
    
    const testContent = Buffer.from('Teste de integridade e comunicacao Clinigo -> Cloudflare R2: ' + new Date().toISOString())
    const filename = 'teste-conexao.txt'
    
    console.log('[1/4] Fazendo upload de arquivo de teste...')
    const uploadResult = await service.upload({
        clinicId: 'teste-clinica',
        module: 'patient-documents',
        entityId: 'teste-entidade',
        file: testContent,
        filename,
        contentType: 'text/plain'
    })
    console.log('Upload bem-sucedido! Chave gerada:', uploadResult.key)
    console.log('Provedor ativo:', uploadResult.provider)
    
    console.log('[2/4] Gerando URL assinada para leitura...')
    const signedUrl = await service.getSignedReadUrl({
        key: uploadResult.key,
        expiresInSeconds: 300
    })
    console.log('URL assinada gerada com sucesso!')
    console.log('Previa da URL:', signedUrl.substring(0, 80) + '...')
    
    console.log('[3/4] Baixando o arquivo via URL assinada para conferir conteudo...')
    const response = await fetch(signedUrl)
    const downloadedText = await response.text()
    if (downloadedText === testContent.toString()) {
        console.log('CONTEUDO CONFERIDO COM 100% DE IDENTIDADE!')
    } else {
        throw new Error('Conteudo baixado difere do original!')
    }
    
    console.log('[4/4] Removendo arquivo de teste do R2 para nao deixar sujeira...')
    await service.delete({ key: uploadResult.key })
    console.log('Arquivo de teste removido com sucesso!')
    
    console.log('=============================================================================')
    console.log('RESULTADO: CLOUDFLARE R2 100% OPERACIONAL, CONECTADO E VALIDADO!')
    console.log('=============================================================================')
}

testR2().catch(err => {
    console.error('ERRO NO TESTE DO R2:', err)
    process.exit(1)
})
