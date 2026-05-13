'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Mail, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface NotaRepasseButtonProps {
    doctorId: string;
    periodStart: string;
    periodEnd: string;
}

export function NotaRepasseButton({ doctorId, periodStart, periodEnd }: NotaRepasseButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notaData, setNotaData] = useState<any>(null);

    const fetchNota = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/payroll/nota-repasse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_id: doctorId, period_start: periodStart, period_end: periodEnd })
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setNotaData(json.data);
            setOpen(true);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar nota de repasse');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!notaData) return;

        const doc = new (jsPDF as any)();
        
        // Configurações básicas
        doc.setFontSize(18);
        doc.text('NOTA DE REPASSE', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Clínica: CliniGo`, 14, 35);
        doc.text(`Período: ${periodStart} a ${periodEnd}`, 14, 42);
        
        doc.text(`Profissional: ${notaData.profissional.nome}`, 14, 55);
        doc.text(`Documento: ${notaData.profissional.documento}`, 14, 62);
        doc.text(`Especialidade: ${notaData.profissional.especialidade}`, 105, 62);

        // Tabela de atendimentos
        const tableData = notaData.atendimentos.map((apt: any) => [
            apt.data.split(' ')[0],
            apt.paciente,
            apt.convenio,
            formatCurrency(apt.valor_bruto),
            `${apt.percentual}%`,
            formatCurrency(apt.valor_repasse)
        ]);

        doc.autoTable({
            startY: 70,
            head: [['Data', 'Paciente', 'Convênio', 'Valor', '% Repasse', 'Repasse (R$)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(11);
        doc.text(`Total Bruto: ${formatCurrency(notaData.resumo.total_bruto)}`, 140, finalY, { align: 'right' });
        doc.text(`Total Repasse: ${formatCurrency(notaData.resumo.total_repasse)}`, 140, finalY + 7, { align: 'right' });
        doc.text(`Deduções: -${formatCurrency(notaData.resumo.total_deducoes)}`, 140, finalY + 14, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.text(`VALOR LÍQUIDO: ${formatCurrency(notaData.resumo.valor_liquido)}`, 140, finalY + 23, { align: 'right' });

        doc.save(`nota-repasse-${notaData.profissional.nome.replace(/\s+/g, '-')}-${periodStart}.pdf`);
        toast.success('PDF baixado com sucesso!');
    };

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={fetchNota}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                Nota PDF
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Pré-visualização: Nota de Repasse</DialogTitle>
                        <DialogDescription>
                            Revise os valores antes de gerar o PDF ou enviar por e-mail.
                        </DialogDescription>
                    </DialogHeader>

                    {notaData && (
                        <div className="space-y-6 py-4">
                            <div className="flex justify-between border-b pb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{notaData.profissional.nome}</h3>
                                    <p className="text-sm text-muted-foreground">{notaData.profissional.especialidade} • {notaData.profissional.documento}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">Período</p>
                                    <p className="text-sm text-muted-foreground">{periodStart} a {periodEnd}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Data</th>
                                            <th className="text-left py-2">Paciente</th>
                                            <th className="text-left py-2">Convênio</th>
                                            <th className="text-right py-2">Valor</th>
                                            <th className="text-right py-2">Repasse (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notaData.atendimentos.map((apt: any, i: number) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="py-2">{apt.data.split(' ')[0]}</td>
                                                <td className="py-2">{apt.paciente}</td>
                                                <td className="py-2">{apt.convenio}</td>
                                                <td className="text-right py-2">{formatCurrency(apt.valor_bruto)}</td>
                                                <td className="text-right py-2 text-green-600 font-medium">
                                                    {formatCurrency(apt.valor_repasse)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-sm">Total Repasse: <strong>{formatCurrency(notaData.resumo.total_repasse)}</strong></p>
                                    <p className="text-sm text-red-500">Deduções: <strong>-{formatCurrency(notaData.resumo.total_deducoes)}</strong></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Líquido</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(notaData.resumo.valor_liquido)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button 
                            variant="secondary" 
                            disabled={loading || !notaData?.profissional?.email}
                            onClick={async () => {
                                if (!notaData?.profissional?.email) {
                                    toast.error('Profissional não possui e-mail cadastrado.');
                                    return;
                                }
                                setLoading(true);
                                try {
                                    const res = await fetch('/api/payroll/send-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                            notaData,
                                            email: notaData.profissional.email
                                        })
                                    });
                                    const json = await res.json();
                                    if (!json.success) throw new Error(json.error);
                                    toast.success('E-mail enviado com sucesso!');
                                } catch (err: any) {
                                    toast.error(err.message || 'Erro ao enviar e-mail');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                            Enviar E-mail
                        </Button>
                        <Button onClick={handleDownloadPdf}>
                            <Download className="w-4 h-4 mr-2" />
                            Baixar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
