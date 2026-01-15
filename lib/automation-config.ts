import { SupabaseClient } from '@supabase/supabase-js';

export type AutomationType = 'appointment_reminders' | 'doctor_payroll' | 'tiss_batch' | 'health_check';

export interface ReminderConfig {
    reminder_24h: boolean;
    reminder_2h: boolean;
    reminder_15min: boolean;
    channels: ('EMAIL' | 'WHATSAPP' | 'SMS')[];
}

export interface PayrollConfig {
    day_of_month: number;
    notify_doctor: boolean;
}

export interface TissConfig {
    day_of_month: number;
    auto_generate: boolean;
}

const DEFAULT_REMINDERS: ReminderConfig = {
    reminder_24h: true,
    reminder_2h: false,
    reminder_15min: false,
    channels: ['EMAIL']
};

const DEFAULT_PAYROLL: PayrollConfig = {
    day_of_month: 20,
    notify_doctor: true
};

const DEFAULT_TISS: TissConfig = {
    day_of_month: 5,
    auto_generate: true
};

export async function getClinicAutomationConfig<T>(
    supabase: any,
    clinicId: string,
    type: AutomationType,
    planType: string = 'BASIC'
): Promise<T | null> {
    // 1. Fetch specific config from DB
    const { data } = await supabase
        .from('clinic_automation_configs')
        .select('config, is_enabled')
        .eq('clinic_id', clinicId)
        .eq('automation_type', type)
        .single();

    if (data && data.is_enabled === false) {
        return null; // Feature explicitly disabled
    }

    const dbConfig = data?.config || {};

    // 2. Merge with Plan-based defaults
    // Logic: Plan limits can override enabled features, but for now we trust `is_enabled`
    // and just merge the config object.

    let baseConfig: any = {};

    switch (type) {
        case 'appointment_reminders':
            baseConfig = { ...DEFAULT_REMINDERS };
            // Plan upgrades
            if (['PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(planType)) {
                baseConfig.reminder_2h = true;
                baseConfig.channels = ['EMAIL', 'WHATSAPP'];
            }
            if (['ENTERPRISE', 'NETWORK'].includes(planType)) {
                baseConfig.reminder_15min = true;
            }
            break;
        case 'doctor_payroll':
            baseConfig = { ...DEFAULT_PAYROLL };
            break;
        case 'tiss_batch':
            baseConfig = { ...DEFAULT_TISS };
            break;
    }

    // 3. Return merged
    return { ...baseConfig, ...dbConfig } as T;
}
