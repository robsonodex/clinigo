import { calculateOfficialAnsEpilogoMd5 } from './tiss-hash-calculator';
import { formatCentsTiss, sumCents, toCents } from '@/lib/tiss/money';

export interface DossierEvidenceResult {
    appeal_id: string;
    appeal_number: string;
    generated_at: string;
    health_insurance_name: string;
    tiss_version: string;
    epilogo_hash: string;
    summary: {
        total_items: number;
        total_contested_value: number;
        biometric_evidences: number;
        signed_evolutions: number;
    };
    items: Array<{
        item_id: string;
        guide_number: string;
        patient_name: string;
        execution_date: string | null;
        tuss_code: string;
        procedure_name: string;
        glosa_code: string;
        glosa_description: string;
        contested_value: number;
        justification: string;
        attendance_proof: {
            checkin_confirmed: boolean;
            checkin_at: string | null;
            checkin_method: string | null;
            therapist_verified_at: string | null;
            biometric_consent_active: boolean;
        };
        clinical_evolution: {
            exists: boolean;
            record_id: string | null;
            is_signed: boolean;
            signed_at: string | null;
            signature_hash: string | null;
            summary_excerpt: string;
        };
    }>;
    xml_recurso_glosa: string;
}

function escapeXml(unsafe: string): string {
    return String(unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function normalizeTuss8(code: string): string {
    const digits = String(code || '').replace(/\D/g, '');
    if (!digits) return '10101012';
    return digits.length >= 8 ? digits.slice(0, 8) : digits.padStart(8, '0');
}

export async function generateAppealDossierAndXml(
    supabaseAdmin: any,
    clinicId: string,
    appealId: string
): Promise<DossierEvidenceResult> {
    const { data: appeal, error: appealErr } = await supabaseAdmin
        .from('tiss_appeals')
        .select(`
            *,
            health_insurance:health_insurances(id, name, code, tiss_version, provider_code_in_operator),
            items:tiss_appeal_items(
                id,
                glosa_id,
                guide_id,
                item_code,
                item_description,
                original_glosa_value,
                contested_value,
                item_reason
            )
        `)
        .eq('id', appealId)
        .eq('clinic_id', clinicId)
        .single();

    if (appealErr || !appeal) {
        throw new Error('Recurso de glosa não encontrado para esta clínica');
    }

    const { data: clinic } = await supabaseAdmin
        .from('clinics')
        .select('id, name, cnpj')
        .eq('id', clinicId)
        .single();

    const items = appeal.items || [];
    const guideIds = Array.from(new Set(items.map((i: any) => i.guide_id).filter(Boolean))) as string[];
    const glosaIds = Array.from(new Set(items.map((i: any) => i.glosa_id).filter(Boolean))) as string[];

    const [{ data: guides }, { data: glosas }] = await Promise.all([
        guideIds.length > 0
            ? supabaseAdmin
                  .from('tiss_guides')
                  .select('id, batch_id, guide_number, appointment_id, patient_id, patient_name, patient_card_number, procedure_code, procedure_name, execution_date, authorization_code, biometric_proof_id')
                  .eq('clinic_id', clinicId)
                  .in('id', guideIds)
            : Promise.resolve({ data: [] }),
        glosaIds.length > 0
            ? supabaseAdmin
                  .from('tiss_glosas')
                  .select('id, glosa_code, glosa_description, item_code, item_description')
                  .eq('clinic_id', clinicId)
                  .in('id', glosaIds)
            : Promise.resolve({ data: [] }),
    ]);

    const guideMap = new Map<string, any>((guides || []).map((g: any) => [g.id, g]));
    const glosaMap = new Map<string, any>((glosas || []).map((gl: any) => [gl.id, gl]));

    const batchIds = Array.from(new Set((guides || []).map((g: any) => g.batch_id).filter(Boolean))) as string[];
    const appointmentIds = Array.from(new Set((guides || []).map((g: any) => g.appointment_id).filter(Boolean))) as string[];
    const patientIds = Array.from(new Set((guides || []).map((g: any) => g.patient_id).filter(Boolean))) as string[];

    const [{ data: batches }, { data: appts }, { data: records }, { data: biometrics }] = await Promise.all([
        batchIds.length > 0
            ? supabaseAdmin
                  .from('tiss_batches')
                  .select('id, batch_number, protocol_number')
                  .eq('clinic_id', clinicId)
                  .in('id', batchIds)
            : Promise.resolve({ data: [] }),
        appointmentIds.length > 0
            ? supabaseAdmin
                  .from('appointments')
                  .select('id, checked_in_at, checkin_confirmed_at, checkin_method, therapist_start_verified_at, digital_signature_hash')
                  .eq('clinic_id', clinicId)
                  .in('id', appointmentIds)
            : Promise.resolve({ data: [] }),
        appointmentIds.length > 0
            ? supabaseAdmin
                  .from('medical_records')
                  .select('id, appointment_id, signed_at, signature_hash, chief_complaint, history_present_illness, treatment_plan')
                  .eq('clinic_id', clinicId)
                  .in('appointment_id', appointmentIds)
            : Promise.resolve({ data: [] }),
        patientIds.length > 0
            ? supabaseAdmin
                  .from('patient_face_biometrics')
                  .select('id, patient_id, consent_given')
                  .eq('clinic_id', clinicId)
                  .in('patient_id', patientIds)
            : Promise.resolve({ data: [] }),
    ]);

    const firstBatch = (batches || [])[0] || null;
    const apptMap = new Map<string, any>((appts || []).map((a: any) => [a.id, a]));
    const recordByApptMap = new Map<string, any>((records || []).map((r: any) => [r.appointment_id, r]));
    const biometricByPatientMap = new Map<string, any>((biometrics || []).map((b: any) => [b.patient_id, b]));

    let biometricEvidences = 0;
    let signedEvolutions = 0;

    const compiledItems = items.map((item: any) => {
        const guide = guideMap.get(item.guide_id) || {};
        const glosa = glosaMap.get(item.glosa_id) || {};
        const appt = guide.appointment_id ? apptMap.get(guide.appointment_id) || null : null;
        const record = guide.appointment_id ? recordByApptMap.get(guide.appointment_id) || null : null;
        const bio = guide.patient_id ? biometricByPatientMap.get(guide.patient_id) || null : null;

        const checkinAt = appt?.checkin_confirmed_at || appt?.checked_in_at || null;
        const biometricActive = Boolean(bio?.consent_given || guide.biometric_proof_id);
        const checkinConfirmed = Boolean(checkinAt || appt?.therapist_start_verified_at || biometricActive);
        const recordSigned = Boolean(record?.signed_at || record?.signature_hash || appt?.digital_signature_hash);

        if (checkinConfirmed) biometricEvidences++;
        if (recordSigned) signedEvolutions++;

        const rawNotes = record?.treatment_plan || record?.history_present_illness || record?.chief_complaint || '';
        const summaryExcerpt = rawNotes
            ? `${String(rawNotes).slice(0, 180)}${String(rawNotes).length > 180 ? '...' : ''}`
            : 'Evolução clínica vinculada ao prontuário do atendimento.';

        return {
            item_id: item.id,
            guide_number: guide.guide_number || 'SEM_GUIA',
            patient_name: guide.patient_name || 'Beneficiário',
            execution_date: guide.execution_date || null,
            tuss_code: normalizeTuss8(item.item_code || guide.procedure_code || '10101012'),
            procedure_name: item.item_description || guide.procedure_name || 'Procedimento',
            glosa_code: String(glosa.glosa_code || '1001').replace(/\D/g, '').slice(0, 4) || '1001',
            glosa_description: glosa.glosa_description || 'Glosa contestada',
            contested_value: toCents(item.contested_value) / 100,
            justification:
                item.item_reason ||
                appeal.general_reason ||
                'Procedimento executado e comprovado em prontuário eletrônico assinado e registro de presença.',
            attendance_proof: {
                checkin_confirmed: checkinConfirmed,
                checkin_at: checkinAt,
                checkin_method: appt?.checkin_method || (biometricActive ? 'BIOMETRIA_FACIAL' : null),
                therapist_verified_at: appt?.therapist_start_verified_at || null,
                biometric_consent_active: biometricActive,
            },
            clinical_evolution: {
                exists: Boolean(record?.id),
                record_id: record?.id || null,
                is_signed: recordSigned,
                signed_at: record?.signed_at || null,
                signature_hash: record?.signature_hash || appt?.digital_signature_hash || null,
                summary_excerpt: record?.id
                    ? summaryExcerpt
                    : 'Nenhuma evolução registrada no prontuário para este atendimento.',
            },
        };
    });

    const nowIso = new Date().toISOString();
    const regDate = nowIso.split('T')[0];
    const regTime = nowIso.slice(11, 19);
    const tissVersion = appeal.health_insurance?.tiss_version || '4.01.00';
    const ansCode = escapeXml(String(appeal.health_insurance?.code || '000000').replace(/\D/g, '').padStart(6, '0').slice(0, 6));
    const cnpjClean = escapeXml(String(clinic?.cnpj || '').replace(/\D/g, '').padStart(14, '0').slice(0, 14));
    const providerCodeInOperator = escapeXml(
        appeal.health_insurance?.provider_code_in_operator || cnpjClean
    );
    const numeroLoteOrigem = escapeXml(String(firstBatch?.batch_number || appeal.appeal_number).replace(/\D/g, '').slice(-12) || '1');
    const numeroProtocoloOrigem = escapeXml(String(firstBatch?.protocol_number || appeal.protocol_number || appeal.appeal_number).slice(0, 12));
    const seqTransacao = escapeXml(String(appeal.appeal_number || '').replace(/\D/g, '').slice(-12) || '1');

    const totalContestedCents =
        compiledItems.length > 0
            ? sumCents(compiledItems.map((i) => i.contested_value))
            : toCents(appeal.total_contested_value);

    const guiasXml = compiledItems
        .map(
            (ci) => `
          <ans:recursoGuia>
            <ans:numeroGuiaOrigem>${escapeXml(ci.guide_number)}</ans:numeroGuiaOrigem>
            <ans:opcaoRecursoGuia>
              <ans:itensGuia>
                <ans:dataInicio>${escapeXml(ci.execution_date || regDate)}</ans:dataInicio>
                <ans:procRecurso>
                  <ans:codigoTabela>22</ans:codigoTabela>
                  <ans:codigoProcedimento>${escapeXml(ci.tuss_code)}</ans:codigoProcedimento>
                  <ans:descricaoProcedimento>${escapeXml(ci.procedure_name.slice(0, 150))}</ans:descricaoProcedimento>
                </ans:procRecurso>
                <ans:codGlosaItem>${escapeXml(ci.glosa_code)}</ans:codGlosaItem>
                <ans:valorRecursado>${formatCentsTiss(toCents(ci.contested_value))}</ans:valorRecursado>
                <ans:justificativaItem>${escapeXml(ci.justification.slice(0, 500))}</ans:justificativaItem>
              </ans:itensGuia>
            </ans:opcaoRecursoGuia>
          </ans:recursoGuia>`
        )
        .join('');

    const xmlWithoutEpilogo = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
      <ans:sequencialTransacao>${seqTransacao}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${regDate}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${regTime}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:CNPJ>${cnpjClean}</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${ansCode}</ans:registroANS>
    </ans:destino>
    <ans:Padrao>${escapeXml(tissVersion)}</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:recursoGlosa>
      <ans:guiaRecursoGlosa>
        <ans:registroANS>${ansCode}</ans:registroANS>
        <ans:numeroGuiaRecGlosaPrestador>${escapeXml(appeal.appeal_number)}</ans:numeroGuiaRecGlosaPrestador>
        <ans:nomeOperadora>${escapeXml((appeal.health_insurance?.name || 'Operadora').slice(0, 70))}</ans:nomeOperadora>
        <ans:objetoRecurso>2</ans:objetoRecurso>
        <ans:dadosContratado>
          <ans:codigoPrestadorNaOperadora>${providerCodeInOperator}</ans:codigoPrestadorNaOperadora>
          <ans:nomeContratado>${escapeXml((clinic?.name || 'Clínica').slice(0, 70))}</ans:nomeContratado>
        </ans:dadosContratado>
        <ans:numeroLote>${numeroLoteOrigem}</ans:numeroLote>
        <ans:numeroProtocolo>${numeroProtocoloOrigem}</ans:numeroProtocolo>
        <ans:opcaoRecurso>${guiasXml}
        </ans:opcaoRecurso>
        <ans:valorTotalRecursado>${formatCentsTiss(totalContestedCents)}</ans:valorTotalRecursado>
        <ans:dataRecurso>${regDate}</ans:dataRecurso>
      </ans:guiaRecursoGlosa>
    </ans:recursoGlosa>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    const epilogoHash = calculateOfficialAnsEpilogoMd5(xmlWithoutEpilogo);
    const xmlRecurso = xmlWithoutEpilogo.replace(
        '</ans:mensagemTISS>',
        `  <ans:epilogo>\n    <ans:hash>${epilogoHash}</ans:hash>\n  </ans:epilogo>\n</ans:mensagemTISS>`
    );

    await supabaseAdmin
        .from('tiss_appeals')
        .update({
            appeal_xml_content: xmlRecurso,
            updated_at: nowIso,
        })
        .eq('id', appealId)
        .eq('clinic_id', clinicId);

    return {
        appeal_id: appeal.id,
        appeal_number: appeal.appeal_number,
        generated_at: nowIso,
        health_insurance_name: appeal.health_insurance?.name || 'Operadora',
        tiss_version: tissVersion,
        epilogo_hash: epilogoHash,
        summary: {
            total_items: compiledItems.length,
            total_contested_value: totalContestedCents / 100,
            biometric_evidences: biometricEvidences,
            signed_evolutions: signedEvolutions,
        },
        items: compiledItems,
        xml_recurso_glosa: xmlRecurso,
    };
}
