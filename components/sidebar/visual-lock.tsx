'use client'

/**
 * VisualLock Component
 * Displays a lock icon and prevents navigation on plan-restricted features
 * 
 * @module components/sidebar/visual-lock
 */

import { Lock, Crown } from 'lucide-react'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLANS, type PlanType, PLAN_LEVEL } from '@/lib/constants/plans'
import { cn } from '@/lib/utils'

interface VisualLockProps {
    requiredPlan: PlanType
    currentPlan: PlanType
    featureName: string
    children: React.ReactNode
    className?: string
}

/**
 * Wraps a sidebar item with visual lock functionality
 * If user's plan is below required plan, shows lock icon and opens upgrade modal on click
 */
export function VisualLock({
    requiredPlan,
    currentPlan,
    featureName,
    children,
    className,
}: VisualLockProps) {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    // Safety check for plan levels
    const currentLevel = PLAN_LEVEL[currentPlan] || 0
    const requiredLevel = PLAN_LEVEL[requiredPlan] || 0
    const hasAccess = currentLevel >= requiredLevel

    if (hasAccess) {
        return <>{children}</>
    }

    // Safety check for plan config
    const plan = PLANS[requiredPlan] || PLANS.STARTER

    return (
        <>
            <div
                className={cn(
                    'relative cursor-not-allowed opacity-60 hover:opacity-80 transition-opacity',
                    className
                )}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowUpgradeModal(true)
                }}
                role="button"
                tabIndex={0}
                aria-disabled="true"
                aria-label={`${featureName} - Requer plano ${plan.name}`}
            >
                <span>{children}</span>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            </div>

            <UpgradeModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                requiredPlan={requiredPlan}
                currentPlan={currentPlan}
                featureName={featureName}
            />
        </>
    )
}

// ============================================================================
// UPGRADE MODAL
// ============================================================================

interface UpgradeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    requiredPlan: PlanType
    currentPlan: PlanType
    featureName: string
}

function UpgradeModal({
    open,
    onOpenChange,
    requiredPlan,
    currentPlan,
    featureName,
}: UpgradeModalProps) {
    const plan = PLANS[requiredPlan] || PLANS.STARTER
    const currentPlanInfo = PLANS[currentPlan] || PLANS.STARTER

    // Generate upgrade options (all plans above current)
    const currentLevel = PLAN_LEVEL[currentPlan] || 0
    const upgradeOptions = (['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK'] as PlanType[])
        .filter(p => PLAN_LEVEL[p] > currentLevel)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        Recurso Premium
                    </DialogTitle>
                    <DialogDescription>
                        <strong>{featureName}</strong> requer o plano{' '}
                        <Badge variant="secondary" className={plan.badgeColor}>
                            {plan.name}
                        </Badge>{' '}
                        ou superior.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                        Seu plano atual: <Badge variant="outline">{currentPlanInfo.name}</Badge>
                    </div>

                    <div className="grid gap-3">
                        {upgradeOptions.map((planKey) => {
                            const p = PLANS[planKey]
                            const isMinRequired = planKey === requiredPlan

                            return (
                                <div
                                    key={planKey}
                                    className={cn(
                                        'flex items-center justify-between p-3 rounded-lg border',
                                        isMinRequired && 'border-primary bg-primary/5',
                                        p.recommended && 'ring-2 ring-emerald-500/20'
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{p.name}</span>
                                            {p.recommended && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                                                    Popular
                                                </Badge>
                                            )}
                                            {isMinRequired && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Mínimo
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {p.tagline}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">{p.priceLabel}</div>
                                        <div className="text-xs text-muted-foreground">{p.billing}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Depois
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => {
                                window.location.href = '/dashboard/planos'
                            }}
                        >
                            Ver Planos
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ============================================================================
// LOCKED BADGE
// ============================================================================

/**
 * Small badge to indicate a feature is locked
 */
export function LockedBadge({ plan }: { plan: PlanType }) {
    const planInfo = PLANS[plan] || PLANS.STARTER
    return (
        <Badge variant="outline" className="text-xs gap-1 opacity-70">
            <Lock className="h-2.5 w-2.5" />
            {planInfo.name}
        </Badge>
    )
}
