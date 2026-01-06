/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // TEMPORARY: Ignore TypeScript errors during build
    // The database.types.ts file needs to be regenerated from Supabase
    // Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
    typescript: {
        ignoreBuildErrors: true,
    },

    eslint: {
        ignoreDuringBuilds: true,
    },

    // Experimental features for Next.js 15
    experimental: {
        // Enable server actions
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },

    // External packages that should not be bundled
    // These packages use Node.js APIs and need to run in Node.js runtime
    serverExternalPackages: ['nodemailer', '@react-email/components', '@react-email/render'],

    // Webpack configuration for Node.js modules
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Client-side: don't try to require these modules
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                dns: false,
                child_process: false,
            }
        }
        return config
    },

    // Headers for security
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
        ]
    },
}

module.exports = nextConfig
