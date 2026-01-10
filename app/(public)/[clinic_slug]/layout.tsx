import { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClinicBySlug, type TypedSupabaseClient } from '@/lib/supabase/typed-queries'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Stethoscope } from 'lucide-react'

interface LayoutProps {
    children: ReactNode
    params: Promise<{ clinic_slug: string }>
}

export default async function ClinicLayout({ children, params }: LayoutProps) {
    const { clinic_slug } = await params
    const supabase = (await createClient()) as unknown as TypedSupabaseClient

    let clinic
    try {
        clinic = await getClinicBySlug(supabase, clinic_slug)
    } catch (error) {
        notFound()
    }

    const { name, logo_url, primary_color } = clinic
    const brandColor = primary_color || '#10b981' // Emerald-500 default

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Dynamic Branding Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    :root {
                        --primary: ${brandColor};
                        --ring: ${brandColor};
                    }
                    .text-primary { color: ${brandColor} !important; }
                    .bg-primary { background-color: ${brandColor} !important; }
                    .border-primary { border-color: ${brandColor} !important; }
                    .hover\\:bg-primary\\/90:hover { background-color: ${brandColor}e6 !important; }
                `
            }} />

            {/* Branded Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 w-full mb-8">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link
                        href={`/${clinic_slug}`}
                        className="flex items-center gap-3 font-semibold transition-opacity hover:opacity-90"
                    >
                        {logo_url ? (
                            <img
                                src={logo_url}
                                alt={name}
                                className="h-10 w-auto object-contain max-w-[150px]"
                            />
                        ) : (
                            <div className="flex items-center gap-2 text-primary">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Stethoscope className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-lg tracking-tight text-gray-900">{name}</span>
                            </div>
                        )}
                    </Link>

                    <nav className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Área do Médico
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Page Content */}
            {children}
        </div>
    )
}
