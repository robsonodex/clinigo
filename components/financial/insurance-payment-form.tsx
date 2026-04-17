"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// TODO: fetch health-insurances option list
const formSchema = z.object({
  health_insurance_id: z.string().min(1, "Selecione uma operadora"),
  tiss_batch_id: z.string().optional(),
  competence_month: z.coerce.number().min(1).max(12),
  competence_year: z.coerce.number().min(2020),
  credit_date: z.string().min(1, "Data é obrigatória"),
  gross_amount: z.coerce.number().min(0, "Valor não pode ser negativo"),
  discounts_irrf: z.coerce.number().min(0).default(0),
  discounts_iss: z.coerce.number().min(0).default(0),
  discounts_other: z.coerce.number().min(0).default(0),
  accepted_glosas: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function InsurancePaymentForm({ onSuccess, healthInsurances = [] }: { onSuccess?: () => void, healthInsurances: any[] }) {
  const { toast } = useToast();
  const [netAmount, setNetAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      health_insurance_id: "",
      tiss_batch_id: "",
      competence_month: new Date().getMonth() + 1,
      competence_year: new Date().getFullYear(),
      credit_date: new Date().toISOString().split('T')[0],
      gross_amount: 0,
      discounts_irrf: 0,
      discounts_iss: 0,
      discounts_other: 0,
      accepted_glosas: 0,
      notes: "",
    },
  });

  const watchFields = form.watch(["gross_amount", "discounts_irrf", "discounts_iss", "discounts_other", "accepted_glosas"]);

  useEffect(() => {
    const gross = Number(watchFields[0]) || 0;
    const irrf = Number(watchFields[1]) || 0;
    const iss = Number(watchFields[2]) || 0;
    const other = Number(watchFields[3]) || 0;
    const glosas = Number(watchFields[4]) || 0;
    
    setNetAmount(gross - irrf - iss - other - glosas);
  }, [watchFields]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/financial/insurance-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao registrar recebimento.");
      }
      
      toast({
        title: "Sucesso",
        description: "Recebimento registrado com sucesso.",
        variant: "default",
      });
      
      form.reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="health_insurance_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operadora</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="">Selecione...</option>
                    {healthInsurances.map((ins: any) => (
                      <option key={ins.id} value={ins.id}>{ins.name}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credit_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Crédito</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="competence_month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mês de Competência</FormLabel>
                <FormControl>
                  <Input type="number" min="1" max="12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="competence_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano de Competência</FormLabel>
                <FormControl>
                  <Input type="number" min="2020" max="2050" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 rounded-md border p-4 bg-muted/20">
          <h4 className="font-medium">Valores</h4>
          <FormField
            control={form.control}
            name="gross_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Bruto Recebido (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="discounts_irrf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IRRF (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discounts_iss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISS (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discounts_other"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outros Descontos (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accepted_glosas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Glosas Aceitas (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between items-center bg-primary/10 p-3 rounded border border-primary/20">
            <span className="font-semibold text-primary">Total Líquido:</span>
            <span className="font-bold text-xl text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netAmount)}
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes opcionais sobre o pagamento" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            "Registrar Recebimento"
          )}
        </Button>
      </form>
    </Form>
  );
}
