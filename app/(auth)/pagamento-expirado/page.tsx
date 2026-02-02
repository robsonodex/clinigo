import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function PagamentoExpiradoPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
            <Card className="max-w-2xl w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-3xl text-red-900">Pagamento Expirado</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-center text-red-900">
                            Seu boleto venceu ou o pagamento foi cancelado. Para continuar usando o CliniGo,
                            realize um novo pagamento.
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-900 mb-2">O que acontece agora?</h3>
                        <ul className="text-sm text-amber-800 space-y-1">
                            <li>• Seus dados estão seguros e serão mantidos por 30 dias</li>
                            <li>• Ao renovar o pagamento, você terá acesso a tudo novamente</li>
                            <li>• Escolha o melhor plano para sua necessidade</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button className="w-full" size="lg" asChild>
                            <Link href="/planos" className="flex items-center justify-center gap-2">
                                Escolher Novo Plano
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>

                        <Button variant="outline" size="lg" asChild>
                            <a href="mailto:contato@clinigo.app" className="flex items-center justify-center gap-2">
                                <Mail className="w-4 h-4" />
                                Preciso de Ajuda
                            </a>
                        </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground pt-4 border-t">
                        Se você acredita que isto é um erro, entre em contato com nosso suporte.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
