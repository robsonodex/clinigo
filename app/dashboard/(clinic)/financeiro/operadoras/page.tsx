import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { InsurancePaymentsDataTable } from "@/components/financial/insurance-payments-data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InsurancePaymentForm } from "@/components/financial/insurance-payment-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Recebimentos de Operadoras - CliniGo",
  description: "Gerencie os recebimentos, glosas e conciliação de pagamentos das operadoras de saúde.",
};

export default async function InsurancePaymentsPage() {
  const supabase = await createClient();
  
  // Fetch available health insurances for this clinic to pass it to the form
  const { data: { user } } = await supabase.auth.getUser();
  let insurances: any[] = [];
  
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single();
      
    if (profile?.clinic_id) {
      const { data } = await supabase
        .from('health_insurances')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .order('name');
      if (data) insurances = data;
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Premium */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Recebimentos de Operadoras</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Integração de pagamentos, impostos retidos e glosas.</p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex gap-1.5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5 text-sm font-semibold transition-all duration-200 border-0">
              <Plus className="h-4 w-4" />
              <span>Novo Recebimento</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle>Registrar Pagamento de Operadora</DialogTitle>
            </DialogHeader>
            <InsurancePaymentForm healthInsurances={insurances} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <InsurancePaymentsDataTable />
      </div>
    </div>
  );
}
