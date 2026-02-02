'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CreditCard, AlertCircle, RefreshCw, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PagamentoPendentePage() {
    const handleRefresh = () => {
        window.location.reload()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="max-w-2xl w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                    <CardTitle className="text-3xl">Pagamento Pendente</CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Sua conta está aguardando confirmação de pagamento
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Status do Pagamento */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-900">Aguardando Confirmação</h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Seu pagamento está sendo processado. Você receberá um e-mail assim que for confirmado.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Informações por Método */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Tempo de liberação por método:</h4>

                        <div className="border rounded-lg p-4 hover:border-green-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold">Cartão de Crédito</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Confirmação <strong className="text-green-600">imediata</strong>. Você receberá acesso em até 1 minuto.
                            </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold">Boleto Bancário</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Confirmação em <strong className="text-blue-600">1 a 3 dias úteis</strong> após o pagamento.
                            </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9.5 4h5l3.5 3.5v9l-3.5 3.5h-5L6 16.5v-9L9.5 4zm2.5 4.5a3 3 0 100 6 3 3 0 000-6z" />
                                </svg>
                                <h4 className="font-semibold">PIX</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Confirmação em <strong className="text-purple-600">5 a 15 segundos</strong> após o pagamento.
                            </p>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-3 pt-4 border-t">
                        <Button
                            onClick={handleRefresh}
                            className="w-full"
                            size="lg"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Verificar Status do Pagamento
                        </Button>

                        <Button variant="outline" asChild size="lg">
                            <a href="mailto:contato@clinigo.app" className="flex items-center justify-center gap-2">
                                <Mail className="w-4 h-4" />
                                Entrar em Contato
                            </a>
                        </Button>
                    </div>

                    {/* Rodapé Informativo */}
                    <p className="text-xs text-center text-muted-foreground pt-4 border-t">
                        Após a confirmação, você terá acesso completo ao CliniGo para gerenciar sua clínica.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
