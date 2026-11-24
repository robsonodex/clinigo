'use client'

import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UpgradeBannerProps {
    title?: string
    description?: string
}

export function UpgradeBanner({
    title = 'Recurso bloqueado',
    description = 'Esta funcionalidade não está disponível no seu plano atual.'
}: UpgradeBannerProps) {
    return (
        <div className="bg-[#0D1F1B] border border-[#1D3831] text-white p-4 rounded-xl mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#15352D] border border-[#2A5347] rounded-lg text-[#7CD4B6]">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base">{title}</h3>
                        <p className="text-sm text-[#CBE2D8]">
                            {description}
                        </p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    asChild
                >
                    <Link href="/dashboard/configuracoes/assinatura">
                        Atualizar Plano
                    </Link>
                </Button>
            </div>
        </div>
    )
}
