'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pagamento e Assinatura</CardTitle>
                <CardDescription>
                    Gerencie seu plano e métodos de pagamento
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
        </Card>
    )
}
