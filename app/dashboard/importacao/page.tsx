'use client';

import { ImportHistoryTable } from '@/components/import/import-history-table';
import { Button } from '@/components/ui/button';
import { Plus, Lock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ImportacoesPage() {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [planType, setPlanType] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        checkPlanAccess();
    }, []);

    const checkPlanAccess = async () => {
        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Get user's clinic
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            if (!userData?.clinic_id) {
                toast.error('Clínica não encontrada');
                return;
            }

            // Get clinic plan
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('plan_type')
                .eq('id', (userData as any).clinic_id)
                .single();

            const plan = (clinicData as any)?.plan_type || 'BASIC';
            setPlanType(plan);

            // BASIC and STARTER plans do NOT have access to import
            if (plan === 'BASIC' || plan === 'STARTER') {
                setHasAccess(false);
            } else {
                setHasAccess(true);
            }
        } catch (error) {
            console.error('Error checking plan:', error);
            toast.error('Erro ao verificar plano');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || loading) {
        return null;
    }

    // Block access for BASIC and STARTER plans
    if (!hasAccess) {
        return (
            <div className="space-y-6 container mx-auto py-6">
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 rounded-full">
                                <Lock className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <CardTitle className="text-amber-900">Recurso Bloqueado</CardTitle>
                                <CardDescription className="text-amber-700">
                                    Plano {planType}: Importação de dados não disponível
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-amber-800">
                            A <strong>Importação de Dados</strong> está disponível apenas nos planos <strong>PRO</strong> e <strong>ENTERPRISE</strong>.
                        </p>
                        <p className="text-sm text-amber-700">
                            Faça upgrade do seu plano para importar pacientes, consultas e prontuários de sistemas anteriores.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <Button asChild variant="default">
                                <Link href="/dashboard/configuracoes?tab=plan">
                                    Fazer Upgrade
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/dashboard">
                                    Voltar ao Dashboard
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
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
                        <span className="flex items-center"><Plus className="mr-2 h-4 w-4" />Nova Importação</span>
                    </Link>
                </Button>
            </div>

            <ImportHistoryTable />
        </div>
    );
}
