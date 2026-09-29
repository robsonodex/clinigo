/**
 * CLINIGO - TISS Transport Interfaces
 * 
 * Define o contrato para envio e transmissão de lotes TISS:
 * 1. ManualPortalTransport: Download do arquivo XML para envio manual no portal da operadora (padrão operacional).
 * 2. SoapWebserviceTransport: Esqueleto de comunicação via webservice SOAP (desativado por padrão, não homologado).
 */

export interface TissDispatchResult {
    success: boolean;
    channel: 'PORTAL' | 'WEBSERVICE' | 'EMAIL';
    protocolNumber?: string;
    submissionDate: string;
    receiptProofUrl?: string;
    notes?: string;
    error?: string;
}

export interface TissTransport {
    channelName: 'PORTAL' | 'WEBSERVICE' | 'EMAIL';
    isLive: boolean;
    dispatchBatch(params: {
        batchId: string;
        batchNumber: string;
        xmlContent: string;
        operatorCode: string;
        cnesCode: string;
    }): Promise<TissDispatchResult>;
}

/**
 * Transporte padrão: Download e conferência para upload manual no portal da operadora
 */
export class ManualPortalTransport implements TissTransport {
    readonly channelName = 'PORTAL';
    readonly isLive = true;

    async dispatchBatch(params: {
        batchId: string;
        batchNumber: string;
        xmlContent: string;
        operatorCode: string;
        cnesCode: string;
    }): Promise<TissDispatchResult> {
        return {
            success: true,
            channel: 'PORTAL',
            submissionDate: new Date().toISOString(),
            notes: `Lote ${params.batchNumber} pronto para upload manual no portal da operadora ${params.operatorCode}.`,
        };
    }
}

/**
 * Esqueleto SOAP Webservice - NÃO HOMOLOGADO
 * Permanece desativado até homologação e contratação com a operadora
 */
export class SoapWebserviceTransport implements TissTransport {
    readonly channelName = 'WEBSERVICE';
    readonly isLive = false;

    constructor(
        private endpointUrl?: string,
        private credentialsEncrypted?: string,
        private environment: 'HOMOLOGATION' | 'PRODUCTION' = 'HOMOLOGATION'
    ) {}

    async dispatchBatch(params: {
        batchId: string;
        batchNumber: string;
        xmlContent: string;
        operatorCode: string;
        cnesCode: string;
    }): Promise<TissDispatchResult> {
        throw new Error(
            `Transmissão via Webservice SOAP para a operadora ${params.operatorCode} não está homologada. Utilize o envio manual via portal.`
        );
    }
}
