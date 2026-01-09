'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
    id: number
    title: string
    description: string
}

interface RegistrationStepperProps {
    steps: Step[]
    currentStep: number
    onStepClick?: (step: number) => void
    loading?: boolean
}

export function RegistrationStepper({
    steps,
    currentStep,
    onStepClick,
    loading = false
}: RegistrationStepperProps) {
    return (
        <nav className="mb-8">
            <ol className="flex items-center justify-center gap-2 md:gap-4">
                {steps.map((step, index) => {
                    const isCompleted = step.id < currentStep
                    const isCurrent = step.id === currentStep
                    const isClickable = step.id < currentStep && !loading

                    return (
                        <li key={step.id} className="flex items-center">
                            <button
                                type="button"
                                onClick={() => isClickable && onStepClick?.(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
                                    isClickable && "cursor-pointer hover:bg-muted",
                                    !isClickable && "cursor-default"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                        isCompleted && "bg-primary text-primary-foreground",
                                        isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium hidden md:block",
                                    isCurrent && "text-primary",
                                    isCompleted && "text-primary",
                                    !isCompleted && !isCurrent && "text-muted-foreground"
                                )}>
                                    {step.title}
                                </span>
                            </button>

                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "w-8 md:w-12 h-0.5 mx-1",
                                    isCompleted ? "bg-primary" : "bg-muted"
                                )} />
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
