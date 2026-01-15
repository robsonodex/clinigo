'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from './file-upload-zone';
import { ValidationReport } from './validation-report';
import { FieldMappingTable } from './field-mapping-table';
import { ImportProgress } from './import-progress';
import { User, Stethoscope, Building2, Coins, FileText } from 'lucide-react';

type WizardStep = 'select-type' | 'download-template' | 'upload' | 'validate' | 'mapping' | 'execute' | 'complete';

export function ImportWizard() {
    const [currentStep, setCurrentStep] = useState<WizardStep>('select-type');
    const [importType, setImportType] = useState<string>('');
    const [jobId, setJobId] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<any[]>([]);

    // States for mapping (mocked for now as we don't have endpoints to fetch missing values yet)
    const [needsMapping, setNeedsMapping] = useState(false);

    // PASSO 1: Seleção do tipo
    if (currentStep === 'select-type') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Tipo de Importação</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Selecione o tipo de dados que deseja importar
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { id: 'patients', label: 'Pacientes', icon: User, description: 'CPF, nome, contatos, convênios' },
                        { id: 'doctors', label: 'Médicos', icon: Stethoscope, description: 'CRM, especialidade, valores' },
                        { id: 'insurances', label: 'Convênios', icon: Building2, description: 'Nomes e contatos de operadoras' },
                        { id: 'financial', label: 'Financeiro', icon: Coins, description: 'Receitas e despesas históricas' }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => {
                                setImportType(type.id);
                                setCurrentStep('download-template');
                            }}
                            className="p-6 border rounded-lg hover:border-primary hover:bg-accent transition text-left flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <type.icon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="font-semibold text-lg">{type.label}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                        </button>
                    ))}
                </div>
            </Card>
        );
    }

    // PASSO 2: Download do template
    if (currentStep === 'download-template') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Download do Modelo</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Baixe a planilha modelo e preencha com seus dados, ou use um arquivo CSV/Excel compatível.
                </p>

                <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Instruções Importantes:
                        </h3>
                        <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                            <li>Não altere os nomes das colunas na primeira linha</li>
                            <li>Preencha os campos obrigatórios (marcados com *)</li>
                            <li>Use o formato de data DD/MM/AAAA e valores numéricos padrão</li>
                            <li>Confira a aba "Instruções" no arquivo para mais detalhes</li>
                        </ul>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button
                            variant="default" // Changed from outline to default for primary action
                            size="lg"
                            onClick={async () => {
                                const response = await fetch(`/api/import/templates/${importType}`);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Importacao_${importType}_CliniGo.xlsx`;
                                a.click();
                            }}
                        >
                            📥 Baixar Planilha Modelo
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setCurrentStep('upload')}
                        >
                            Já tenho o arquivo preenchido →
                        </Button>
                    </div>

                    <div className="pt-4">
                        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-type')}>
                            ← Voltar
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    // PASSO 3: Upload
    if (currentStep === 'upload') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Upload do Arquivo</h2>
                <FileUploadZone
                    importType={importType}
                    onUploadComplete={(uploadedJobId) => {
                        setJobId(uploadedJobId);
                        setCurrentStep('validate');
                    }}
                />
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => setCurrentStep('download-template')}>
                    ← Voltar
                </Button>
            </Card>
        );
    }

    // PASSO 4: Validação
    if (currentStep === 'validate') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Validação dos Dados</h2>
                <ValidationReport
                    jobId={jobId}
                    onValidationComplete={(errors) => {
                        setValidationErrors(errors);
                        // Logic to determine if mapping is needed could go here
                        // For now, go straight to execute
                        if (false) { // if (needsMapping)
                            setCurrentStep('mapping');
                        } else {
                            executeImport();
                        }
                    }}
                />
            </Card>
        );
    }

    // PASSO 5: Mapeamento (Placeholder)
    if (currentStep === 'mapping') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Mapeamento de Campos</h2>
                <FieldMappingTable
                    sourceValues={['Unimed', 'Bradesco']} // Mock
                    targetOptions={[{ id: '1', name: 'Unimed System' }]}
                    entityType="insurance"
                    onMappingComplete={(mapping) => {
                        executeImport(); // Pass mapping if implemented
                    }}
                />
            </Card>
        );
    }

    async function executeImport() {
        // Call execute API
        await fetch(`/api/import/execute/${jobId}`, { method: 'POST' });
        setCurrentStep('execute');
    }

    // PASSO 6: Execução
    if (currentStep === 'execute') {
        return (
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Importando Dados</h2>
                <ImportProgress jobId={jobId} />

                <div className="mt-6 pt-6 border-t flex justify-between">
                    <Button variant="outline" asChild>
                        <a href="/dashboard/importacao">Ver Histórico</a>
                    </Button>
                    <Button asChild>
                        <a href="/dashboard">Ir para Dashboard</a>
                    </Button>
                </div>
            </Card>
        );
    }

    return null;
}
