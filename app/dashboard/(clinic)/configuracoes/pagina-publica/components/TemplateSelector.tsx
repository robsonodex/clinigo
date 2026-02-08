'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PAGE_TEMPLATES, PageTemplate } from '@/types/clinic-theme'
import { Check } from 'lucide-react'

interface TemplateSelectorProps {
    selectedTemplate: PageTemplate
    onSelect: (template: PageTemplate) => void
}

// Template preview thumbnails (inline SVG patterns)
const templatePreviews: Record<PageTemplate, { gradient: string; pattern: string }> = {
    'classic-medical': {
        gradient: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        pattern: `
            <rect x="0" y="0" width="200" height="50" fill="#0b1120"/>
            <rect x="60" y="70" width="80" height="12" fill="#0b1120"/>
            <rect x="50" y="90" width="100" height="6" fill="#d1d5db"/>
            <rect x="20" y="120" width="50" height="35" rx="4" fill="#f3f4f6" stroke="#e5e7eb"/>
            <rect x="75" y="120" width="50" height="35" rx="4" fill="#f3f4f6" stroke="#e5e7eb"/>
            <rect x="130" y="120" width="50" height="35" rx="4" fill="#f3f4f6" stroke="#e5e7eb"/>
        `
    },
    'modern-minimal': {
        gradient: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        pattern: `
            <rect x="20" y="50" width="80" height="10" fill="#111827"/>
            <rect x="20" y="65" width="60" height="4" fill="#9ca3af"/>
            <rect x="120" y="40" width="60" height="80" fill="#f3f4f6"/>
            <text x="130" y="75" fill="#6b7280" font-size="20" font-weight="bold">01</text>
            <text x="130" y="95" fill="#6b7280" font-size="20" font-weight="bold">02</text>
        `
    },
    'corporate-healthcare': {
        gradient: 'linear-gradient(180deg, #0b1120 0%, #1e293b 40%, #ffffff 40%)',
        pattern: `
            <rect x="20" y="50" width="100" height="12" fill="#14b8a6"/>
            <rect x="20" y="70" width="60" height="6" fill="rgba(255,255,255,0.6)"/>
            <rect x="20" y="110" width="160" height="1" fill="#e5e7eb"/>
            <rect x="20" y="125" width="160" height="1" fill="#e5e7eb"/>
            <rect x="20" y="140" width="160" height="1" fill="#e5e7eb"/>
        `
    },
    'swiss-clean': {
        gradient: 'linear-gradient(180deg, #ffffff 0%, #ffffff 100%)',
        pattern: `
            <rect x="0" y="0" width="200" height="2" fill="#000"/>
            <rect x="0" y="158" width="200" height="2" fill="#000"/>
            <text x="20" y="70" fill="#000" font-size="36" font-weight="900">SAÚDE</text>
            <rect x="20" y="100" width="40" height="40" fill="#fff" stroke="#000" stroke-width="1"/>
            <rect x="65" y="100" width="40" height="40" fill="#fff" stroke="#000" stroke-width="1"/>
            <rect x="110" y="100" width="40" height="40" fill="#fff" stroke="#000" stroke-width="1"/>
            <text x="30" y="115" fill="#14b8a6" font-size="8" font-weight="700">01</text>
            <text x="75" y="115" fill="#14b8a6" font-size="8" font-weight="700">02</text>
            <text x="120" y="115" fill="#14b8a6" font-size="8" font-weight="700">03</text>
        `
    },
    'glassmorphism': {
        gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        pattern: `
            <circle cx="30" cy="30" r="60" fill="url(#glass-grad-1)" opacity="0.4"/>
            <circle cx="170" cy="120" r="50" fill="url(#glass-grad-2)" opacity="0.3"/>
            <rect x="60" y="60" width="80" height="60" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)"/>
        `
    },
    'swiss-minimal': {
        gradient: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
        pattern: `
            <rect x="20" y="40" width="60" height="8" fill="#111"/>
            <rect x="20" y="55" width="40" height="4" fill="#999"/>
            <rect x="120" y="30" width="60" height="50" fill="#f0f0f0" stroke="#ddd"/>
            <rect x="120" y="90" width="60" height="50" fill="#f0f0f0" stroke="#ddd"/>
        `
    },
    'aurora-neon': {
        gradient: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
        pattern: `
            <ellipse cx="60" cy="40" rx="80" ry="60" fill="url(#aurora-grad-1)" opacity="0.4"/>
            <ellipse cx="140" cy="100" rx="70" ry="50" fill="url(#aurora-grad-2)" opacity="0.3"/>
            <rect x="70" y="70" width="60" height="30" rx="8" fill="rgba(168,85,247,0.3)"/>
        `
    }
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Template da Página</CardTitle>
                <CardDescription>
                    Escolha o estilo visual da página pública da sua clínica
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PAGE_TEMPLATES.map((template) => {
                        const isSelected = selectedTemplate === template.id
                        const preview = templatePreviews[template.id]

                        return (
                            <div
                                key={template.id}
                                onClick={() => onSelect(template.id)}
                                className={`
                                    relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300
                                    ${isSelected
                                        ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
                                        : 'border-border hover:border-primary/50 hover:scale-[1.01]'
                                    }
                                `}
                            >
                                {/* Preview Image */}
                                <div
                                    className="h-40 relative"
                                    style={{ background: preview.gradient }}
                                >
                                    <svg
                                        className="absolute inset-0 w-full h-full"
                                        viewBox="0 0 200 160"
                                        preserveAspectRatio="xMidYMid slice"
                                    >
                                        <defs>
                                            <radialGradient id="glass-grad-1">
                                                <stop offset="0%" stopColor="#06b6d4" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </radialGradient>
                                            <radialGradient id="glass-grad-2">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#ec4899" />
                                            </radialGradient>
                                            <linearGradient id="aurora-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#a855f7" />
                                                <stop offset="100%" stopColor="#00d9ff" />
                                            </linearGradient>
                                            <linearGradient id="aurora-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#ff0080" />
                                                <stop offset="100%" stopColor="#a855f7" />
                                            </linearGradient>
                                        </defs>
                                        <g dangerouslySetInnerHTML={{ __html: preview.pattern }} />
                                    </svg>

                                    {/* Selected Check */}
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-5 h-5 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Template Info */}
                                <div className="p-4 bg-background">
                                    <h3 className="font-semibold text-foreground mb-1">
                                        {template.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {template.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Template Features Note */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        <strong>💡 Dica:</strong> Todos os templates são totalmente responsivos e incluem
                        funcionalidades de agendamento, teleconsulta e busca. As cores e conteúdos podem
                        ser personalizados nas outras abas.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
