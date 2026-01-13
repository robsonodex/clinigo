'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useClinicTheme } from './ThemeProvider'
import { Star, ExternalLink, CheckCircle, Quote } from 'lucide-react'
import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

interface Review {
    id: string
    reviewer_name: string
    avatar_url?: string
    rating: number
    comment: string
    date: string
    is_verified: boolean
}

interface ReviewsSectionProps {
    clinicRating: number
    totalReviews: number
    reviews: Review[]
    googleReviewsUrl?: string | null
}

// =============================================================================
// Single Review Card
// =============================================================================

function ReviewCard({ review }: { review: Review }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                {review.avatar_url ? (
                    <img
                        src={review.avatar_url}
                        alt={review.reviewer_name}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                            {review.reviewer_name.charAt(0)}
                        </span>
                    </div>
                )}
                <div>
                    <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                </div>
            </div>

            {/* Rating */}
            <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-200'
                            }`}
                    />
                ))}
            </div>

            {/* Comment */}
            <div className="relative">
                <Quote className="absolute -top-2 -left-2 w-6 h-6 text-gray-100" />
                <p className="text-gray-600 text-sm leading-relaxed relative z-10 pl-4">
                    {review.comment}
                </p>
            </div>

            {/* Verified Badge */}
            {review.is_verified && (
                <Badge
                    variant="outline"
                    className="mt-4 text-xs text-emerald-600 border-emerald-200 bg-emerald-50"
                >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Avaliação verificada
                </Badge>
            )}
        </div>
    )
}

// =============================================================================
// Main Component
// =============================================================================

export function ReviewsSection({
    clinicRating,
    totalReviews,
    reviews,
    googleReviewsUrl
}: ReviewsSectionProps) {
    const { theme } = useClinicTheme()

    if (!theme.display.show_reviews || reviews.length === 0) {
        return null
    }

    return (
        <section className="py-16 md:py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2
                        className="text-3xl md:text-4xl font-bold font-theme-heading mb-4"
                        style={{ color: theme.colors.text }}
                    >
                        O que nossos pacientes dizem
                    </h2>

                    {/* Overall Rating */}
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-6 h-6 ${i < Math.floor(clinicRating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-200'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                            {clinicRating.toFixed(1)}/5.0
                        </span>
                        <span className="text-gray-500">
                            • {totalReviews.toLocaleString()} avaliações
                        </span>
                    </div>
                </div>

                {/* Reviews Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.slice(0, 6).map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>

                {/* Google Reviews Link */}
                {googleReviewsUrl && (
                    <div className="text-center mt-10">
                        <Link href={googleReviewsUrl} target="_blank" rel="noopener noreferrer">
                            <Button
                                variant="outline"
                                className="gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Ver todas as avaliações no Google
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )
}
