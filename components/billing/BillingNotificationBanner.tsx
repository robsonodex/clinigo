'use client'

import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useBillingNotifications } from '@/lib/hooks/use-billing-notifications'

export function BillingNotificationBanner() {
    const { unreadNotifications, markAsRead } = useBillingNotifications()

    if (unreadNotifications.length === 0) {
        return null
    }

    return (
        <div className="space-y-2">
            {unreadNotifications.map((notification) => {
                const isPaymentReceived = notification.type === 'PAYMENT_RECEIVED'
                const isOverdue = notification.type === 'OVERDUE' || notification.type === 'SUSPENDED'
                const isReminder = notification.type.startsWith('REMINDER')

                let bgColor = 'bg-blue-50 border-blue-200'
                let textColor = 'text-blue-900'
                let icon = <Clock className="w-5 h-5 text-blue-600" />

                if (isPaymentReceived) {
                    bgColor = 'bg-green-50 border-green-200'
                    textColor = 'text-green-900'
                    icon = <CheckCircle className="w-5 h-5 text-green-600" />
                } else if (isOverdue) {
                    bgColor = 'bg-red-50 border-red-200'
                    textColor = 'text-red-900'
                    icon = <AlertCircle className="w-5 h-5 text-red-600" />
                } else if (isReminder) {
                    bgColor = 'bg-amber-50 border-amber-200'
                    textColor = 'text-amber-900'
                    icon = <AlertCircle className="w-5 h-5 text-amber-600" />
                }

                return (
                    <Card key={notification.id} className={`p-4 ${bgColor} border`}>
                        <div className="flex items-start gap-3">
                            {icon}
                            <div className="flex-1">
                                <h3 className={`font-semibold ${textColor}`}>{notification.title}</h3>
                                <p className={`text-sm mt-1 ${textColor}/80`}>{notification.message}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`shrink-0 hover:${bgColor.replace('50', '200')}`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
