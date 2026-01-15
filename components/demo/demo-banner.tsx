'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function DemoBanner({ isDemo }: { isDemo: boolean }) {
    const router = useRouter();

    if (!isDemo) return null;

    return (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <AlertDescription className="flex items-center justify-between">
                <span>
                    🎬 <strong>Modo Demonstração:</strong> Você está em uma conta fictícia.
                    Dados resetam a cada 24h.
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/cadastro')}
                >
                    Criar Conta Real
                </Button>
            </AlertDescription>
        </Alert>
    );
}
