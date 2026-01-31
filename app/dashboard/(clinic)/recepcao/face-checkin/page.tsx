// app/dashboard/(clinic)/recepcao/face-checkin/page.tsx
// CliniGo Premium - Página de check-in por reconhecimento facial

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaceCheckIn } from '@/components/face-recognition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, QrCode, Camera, Shield } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { toast } from 'sonner';

export default function FaceCheckInPage() {
    const router = useRouter();
    const { user } = useUser();
    const [lastCheckIn, setLastCheckIn] = useState<{ name: string; time: Date } | null>(null);

    const clinicId = user?.clinic_id;

    if (!clinicId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p>Carregando informações da clínica...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleCheckInSuccess = (patientId: string, patientName: string) => {
        setLastCheckIn({ name: patientName, time: new Date() });
        toast.success(`Check-in realizado: ${patientName}`);
    };

    const handleFallbackToQR = () => {
        router.push('/dashboard/recepcao');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-primary" />
                            <h1 className="text-xl font-bold">Check-in Facial</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleFallbackToQR}>
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Code
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container py-8 px-4">
                <FaceCheckIn
                    clinicId={clinicId}
                    onCheckInSuccess={handleCheckInSuccess}
                    onFallbackToQR={handleFallbackToQR}
                />

                {/* Último check-in */}
                {lastCheckIn && (
                    <Card className="max-w-md mx-auto mt-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Último Check-in
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-bold">{lastCheckIn.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {lastCheckIn.time.toLocaleTimeString('pt-BR')}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Info de segurança */}
                <div className="max-w-md mx-auto mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Sistema biométrico criptografado em conformidade com LGPD
                </div>
            </div>
        </div>
    );
}
