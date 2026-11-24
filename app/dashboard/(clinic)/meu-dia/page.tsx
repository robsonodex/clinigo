'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TherapistClinicalDayPanel } from '@/components/dashboard/TherapistClinicalDayPanel'

export default function MeuDiaClinicoPage() {
    return (
        <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-3">
                <Button asChild variant="ghost" size="sm" className="min-h-[40px]">
                    <Link href="/dashboard">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Voltar ao Painel
                    </Link>
                </Button>
            </div>

            <TherapistClinicalDayPanel />
        </div>
    )
}

