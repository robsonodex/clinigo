import { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ReconciliationDataTable } from "@/components/financial/reconciliation-data-table";
import { createClient } from "@/lib/supabase/server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const metadata: Metadata = {
  title: "Conciliação TISS - CliniGo",
  description: "Cruzamento de guias enviadas com pagamentos das operadoras de saúde.",
};

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<{ batchId?: string }> }) {
  const { batchId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let batches: any[] = [];
  
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single();
      
    if (profile?.clinic_id) {
      // Puxa lotes recentes para listar no combo (Prioriza lote pendentes de pagamento ou glosados parcialmente)
      const { data } = await supabase
        .from('tiss_batches')
        .select(`id, batch_number, operator:insurance_operators(name), competence_month`)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) batches = data;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          heading="Conciliação TISS" 
          text="Selecione um lote TISS para informar os valores pagos em cada guia."
        />
      </div>

      <div className="rounded-md border p-4 bg-muted/10 mb-4 max-w-sm">
        <form method="GET" action="" className="flex flex-col gap-2">
          <label className="text-sm font-medium">Selecione o Lote</label>
          <div className="flex gap-2">
            <select name="batchId" defaultValue={batchId || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
               <option value="" disabled>Escolha um lote...</option>
               {batches.map((b) => (
                 <option key={b.id} value={b.id}>
                    {b.operator?.name || 'Operadora Interna'} - Lote: {b.batch_number}
                 </option>
               ))}
            </select>
            <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4">
              Carregar
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {batchId ? (
           <ReconciliationDataTable batchId={batchId} />
        ) : (
           <div className="text-center p-8 border rounded-md text-muted-foreground bg-muted/5">
             Nenhum lote selecionado.
           </div>
        )}
      </div>
    </div>
  );
}
