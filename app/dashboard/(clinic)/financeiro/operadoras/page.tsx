import { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <PageHeader 
          heading="Recebimentos de Operadoras" 
          text="Integração de pagamentos, impostos retidos e glosas."
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Recebimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
