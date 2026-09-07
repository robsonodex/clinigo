// app/dashboard/(clinic)/recepcao/face-checkin/page.tsx
// CliniGo Premium - Página de Check-in Facial da Recepção

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { FaceCheckIn } from '@/components/face-recognition';

export default function FaceCheckInPage() {
    const router = useRouter();
    const { user } = useUser();
    const clinicId = user?.clinic_id;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 max-w-5xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push('/dashboard/recepcao')}
                            className="min-h-[44px]"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para Recepção
                        </Button>
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-emerald-600" />
                            <h1 className="text-xl font-bold">Check-in Facial da Recepção</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container py-8 px-4 max-w-3xl mx-auto">
                {clinicId ? (
                    <FaceCheckIn
                        clinicId={clinicId}
                        onCheckInSuccess={(patientId, patientName) => {
                            setTimeout(() => {
                                router.push('/dashboard/recepcao');
                            }, 3000);
                        }}
                    />
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        Carregando informações da clínica...
                    </div>
                )}
            </div>
        </div>
    );
}

