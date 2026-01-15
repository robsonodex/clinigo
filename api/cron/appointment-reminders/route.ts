import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsApp, sendEmail } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const results = { sent: 0, failed: 0, skipped: 0 };

    try {
        const now = new Date();
        const { getClinicAutomationConfig } = await import('@/lib/automation-config');

        // 1. Fetch all active clinics to process individually
        const { data: clinics } = await supabase
            .from('clinics')
            .select('id, name, plan_type')
            .eq('is_active', true);

        if (!clinics) return NextResponse.json({ success: true, processed: 0 });

        for (const clinic of clinics) {
            const config = await getClinicAutomationConfig<any>(
                supabase,
                clinic.id,
                'appointment_reminders',
                clinic.plan_type
            );

            // If disabled or null, skip clinic
            if (!config) continue;

            // Build time windows based on config
            const timeWindows = [];
            if (config.reminder_24h) timeWindows.push({ hours: 24, type: 'REMINDER_24H' });
            if (config.reminder_2h) timeWindows.push({ hours: 2, type: 'REMINDER_2H' });
            if (config.reminder_15min) timeWindows.push({ minutes: 15, type: 'REMINDER_15MIN' });

            for (const window of timeWindows) {
                // Calculate window range
                const offsetMs = (window.hours ? window.hours * 60 : window.minutes!) * 60 * 1000;
                const targetDate = new Date(now.getTime() + offsetMs);
                const lowerBound = new Date(targetDate.getTime() - 30 * 60 * 1000); // +/- 30min tolerance
                const upperBound = new Date(targetDate.getTime() + 30 * 60 * 1000);

                try {
                    const { data: appointments } = await (supabase as any)
                        .from('appointments')
                        .select(`
                          id,
                          scheduled_at,
                          patient_id,
                          doctor_id,
                          patients (id, full_name, phone, email),
                          doctors (id, full_name, specialty)
                        `)
                        .eq('clinic_id', clinic.id)
                        .eq('status', 'SCHEDULED')
                        .gte('scheduled_at', lowerBound.toISOString())
                        .lt('scheduled_at', upperBound.toISOString());

                    if (!appointments || appointments.length === 0) continue;

                    for (const apt of appointments) {
                        // Check idempotency
                        const { data: existingLog } = await (supabase as any)
                            .from('notification_logs')
                            .select('id')
                            .eq('appointment_id', apt.id)
                            .eq('type', window.type)
                            .eq('status', 'SENT')
                            .single();

                        if (existingLog) {
                            results.skipped++;
                            continue;
                        }

                        // Prepare Context
                        const patient = apt.patients;
                        const doctor = apt.doctors;
                        const context = {
                            appointment: apt,
                            clinic: { name: clinic.name }, // Use clinic from loop
                            patient,
                            doctor
                        };

                        let sent = false;
                        let channel = 'NONE';
                        let errorMsg = null;

                        // Channel Logic from Config
                        if (config.channels.includes('WHATSAPP') && patient.phone) {
                            try {
                                await sendWhatsApp(patient.phone, context, window.type);
                                sent = true;
                                channel = 'WHATSAPP';
                            } catch (waErr) {
                                console.warn(`WhatsApp failed for ${apt.id}, trying email fallback?`, waErr);
                            }
                        }

                        // Fallback to Email if WhatsApp failed OR if WhatsApp not enabled but Email is
                        if (!sent && config.channels.includes('EMAIL') && patient.email) {
                            try {
                                const formattedDate = formatDate(apt.scheduled_at);
                                const message = `Olá ${patient.full_name}! Lembrete: você tem consulta com Dr(a). ${doctor.full_name} em ${formattedDate}. Clínica: ${clinic.name}`;

                                await sendEmail(
                                    patient.email,
                                    'Lembrete de Consulta',
                                    `<p>${message}</p>`,
                                    context
                                );
                                sent = true;
                                channel = 'EMAIL';
                            } catch (emailErr) {
                                console.error(`Email failed for ${apt.id}`, emailErr);
                                errorMsg = (emailErr as Error).message;
                            }
                        }

                        // Log result
                        await (supabase as any).from('notification_logs').insert({
                            appointment_id: apt.id,
                            type: window.type,
                            channel,
                            status: sent ? 'SENT' : 'FAILED',
                            error_message: errorMsg,
                            sent_at: sent ? new Date().toISOString() : null
                        });

                        if (sent) results.sent++; else results.failed++;
                    }

                } catch (windowErr) {
                    console.error(`Error processing window ${window.type} for clinic ${clinic.id}`, windowErr);
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Cron fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
