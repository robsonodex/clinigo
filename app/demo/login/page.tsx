'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DemoLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDemoLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            // Automatic login with demo credentials
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@demo.clinigo.app',
                    password: 'Demo@2026'
                })
            });

            if (response.ok) {
                router.push('/dashboard');
            } else {
                const data = await response.json().catch(() => ({}));
                console.error('Demo login failed', data);
                if (response.status === 401) {
                    setError('Falha na autenticação. O usuário "admin@demo.clinigo.app" foi criado no Supabase Auth?');
                } else {
                    setError('Erro ao tentar entrar na demo. Tente novamente.');
                }
            }
        } catch (error) {
            console.error('Erro no login demo:', error);
            setError('Erro de conexão. Verifique sua internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        🎬 Demonstração CliniGo
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Explore o sistema completo com dados fictícios
                    </p>
                </div>

                <Alert>
                    <AlertDescription>
                        ℹ️ Esta é uma conta de demonstração. Os dados são resetados a cada 24h.
                        Algumas operações críticas estão bloqueadas.
                    </AlertDescription>
                </Alert>

                {error && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Credenciais de acesso:</p>
                        <p className="font-mono text-sm">📧 admin@demo.clinigo.app</p>
                        <p className="font-mono text-sm">🔑 Demo@2026</p>
                    </div>

                    <Button
                        onClick={handleDemoLogin}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? 'Entrando...' : 'Entrar na Demonstração'}
                    </Button>

                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Gostou?
                            <a href="/cadastro" className="text-blue-600 hover:underline ml-1">
                                Crie sua conta real e ganhe 15 dias grátis!
                            </a>
                        </p>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">O que você pode fazer na demo:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>✅ Navegar por todos os módulos</li>
                        <li>✅ Ver prontuários preenchidos</li>
                        <li>✅ Gerar PDFs de receitas</li>
                        <li>✅ Explorar relatórios financeiros</li>
                        <li>✅ Testar geração de XML TISS</li>
                        <li>⛔ Deletar dados críticos (bloqueado)</li>
                        <li>⛔ Enviar emails/WhatsApp reais (bloqueado)</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
}
