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
// Template Preview Components
// =============================================================================

function GlassmorphismPreview({ theme }: { theme: ClinicTheme }) {
    return (
        <>
            {/* Hero - Dark gradient with glass effect */}
            <div
                className="p-8 min-h-[300px] flex flex-col justify-center relative overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                }}
            >
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: theme.typography.fontFamily }}>
                        {theme.hero.title || 'Nome da Clínica'}
                    </h1>
                    {theme.hero.subtitle && <p className="text-white/90 mb-4">{theme.hero.subtitle}</p>}
                    <button className="px-6 py-3 rounded-xs font-semibold text-white bg-white/20 backdrop-blur border border-white/30 hover:bg-white/30 transition">
                        {theme.hero.cta_text || 'Agendar Consulta'}
                    </button>
                </div>
            </div>
            {/* Content with glass cards */}
            <div className="p-8 bg-gray-50 space-y-6">
                {theme.display.show_specialties_grid && (
                    <div className="grid grid-cols-3 gap-4">
                        {['Cardiologia', 'Dermatologia', 'Ortopedia'].map((spec) => (
                            <div key={spec} className="p-4 bg-white/80 backdrop-blur border border-gray-200 rounded-xl text-center text-sm shadow-sm">
                                {spec}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Footer */}
            <div className="bg-gray-900 text-white p-4 text-center text-sm">
                <p>© 2026 {theme.hero.title || 'Nome da Clínica'}</p>
                {theme.display.show_clinigo_branding && <p className="text-gray-400 mt-1">Powered by CliniGo</p>}
            </div>
        </>
    )
}

function SwissMinimalPreview({ theme }: { theme: ClinicTheme }) {
    return (
        <>
            {/* Hero - Clean white with bold typography */}
            <div className="p-8 min-h-[300px] flex flex-col justify-center bg-white border-b-4 border-black">
                <h1 className="text-4xl font-black uppercase tracking-tight mb-2" style={{ color: theme.colors.text }}>
                    {theme.hero.title || 'Nome da Clínica'}
                </h1>
                {theme.hero.subtitle && <p className="text-lg text-gray-600 mb-6 font-light">{theme.hero.subtitle}</p>}
                <button className="self-start px-8 py-4 bg-black text-white font-bold uppercase text-sm tracking-wide hover:bg-gray-800 transition">
                    {theme.hero.cta_text || 'Agendar Consulta'} →
                </button>
            </div>
            {/* Content with grid layout */}
            <div className="p-8 bg-white space-y-6">
                {theme.display.show_specialties_grid && (
                    <div className="grid grid-cols-3 gap-0 border border-black">
                        {['Cardiologia', 'Dermatologia', 'Ortopedia'].map((spec, i) => (
                            <div key={spec} className={cn("p-4 text-center text-sm font-medium uppercase", i < 2 && "border-r border-black")}>
                                {spec}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Footer */}
            <div className="bg-black text-white p-4 text-center text-sm font-light">
                <p>© 2026 {theme.hero.title || 'Nome da Clínica'}</p>
            </div>
        </>
    )
}

function AuroraNeonPreview({ theme }: { theme: ClinicTheme }) {
    return (
        <>
            {/* Hero - Dark with neon accents */}
            <div className="p-8 min-h-[300px] flex flex-col justify-center relative overflow-hidden bg-slate-900">
                {/* Aurora gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-cyan-400/30 animate-pulse" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: theme.typography.fontFamily }}>
                        {theme.hero.title || 'Nome da Clínica'}
                    </h1>
                    {theme.hero.subtitle && <p className="text-purple-200 mb-4">{theme.hero.subtitle}</p>}
                    <button className="px-6 py-3 rounded-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 transition">
                        {theme.hero.cta_text || 'Agendar Consulta'}
                    </button>
                </div>
            </div>
            {/* Content with neon cards */}
            <div className="p-8 bg-slate-950 space-y-6">
                {theme.display.show_specialties_grid && (
                    <div className="grid grid-cols-3 gap-4">
                        {['Cardiologia', 'Dermatologia', 'Ortopedia'].map((spec) => (
                            <div key={spec} className="p-4 bg-slate-800 border border-purple-500/30 rounded-xl text-center text-sm text-white shadow-lg shadow-purple-500/10">
                                {spec}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Footer */}
            <div className="bg-slate-950 border-t border-purple-500/20 text-white p-4 text-center text-sm">
                <p className="text-purple-300">© 2026 {theme.hero.title || 'Nome da Clínica'}</p>
                {theme.display.show_clinigo_branding && <p className="text-slate-500 mt-1">Powered by CliniGo</p>}
            </div>
        </>
    )
}

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

    // Validate slug - prevent redirect to root
    const hasValidSlug = clinicSlug && clinicSlug.trim().length > 0
    const previewUrl = hasValidSlug ? `/${clinicSlug}?preview=true` : null

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

                            {/* Open in New Tab - Only if slug is valid */}
                            {previewUrl ? (
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Abrir
                                    </Button>
                                </a>
                            ) : (
                                <Button variant="outline" size="sm" disabled title="Slug não configurado">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Abrir
                                </Button>
                            )}
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
                            <div className={cn(
                                "flex-1 bg-white rounded-md px-3 py-1 text-xs truncate",
                                hasValidSlug ? "text-gray-500" : "text-amber-600"
                            )}>
                                {hasValidSlug ? `clinigo.app/${clinicSlug}` : 'Slug não configurado'}
                            </div>
                        </div>

                        {/* Preview Content - Template-based Preview */}
                        <div className="h-[calc(100%-40px)] overflow-auto">
                            {theme.template === 'glassmorphism' && (
                                <GlassmorphismPreview theme={theme} />
                            )}
                            {theme.template === 'swiss-minimal' && (
                                <SwissMinimalPreview theme={theme} />
                            )}
                            {theme.template === 'aurora-neon' && (
                                <AuroraNeonPreview theme={theme} />
                            )}
                            {/* Fallback to default if template not recognized */}
                            {!['glassmorphism', 'swiss-minimal', 'aurora-neon'].includes(theme.template) && (
                                <GlassmorphismPreview theme={theme} />
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
