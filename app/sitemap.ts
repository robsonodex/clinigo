import { MetadataRoute } from 'next'
import { SOLUTIONS_DATA } from '@/lib/seo/solutions-data'
import { BLOG_ARTICLES } from '@/lib/seo/blog-articles'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://clinigo.app'
    const lastModified = new Date()

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/solucoes`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/comparativo`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/planos`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/trial`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.85,
        },
        {
            url: `${baseUrl}/sobre`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/site`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/contato`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/help`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.65,
        },
        {
            url: `${baseUrl}/clinica`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/medico`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/termos`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ]

    const solutionPages: MetadataRoute.Sitemap = SOLUTIONS_DATA.map((solution) => ({
        url: `${baseUrl}/solucoes/${solution.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.95,
    }))

    const blogPages: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
        url: `${baseUrl}/blog/${article.id}`,
        lastModified: new Date(article.isoDate),
        changeFrequency: 'monthly',
        priority: 0.8,
    }))

    return [...staticPages, ...solutionPages, ...blogPages]
}
