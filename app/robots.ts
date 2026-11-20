import { MetadataRoute } from 'next'

const PRIVATE_DISALLOW = [
    '/dashboard/',
    '/api/',
    '/api-v2/',
    '/paciente/',
    '/partners/',
    '/admin/',
    '/system-master-hub/',
    '/totem/',
    '/checkin/',
    '/m/',
    '/pagar/',
    '/pagamento/',
    '/conta-bloqueada',
    '/pagamento-pendente',
    '/pagamento-expirado',
    '/landing-premium',
    '/preview',
    '/preview-home',
    '/booking-templates',
    '/public-templates',
    '/lgpd',
    '/privacidade',
]

const PUBLIC_ALLOW = [
    '/',
    '/solucoes',
    '/solucoes/',
    '/comparativo',
    '/planos',
    '/trial',
    '/blog',
    '/blog/',
    '/sobre',
    '/contato',
    '/site',
    '/help',
    '/termos',
    '/clinica',
    '/medico',
    '/llms.txt',
    '/llms-full.txt',
    '/.well-known/ai-summary.json',
    '/8f4c2b9e7a1d4e6f9c3b2a5d8e7f1a4c.txt',
    '/favicon.ico',
    '/favicon.png',
    '/favicon-48x48.png',
    '/favicon-96x96.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon.png',
    '/site.webmanifest',
    '/manifest.json',
]

const AI_AND_SEARCH_BOTS = [
    'OAI-SearchBot',
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://clinigo.app'

    return {
        rules: [
            {
                userAgent: '*',
                allow: PUBLIC_ALLOW,
                disallow: PRIVATE_DISALLOW,
            },
            ...AI_AND_SEARCH_BOTS.map((bot) => ({
                userAgent: bot,
                allow: PUBLIC_ALLOW,
                disallow: PRIVATE_DISALLOW,
            })),
            {
                userAgent: 'Googlebot-Image',
                allow: [
                    '/',
                    '*.png',
                    '*.ico',
                    '*.svg',
                    '*.jpg',
                    '/favicon.ico',
                    '/favicon.png',
                    '/favicon-48x48.png',
                    '/favicon-96x96.png',
                    '/apple-touch-icon.png',
                    '/icon-192.png',
                    '/icon.png',
                    '/icons/*',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
