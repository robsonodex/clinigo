export const PLANS = {
    FREE: {
        id: 'FREE',
        name: 'Gratuito',
        price: 0,
        limits: {
            max_doctors: 1,
            max_appointments_month: 50,
            storage_gb: 0.5,
        },
        features: [
            '1 Médico',
            '50 Agendamentos/mês',
            'Agenda básica',
            'Perfil público',
        ],
        color: 'gray',
    },
    BASIC: {
        id: 'BASIC',
        name: 'Básico',
        price: 97,
        limits: {
            max_doctors: 3,
            max_appointments_month: 300,
            storage_gb: 5,
        },
        features: [
            'Até 3 Médicos',
            '300 Agendamentos/mês',
            'Confirmação via Email',
            'Lembretes automáticos',
            'Dashboard financeiro básico',
        ],
        color: 'blue',
    },
    PRO: {
        id: 'PRO',
        name: 'Profissional',
        price: 197,
        limits: {
            max_doctors: 10,
            max_appointments_month: 1000,
            storage_gb: 20,
        },
        features: [
            'Até 10 Médicos',
            '1000 Agendamentos/mês',
            'Confirmação via WhatsApp (Twilio)',
            'Teleconsulta integrada',
            'Prontuário eletrônico completo',
            'Gestão financeira avançada',
        ],
        color: 'purple',
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 497,
        limits: {
            max_doctors: 999,
            max_appointments_month: 99999,
            storage_gb: 100,
        },
        features: [
            'Médicos ilimitados',
            'Agendamentos ilimitados',
            'API para integrações',
            'Suporte prioritário 24/7',
            'Domínio personalizado',
            'Treinamento da equipe',
        ],
        color: 'black',
    },
} as const

export type PlanType = keyof typeof PLANS
