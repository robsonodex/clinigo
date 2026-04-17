"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  health_insurance_id: z.string().min(1, "Selecione a operadora"),
  card_number: z.string().min(5, "Número da carteirinha inválido"),
  card_validity: z.string().optional()
})

type EligibilityResult = {
  success: boolean
  data?: {
    status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING' | 'ERROR'
    provider_response: {
      message: string
      ans_transaction_id: string
    }
  }
  error?: string
}

export function EligibilityCheckModal({ 
  patientId, 
  defaultInsuranceId,
  defaultCardNumber,
  triggerBtn 
}: { 
  patientId?: string
  defaultInsuranceId?: string
  defaultCardNumber?: string
  triggerBtn?: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EligibilityResult | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      health_insurance_id: defaultInsuranceId || "",
      card_number: defaultCardNumber || "",
      card_validity: ""
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setResult(null)

    try {
      const payload = {
        ...values,
        patient_id: patientId || undefined
      }

      const res = await fetch('/api/tiss/eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      
      if (!res.ok) {
        setResult({ success: false, error: json.error || 'Erro desconhecido ao verificar elegibilidade.' })
      } else {
        setResult(json)
      }
    } catch (error: any) {
      setResult({ success: false, error: 'Erro de conexão com o servidor.' })
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setResult(null)
      form.reset()
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerBtn || (
          <Button variant="outline" size="sm" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Verificar Elegibilidade (TISS 800)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Teste de Elegibilidade</DialogTitle>
          <DialogDescription>
            Validaremos a validade da carteirinha junto ao Webservices da Operadora (Padrão TISS 800).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="health_insurance_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID da Operadora / Convênio</FormLabel>
                  <FormControl>
                    <Input placeholder="Selecione ou insira o ID..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="card_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Carteirinha</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 012345678900" {...field} />
                  </FormControl>
                  <FormDescription>
                    Para teste local: termine com "00" para Inelegível ou "99" para Erro de WS.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="card_validity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Validade (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RESULTS UI */}
            {result && (
              <div className={`p-4 rounded-md border ${
                result.success ? 'bg-green-50 border-green-200' : 
                result.error ? 'bg-red-50 border-red-200' : 
                'bg-yellow-50 border-yellow-200'
              }`}>
                {result.error ? (
                  <div className="flex items-start gap-2 text-red-700">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="text-sm font-medium">{result.error}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className={`flex items-start gap-2 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
                      {result.success ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
                      <span className="font-semibold">{result.success ? 'Beneficiário Elegível' : 'Inelegível / Erro'}</span>
                    </div>
                    <div className="text-sm text-gray-600 pl-7">
                      <p><strong>Detalhe:</strong> {result.data?.provider_response?.message}</p>
                      <p className="text-xs mt-1">Status: {result.data?.status}</p>
                      <p className="text-xs text-gray-400">Transação da ANS: {result.data?.provider_response?.ans_transaction_id}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Consultar Elegibilidade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
