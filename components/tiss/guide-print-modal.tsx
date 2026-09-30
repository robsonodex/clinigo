'use client';

import { useRef } from 'react';
import {
    FileText,
    Printer,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface PrintableGuide {
    id: string;
    guide_number: string;
    guide_type?: string;
    status: string;
    validation_status?: string;
    patient_name?: string;
    patient_cpf?: string;
    patient_card_number?: string;
    patient_card_validity?: string;
    procedure_code?: string;
    procedure_name?: string;
    procedure_quantity?: number;
    unit_value?: number;
    total_value?: number;
    cid10_code?: string;
    authorization_code?: string;
    execution_date?: string;
    operator_name?: string;
    operator_ans_code?: string;
    doctor_name?: string;
    doctor_crm?: string;
}

interface GuidePrintModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guide?: PrintableGuide | null;
    guides?: PrintableGuide[];
}

export function GuidePrintModal({
    open,
    onOpenChange,
    guide,
    guides,
}: GuidePrintModalProps) {
    const printAreaRef = useRef<HTMLDivElement>(null);

    // Lista consolidada de guias a imprimir
    const listToPrint: PrintableGuide[] = guides && guides.length > 0
        ? guides
        : guide ? [guide] : [];

    if (listToPrint.length === 0) return null;

    const isMultiple = listToPrint.length > 1;

    const handlePrint = () => {
        window.print();
        toast.info(isMultiple
            ? `${listToPrint.length} guias enviadas para a fila de impressão.`
            : 'Guia enviada para a fila de impressão.'
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:m-0 print:border-none print:max-w-none print:max-h-none">
                <DialogHeader className="print:hidden">
                    <div className="flex items-center justify-between pr-4">
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <FileText className="w-5 h-5 text-primary" />
                            {isMultiple
                                ? `Impressão em Lote - ${listToPrint.length} Guias TISS`
                                : `Espelho da Guia TISS - ${listToPrint[0]?.guide_number}`
                            }
                        </DialogTitle>
                        <Badge variant="outline" className="text-zinc-600 border-zinc-300 text-xs">
                            Visualização para Impressão
                        </Badge>
                    </div>
                </DialogHeader>

                {/* Área de Impressão Formatada */}
                <div ref={printAreaRef} className="space-y-8 print:space-y-0">
                    {listToPrint.map((item, idx) => {
                        const isDraft = item.status === 'PENDING' || item.status === 'DRAFT' || item.validation_status === 'NOT_VALIDATED';
                        const isConsultation = !item.guide_type || item.guide_type.toLowerCase().includes('consulta');

                        return (
                            <div
                                key={item.id || idx}
                                className={`relative border rounded p-6 bg-white text-black font-sans text-xs space-y-4 print:border-none print:p-0 ${
                                    idx < listToPrint.length - 1 ? 'print:break-after-page' : ''
                                }`}
                                style={{ pageBreakAfter: idx < listToPrint.length - 1 ? 'always' : 'auto' }}
                            >
                                {/* Marca d'água de Rascunho se não for validada/oficial */}
                                {isDraft && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-10">
                                        <span className="text-gray-200 font-extrabold text-4xl uppercase rotate-[-30deg] tracking-widest border-4 border-dashed border-gray-200 p-6 rounded-lg">
                                            RASCUNHO / SEM VALOR LEGAL
                                        </span>
                                    </div>
                                )}

                                {/* Cabeçalho com Disclaimer Obrigatório */}
                                <div className="border-b pb-3 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xs font-semibold tracking-tight text-gray-700">
                                            Espelho da guia gerado pelo sistema (não substitui a guia oficial da operadora)
                                        </h2>
                                        <h1 className="text-sm font-extrabold uppercase mt-1 text-black">
                                            {isConsultation ? 'Guia de Consulta Médica' : 'Guia de Serviço Profissional / SADT'}
                                        </h1>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-500 block uppercase font-semibold">
                                            Número no Prestador
                                        </span>
                                        <span className="font-mono text-sm font-bold">{item.guide_number}</span>
                                    </div>
                                </div>

                                {/* Dados da Operadora e Autorização */}
                                <div className="grid grid-cols-3 gap-2 border p-2.5 rounded bg-gray-50/50">
                                    <div>
                                        <span className="text-[10px] text-gray-500 block">1 - Registro ANS</span>
                                        <span className="font-medium">{item.operator_ans_code || '000000'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 block">2 - Nome da Operadora</span>
                                        <span className="font-medium">{item.operator_name || 'Operadora de Saúde'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-500 block">3 - Número de Autorização</span>
                                        <span className="font-mono font-medium">{item.authorization_code || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Dados do Beneficiário */}
                                <div className="border p-2.5 rounded space-y-2">
                                    <div className="text-[10px] font-bold text-gray-700 uppercase border-b pb-1">
                                        Dados do Beneficiário
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="col-span-2">
                                            <span className="text-[10px] text-gray-500 block">4 - Nome do Paciente</span>
                                            <span className="font-bold">{item.patient_name || 'Paciente Não Identificado'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">5 - CPF</span>
                                            <span className="font-medium">{item.patient_cpf || 'Não informado'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">6 - Carteirinha</span>
                                            <span className="font-mono font-medium">{item.patient_card_number || 'Sem carteirinha'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dados do Procedimento */}
                                <div className="border p-2.5 rounded space-y-2">
                                    <div className="text-[10px] font-bold text-gray-700 uppercase border-b pb-1">
                                        Procedimentos Realizados
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">7 - Data de Execução</span>
                                            <span className="font-medium">{item.execution_date || new Date().toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">8 - Código TUSS</span>
                                            <span className="font-mono font-bold">{item.procedure_code || '10101012'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[10px] text-gray-500 block">9 - Descrição do Procedimento</span>
                                            <span className="font-medium">{item.procedure_name || 'Procedimento Clínico'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">10 - CID-10 Principal</span>
                                            <span className="font-mono font-medium">{item.cid10_code || 'Z00.0'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t mt-2">
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">11 - Quantidade</span>
                                            <span className="font-medium">{item.procedure_quantity || 1}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">12 - Valor Unitário (R$)</span>
                                            <span className="font-medium">
                                                {(item.unit_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block">13 - Valor Total (R$)</span>
                                            <span className="font-bold text-sm">
                                                {(item.total_value || item.unit_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Assinaturas */}
                                <div className="grid grid-cols-2 gap-4 pt-6 mt-4 border-t">
                                    <div className="text-center space-y-1">
                                        <div className="border-b border-gray-400 w-3/4 mx-auto pb-4"></div>
                                        <span className="text-[10px] text-gray-600 block">Assinatura do Beneficiário ou Responsável</span>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <div className="border-b border-gray-400 w-3/4 mx-auto pb-4"></div>
                                        <span className="text-[10px] text-gray-600 block">Assinatura e Carimbo do Profissional Executante</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="print:hidden gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Fechar
                    </Button>
                    <Button size="sm" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4 mr-1" />
                        {isMultiple ? `Imprimir ${listToPrint.length} Guias` : 'Imprimir Guia'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
