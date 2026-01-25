/**
 * WhatsApp Business Service
 * Integration using whatsapp-web.js for appointment reminders
 */

import { Client, LocalAuth, Message } from 'whatsapp-web.js'
import QRCode from 'qrcode-terminal'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Appointment {
    id: string
    appointment_date: string
    appointment_time: string
    patient: {
        full_name: string
        phone: string
    }
    doctor: {
        user: {
            full_name: string
        }
    }
    clinic: {
        name: string
        address: string
        whatsapp: string
    }
}

export class WhatsAppBusinessService {
    private static instance: WhatsAppBusinessService
    private client: Client
    private isReady: boolean = false

    private constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'clinigo-whatsapp',
                dataPath: './.wwebjs_auth',
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            },
        })

        this.setupEventHandlers()
    }

    static getInstance(): WhatsAppBusinessService {
        if (!WhatsAppBusinessService.instance) {
            WhatsAppBusinessService.instance = new WhatsAppBusinessService()
        }
        return WhatsAppBusinessService.instance
    }

    private setupEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('📱 WhatsApp QR Code:')
            QRCode.generate(qr, { small: true })
            console.log('Escaneie o QR Code acima com WhatsApp Business')
        })

        this.client.on('ready', () => {
            console.log('✅ WhatsApp Business conectado!')
            this.isReady = true
        })

        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp autenticado')
        })

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Falha na autenticação WhatsApp:', msg)
            this.isReady = false
        })

        this.client.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp desconectado:', reason)
            this.isReady = false
        })

        // Bot handlers
        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message)
        })
    }

    async initialize() {
        if (!this.isReady) {
            await this.client.initialize()
        }
    }

    private async handleIncomingMessage(message: Message) {
        const text = message.body.toLowerCase().trim()

        // Ignorar mensagens da própria conta
        if (message.fromMe) return

        // Comandos
        if (text === '1' || text.includes('confirmar')) {
            await this.handleConfirmacao(message)
        } else if (text === '2' || text.includes('reagendar')) {
            await this.handleReagendamento(message)
        } else if (text === '3' || text.includes('cancelar')) {
            await this.handleCancelamento(message)
        } else if (text.includes('agendar') || text.includes('marcar')) {
            await this.handleSolicitacaoAgendamento(message)
        }
    }

    private async handleConfirmacao(message: Message) {
        const phone = message.from.replace('@c.us', '').replace('55', '')
        const supabase = createClient()

        // Buscar agendamento pendente
        const { data: appointments } = await supabase
            .from('appointments')
            .select(`
        *,
        patient:patients(*)
      `)
            .eq('patient.phone', phone)
            .eq('confirmation_status', 'PENDING')
            .gte('appointment_date', new Date().toISOString().split('T')[0])
            .order('appointment_date', { ascending: true })
            .limit(1)

        if (appointments && appointments.length > 0) {
            const apt = appointments[0]

            // Atualizar status
            await supabase
                .from('appointments')
                .update({
                    confirmation_status: 'CONFIRMED',
                    status: 'CONFIRMED',
                })
                .eq('id', apt.id)

            await message.reply(
                '✅ *Consulta confirmada!*\n\n' +
                `Sua consulta está confirmada para ${format(new Date(apt.appointment_date), 'dd/MM/yyyy')} às ${apt.appointment_time}.\n\n` +
                'Nos vemos em breve! 👋'
            )
        } else {
            await message.reply(
                'Não encontramos nenhuma consulta pendente de confirmação para este número.\n\n' +
                'Se tiver dúvidas, entre em contato com a recepção.'
            )
        }
    }

    private async handleReagendamento(message: Message) {
        await message.reply(
            'Para reagendar, entre em contato com a recepção:\n' +
            '📞 Entre em contato através do WhatsApp da clínica\n' +
            '💬 Ou responda esta mensagem com sua preferência de data/horário.'
        )
    }

    private async handleCancelamento(message: Message) {
        await message.reply(
            'Para cancelar, entre em contato com a recepção:\n' +
            '📞 Entre em contato através do WhatsApp da clínica\n\n' +
            '⚠️ *Importante*: Cancelamentos devem ser feitos com pelo menos 24h de antecedência.'
        )
    }

    private async handleSolicitacaoAgendamento(message: Message) {
        await message.reply(
            'Olá! Para agendar sua consulta, acesse nosso site:\n' +
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'}/agendar\n\n` +
            'Ou entre em contato com a recepção.'
        )
    }

    async sendLembrete24h(appointment: Appointment) {
        if (!this.isReady) {
            throw new Error('WhatsApp não está conectado')
        }

        const phone = appointment.patient.phone.replace(/\D/g, '')
        const chatId = `55${phone}@c.us` // Brasil

        const message =
            `🔔 *Lembrete de Consulta*\n\n` +
            `Olá ${appointment.patient.full_name}!\n\n` +
            `Você tem consulta agendada para *amanhã*:\n` +
            `📅 ${format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}\n` +
            `🕐 ${appointment.appointment_time}\n` +
            `👨‍⚕️ Dr(a). ${appointment.doctor.user.full_name}\n\n` +
            `Por favor, confirme sua presença:\n` +
            `1️⃣ Confirmar\n` +
            `2️⃣ Reagendar\n` +
            `3️⃣ Cancelar`

        try {
            await this.client.sendMessage(chatId, message)

            // Atualizar flag
            const supabase = createClient()
            await supabase
                .from('appointments')
                .update({ lembrete_24h_enviado: true })
                .eq('id', appointment.id)

            console.log(`✅ Lembrete 24h enviado: ${appointment.id}`)
        } catch (error) {
            console.error(`❌ Erro ao enviar lembrete 24h:`, error)
            throw error
        }
    }

    async sendLembrete1h(appointment: Appointment) {
        if (!this.isReady) {
            throw new Error('WhatsApp não está conectado')
        }

        const phone = appointment.patient.phone.replace(/\D/g, '')
        const chatId = `55${phone}@c.us`

        const message =
            `⏰ *Consulta em 1 hora!*\n\n` +
            `${appointment.patient.full_name}, sua consulta é daqui a pouco:\n\n` +
            `🕐 ${appointment.appointment_time}\n` +
            `📍 ${appointment.clinic.address}\n\n` +
            `Não esqueça de trazer:\n` +
            `✅ Documento com foto\n` +
            `✅ Carteirinha do convênio (se houver)\n` +
            `✅ Exames anteriores\n\n` +
            `Nos vemos em breve! 👋`

        try {
            await this.client.sendMessage(chatId, message)

            const supabase = createClient()
            await supabase
                .from('appointments')
                .update({ lembrete_1h_enviado: true })
                .eq('id', appointment.id)

            console.log(`✅ Lembrete 1h enviado: ${appointment.id}`)
        } catch (error) {
            console.error(`❌ Erro ao enviar lembrete 1h:`, error)
            // Fallback para email poderia ser implementado aqui
            throw error
        }
    }

    get ready(): boolean {
        return this.isReady
    }
}
