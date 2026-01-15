'use client';

import { ImportHistoryTable } from '@/components/import/import-history-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ImportacoesPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null; // or a loading skeleton
    }

    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Importação de Dados</h1>
                    <p className="text-muted-foreground">
                        Migre seus dados de sistemas anteriores para o CliniGo
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/importacao/novo">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Importação
                    </Link>
                </Button>
            </div>

            {/* <ImportHistoryTable /> */}
        </div>
    );
}
