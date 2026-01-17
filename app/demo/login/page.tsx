'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Play } from 'lucide-react'

export default function DemoLoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDemoLogin = async () => {
        setLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: 'admin@demo.clinigo.app',
                password: 'Demo@2026'
            })

            if (authError) {
                console.error('Auth error:', authError)
                setError(authError.message)
                return
            }

            if (data.session) {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err: any) {
            console.error('Exception:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
            <Card className="w-full max-w-md p-8 shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Play className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Demonstração CliniGo</h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4 mb-6 font-mono text-sm">
                    <p>admin@demo.clinigo.app</p>
                    <p>Demo@2026</p>
                </div>

                <Button
                    onClick={handleDemoLogin}
                    disabled={loading}
                    variant="premium"
                    size="xl"
                    className="w-full"
                >
                    {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                    Entrar
                </Button>
            </Card>
        </div>
    )
}
