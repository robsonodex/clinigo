"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function InsurancePaymentsDataTable() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/financial/insurance-payments");
        const data = await res.json();
        if (data.success) {
          setPayments(data.data);
        }
      } catch (error) {
        console.error("Erro ao buscar pagamentos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Carregando recebimentos...</div>;
  }

  if (payments.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Nenhum recebimento registrado.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operadora</TableHead>
            <TableHead>Competência</TableHead>
            <TableHead>Data Crédito</TableHead>
            <TableHead className="text-right">Bruto</TableHead>
            <TableHead className="text-right">Descontos</TableHead>
            <TableHead className="text-right">Glosas</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const totalDescontos = payment.discounts_irrf + payment.discounts_iss + payment.discounts_other;
            return (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.health_insurance?.name || "Desconhecida"}
                </TableCell>
                <TableCell>{String(payment.competence_month).padStart(2, '0')}/{payment.competence_year}</TableCell>
                <TableCell>{format(new Date(payment.credit_date), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.gross_amount)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDescontos)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.accepted_glosas)}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.net_amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={payment.status === 'CONCILIATED' ? 'default' : payment.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
                    {payment.status === 'CONCILIATED' ? 'Conciliado' : payment.status === 'CANCELLED' ? 'Cancelado' : 'Pendente'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
