'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ClinicTheme } from '@/types/clinic-theme'
import { ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface PreviewModalProps {
    open: boolean
    onClose: () => void
    theme: ClinicTheme
    clinicSlug: string
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

// =============================================================================
// Main Component
// =============================================================================

export function PreviewModal({ open, onClose, theme, clinicSlug }: PreviewModalProps) {
    const [device, setDevice] = useState<DeviceType>('desktop')

    const deviceWidths: Record<DeviceType, string> = {
        desktop: 'w-full',
        tablet: 'w-[768px]',
        mobile: 'w-[375px]',
    }

    const previewUrl = `/${clinicSlug}?preview=true`

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Preview da Página Pública</DialogTitle>

                        <div className="flex items-center gap-2">
                            {/* Device Switcher */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <Button
                                    size="icon"
                                    variant={device === 'desktop' ? 'default' : 'ghost'}
                                    className="h-8 w-8"
                                    onClick={() => setDevice('desktop')}
                                >
                                    <Monitor className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant={device === 'tablet' ? 'default' : 'ghost'}
                                    className="h-8 w-8"
                                    onClick={() => setDevice('tablet')}
                                >
                                    <Tablet className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant={device === 'mobile' ? 'default' : 'ghost'}
                                    className="h-8 w-8"
                                    onClick={() => setDevice('mobile')}
                                >
                                    <Smartphone className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Open in New Tab */}
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Abrir
                                </Button>
                            </a>
                        </div>
                    </div>
                </DialogHeader>

                {/* Preview Container */}
                <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-hidden flex items-start justify-center">
                    <div
                        className={cn(
                            "bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 h-full",
                            deviceWidths[device],
                            device !== 'desktop' && 'max-w-full'
                        )}
                    >
                        {/* Mini Browser Chrome */}
                        <div className="bg-gray-200 px-4 py-2 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 truncate">
                                clinigo.app/{clinicSlug}
                            </div>
                        </div>

                        {/* Preview Content - Static Preview */}
                        <div className="h-[calc(100%-40px)] overflow-auto">
                            {/* Hero Preview */}
                            <div
                                className="p-8 min-h-[300px] flex flex-col justify-center"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                                }}
                            >
                                <h1
                                    className="text-3xl font-bold text-white mb-2"
                                    style={{ fontFamily: theme.typography.fontFamily }}
                                >
                                    {theme.hero.title || 'Nome da Clínica'}
                                </h1>
                                {theme.hero.subtitle && (
                                    <p className="text-white/90 mb-4">{theme.hero.subtitle}</p>
                                )}
                                <button
                                    className="self-start px-6 py-3 rounded-lg font-semibold text-white"
                                    style={{ backgroundColor: theme.colors.accent }}
                                >
                                    {theme.hero.cta_text || 'Agendar Consulta'}
                                </button>
                            </div>

                            {/* Content Preview */}
                            <div className="p-8 space-y-8">
                                {/* Specialties Section */}
                                {theme.display.show_specialties_grid && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                                            Nossas Especialidades
                                        </h2>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['Cardiologia', 'Dermatologia', 'Ortopedia'].map((spec) => (
                                                <div
                                                    key={spec}
                                                    className="p-4 border rounded-lg text-center text-sm"
                                                    style={{ borderColor: `${theme.colors.primary}30` }}
                                                >
                                                    {spec}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Doctors Section */}
                                <div>
                                    <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                                        Nossos Médicos
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="border rounded-lg p-4">
                                                <div className="flex gap-3">
                                                    {theme.display.show_doctor_photos && (
                                                        <div className="w-12 h-12 bg-gray-200 rounded-full" />
                                                    )}
                                                    <div>
                                                        <p className="font-semibold">Dr. Nome Exemplo</p>
                                                        <p className="text-sm text-gray-500">Especialidade</p>
                                                        {theme.display.show_prices && (
                                                            <p
                                                                className="text-sm font-medium mt-1"
                                                                style={{ color: theme.colors.primary }}
                                                            >
                                                                R$ 250,00
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Reviews Section */}
                                {theme.display.show_reviews && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                                            Avaliações
                                        </h2>
                                        <div className="flex gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <span key={i} className="text-yellow-400">⭐</span>
                                            ))}
                                            <span className="ml-2 text-sm">4.9/5.0</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Preview */}
                            <div className="bg-gray-900 text-white p-6 text-center text-sm">
                                <p>© 2026 Nome da Clínica</p>
                                {theme.display.show_clinigo_branding && (
                                    <p className="text-gray-400 mt-2">
                                        Powered by <span style={{ color: theme.colors.primary }}>CliniGo</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
