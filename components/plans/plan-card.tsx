'use client'

import { Check, X, Sparkles, Lock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanConfig } from '@/lib/constants/plans'
import Link from 'next/link'

interface PlanCardProps {
    plan: PlanConfig
    onSelect?: () => void
    selected?: boolean
    showCTA?: boolean
    ctaText?: string
    className?: string
}

export function PlanCard({
    plan,
    onSelect,
    selected = false,
    showCTA = true,
    ctaText,
    className,
    ctaLink,
    disableUpgradeLinks = false,
}: PlanCardProps & { disableUpgradeLinks?: boolean; ctaLink?: string }) {
    const borderColor = selected
        ? `border-${plan.color}-500`
        : 'border-border'

    const FooterButton = ctaLink ? (
        <Link
            href={ctaLink}
            className={cn(
                buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                }),
                'w-full transition-all duration-300',
                selected && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 scale-105'
            )}
        >
            {ctaText || 'Escolher Plano'}
        </Link>
    ) : (
        <Button
            onClick={onSelect}
            variant="outline"
            size="lg"
            className={cn(
                'w-full transition-all duration-300',
                selected && 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 scale-105'
            )}
        >
            {ctaText || (selected ? '✓ Selecionado' : 'Escolher Plano')}
        </Button>
    )

    return (
        <Card
            className={cn(
                'relative flex flex-col cursor-pointer',
                'transition-all duration-300 ease-in-out',
                'hover:shadow-lg hover:-translate-y-1',
                'border-2',
                selected
                    ? 'ring-2 ring-offset-2 ring-emerald-500 border-emerald-500 shadow-xl scale-[1.02]'
                    : 'border-border hover:border-emerald-300',
                plan.recommended && !selected && 'border-emerald-400',
                className
            )}
            onClick={onSelect}
        >
            {/* Recommended Badge */}
            {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white px-4 py-1 gap-1">
                        <Sparkles className="w-3 h-3" />
                        Recomendado
                    </Badge>
                </div>
            )}

            <CardHeader className="text-center pb-4">
                {/* Plan Badge */}
                <div className="flex justify-center mb-2">
                    <Badge variant="outline" className={plan.badgeColor}>
                        {plan.name}
                    </Badge>
                </div>

                {/* Tagline */}
                <CardDescription className="text-sm min-h-[40px]">
                    {plan.tagline}
                </CardDescription>

                {/* Price */}
                <CardTitle className="text-4xl font-bold mt-4">
                    {plan.priceLabel}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {plan.billing}
                </p>
            </CardHeader>

            <CardContent className="space-y-4 flex-1">
                {/* Features List */}
                <ul className="space-y-3">
                    {plan.features.map((feature, index) => {
                        // Check if this is a "locked" feature for STARTER/BASIC that we want to highlight
                        // e.g. WhatsApp or Video in low tier plans
                        // But don't show upgrade button if disableUpgradeLinks is true (public page)
                        const isLockedFeature = !feature.included && (plan.id === 'STARTER' || plan.id === 'BASIC') &&
                            (feature.name.includes('WhatsApp') || feature.name.includes('Vídeo') || feature.name.includes('Teleconsulta'))

                        if (isLockedFeature) {
                            return (
                                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded border border-dashed">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        <Lock className="w-3 h-3" />
                                    </div>
                                    <span className="flex-1 font-medium">{feature.name}</span>
                                    {!disableUpgradeLinks && (
                                        <Link
                                            href="/dashboard/configuracoes/plano"
                                            className={cn(
                                                buttonVariants({ variant: "ghost", size: "sm" }),
                                                "h-6 text-[10px] px-2 text-primary"
                                            )}
                                        >
                                            UPGRADE
                                        </Link>
                                    )}
                                </li>
                            )
                        }

                        return (
                            <li
                                key={index}
                                className={cn(
                                    'flex items-start gap-2 text-sm',
                                    !feature.included && 'text-muted-foreground line-through opacity-60'
                                )}
                            >
                                {feature.included ? (
                                    <Check className={cn('w-4 h-4 mt-0.5 flex-shrink-0', `text-${plan.color}-600`)} />
                                ) : (
                                    <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                )}
                                <span className="flex-1">
                                    {feature.name}
                                    {feature.tooltip && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            ({feature.tooltip})
                                        </span>
                                    )}
                                </span>
                            </li>
                        )
                    })}
                </ul>

                {/* Storage Info */}
                <div className="pt-4 border-t mt-auto">
                    <p className="text-xs text-muted-foreground text-center">
                        {plan.limits.max_storage_gb}GB de armazenamento
                    </p>
                </div>
            </CardContent>

            {showCTA && (
                <CardFooter>
                    {FooterButton}
                </CardFooter>
            )}
        </Card>
    )
}
