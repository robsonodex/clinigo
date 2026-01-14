'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DevicesTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dispositivos Conectados</CardTitle>
                <CardDescription>
                    Gerencie os dispositivos conectados à sua conta
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Em desenvolvimento...</p>
            </CardContent>
        </Card>
    )
}
