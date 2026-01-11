'use client'

import { Shield, Lock, Award, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const partners = [
    { name: 'Clínica Vida', initials: 'CV' },
    { name: 'MedCenter', initials: 'MC' },
    { name: 'Saúde Plus', initials: 'S+' },
    { name: 'CardioRio', initials: 'CR' },
    { name: 'DermaCare', initials: 'DC' },
]

const badges = [
    { icon: Shield, label: 'LGPD Compliant', color: 'text-emerald-600' },
    { icon: Lock, label: 'SSL Seguro', color: 'text-blue-600' },
    { icon: Award, label: 'CFM Aprovado', color: 'text-purple-600' },
]

export function CredibilityBar() {
    return (
        <section className="py-12 bg-white border-b">
            <div className="container mx-auto px-4">
                {/* Partners logos */}
                <div className="text-center mb-8">
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-6">
                        Confiado por clínicas líderes
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                        {partners.map((partner, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity",
                                    "grayscale hover:grayscale-0"
                                )}
                            >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-bold text-gray-600">
                                        {partner.initials}
                                    </span>
                                </div>
                                <span className="hidden md:block text-gray-600 font-medium">
                                    {partner.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 my-8" />

                {/* Rating + Badges */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    {/* Google Rating */}
                    <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-full">
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={cn(
                                        "w-5 h-5",
                                        i < 5 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-gray-900">4.9/5.0</div>
                            <div className="text-xs text-gray-500">227 avaliações</div>
                        </div>
                    </div>

                    {/* Certification Badges */}
                    <div className="flex items-center gap-4">
                        {badges.map((badge, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <badge.icon className={cn("w-4 h-4", badge.color)} />
                                <span className="text-sm font-medium text-gray-700">
                                    {badge.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
