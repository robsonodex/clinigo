'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Download, FileText, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function PrivacyTab() {
    async function requestDataExport() {
        toast.info('Funcionalidade em desenvolvimento')
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Seus Dados (LGPD)</CardTitle>
                    <CardDescription>
                        Controle e gerencie seus dados pessoais
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium">Exportar Meus Dados</p>
                            <p className="text-sm text-muted-foreground">
                                Receba uma cópia de todos os seus dados em formato ZIP
                            </p>
                        </div>
                        <Button onClick={requestDataExport} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <p className="font-medium">Seus Direitos</p>
                        <p className="text-sm text-muted-foreground">
                            De acordo com a LGPD, você tem direito a:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                            <li>Acessar seus dados</li>
                            <li>Corrigir dados incorretos</li>
                            <li>Solicitar exclusão</li>
                            <li>Revogar consentimento</li>
                            <li>Portabilidade de dados</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Termos e Políticas</CardTitle>
                    <CardDescription>
                        Documentos legais e de privacidade
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/termos-de-uso" target="_blank">
                            <FileText className="mr-2 h-4 w-4" />
                            Termos de Uso
                        </a>
                    </Button>

                    <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/politica-de-privacidade" target="_blank">
                            <Shield className="mr-2 h-4 w-4" />
                            Política de Privacidade
                        </a>
                    </Button>

                    <Button variant="outline" className="w-full justify-start" asChild>
                        <a href="/politica-de-cookies" target="_blank">
                            <FileText className="mr-2 h-4 w-4" />
                            Política de Cookies
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
