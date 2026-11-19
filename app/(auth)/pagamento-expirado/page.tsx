import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditorialShell } from '@/components/marketing/EditorialShell'

export default function PagamentoExpiradoPage() {
    return (
        <EditorialShell minimal backHref="/" backLabel="Voltar ao início" compactFooter>
            <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
                <div className="max-w-xl w-full">
                    <div className="flex justify-center mb-6">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/logo_black.svg"
                                alt="CliniGo"
                                width={156}
                                height={48}
                                unoptimized
                                priority
                                className="h-[46px] w-auto object-contain"
                            />
                        </Link>
                    </div>

                    <Card className="bg-white border border-[#E6E8E5] shadow-sm">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-600" strokeWidth={1.75} />
                            </div>
                            <CardTitle className="text-2xl sm:text-3xl text-[#0F1F1B]">Pagamento Expirado</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-center text-sm text-red-900">
                                    Seu boleto venceu ou o pagamento foi cancelado. Para retomar o acesso ao CliniGo, escolha um plano e realize um novo pagamento.
                                </p>
                            </div>

                            <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg p-4">
                                <h3 className="font-semibold text-[#0F1F1B] text-sm mb-2">O que acontece agora?</h3>
                                <ul className="text-sm text-[#4B5B56] space-y-1.5 list-disc list-inside">
                                    <li>Seus dados permanecem preservados com segurança por 30 dias</li>
                                    <li>Ao confirmar a renovação, o acesso da unidade é restabelecido</li>
                                    <li>Você pode revisar o plano ideal para o número de profissionais da equipe</li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button className="w-full min-h-[46px] bg-[#155E4B] hover:bg-[#0F493A] text-white" size="lg" asChild>
                                    <Link href="/planos" className="flex items-center justify-center gap-2">
                                        Escolher plano
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </Button>

                                <Button variant="outline" size="lg" className="w-full min-h-[46px] border-[#E6E8E5]" asChild>
                                    <a href="mailto:contato@clinigo.app" className="flex items-center justify-center gap-2">
                                        <Mail className="w-4 h-4 text-[#155E4B]" />
                                        Preciso de ajuda
                                    </a>
                                </Button>
                            </div>

                            <p className="text-xs text-center text-[#4B5B56] pt-4 border-t border-[#E6E8E5]">
                                Se você acredita que isto é um engano, entre em contato com nossa equipe de suporte.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </EditorialShell>
    )
}
