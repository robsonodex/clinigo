'use client';

import { ImportWizard } from '@/components/import/import-wizard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NovaImportacaoPage() {
    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4 pl-0">
                    <Link href="/dashboard/importacao">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Nova Importação</h1>
                <p className="text-muted-foreground">
                    Siga os passos para importar seus dados de forma segura.
                </p>
            </div>

            <ImportWizard />
        </div>
    );
}
