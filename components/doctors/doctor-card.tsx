'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, getInitials } from '@/lib/utils'
import { User, Star } from 'lucide-react'
import type { Doctor } from '@/lib/api-client'

interface DoctorCardProps {
    doctor: Doctor
    onSelect: () => void
}

export function DoctorCard({ doctor, onSelect }: DoctorCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {doctor.user.avatar_url ? (
                            <Image
                                src={doctor.user.avatar_url}
                                alt={doctor.user.full_name}
                                width={64}
                                height={64}
                                className="rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xl font-semibold text-primary">
                                    {getInitials(doctor.user.full_name)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                            {doctor.user.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            CRM {doctor.crm}/{doctor.crm_state}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                            {doctor.specialty}
                        </Badge>
                    </div>
                </div>

                {/* Bio */}
                {doctor.bio && (
                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                        {doctor.bio}
                    </p>
                )}

                {/* Price and Action */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Consulta</p>
                        <p className="text-xl font-bold text-primary">
                            {formatCurrency(doctor.consultation_price)}
                        </p>
                    </div>
                    <Button onClick={onSelect} size="lg">
                        Agendar
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export function DoctorCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>
                <Skeleton className="h-10 w-full mt-6" />
            </CardContent>
        </Card>
    )
}
