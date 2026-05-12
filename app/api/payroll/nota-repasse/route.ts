import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Apenas CLINIC_ADMIN, SUPER_ADMIN ou o próprio DOCTOR podem emitir
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        let { doctor_id, period_start, period_end } = body;

        // Se for doctor, só pode ver a si mesmo
        if (profile.role === 'DOCTOR') {
            const { data: doctorRecord } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .single();

            if (!doctorRecord) {
                return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });
            }
            // Força o ID para o seu próprio
            doctor_id = doctorRecord.id;
        }

        if (!doctor_id || !period_start || !period_end) {
            return NextResponse.json({ success: false, error: 'Parâmetros insuficientes' }, { status: 400 });
        }

        // 1. Busca dados do doctor
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, name, crm, specialty, user:users(email)')
            .eq('id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 });
        }

        // 2. Busca contratos e regras de convênio
        const { data: contracts } = await supabase
            .from('doctor_contracts')
            .select('*')
            .eq('doctor_id', doctor_id)
            .eq('is_active', true)
            .limit(1);
        
        const contract = contracts?.[0];
        const defaultPercentage = contract?.percentage || 0;
        
        let insuranceRulesMap: Record<string, number> = {};
        if (contract) {
            const { data: rules } = await supabase
                .from('doctor_contract_insurance_rules')
                .select('health_insurance_id, payment_type, percentage')
                .eq('doctor_contract_id', contract.id);
                
            if (rules) {
                rules.forEach(r => {
                    const key = r.health_insurance_id ? `${r.health_insurance_id}` : `type_${r.payment_type}`;
                    insuranceRulesMap[key] = r.percentage;
                });
            }
        }

        // 3. Busca appointments concluídos no período
        const { data: appointments } = await supabase
            .from('appointments')
            .select(`
                id, appointment_date, start_time, type, status, price,
                patient:patients(id, name),
                health_insurance:health_insurances(id, name)
            `)
            .eq('doctor_id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', period_start)
            .lte('appointment_date', period_end)
            .order('appointment_date', { ascending: true });

        // Calcula repasse por atendimento
        let total_bruto = 0;
        let total_repasse = 0;
        
        const details = (appointments || []).map(apt => {
            const valor = apt.price || 0;
            total_bruto += valor;
            
            // Verifica regra específica
            let percentual = defaultPercentage;
            if (apt.health_insurance?.id && insuranceRulesMap[apt.health_insurance.id]) {
                percentual = insuranceRulesMap[apt.health_insurance.id];
            }
            
            const repasse = valor * (percentual / 100);
            total_repasse += repasse;

            return {
                data: `${apt.appointment_date} ${apt.start_time}`,
                paciente: apt.patient?.name || 'Não informado',
                convenio: apt.health_insurance?.name || 'Particular',
                valor_bruto: valor,
                percentual: percentual,
                valor_repasse: repasse
            };
        });

        // 4. Busca deduções (doctor_expenses)
        const [year, month] = period_start.split('-');
        const { data: expenses } = await supabase
            .from('doctor_expenses')
            .select('id, description, amount, expense_category')
            .eq('doctor_id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .eq('year', parseInt(year))
            .eq('month', parseInt(month))
            .eq('deduct_from_payroll', true);

        let total_deducoes = 0;
        expenses?.forEach(e => {
            total_deducoes += e.amount || 0;
        });

        const valor_liquido = total_repasse - total_deducoes;

        // 5. Retorna dados estruturados
        return NextResponse.json({
            success: true,
            data: {
                profissional: {
                    nome: doctor.name,
                    documento: doctor.crm || 'N/A',
                    especialidade: doctor.specialty || 'N/A',
                    email: doctor.user?.email || ''
                },
                periodo: { start: period_start, end: period_end },
                atendimentos: details,
                resumo: {
                    total_bruto,
                    percentual_medio: total_bruto > 0 ? (total_repasse / total_bruto) * 100 : 0,
                    total_repasse,
                    deducoes: expenses || [],
                    total_deducoes,
                    valor_liquido
                }
            }
        });

    } catch (error: any) {
        console.error('[NotaRepasse] Erro ao gerar:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
