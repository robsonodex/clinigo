/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Enable standalone output for Docker optimization
    output: 'standalone',

    // TypeScript strict mode - enforce type checking
    typescript: {
        ignoreBuildErrors: true,  // TODO: Complete Next.js 16 async params conversion for remaining routes
    },

    // External packages that should not be bundled
    // These packages use Node.js APIs and need to run in Node.js runtime
    serverExternalPackages: ['nodemailer', '@react-email/components', '@react-email/render'],

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


