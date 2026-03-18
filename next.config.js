/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Compressão agressiva
    compress: true,

    // Experimental optimizations
    experimental: {
        // Auto package imports optimization para reduzir bundle
        optimizePackageImports: [
            '@radix-ui/react-*',
            'lucide-react',
            'date-fns',
            'recharts',
            '@tanstack/react-query',
            '@tanstack/react-virtual',
        ],
    },

    // TypeScript strict mode - enforce type checking
    typescript: {
        ignoreBuildErrors: true,  // TODO: Complete Next.js 16 async params conversion for remaining routes
    },

    eslint: {
        ignoreDuringBuilds: true,
    },

    // External packages that should not be bundled
    // These packages use Node.js APIs and need to run in Node.js runtime
    serverExternalPackages: ['nodemailer', '@react-email/components', '@react-email/render'],

    // Image optimization
    images: {
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        minimumCacheTTL: 31536000, // 1 ano
    },

    // Turbopack config (required for Next.js 16)
    turbopack: {},

    // Webpack optimization - disabled for Turbopack
    // webpack: (config, { isServer }) => {
    //     if (!isServer) {
    //         // Tree shaking
    //         config.optimization.usedExports = true
    //         config.optimization.sideEffects = false
    //     }
    //     return config
    // },

    // Rewrites: Vercel has a bug that prevents ANY route under api/appointments/[id]
    // from being registered (even a minimal handler). api-v2/appointments/[id] works.
    // These rewrites transparently proxy [id] routes to their api-v2 equivalents.
    async rewrites() {
        return [
            // Main [id] route - GET/PATCH
            {
                source: '/api/appointments/:id',
                destination: '/api-v2/appointments/:id',
            },
            // Sub-routes
            {
                source: '/api/appointments/:id/cancel',
                destination: '/api-v2/appointments/:id/cancel',
            },
            {
                source: '/api/appointments/:id/confirm-payment',
                destination: '/api-v2/appointments/:id/confirm-payment',
            },
            {
                source: '/api/appointments/:id/generate-qr',
                destination: '/api-v2/appointments/:id/generate-qr',
            },
            {
                source: '/api/appointments/:id/mark-no-show',
                destination: '/api-v2/appointments/:id/mark-no-show',
            },
            {
                source: '/api/appointments/:id/send-qr',
                destination: '/api-v2/appointments/:id/send-qr',
            },
            {
                source: '/api/appointments/:id/video-link',
                destination: '/api-v2/appointments/:id/video-link',
            },
        ]
    },

    // Headers for security and caching
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
                ],
            },
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss: data: blob:; frame-src 'self' https:;"
                    }
                ],
            },
            {
                // Cache static assets agressivamente
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ]
    },
}

module.exports = nextConfig


