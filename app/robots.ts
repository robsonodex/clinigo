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
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
