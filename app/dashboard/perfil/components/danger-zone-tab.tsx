'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'

export default function DangerZoneTab() {
    const router = useRouter()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [deleteForm, setDeleteForm] = useState({
        reason: '',
        feedback: '',
        password: '',
        confirmText: '',
    })

    async function handleDeleteAccount() {
        if (deleteForm.confirmText !== 'EXCLUIR') {
            toast.error('Digite EXCLUIR para confirmar')
            return
        }

        if (!deleteForm.reason) {
            toast.error('Selecione um motivo')
            return
        }

        if (!deleteForm.password) {
            toast.error('Senha obrigatória')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/profile/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deleteForm),
            })

            if (res.ok) {
                const data = await res.json()
                toast.success('Solicitação de exclusão registrada. Você tem 30 dias para cancelar.')
                setDeleteDialogOpen(false)

                // Opcional: redirecionar para página de confirmação
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao processar solicitação')
            }
        } catch (error) {
            toast.error('Erro ao processar solicitação')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Zona de Perigo:</strong> As ações abaixo são permanentes e não podem ser desfeitas.
                    Proceda com cautela.
                </AlertDescription>
            </Alert>

            {/* Desativar Temporariamente */}
            <Card className="border-orange-300">
                <CardHeader>
                    <CardTitle className="text-orange-600">Desativar Conta Temporariamente</CardTitle>
                    <CardDescription>
                        Sua conta ficará invisível mas seus dados serão mantidos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Você poderá reativar sua conta a qualquer momento fazendo login novamente.
                    </p>
                    <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50">
                        Desativar Temporariamente
                    </Button>
                </CardContent>
            </Card>

            {/* Excluir Permanentemente */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Excluir Conta Permanentemente</CardTitle>
                    <CardDescription>
                        Após 30 dias seus dados serão anonimizados de forma irreversível
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Atenção:</strong> Esta ação agendará a exclusão da sua conta para daqui 30 dias.
                                Durante este período, você pode cancelar a exclusão. Após os 30 dias, todos os seus dados
                                serão anonimizados permanentemente.
                            </AlertDescription>
                        </Alert>

                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    Excluir Minha Conta
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Confirmar Exclusão de Conta</DialogTitle>
                                    <DialogDescription>
                                        Esta é uma ação permanente. Você tem certeza?
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Motivo da Exclusão *</Label>
                                        <Select
                                            value={deleteForm.reason}
                                            onValueChange={(value) => setDeleteForm({ ...deleteForm, reason: value })}
                                        >
                                            <SelectTrigger id="reason">
                                                <SelectValue placeholder="Selecione um motivo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="nao_uso_mais">Não uso mais</SelectItem>
                                                <SelectItem value="mudei_sistema">Mudei para outro sistema</SelectItem>
                                                <SelectItem value="problemas_tecnicos">Problemas técnicos</SelectItem>
                                                <SelectItem value="custo_alto">Custo muito alto</SelectItem>
                                                <SelectItem value="outro">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="feedback">Feedback (opcional)</Label>
                                        <Textarea
                                            id="feedback"
                                            placeholder="Como podemos melhorar?"
                                            value={deleteForm.feedback}
                                            onChange={(e) => setDeleteForm({ ...deleteForm, feedback: e.target.value })}
                                            rows={4}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Sua Senha *</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Digite sua senha para confirmar"
                                            value={deleteForm.password}
                                            onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmText">
                                            Digite <strong>EXCLUIR</strong> para confirmar *
                                        </Label>
                                        <Input
                                            id="confirmText"
                                            placeholder="EXCLUIR"
                                            value={deleteForm.confirmText}
                                            onChange={(e) => setDeleteForm({ ...deleteForm, confirmText: e.target.value })}
                                        />
                                    </div>

                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                            <ul className="list-disc list-inside text-sm space-y-1">
                                                <li>Todos os seus dados serão anonimizados em 30 dias</li>
                                                <li>Consultas agendadas serão canceladas</li>
                                                <li>Você perderá acesso ao sistema imediatamente</li>
                                                <li>Esta ação pode ser cancelada dentro de 30 dias</li>
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setDeleteDialogOpen(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteAccount}
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirmar Exclusão
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
