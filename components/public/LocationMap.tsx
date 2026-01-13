'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useClinicTheme } from './ThemeProvider'
import { MapPin, Navigation, Phone, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface LocationMapProps {
    clinicName: string
    address?: string | null
    phone?: string | null
    googleMapsUrl?: string | null
    openingHours?: Record<string, string> | null
    gallery?: string[]
}

// =============================================================================
// Component
// =============================================================================

export function LocationMap({
    clinicName,
    address,
    phone,
    googleMapsUrl,
    openingHours,
    gallery = []
}: LocationMapProps) {
    const { theme } = useClinicTheme()
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    if (!theme.display.show_map) {
        return null
    }

    const hasGallery = gallery.length > 0

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % gallery.length)
    }

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length)
    }

    return (
        <section id="localizacao" className="py-16 md:py-20">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2
                        className="text-3xl md:text-4xl font-bold font-theme-heading mb-4"
                        style={{ color: theme.colors.text }}
                    >
                        Nossa Localização
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Venha nos visitar ou agende uma teleconsulta
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                    {/* Map & Gallery */}
                    <div className="space-y-4">
                        {/* Map iframe or placeholder */}
                        <div className="relative h-80 rounded-2xl overflow-hidden bg-gray-100">
                            {googleMapsUrl ? (
                                <iframe
                                    src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.075376!2d-46.6565!3d-23.5629!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${encodeURIComponent(address || clinicName)}!5e0!3m2!1spt-BR!2sbr!4v1609459200000!5m2!1spt-BR!2sbr`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                                    <div className="text-center">
                                        <MapPin
                                            className="w-12 h-12 mx-auto mb-3"
                                            style={{ color: theme.colors.primary }}
                                        />
                                        <p className="text-gray-600">Mapa em breve</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Gallery Carousel */}
                        {hasGallery && (
                            <div className="relative h-48 rounded-2xl overflow-hidden group">
                                <Image
                                    src={gallery[currentImageIndex]}
                                    alt={`${clinicName} - Foto ${currentImageIndex + 1}`}
                                    fill
                                    className="object-cover"
                                />

                                {gallery.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>

                                        {/* Dots */}
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                                            {gallery.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentImageIndex(i)}
                                                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <h3
                            className="text-xl font-bold mb-6"
                            style={{ color: theme.colors.text }}
                        >
                            {clinicName}
                        </h3>

                        <div className="space-y-6">
                            {/* Address */}
                            {address && (
                                <div className="flex gap-4">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${theme.colors.primary}15` }}
                                    >
                                        <MapPin className="w-5 h-5" style={{ color: theme.colors.primary }} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Endereço</p>
                                        <p className="text-gray-600">{address}</p>
                                    </div>
                                </div>
                            )}

                            {/* Phone */}
                            {phone && (
                                <div className="flex gap-4">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${theme.colors.primary}15` }}
                                    >
                                        <Phone className="w-5 h-5" style={{ color: theme.colors.primary }} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Telefone</p>
                                        <a href={`tel:${phone}`} className="text-gray-600 hover:text-theme-primary">
                                            {phone}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Opening Hours */}
                            {openingHours && Object.keys(openingHours).length > 0 && (
                                <div className="flex gap-4">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${theme.colors.primary}15` }}
                                    >
                                        <Clock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 mb-2">Horário de Funcionamento</p>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {Object.entries(openingHours).map(([day, hours]) => {
                                                // Ensure hours is a string
                                                const hoursStr = typeof hours === 'string' ? hours : String(hours || '')
                                                return (
                                                    <div key={day} className="flex justify-between">
                                                        <span>{day}</span>
                                                        <span>{hoursStr}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-8">
                            {googleMapsUrl && (
                                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                    <Button
                                        className="w-full btn-theme-primary"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Como Chegar
                                    </Button>
                                </a>
                            )}
                            {phone && (
                                <a href={`tel:${phone}`}>
                                    <Button variant="outline">
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
