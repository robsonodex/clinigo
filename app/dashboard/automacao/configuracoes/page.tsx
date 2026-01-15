'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import { ReminderConfig, PayrollConfig, TissConfig } from '@/lib/automation-config';

export default function AutomationSettingsPage() {
    const supabase = createClient();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clinicId, setClinicId] = useState<string | null>(null);

    // States for each automation type
    const [reminders, setReminders] = useState<{ enabled: boolean; config: ReminderConfig }>({
        enabled: true,
        config: { reminder_24h: true, reminder_2h: false, reminder_15min: false, channels: ['EMAIL'] }
    });

    const [payroll, setPayroll] = useState<{ enabled: boolean; config: PayrollConfig }>({
        enabled: true,
        config: { day_of_month: 20, notify_doctor: true }
    });

    const [tiss, setTiss] = useState<{ enabled: boolean; config: TissConfig }>({
        enabled: false,
        config: { day_of_month: 5, auto_generate: true }
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    async function fetchConfigs() {
        try {
            // Get User Clinic
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single();

            if (!userData?.clinic_id) return;
            setClinicId(userData.clinic_id);

            // Fetch Configs
            const { data: configs } = await supabase
                .from('clinic_automation_configs')
                .select('*')
                .eq('clinic_id', userData.clinic_id);

            if (configs) {
                configs.forEach(c => {
                    if (c.automation_type === 'appointment_reminders') {
                        setReminders({ enabled: c.is_enabled, config: { ...reminders.config, ...c.config } });
                    } else if (c.automation_type === 'doctor_payroll') {
                        setPayroll({ enabled: c.is_enabled, config: { ...payroll.config, ...c.config } });
                    } else if (c.automation_type === 'tiss_batch') {
                        setTiss({ enabled: c.is_enabled, config: { ...tiss.config, ...c.config } });
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching configs', error);
            toast({ title: 'Erro ao carregar configurações', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function saveConfig(type: string, enabled: boolean, config: any) {
        if (!clinicId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('clinic_automation_configs')
                .upsert({
                    clinic_id: clinicId,
                    automation_type: type,
                    is_enabled: enabled,
                    config,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast({ title: 'Configurações salvas com sucesso!' });
        } catch (error) {
            console.error('Error saving', error);
            toast({ title: 'Erro ao salvar', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight">Configuração de Automações</h1>
            <p className="text-muted-foreground">Gerencie como o CliniGo automatiza tarefas para sua clínica.</p>

            {/* Appointment Reminders */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Lembretes de Consulta</CardTitle>
                            <CardDescription>Envio automático de lembretes para pacientes.</CardDescription>
                        </div>
                        <Switch
                            checked={reminders.enabled}
                            onCheckedChange={(checked) => {
                                setReminders(prev => ({ ...prev, enabled: checked }));
                                saveConfig('appointment_reminders', checked, reminders.config);
                            }}
                        />
                    </div>
                </CardHeader>
                {reminders.enabled && (
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <Label>24 horas antes (E-mail/WhatsApp)</Label>
                            <Switch
                                checked={reminders.config.reminder_24h}
                                onCheckedChange={(c) => {
                                    const newConfig = { ...reminders.config, reminder_24h: c };
                                    setReminders({ ...reminders, config: newConfig });
                                    saveConfig('appointment_reminders', true, newConfig);
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <Label>2 horas antes (WhatsApp Prioritário)</Label>
                            <Switch
                                checked={reminders.config.reminder_2h}
                                onCheckedChange={(c) => {
                                    const newConfig = { ...reminders.config, reminder_2h: c };
                                    setReminders({ ...reminders, config: newConfig });
                                    saveConfig('appointment_reminders', true, newConfig);
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <Label>15 minutos antes (Telemedicina/Link)</Label>
                            <Switch
                                checked={reminders.config.reminder_15min}
                                onCheckedChange={(c) => {
                                    const newConfig = { ...reminders.config, reminder_15min: c };
                                    setReminders({ ...reminders, config: newConfig });
                                    saveConfig('appointment_reminders', true, newConfig);
                                }}
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">Canais Ativos</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={reminders.config.channels.includes('EMAIL')}
                                        onChange={(e) => {
                                            const newChannels = e.target.checked
                                                ? [...reminders.config.channels, 'EMAIL']
                                                : reminders.config.channels.filter(c => c !== 'EMAIL');
                                            const newConfig = { ...reminders.config, channels: newChannels as ('EMAIL' | 'WHATSAPP' | 'SMS')[] };
                                            setReminders({ ...reminders, config: newConfig });
                                            saveConfig('appointment_reminders', true, newConfig);
                                        }}
                                    /> Email
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={reminders.config.channels.includes('WHATSAPP')}
                                        onChange={(e) => {
                                            const newChannels = e.target.checked
                                                ? [...reminders.config.channels, 'WHATSAPP']
                                                : reminders.config.channels.filter(c => c !== 'WHATSAPP');
                                            const newConfig = { ...reminders.config, channels: newChannels as ('EMAIL' | 'WHATSAPP' | 'SMS')[] };
                                            setReminders({ ...reminders, config: newConfig });
                                            saveConfig('appointment_reminders', true, newConfig);
                                        }}
                                    /> WhatsApp
                                </label>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Doctor Payroll */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Repasse Médico Automático</CardTitle>
                            <CardDescription>Cálculo mensal e notificação de repasses.</CardDescription>
                        </div>
                        <Switch
                            checked={payroll.enabled}
                            onCheckedChange={(checked) => {
                                setPayroll(prev => ({ ...prev, enabled: checked }));
                                saveConfig('doctor_payroll', checked, payroll.config);
                            }}
                        />
                    </div>
                </CardHeader>
                {payroll.enabled && (
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Dia do Mês para Execução</Label>
                            <Select
                                value={String(payroll.config.day_of_month)}
                                onValueChange={(val) => {
                                    const newConfig = { ...payroll.config, day_of_month: Number(val) };
                                    setPayroll({ ...payroll, config: newConfig });
                                    saveConfig('doctor_payroll', true, newConfig);
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecione o dia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 15, 20, 25, 28].map(day => (
                                        <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Notificar médicos por e-mail após cálculo?</Label>
                            <Switch
                                checked={payroll.config.notify_doctor}
                                onCheckedChange={(c) => {
                                    const newConfig = { ...payroll.config, notify_doctor: c };
                                    setPayroll({ ...payroll, config: newConfig });
                                    saveConfig('doctor_payroll', true, newConfig);
                                }}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* TISS Batch */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Geração de Lotes TISS</CardTitle>
                            <CardDescription>Agrupamento automático de guias para faturamento.</CardDescription>
                        </div>
                        <Switch
                            checked={tiss.enabled}
                            onCheckedChange={(checked) => {
                                setTiss(prev => ({ ...prev, enabled: checked }));
                                saveConfig('tiss_batch', checked, tiss.config);
                            }}
                        />
                    </div>
                </CardHeader>
                {tiss.enabled && (
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Dia do fechamento de lote</Label>
                            <Select
                                value={String(tiss.config.day_of_month)}
                                onValueChange={(val) => {
                                    const newConfig = { ...tiss.config, day_of_month: Number(val) };
                                    setTiss({ ...tiss, config: newConfig });
                                    saveConfig('tiss_batch', true, newConfig);
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecione o dia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 5, 10, 15, 20].map(day => (
                                        <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Gerar automaticamente?</Label>
                            <Switch
                                checked={tiss.config.auto_generate}
                                onCheckedChange={(c) => {
                                    const newConfig = { ...tiss.config, auto_generate: c };
                                    setTiss({ ...tiss, config: newConfig });
                                    saveConfig('tiss_batch', true, newConfig);
                                }}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
