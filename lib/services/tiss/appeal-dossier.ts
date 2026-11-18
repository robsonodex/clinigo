export interface DossierEvidenceResult {
    appeal_id: string;
    appeal_number: string;
    generated_at: string;
    health_insurance_name: string;
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
        };
        clinical_evolution: {
            exists: boolean;
            record_id: string | null;
            is_signed: boolean;
            signed_at: string | null;
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

export async function generateAppealDossierAndXml(
    supabaseAdmin: any,
    clinicId: string,
    appealId: string
): Promise<DossierEvidenceResult> {
    const { data: appeal, error: appealErr } = await supabaseAdmin
        .from('tiss_appeals')
        .select(`
            *,
            health_insurance:health_insurances(id, name, code),
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
                  .select('id, guide_number, appointment_id, patient_id, patient_name, patient_card_number, procedure_code, procedure_name, execution_date, authorization_code')
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

    const appointmentIds = Array.from(
        new Set((guides || []).map((g: any) => g.appointment_id).filter(Boolean))
    ) as string[];

    const [{ data: appts }, { data: records }] = await Promise.all([
        appointmentIds.length > 0
            ? supabaseAdmin
                  .from('appointments')
                  .select('id, checkin_confirmed_at, checkin_method, therapist_start_verified_at')
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
    ]);

    const apptMap = new Map<string, any>((appts || []).map((a: any) => [a.id, a]));
    const recordByApptMap = new Map<string, any>((records || []).map((r: any) => [r.appointment_id, r]));

    let biometricEvidences = 0;
    let signedEvolutions = 0;

    const compiledItems = items.map((item: any) => {
        const guide = guideMap.get(item.guide_id) || {};
        const glosa = glosaMap.get(item.glosa_id) || {};
        const appt = guide.appointment_id ? apptMap.get(guide.appointment_id) || null : null;
        const record = guide.appointment_id ? recordByApptMap.get(guide.appointment_id) || null : null;

        const checkinConfirmed = Boolean(appt?.checkin_confirmed_at || appt?.therapist_start_verified_at);
        const recordSigned = Boolean(record?.signed_at || record?.signature_hash);
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
            tuss_code: item.item_code || guide.procedure_code || '10101012',
            procedure_name: item.item_description || guide.procedure_name || 'Procedimento',
            glosa_code: glosa.glosa_code || '9999',
            glosa_description: glosa.glosa_description || 'Glosa contestada',
            contested_value: Number(item.contested_value || 0),
            justification: item.item_reason || appeal.general_reason || 'Procedimento executado e comprovado em prontuário e registro de presença.',
            attendance_proof: {
                checkin_confirmed: checkinConfirmed,
                checkin_at: appt?.checkin_confirmed_at || null,
                checkin_method: appt?.checkin_method || null,
                therapist_verified_at: appt?.therapist_start_verified_at || null,
            },
            clinical_evolution: {
                exists: Boolean(record?.id),
                record_id: record?.id || null,
                is_signed: recordSigned,
                signed_at: record?.signed_at || null,
                summary_excerpt: record?.id ? summaryExcerpt : 'Nenhuma evolução registrada no prontuário para este atendimento.',
            },
        };
    });

    const nowIso = new Date().toISOString();
    const regDate = nowIso.split('T')[0];
    const regTime = nowIso.slice(11, 19);
    const ansCode = escapeXml(appeal.health_insurance?.code || '000000');
    const cnpjClean = escapeXml(String(clinic?.cnpj || '').replace(/\D/g, '') || '00000000000000');

    const guiasXml = compiledItems
        .map(
            (ci) => `
        <ans:recursoGuia>
          <ans:numeroGuiaOrigem>${escapeXml(ci.guide_number)}</ans:numeroGuiaOrigem>
          <ans:numeroGuiaOperadora>${escapeXml(ci.guide_number)}</ans:numeroGuiaOperadora>
          <ans:itensRecurso>
            <ans:dataInicio>${escapeXml(ci.execution_date || regDate)}</ans:dataInicio>
            <ans:codigoProcedimento>${escapeXml(ci.tuss_code)}</ans:codigoProcedimento>
            <ans:descricaoProcedimento>${escapeXml(ci.procedure_name)}</ans:descricaoProcedimento>
            <ans:codGlosa>${escapeXml(ci.glosa_code)}</ans:codGlosa>
            <ans:valorRecursado>${ci.contested_value.toFixed(2)}</ans:valorRecursado>
            <ans:justificativaItem>${escapeXml(ci.justification)}</ans:justificativaItem>
          </ans:itensRecurso>
        </ans:recursoGuia>`
        )
        .join('');

    const xmlRecurso = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>RECURSO_GLOSA</ans:tipoTransacao>
      <ans:sequencialTransacao>${escapeXml(appeal.appeal_number)}</ans:sequencialTransacao>
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
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:recursoGlosa>
      <ans:guiaRecursoGlosa>
        <ans:registroANS>${ansCode}</ans:registroANS>
        <ans:numeroGuiaRecGlosaPrestador>${escapeXml(appeal.appeal_number)}</ans:numeroGuiaRecGlosaPrestador>
        <ans:nomeOperadora>${escapeXml(appeal.health_insurance?.name || 'Operadora')}</ans:nomeOperadora>
        <ans:objetoRecurso>1</ans:objetoRecurso>
        <ans:dadosContratado>
          <ans:codigoPrestadorNaOperadora>${cnpjClean}</ans:codigoPrestadorNaOperadora>
          <ans:nomeContratado>${escapeXml(clinic?.name || 'Clínica')}</ans:nomeContratado>
        </ans:dadosContratado>
        <ans:valorTotalRecursado>${Number(appeal.total_contested_value || 0).toFixed(2)}</ans:valorTotalRecursado>
        <ans:justificativaProtocolo>${escapeXml(appeal.general_reason || 'Contestação técnica e administrativa com dossiê probatório completo.')}</ans:justificativaProtocolo>${guiasXml}
      </ans:guiaRecursoGlosa>
    </ans:recursoGlosa>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

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
        summary: {
            total_items: compiledItems.length,
            total_contested_value: Number(appeal.total_contested_value || 0),
            biometric_evidences: biometricEvidences,
            signed_evolutions: signedEvolutions,
        },
        items: compiledItems,
        xml_recurso_glosa: xmlRecurso,
    };
}
