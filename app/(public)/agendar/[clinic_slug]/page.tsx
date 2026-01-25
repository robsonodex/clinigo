/**
 * Public Appointment Booking Page (Linktree Style)
 * URL: /agendar/[clinic_slug]
 */

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AgendarPublicPage({
    params,
}: {
    params: Promise<{ clinic_slug: string }>
}) {
    const { clinic_slug } = await params
    const supabase = await createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select(`
      *,
      doctors(
        id,
        specialty,
        user:users(
          full_name,
          avatar_url
        )
      )
    `)
        .eq('slug', clinic_slug)
        .single()

    if (!clinic) notFound()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <header className="p-6 text-center">
                <img
                    src={clinic.logo_url || '/default-clinic-logo.png'}
                    alt={clinic.name}
                    className="w-24 h-24 mx-auto rounded-full shadow-lg object-cover border-4 border-white"
                />
                <h1 className="text-4xl font-bold mt-4 text-gray-900">{clinic.name}</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Agende sua consulta em segundos ⚡
                </p>
            </header>

            {/* Grid de médicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pb-24 max-w-3xl mx-auto">
                {clinic.doctors?.map((doctor: any) => (
                    <Link key={doctor.id} href={`/agendar/${clinic.slug}/${doctor.id}`}>
                        <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-2 hover:border-primary">
                            <CardContent className="p-6 text-center">
                                <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-gray-200">
                                    <AvatarImage src={doctor.user?.avatar_url} alt={doctor.user?.full_name} />
                                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                        {doctor.user?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <h3 className="font-semibold text-lg">{doctor.user?.full_name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{doctor.specialty}</p>
                                <Button className="w-full mt-4 bg-primary hover:bg-primary/90 font-medium">
                                    Agendar Consulta
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {(!clinic.doctors || clinic.doctors.length === 0) && (
                    <div className="col-span-full text-center py-12">
                        <p className="text-muted-foreground">
                            Nenhum médico disponível no momento.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer WhatsApp */}
            {clinic.whatsapp && (
                <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-50">
                    <div className="max-w-3xl mx-auto">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                            onClick={() => {
                                const message = encodeURIComponent('Olá, gostaria de agendar uma consulta')
                                window.open(
                                    `https://wa.me/${clinic.whatsapp.replace(/\D/g, '')}?text=${message}`,
                                    '_blank'
                                )
                            }}
                        >
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Falar no WhatsApp
                        </Button>
                    </div>
                </footer>
            )}
        </div>
    )
}
