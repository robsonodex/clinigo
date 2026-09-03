import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://clinigo.app'

    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/planos',
                    '/blog',
                    '/contato',
                    '/sobre',
                    '/termos',
                    '/privacidade',
                    '/clinica',
                    '/medico',
                    '/favicon.ico',
                    '/favicon.png',
                    '/favicon-48x48.png',
                    '/favicon-96x96.png',
                    '/apple-touch-icon.png',
                    '/icon-192.png',
                    '/icon.png',
                    '/site.webmanifest',
                    '/manifest.json',
                ],
                disallow: [
                    '/dashboard/',
                    '/api/',
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
                ],
            },
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
