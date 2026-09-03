import { Metadata } from "next";
import { ReconciliationDataTable } from "@/components/financial/reconciliation-data-table";
import { createClient } from "@/lib/supabase/server";
import { FileSpreadsheet } from "lucide-react";
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
      {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <FileSpreadsheet className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Conciliação TISS</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Selecione um lote TISS para informar os valores pagos em cada guia.</p>
                    </div>
                </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/20 mb-4 max-w-sm">
        <form method="GET" action="" className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selecione o Lote</label>
          <div className="flex gap-2">
            <select 
              name="batchId" 
              defaultValue={batchId || ""} 
              className="flex h-10 w-full rounded-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 shadow-sm outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
               <option value="" disabled>Escolha um lote...</option>
               {batches.map((b) => (
                 <option key={b.id} value={b.id}>
                    {b.operator?.name || 'Operadora Interna'} - Lote: {b.batch_number}
                 </option>
               ))}
            </select>
            <button 
              type="submit" 
              className="h-10 rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 text-sm font-semibold transition-all duration-200 border-0 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            >
              Carregar
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {batchId ? (
           <ReconciliationDataTable batchId={batchId} />
        ) : (
           <div className="text-center p-12 border border-dashed rounded-2xl text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/10">
             Nenhum lote selecionado.
           </div>
        )}
      </div>
    </div>
  );
}
