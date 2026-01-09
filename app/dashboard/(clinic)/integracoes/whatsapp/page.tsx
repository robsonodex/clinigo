'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppConfigPage() {
    const [apiKey, setApiKey] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [businessAccountId, setBusinessAccountId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/integrations/whatsapp/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    phone_number_id: phoneNumberId,
                    business_account_id: businessAccountId
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao configurar WhatsApp');
            }

            const data = await response.json();

            toast({
                title: '✅ Configurado com sucesso',
                description: 'WhatsApp Business API está pronta para uso.'
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '❌ Erro',
                description: error.message || 'Erro desconhecido'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-green-600" />
                        Configuração WhatsApp
                    </h1>
                    <p className="text-muted-foreground">Conecte sua conta do WhatsApp Business API</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="https://business.facebook.com" target="_blank" className="flex items-center gap-2">
                        Business Manager <ExternalLink className="w-4 h-4" />
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Credenciais da API</CardTitle>
                    <CardDescription>Insira as chaves de acesso do painel da Meta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">
                            API Key (Access Token)
                        </label>
                        <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="EAAG..."
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">
                            Phone Number ID
                        </label>
                        <Input
                            value={phoneNumberId}
                            onChange={(e) => setPhoneNumberId(e.target.value)}
                            placeholder="123456789"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">
                            Business Account ID
                        </label>
                        <Input
                            value={businessAccountId}
                            onChange={(e) => setBusinessAccountId(e.target.value)}
                            placeholder="123456789"
                        />
                    </div>

                    <Button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                        {isLoading ? 'Salvando...' : 'Salvar e Conectar'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Como obter as credenciais?</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                        <li>Acesse o <a href="https://business.facebook.com" className="text-primary underline">Facebook Business Manager</a></li>
                        <li>Crie um aplicativo do tipo "Business"</li>
                        <li>Adicione o produto "WhatsApp" ao seu app</li>
                        <li>Em "API Setup", copie o Token e o Phone Number ID</li>
                        <li>Cole os dados nos campos acima</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
