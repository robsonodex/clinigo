'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useClinicTheme } from './ThemeProvider'
import {
    Calendar,
    Video,
    Award,
    Shield,
    Star,
    Search,
    CreditCard,
    PlayCircle
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// =============================================================================
// Types
// =============================================================================

interface HeroSectionProps {
    clinicName: string
    clinicSlug: string
    logoUrl?: string | null
    rating?: number
    totalReviews?: number
    totalInsurances?: number
    onSearch?: (term: string) => void
}

// =============================================================================
// Component
// =============================================================================

export function HeroSection({
    clinicName,
    clinicSlug,
    logoUrl,
    rating,
    totalReviews = 0,
    totalInsurances = 0,
    onSearch,
}: HeroSectionProps) {
    const { theme } = useClinicTheme()
    const [searchTerm, setSearchTerm] = useState('')
    const videoRef = useRef<HTMLVideoElement>(null)

    const hasVideo = !!theme.hero.video_url
    const hasBackgroundImage = !!theme.hero.background_image_url

    // Handle search
    const handleSearch = () => {
        if (searchTerm.trim() && onSearch) {
            onSearch(searchTerm.trim())
        }
    }

    return (
        <section className="relative min-h-[500px] md:min-h-[600px] overflow-hidden">
            {/* Background: Video or Image or Gradient */}
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src={theme.hero.video_url!} type="video/mp4" />
                </video>
            ) : hasBackgroundImage ? (
                <Image
                    src={theme.hero.background_image_url!}
                    alt={clinicName}
                    fill
                    className="object-cover"
                    priority
                />
            ) : null}

            {/* Overlay Gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: hasVideo || hasBackgroundImage
                        ? `linear-gradient(135deg, ${theme.colors.primary}E6 0%, ${theme.colors.secondary}99 100%)`
                        : `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
                }}
            />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 h-full flex items-center py-16 md:py-24">
                <div className="max-w-3xl text-white space-y-6 md:space-y-8">

                    {/* Logo (if no video/image, show logo prominently) */}
                    {logoUrl && !hasVideo && !hasBackgroundImage && (
                        <div className="mb-4">
                            <Image
                                src={logoUrl}
                                alt={clinicName}
                                width={180}
                                height={60}
                                className="h-14 md:h-16 w-auto object-contain brightness-0 invert"
                            />
                        </div>
                    )}

                    {/* Title - Não mostrar se for igual ao nome da clínica */}
                    {typeof theme.hero.title === 'string' && theme.hero.title && theme.hero.title !== clinicName && (
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-theme-heading leading-tight">
                            {theme.hero.title}
                        </h1>
                    )}

                    {/* Subtitle */}
                    {typeof theme.hero.subtitle === 'string' && theme.hero.subtitle && (
                        <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-2xl">
                            {theme.hero.subtitle}
                        </p>
                    )}

                    {/* Trust Badges */}
                    <div className="flex flex-wrap gap-3">
                        <Badge
                            variant="secondary"
                            className="px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30"
                        >
                            <Award className="w-4 h-4 mr-2" />
                            CRM Verificado
                        </Badge>

                        {(rating ?? 0) > 0 && (
                            <Badge
                                variant="secondary"
                                className="px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm"
                            >
                                <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
                                {rating?.toFixed(1)}/5.0 • {totalReviews.toLocaleString()} avaliações
                            </Badge>
                        )}

                        {totalInsurances > 0 && (
                            <Badge
                                variant="secondary"
                                className="px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm"
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Aceita {totalInsurances} convênios
                            </Badge>
                        )}

                        <Badge
                            variant="secondary"
                            className="px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            100% Seguro
                        </Badge>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-xl">
                        <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Buscar especialidade ou médico..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-12 h-12 md:h-14 text-base md:text-lg bg-white text-gray-900 border-0 rounded-xl shadow-lg"
                                />
                            </div>
                            <Button
                                size="lg"
                                className="h-12 md:h-14 px-6 rounded-xl shadow-lg"
                                style={{ backgroundColor: theme.colors.accent }}
                                onClick={handleSearch}
                            >
                                <Search className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href={`/${clinicSlug}/agendar`}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto h-12 md:h-14 text-base md:text-lg px-8 rounded-xl shadow-lg transition-transform hover:scale-105"
                                style={{ backgroundColor: theme.colors.accent }}
                            >
                                <Calendar className="w-5 h-5 mr-2" />
                                {typeof theme.hero.cta_text === 'string' && theme.hero.cta_text ? theme.hero.cta_text : 'Agendar Consulta'}
                            </Button>
                        </Link>

                        <Link href={`/${clinicSlug}/agendar?tipo=teleconsulta`}>
                            <Button
                                size="lg"
                                className="w-full sm:w-auto h-12 md:h-14 text-base md:text-lg px-8 rounded-xl shadow-lg transition-transform hover:scale-105"
                                style={{
                                    backgroundColor: 'white',
                                    color: theme.colors.primary
                                }}
                            >
                                <Video className="w-5 h-5 mr-2" />
                                Teleconsulta
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />

            {/* Video Play Button Overlay (if video exists) */}
            {hasVideo && (
                <button
                    className="absolute bottom-8 right-8 z-20 bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors hidden md:flex items-center gap-2 text-white text-sm"
                    onClick={() => {
                        if (videoRef.current) {
                            videoRef.current.muted = !videoRef.current.muted
                        }
                    }}
                >
                    <PlayCircle className="w-5 h-5" />
                    <span>Ver vídeo</span>
                </button>
            )}
        </section>
    )
}
