/**
 * WhatsApp Initialization Script
 * Run this to start WhatsApp Business connection
 * Usage: node scripts/start-whatsapp.js
 */

const { WhatsAppBusinessService } = require('../lib/services/whatsapp-business')

async function main() {
    console.log('🚀 Inicializando WhatsApp Business...')
    console.log('📱 Aguarde o QR Code aparecer\n')

    try {
        const whatsapp = WhatsAppBusinessService.getInstance()
        await whatsapp.initialize()

        console.log('\n✅ WhatsApp Business conectado com sucesso!')
        console.log('🔄 Mantendo conexão ativa... (Pressione Ctrl+C para parar)')

        // Keep process alive
        setInterval(() => {
            console.log(`⏰ [${new Date().toLocaleTimeString()}] Conexão ativa`)
        }, 60000) // Log every minute
    } catch (error) {
        console.error('❌ Erro ao iniciar WhatsApp:', error)
        process.exit(1)
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Desconectando WhatsApp Business...')
    process.exit(0)
})

main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})
