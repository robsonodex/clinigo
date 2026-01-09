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
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{title}</h3>
                        <p className="text-sm opacity-90">
                            {description}
                        </p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    asChild
                >
                    <Link href="/dashboard/configuracoes/plano">
                        Atualizar Plano
                    </Link>
                </Button>
            </div>
        </div>
    )
}
