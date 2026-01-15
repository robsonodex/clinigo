'use client';

import { ImportProgress } from '@/components/import/import-progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, FileDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    useParams
} from 'next/navigation';

export default function ImportacaoDetalhesPage() {
    const params = useParams();
    const id = params?.id as string;

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <Button variant="ghost" size="sm" asChild className="mb-4 pl-0">
                        <Link href="/dashboard/importacao">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Detalhes da Importação</h1>
                    <p className="text-muted-foreground">
                        Acompanhe o status e resultados.
                    </p>
                </div>

                {/* Placeholder for Error Report Download */}
                {/* <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Baixar Relatório de Erros
        </Button> */}
            </div>

            <Card className="p-6">
                <ImportProgress jobId={id} />
            </Card>
        </div>
    );
}
