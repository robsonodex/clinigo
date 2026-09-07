// app/dashboard/(clinic)/pacientes/[id]/page.tsx
// CliniGo - Página de detalhes do paciente com cadastro biométrico (v2.1)

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionPlansDropdown } from '@/components/session-plans/SessionPlansDropdown';
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Calendar,
    CalendarDays,
    MapPin,
    CreditCard,
    Camera,
    Shield,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Edit2,
    XCircle,
    Clock,
    CheckSquare,
    Square,
    FileText,
    History,
    Receipt,
    Activity,
    ShieldCheck,
    Plus,
    Sparkles,
    Copy,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCPF, formatPhone, getInitials } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaceEnrollment } from '@/components/face-recognition';
import { useUser } from '@/hooks/use-user';
import { PatientDocuments } from '@/components/patients/PatientDocuments';
import { PatientEvolutions } from '@/components/patients/PatientEvolutions';
import { PatientReimbursement } from '@/components/patients/PatientReimbursement';
import { PatientSignaturesTab } from '@/components/patients/PatientSignaturesTab';

interface Patient {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birth_date?: string;
    address?: string;
    created_at: string;
    billing_type?: 'particular' | 'convenio' | 'ambos';
    health_insurance_id?: string;
    insurance_card_number?: string;
    insurance_validity?: string;
    insurance_plan_name?: string;
    health_insurances?: {
        id: string;
        name: string;
        code?: string;
    };
}

interface BiometricItem {
    id: string;
    person_type?: string;
    person_name?: string;
    notes?: string;
    consent_given: boolean;
    consent_date: string;
    detection_score: number;
    created_at: string;
    reference_image_url?: string;
}

interface BiometricStatus {
    hasBiometrics: boolean;
    count?: number;
    items?: BiometricItem[];
    biometrics?: BiometricItem;
}

const PatientFormSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['M', 'F', 'O']).optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
    address_zip_code: z.string().optional(),
    insurance_holder_name: z.string().optional(),
    insurance_holder_cpf: z.string().optional(),
    billing_type: z.enum(['particular', 'convenio', 'ambos']).default('particular'),
    health_insurance_id: z.string().optional(),
    insurance_card_number: z.string().optional(),
    insurance_validity: z.string().optional(),
    insurance_plan_name: z.string().optional(),
});
type PatientFormData = z.infer<typeof PatientFormSchema>;

export default function PatientDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const patientId = params.id as string;

    const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'info');

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const [patient, setPatient] = useState<Patient | null>(null);
    const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [insurances, setInsurances] = useState<any[]>([]);
    const [isHolder, setIsHolder] = useState(true);
    const [showQuickInsuranceModal, setShowQuickInsuranceModal] = useState(false);
    const [quickInsuranceName, setQuickInsuranceName] = useState('');
    const [quickInsuranceCode, setQuickInsuranceCode] = useState('');
    const [isCreatingQuickInsurance, setIsCreatingQuickInsurance] = useState(false);

    // Appointments state
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [cancellingBulk, setCancellingBulk] = useState(false);

    // Edit state
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasPsicomotricidade, setHasPsicomotricidade] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, fieldId: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        toast.success('Copiado para a área de transferência');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const getAgeInfo = (bDate: any) => {
        if (!bDate) return null;
        try {
            let dateObj: Date;
            if (typeof bDate === 'string' && bDate.includes('T')) {
                dateObj = new Date(bDate);
            } else if (typeof bDate === 'string' && bDate.includes('-')) {
                const [y, m, d] = bDate.split('-').map(Number);
                dateObj = new Date(y, m - 1, d);
            } else if (typeof bDate === 'string' && bDate.includes('/')) {
                const [d, m, y] = bDate.split('/').map(Number);
                dateObj = new Date(y, m - 1, d);
            } else {
                dateObj = new Date(bDate);
            }
            if (isNaN(dateObj.getTime())) return null;
            const formatted = dateObj.toLocaleDateString('pt-BR');
            const today = new Date();
            let age = today.getFullYear() - dateObj.getFullYear();
            const monthDiff = today.getMonth() - dateObj.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
                age--;
            }
            return { formatted, age: age >= 0 ? age : 0 };
        } catch {
            return null;
        }
    };
    const form = useForm<PatientFormData>({
        resolver: zodResolver(PatientFormSchema),
        defaultValues: { 
            full_name: '', 
            cpf: '', 
            email: '', 
            phone: '', 
            date_of_birth: '', 
            gender: 'M',
            address_street: '', 
            address_number: '', 
            address_complement: '', 
            address_neighborhood: '', 
            address_city: '', 
            address_state: '', 
            address_zip_code: '', 
            insurance_holder_name: '', 
            insurance_holder_cpf: '',
            billing_type: 'particular',
            health_insurance_id: '',
            insurance_card_number: '',
            insurance_validity: '',
            insurance_plan_name: '',
        },
    });

    const clinicId = user?.clinic_id;

    useEffect(() => {
        if (patientId) {
            loadPatient();
            loadBiometricStatus();
            loadAppointments();
            checkModules();
            loadInsurances();
        }
    }, [patientId]);

    const checkModules = async () => {
        if (!user?.clinic_id) return;
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from('clinica_modulos')
                .select('ativo')
                .eq('clinica_id', user.clinic_id)
                .eq('modulo_id', 'psicomotricidade_sensory')
                .maybeSingle();
            
            if (data?.ativo) {
                setHasPsicomotricidade(true);
            } else {
                setHasPsicomotricidade(false);
            }
        } catch (e) {
            console.error('Error checking modules:', e);
            setHasPsicomotricidade(false);
        }
    };

    const loadAppointments = async () => {
        setLoadingAppointments(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('appointments')
                .select('*, doctors!inner(id, user_id, specialty, users:user_id(full_name))')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false })
                .order('appointment_time', { ascending: false });

            if (error) {
                console.error('[PatientDetail] Error loading appointments:', error);
                // Fallback without join
                const { data: fallbackData } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('appointment_date', { ascending: false });
                setAppointments(fallbackData || []);
            } else {
                setAppointments(data || []);
            }
        } catch (err) {
            console.error('[PatientDetail] Unexpected error loading appointments:', err);
        } finally {
            setLoadingAppointments(false);
        }
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
        setCancellingId(appointmentId);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'CANCELLED' })
                .eq('id', appointmentId);
            if (error) throw error;
            toast.success('Agendamento cancelado com sucesso!');
            loadAppointments();
        } catch (err: any) {
            toast.error('Erro ao cancelar agendamento: ' + err.message);
        } finally {
            setCancellingId(null);
        }
    };

    const cancellableAppointments = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT');

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === cancellableAppointments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(cancellableAppointments.map(a => a.id)));
        }
    };

    const handleBulkCancel = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Tem certeza que deseja cancelar ${selectedIds.size} agendamento(s) selecionado(s)?`)) return;
        setCancellingBulk(true);
        try {
            const supabase = createClient();
            const ids = Array.from(selectedIds);
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'CANCELLED' })
                .in('id', ids);
            if (error) throw error;
            toast.success(`${ids.length} agendamento(s) cancelado(s) com sucesso!`);
            setSelectedIds(new Set());
            loadAppointments();
        } catch (err: any) {
            toast.error('Erro ao cancelar agendamentos: ' + err.message);
        } finally {
            setCancellingBulk(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            'CONFIRMED': { label: 'Confirmado', variant: 'default' },
            'PENDING_PAYMENT': { label: 'Pendente', variant: 'secondary' },
            'COMPLETED': { label: 'Realizado', variant: 'outline' },
            'CANCELLED': { label: 'Cancelado', variant: 'destructive' },
            'NO_SHOW': { label: 'Não compareceu', variant: 'destructive' },
        };
        const s = map[status] || { label: status, variant: 'secondary' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
    };

    const loadInsurances = async () => {
        try {
            const res = await fetch('/api/health-insurances?status=ACTIVE&pageSize=100');
            if (res.ok) {
                const json = await res.json();
                setInsurances(json.data || []);
            }
        } catch (e) {
            console.error('Error loading insurances:', e);
        }
    };

    const handleQuickCreateInsurance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickInsuranceName.trim()) {
            toast.error('Informe o nome da operadora/convênio');
            return;
        }

        setIsCreatingQuickInsurance(true);
        try {
            const res = await fetch('/api/health-insurances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: quickInsuranceName.trim(),
                    code: quickInsuranceCode.trim() || undefined,
                    status: 'ACTIVE',
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao cadastrar convênio');
            }

            const newIns = await res.json();
            toast.success('Convênio cadastrado e selecionado!');
            setInsurances(prev => [...prev, newIns]);
            form.setValue('health_insurance_id', newIns.id);
            setQuickInsuranceName('');
            setQuickInsuranceCode('');
            setShowQuickInsuranceModal(false);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cadastrar convênio rápido');
        } finally {
            setIsCreatingQuickInsurance(false);
        }
    };

    const loadPatient = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                health_insurances:health_insurance_id (
                    id,
                    name,
                    code
                )
            `)
            .eq('id', patientId)
            .single();

        if (error) {
            toast.error('Erro ao carregar paciente');
            console.error(error);
            return;
        }

        setPatient(data);
        if (data) {
            const d = data as any;
            
            // Helper to format the address object to a readable string
            const formatAddress = (addr: any) => {
                if (!addr) return '';
                if (typeof addr === 'string') return addr;
                if (typeof addr === 'object') {
                    const parts = [];
                    if (addr.street) {
                       const streetParts = [addr.street];
                       if (addr.number) streetParts.push(addr.number);
                       parts.push(streetParts.join(', '));
                    }
                    if (addr.complement && addr.complement !== 'N/A') parts.push(addr.complement);
                    if (addr.neighborhood) parts.push(addr.neighborhood);
                    if (addr.city) parts.push(addr.state ? `${addr.city} - ${addr.state}` : addr.city);
                    if (addr.zip_code) {
                       const zip = String(addr.zip_code).replace(/\D/g, '');
                       if (zip.length === 8) {
                           parts.push(`CEP: ${zip.slice(0, 5)}-${zip.slice(5)}`);
                       } else if (zip) {
                           parts.push(`CEP: ${zip}`);
                       }
                    }
                    return parts.join(', ');
                }
                return String(addr);
            };

            // Extração resiliente de endereço: suporta objeto JSONB, string de texto ou colunas raízes
            let rawAddress = d.address;
            if (!rawAddress && (d.address_street || d.city || d.neighborhood || d.address_number)) {
                rawAddress = {
                    street: d.address_street || '',
                    number: d.address_number || '',
                    complement: d.address_complement || '',
                    neighborhood: d.neighborhood || '',
                    city: d.city || '',
                    state: d.state || '',
                    zip_code: d.zip_code || '',
                };
            }

            let addr: any = {};
            if (rawAddress && typeof rawAddress === 'object') {
                addr = rawAddress;
            } else if (typeof rawAddress === 'string' && rawAddress.trim()) {
                addr = {
                    street: rawAddress.trim(),
                    number: d.address_number || '',
                    complement: d.address_complement || '',
                    neighborhood: d.neighborhood || '',
                    city: d.city || '',
                    state: d.state || '',
                    zip_code: d.zip_code || '',
                };
            } else {
                addr = {
                    street: d.address_street || '',
                    number: d.address_number || '',
                    complement: d.address_complement || '',
                    neighborhood: d.neighborhood || '',
                    city: d.city || '',
                    state: d.state || '',
                    zip_code: d.zip_code || '',
                };
            }

            const formattedAddress = formatAddress(rawAddress || addr);

            setIsHolder(!d.insurance_holder_name && !d.insurance_holder_cpf);
            form.reset({
                full_name: d.full_name || '',
                cpf: d.cpf || '',
                email: d.email || '',
                phone: d.phone || '',
                date_of_birth: d.birth_date || d.date_of_birth || '',
                gender: d.gender || 'M',
                address_street: addr.street || '',
                address_number: addr.number || d.address_number || '',
                address_complement: (addr.complement && addr.complement !== 'N/A' ? addr.complement : '') || d.address_complement || '',
                address_neighborhood: addr.neighborhood || d.neighborhood || '',
                address_city: addr.city || d.city || '',
                address_state: addr.state || d.state || '',
                address_zip_code: addr.zip_code || d.zip_code || '',
                insurance_holder_name: d.insurance_holder_name || '',
                insurance_holder_cpf: d.insurance_holder_cpf || '',
                billing_type: d.billing_type || 'particular',
                health_insurance_id: d.health_insurance_id || '',
                insurance_card_number: d.insurance_card_number || '',
                insurance_validity: d.insurance_validity || '',
                insurance_plan_name: d.insurance_plan_name || '',
            });

            // Exibir o endereço de forma consistente
            d.addressText = formattedAddress || (typeof d.address === 'string' ? d.address : '');
        }
        setIsLoading(false);
    };

    const handleEditSubmit = async (data: PatientFormData) => {
        setIsSaving(true);
        try {
            // Build address JSONB object from separate fields
            const addressObj: any = {};
            if (data.address_street?.trim()) addressObj.street = data.address_street.trim();
            if (data.address_number?.trim()) addressObj.number = data.address_number.trim();
            if (data.address_complement?.trim()) addressObj.complement = data.address_complement.trim();
            if (data.address_neighborhood?.trim()) addressObj.neighborhood = data.address_neighborhood.trim();
            if (data.address_city?.trim()) addressObj.city = data.address_city.trim();
            if (data.address_state?.trim()) addressObj.state = data.address_state.trim();
            if (data.address_zip_code?.trim()) addressObj.zip_code = data.address_zip_code.replace(/\D/g, '');

            // NUNCA apagar o endereço existente por acidente
            const finalAddress = Object.keys(addressObj).length > 0 
                ? addressObj 
                : (patient?.address || null);

            const isConvenioOrBoth = data.billing_type === 'convenio' || data.billing_type === 'ambos';

            const mappedData: any = {
                full_name: data.full_name,
                cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
                email: data.email || null,
                phone: data.phone,
                date_of_birth: data.date_of_birth || null,
                gender: data.gender,
                address: finalAddress,
                address_number: addressObj.number || (patient as any)?.address_number || null,
                address_complement: addressObj.complement || (patient as any)?.address_complement || null,
                neighborhood: addressObj.neighborhood || (patient as any)?.neighborhood || null,
                city: addressObj.city || (patient as any)?.city || null,
                state: addressObj.state || (patient as any)?.state || null,
                zip_code: addressObj.zip_code || (patient as any)?.zip_code || null,
                insurance_holder_name: data.insurance_holder_name || null,
                insurance_holder_cpf: data.insurance_holder_cpf ? data.insurance_holder_cpf.replace(/\D/g, '') : null,
                billing_type: data.billing_type,
                health_insurance_id: isConvenioOrBoth ? (data.health_insurance_id || null) : null,
                insurance_card_number: isConvenioOrBoth ? (data.insurance_card_number?.trim() || null) : null,
                insurance_validity: isConvenioOrBoth ? (data.insurance_validity || null) : null,
                insurance_plan_name: isConvenioOrBoth ? (data.insurance_plan_name?.trim() || null) : null,
            };

            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappedData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao atualizar paciente');
            }
            toast.success('Paciente atualizado com sucesso!');
            setShowEditModal(false);
            loadPatient();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar paciente');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    if (data.logradouro) form.setValue('address_street', data.logradouro);
                    if (data.bairro) form.setValue('address_neighborhood', data.bairro);
                    if (data.localidade) form.setValue('address_city', data.localidade);
                    if (data.uf) form.setValue('address_state', data.uf);
                    toast.success('Endereço preenchido via CEP!');
                }
            }
        } catch (err) {
            console.error('Erro ao consultar CEP:', err);
        }
    };

    const loadBiometricStatus = async () => {
        const response = await fetch(`/api/patients/${patientId}/biometrics`);
        if (response.ok) {
            const data = await response.json();
            setBiometricStatus(data);
        }
    };

    const handleDeleteBiometrics = async (biometricId?: string) => {
        if (!confirm('Tem certeza que deseja excluir esta biometria facial? Esta ação não pode ser desfeita.')) {
            return;
        }

        setIsDeleting(true);

        try {
            const url = biometricId
                ? `/api/patients/${patientId}/biometrics?biometricId=${biometricId}`
                : `/api/patients/${patientId}/biometrics`;
            const response = await fetch(url, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir biometria');
            }

            toast.success('Biometria excluída com sucesso');
            loadBiometricStatus();
        } catch (error) {
            toast.error('Erro ao excluir biometria');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEnrollmentComplete = () => {
        setShowEnrollment(false);
        loadBiometricStatus();
        toast.success('Biometria cadastrada com sucesso!');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="container py-8">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Paciente não encontrado</h2>
                        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                            Voltar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-6">
            {/* Header com padrao SaaS Internacional */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.back()}
                        className="h-10 px-2.5 sm:px-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Voltar a lista de pacientes"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Voltar
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-800 dark:to-slate-900 text-white font-semibold text-base shadow-xs ring-2 ring-slate-100 dark:ring-slate-800 shrink-0 flex items-center justify-center">
                            {getInitials(typeof patient.full_name === 'string' ? patient.full_name : 'Paciente')}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    {typeof patient.full_name === 'object' ? '-' : (patient.full_name || 'Paciente')}
                                </h1>
                                {patient.billing_type === 'convenio' ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 font-medium text-xs">
                                        <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                        Convênio: {patient.health_insurances?.name || 'Convênio'}
                                        {patient.insurance_card_number ? ` • Cart: ${patient.insurance_card_number}` : ''}
                                    </Badge>
                                ) : patient.billing_type === 'ambos' ? (
                                    <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60 font-medium text-xs">
                                        <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-600 dark:text-sky-400" />
                                        Particular & {patient.health_insurances?.name || 'Convênio'}
                                        {patient.insurance_card_number ? ` • Cart: ${patient.insurance_card_number}` : ''}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 font-medium text-xs">
                                        <User className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                        Particular
                                    </Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Cadastrado em {patient.created_at && typeof patient.created_at !== 'object' ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '-'}
                                </span>
                                {biometricStatus?.hasBiometrics && (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Biometria Ativa ({biometricStatus.count || 1})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <SessionPlansDropdown patientId={patientId} />
                    <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('signatures')}
                        className={cn(
                            "min-h-[44px] px-3.5 font-medium text-sm gap-2 border transition-all",
                            activeTab === 'signatures' 
                                ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs' 
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        )}
                    >
                        <ShieldCheck className={cn("w-4 h-4", activeTab === 'signatures' ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400')} />
                        <span>Contratos & Termos</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => setShowEditModal(true)}
                        className="min-h-[44px] px-3.5 font-medium text-sm gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                        <span>Editar</span>
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="info" className="gap-2">
                        <User className="w-4 h-4" />
                        Informações
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="gap-2">
                        <CalendarDays className="w-4 h-4" />
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Documentos
                    </TabsTrigger>
                    <TabsTrigger 
                        value="signatures" 
                        className="gap-2 font-medium"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Contratos & Termos</span>
                    </TabsTrigger>
                    <TabsTrigger value="evolutions" className="gap-2">
                        <History className="w-4 h-4" />
                        Evoluções
                    </TabsTrigger>
                    {hasPsicomotricidade && (
                        <TabsTrigger 
                            value="psicomotricidade" 
                            className="gap-2 text-emerald-700 dark:text-emerald-400 data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/40"
                            onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}
                        >
                            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Psicomotricidade
                        </TabsTrigger>
                    )}
                    {user?.role !== 'DOCTOR' && (
                    <TabsTrigger value="reimbursement" className="gap-2">
                        <Receipt className="w-4 h-4" />
                        Reembolso
                    </TabsTrigger>
                    )}
                    <TabsTrigger value="biometrics" className="gap-2">
                        <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <span>Biometria Facial</span>
                        {biometricStatus?.count ? (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-semibold">
                                {biometricStatus.count}
                            </Badge>
                        ) : null}
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Informações */}
                <TabsContent value="info" className="space-y-6 mt-6">
                    {(() => {
                        const bDate = patient.birth_date || (patient as any).date_of_birth;
                        const ageInfo = getAgeInfo(bDate);

                        return (
                            <>
                                {/* Grid Principal: Identificação e Contato */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Card 1: Identificação do Paciente */}
                                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/50">
                                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            Identificação do Paciente
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">
                                                            Dados civis e filiação
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowEditModal(true)}
                                                    className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                    Editar
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Nome Completo
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {typeof patient.full_name === 'object' ? '-' : (patient.full_name || 'Não informado')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Data de Nascimento
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {ageInfo ? ageInfo.formatted : 'Não informada'}
                                                        </p>
                                                        {ageInfo && (
                                                            <Badge variant="secondary" className="px-1.5 py-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                {ageInfo.age} {ageInfo.age === 1 ? 'ano' : 'anos'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        CPF do Paciente
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                                                            {patient.cpf ? formatCPF(patient.cpf) : 'Não informado'}
                                                        </p>
                                                        {patient.cpf && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(formatCPF(patient.cpf!), 'cpf')}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                title="Copiar CPF"
                                                            >
                                                                {copiedField === 'cpf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Gênero
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {(patient as any).gender === 'M' ? 'Masculino' : (patient as any).gender === 'F' ? 'Feminino' : (patient as any).gender === 'O' ? 'Outro' : 'Não informado'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Responsável / Titular
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {(patient as any).insurance_holder_name || (patient as any).responsible_name || (patient as any).guardian_name || (patient as any).mother_name || 'Próprio paciente'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        CPF do Responsável
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                                                            {(patient as any).insurance_holder_cpf ? formatCPF((patient as any).insurance_holder_cpf) : 'Não informado'}
                                                        </p>
                                                        {(patient as any).insurance_holder_cpf && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(formatCPF((patient as any).insurance_holder_cpf), 'holder_cpf')}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                title="Copiar CPF do responsável"
                                                            >
                                                                {copiedField === 'holder_cpf' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Card 2: Contato & Endereço */}
                                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/50">
                                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                                        <Phone className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            Contato & Endereço
                                                        </CardTitle>
                                                        <CardDescription className="text-xs">
                                                            Canais de comunicação e residência
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Telefone / WhatsApp
                                                    </span>
                                                    {patient.phone ? (
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={`tel:${patient.phone}`}
                                                                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                                                            >
                                                                {formatPhone(patient.phone)}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(formatPhone(patient.phone!), 'phone')}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                title="Copiar telefone"
                                                            >
                                                                {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-slate-400">Não informado</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        E-mail
                                                    </span>
                                                    {patient.email ? (
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={`mailto:${patient.email}`}
                                                                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate max-w-[180px]"
                                                                title={patient.email}
                                                            >
                                                                {patient.email}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(patient.email!, 'email')}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                                                                title="Copiar e-mail"
                                                            >
                                                                {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-slate-400">Não informado</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                    Endereço Residencial
                                                </span>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                                        {(patient as any).addressText || 'Nenhum endereço cadastrado para este paciente.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Card 3: Modalidade & Cobertura */}
                                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/50">
                                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        Modalidade de Atendimento & Cobertura
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Faturamento, convênio e autorizações
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {patient.billing_type === 'particular' ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                Atendimento 100% Particular
                                                            </h4>
                                                            <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs">
                                                                Particular
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Cobrança direta por sessão realizada ou via plano de sessões pré-pago.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowEditModal(true)}
                                                    className="min-h-[44px] text-xs font-medium border-slate-200 dark:border-slate-800"
                                                >
                                                    Vincular Convênio
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Modalidade
                                                    </span>
                                                    {patient.billing_type === 'ambos' ? (
                                                        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 text-xs font-medium">
                                                            <Sparkles className="w-3 h-3 mr-1" />
                                                            Particular & Convênio
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs font-medium">
                                                            <Shield className="w-3 h-3 mr-1" />
                                                            Convênio
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Operadora de Saúde
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {patient.health_insurances?.name || 'Não informado'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Nº da Carteirinha
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                                                            {patient.insurance_card_number || 'Não informado'}
                                                        </p>
                                                        {patient.insurance_card_number && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(patient.insurance_card_number!, 'card_number')}
                                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                                                title="Copiar carteirinha"
                                                            >
                                                                {copiedField === 'card_number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                                                        Validade / Plano
                                                    </span>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {patient.insurance_validity
                                                            ? new Date(patient.insurance_validity + 'T12:00:00').toLocaleDateString('pt-BR')
                                                            : (patient.insurance_plan_name || 'Vigência indeterminada')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Card 4: Biometria Facial */}
                                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900/50">
                                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                                    <Camera className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        Biometria Facial (Check-in)
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Validação biométrica por visão computacional para recepção
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3.5">
                                                <div className={cn(
                                                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                                                    biometricStatus?.hasBiometrics 
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" 
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                                )}>
                                                    <Camera className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            Status do Reconhecimento Facial
                                                        </h4>
                                                        {biometricStatus?.hasBiometrics ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs font-medium">
                                                                {biometricStatus.count || 1} face(s) cadastrada(s)
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-xs font-medium">
                                                                Pendente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {biometricStatus?.hasBiometrics 
                                                            ? 'Reconhecimento facial ativo para validação instantânea de presença na recepção.'
                                                            : 'Nenhum perfil facial cadastrado. Cadastre o paciente ou responsável para agilizar a recepção.'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab('biometrics')}
                                                    className="min-h-[44px] px-3.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800"
                                                >
                                                    <Camera className="w-3.5 h-3.5" />
                                                    Gerenciar Biometria
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setShowEnrollment(true)}
                                                    className="min-h-[44px] px-3.5 text-xs font-semibold gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    {biometricStatus?.hasBiometrics ? 'Adicionar Novo Rosto' : 'Cadastrar Agora'}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        );
                    })()}
                </TabsContent>

                {/* Tab: Agendamentos */}
                <TabsContent value="appointments">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5" />
                                        Agendamentos do Paciente
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {appointments.length} agendamento(s) encontrado(s)
                                        {selectedIds.size > 0 && (
                                            <span className="ml-2 font-medium text-destructive">
                                                • {selectedIds.size} selecionado(s)
                                            </span>
                                        )}
                                    </CardDescription>
                                </div>
                                {cancellableAppointments.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                            className="gap-1.5"
                                        >
                                            {selectedIds.size === cancellableAppointments.length ? (
                                                <CheckSquare className="w-4 h-4" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                            {selectedIds.size === cancellableAppointments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </Button>
                                        {selectedIds.size > 0 && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleBulkCancel}
                                                disabled={cancellingBulk}
                                                className="gap-1.5"
                                            >
                                                {cancellingBulk ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                Cancelar {selectedIds.size}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingAppointments ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : appointments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum agendamento encontrado para este paciente.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {appointments.map((apt) => {
                                        const doctorName = apt.doctors?.users?.full_name || apt.doctors?.specialty || 'Profissional';
                                        const canCancel = apt.status === 'CONFIRMED' || apt.status === 'PENDING_PAYMENT';
                                        return (
                                            <div
                                                key={apt.id}
                                                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${selectedIds.has(apt.id) ? 'border-destructive/50 bg-destructive/5' : ''}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {canCancel && (
                                                        <button
                                                            onClick={() => toggleSelect(apt.id)}
                                                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                                        >
                                                            {selectedIds.has(apt.id) ? (
                                                                <CheckSquare className="w-5 h-5 text-destructive" />
                                                            ) : (
                                                                <Square className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/10 rounded-lg">
                                                        <span className="text-xs font-medium text-primary">
                                                            {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', { year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{doctorName}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{apt.appointment_time?.substring(0, 5) || '--:--'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(apt.status)}
                                                    {canCancel && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={cancellingId === apt.id}
                                                            onClick={() => handleCancelAppointment(apt.id)}
                                                        >
                                                            {cancellingId === apt.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Documentos */}
                <TabsContent value="documents">
                    {clinicId && <PatientDocuments patientId={patientId} clinicId={clinicId} userRole={user?.role} />}
                </TabsContent>

                {/* Tab: Contratos & Termos com Assinatura Digital dos Pais */}
                <TabsContent value="signatures">
                    <PatientSignaturesTab patient={patient} />
                </TabsContent>

                {/* Tab: Evoluções */}
                <TabsContent value="evolutions">
                    <PatientEvolutions patientId={patientId} />
                </TabsContent>

                {/* Tab: Reembolso — oculto para terapeutas (DOCTOR) */}
                {user?.role !== 'DOCTOR' && (
                <TabsContent value="reimbursement">
                    {clinicId && (
                        <PatientReimbursement
                            patientId={patientId}
                            clinicId={clinicId}
                            patientName={typeof patient.full_name === 'object' ? '' : patient.full_name}
                            patientCpf={(patient as any).cpf}
                        />
                    )}
                </TabsContent>
                )}

                {/* Tab: Biometria Facial */}
                <TabsContent value="biometrics" className="space-y-4">
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-sky-600" />
                                    Cadastros Biométricos (Check-in Facial)
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-1">
                                    Gerencie os rostos autorizados para validação de presença nas sessões deste paciente (paciente, pai, mãe ou responsáveis).
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={() => setShowEnrollment(true)}
                                className="min-h-[44px] gap-2 font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Cadastrar Nova Biometria
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(!biometricStatus?.items || biometricStatus.items.length === 0) ? (
                                <div className="text-center py-12 px-4 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                                    <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Nenhuma biometria cadastrada</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                                        Cadastre a face do paciente e/ou de seus responsáveis para permitir o check-in facial automatizado na recepção e confirmar a presença nas sessões.
                                    </p>
                                    <Button 
                                        onClick={() => setShowEnrollment(true)}
                                        className="min-h-[44px] gap-2 font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Cadastrar Primeiro Rosto
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {biometricStatus.items.map((bio) => {
                                        const labelMap: Record<string, string> = {
                                            patient: 'Paciente',
                                            mother: 'Mãe',
                                            father: 'Pai',
                                            guardian: 'Responsável Legal',
                                            other: 'Outro'
                                        };
                                        const typeLabel = labelMap[bio.person_type || 'patient'] || 'Paciente';

                                        return (
                                            <div 
                                                key={bio.id} 
                                                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between shadow-xs gap-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {bio.reference_image_url ? (
                                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100">
                                                            <img 
                                                                src={bio.reference_image_url} 
                                                                alt={bio.person_name || typeLabel}
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600">
                                                            <User className="w-7 h-7" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <Badge variant="outline" className="text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 border-sky-200 text-sky-700 dark:text-sky-300">
                                                                {typeLabel}
                                                            </Badge>
                                                            {bio.detection_score ? (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Qualidade: {Math.round(bio.detection_score * 100)}%
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-base">
                                                            {bio.person_name || (typeof patient.full_name === 'object' ? '' : patient.full_name)}
                                                        </h4>
                                                        {bio.notes && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                                {bio.notes}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>Cadastrado em {bio.created_at ? new Date(bio.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Consentimento LGPD Ativo
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteBiometrics(bio.id)}
                                                        disabled={isDeleting}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[40px] px-2.5 gap-1.5"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Patient Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-primary" />
                            Editar Paciente
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Atualize os dados cadastrais do paciente.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo *</Label>
                                <Input id="full_name" placeholder="Ex: João da Silva" {...form.register('full_name')} />
                                {form.formState.errors.full_name && (
                                    <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" placeholder="000.000.000-00" {...form.register('cpf')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Sexo</Label>
                                    <Select 
                                        defaultValue={form.getValues('gender')} 
                                        onValueChange={(value) => form.setValue('gender', value as 'M' | 'F' | 'O')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Masculino</SelectItem>
                                            <SelectItem value="F">Feminino</SelectItem>
                                            <SelectItem value="O">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone *</Label>
                                <Input id="phone" placeholder="(11) 99999-9999" {...form.register('phone')} />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" placeholder="paciente@email.com" {...form.register('email')} />
                                {form.formState.errors.email && (
                                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                                <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
                            </div>

                            {/* Endereço - Campos separados */}
                            <div className="space-y-2">
                                <Label className="font-semibold">Endereço</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_street" className="text-xs text-muted-foreground">Rua</Label>
                                        <Input id="address_street" placeholder="Nome da rua" {...form.register('address_street')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_number" className="text-xs text-muted-foreground">Número</Label>
                                        <Input id="address_number" placeholder="Nº" {...form.register('address_number')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="address_complement" className="text-xs text-muted-foreground">Complemento</Label>
                                        <Input id="address_complement" placeholder="Apto, Bloco..." {...form.register('address_complement')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_neighborhood" className="text-xs text-muted-foreground">Bairro</Label>
                                        <Input id="address_neighborhood" placeholder="Bairro" {...form.register('address_neighborhood')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_city" className="text-xs text-muted-foreground">Cidade</Label>
                                        <Input id="address_city" placeholder="Cidade" {...form.register('address_city')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_state" className="text-xs text-muted-foreground">UF</Label>
                                        <Input id="address_state" placeholder="SP" maxLength={2} {...form.register('address_state')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_zip_code" className="text-xs text-muted-foreground">CEP</Label>
                                        <Input
                                            id="address_zip_code"
                                            placeholder="00000-000"
                                            maxLength={9}
                                            {...form.register('address_zip_code')}
                                            onBlur={handleCepBlur}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modalidade de Atendimento: Particular vs Convênio */}
                            <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Tipo de Atendimento *
                                </Label>
                                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('billing_type', 'particular')}
                                        className={cn(
                                            "py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px]",
                                            form.watch('billing_type') === 'particular'
                                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <User className="w-4 h-4 shrink-0" />
                                        <span>Particular</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('billing_type', 'convenio')}
                                        className={cn(
                                            "py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px]",
                                            form.watch('billing_type') === 'convenio'
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <Shield className="w-4 h-4 shrink-0" />
                                        <span>Convênio</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('billing_type', 'ambos')}
                                        className={cn(
                                            "py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px]",
                                            form.watch('billing_type') === 'ambos'
                                                ? "bg-blue-600 text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <ShieldCheck className="w-4 h-4 shrink-0 text-blue-200" />
                                        <span>Ambos</span>
                                    </button>
                                </div>

                                {form.watch('billing_type') === 'ambos' && (
                                    <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span><strong>Modalidade Híbrida:</strong> O paciente realiza atendimentos particulares e também via convênio. Cadastre os dados do plano abaixo.</span>
                                    </div>
                                )}

                                {(form.watch('billing_type') === 'convenio' || form.watch('billing_type') === 'ambos') && (
                                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="health_insurance_id" className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                                    Operadora / Convênio *
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQuickInsuranceModal(true)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[36px] px-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    + Novo Convênio
                                                </button>
                                            </div>
                                            <Select
                                                value={form.watch('health_insurance_id') || ''}
                                                onValueChange={(val) => form.setValue('health_insurance_id', val)}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-slate-900 min-h-[44px] text-sm">
                                                    <SelectValue placeholder="Selecione o convênio da clínica..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {insurances.length === 0 ? (
                                                        <div className="p-3 text-xs text-slate-500 text-center">
                                                            Nenhum convênio cadastrado ainda. Clique em "+ Novo Convênio".
                                                        </div>
                                                    ) : (
                                                        insurances.map((ins: any) => (
                                                            <SelectItem key={ins.id} value={ins.id}>
                                                                {ins.name} {ins.code ? `(ANS: ${ins.code})` : ''}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="insurance_card_number" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                    Nº Carteirinha / Matrícula
                                                </Label>
                                                <Input
                                                    id="insurance_card_number"
                                                    placeholder="Ex: 0023456789"
                                                    className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                    {...form.register('insurance_card_number')}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="insurance_validity" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                    Validade da Carteirinha
                                                </Label>
                                                <Input
                                                    id="insurance_validity"
                                                    type="date"
                                                    className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                    {...form.register('insurance_validity')}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="insurance_plan_name" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                Plano / Categoria (opcional)
                                            </Label>
                                            <Input
                                                id="insurance_plan_name"
                                                placeholder="Ex: Básico, Executivo, Top Nacional..."
                                                className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                {...form.register('insurance_plan_name')}
                                            />
                                        </div>

                                        {/* Titularidade */}
                                        <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-900/30 space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]">
                                                <input
                                                    type="checkbox"
                                                    checked={isHolder}
                                                    onChange={(e) => setIsHolder(e.target.checked)}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                O paciente é o próprio titular do plano
                                            </label>

                                            {!isHolder && (
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="insurance_holder_name" className="text-xs text-slate-600 dark:text-slate-400">
                                                            Nome do Titular
                                                        </Label>
                                                        <Input
                                                            id="insurance_holder_name"
                                                            placeholder="Nome do pai/mãe ou titular"
                                                            className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                            {...form.register('insurance_holder_name')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="insurance_holder_cpf" className="text-xs text-slate-600 dark:text-slate-400">
                                                            CPF do Titular
                                                        </Label>
                                                        <Input
                                                            id="insurance_holder_cpf"
                                                            placeholder="000.000.000-00"
                                                            className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                            {...form.register('insurance_holder_cpf')}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(form.watch('billing_type') === 'particular' || form.watch('billing_type') === 'ambos') && (
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_holder_name">Nome Completo dos Responsáveis</Label>
                                        <Input
                                            id="insurance_holder_name"
                                            placeholder="Ex: Maria da Silva (Mãe)"
                                            className="min-h-[44px] text-sm"
                                            {...form.register('insurance_holder_name')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_holder_cpf">CPF do Responsável</Label>
                                        <Input
                                            id="insurance_holder_cpf"
                                            placeholder="000.000.000-00"
                                            className="min-h-[44px] text-sm"
                                            {...form.register('insurance_holder_cpf')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 px-6 border-t bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur shrink-0 flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="min-h-[44px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm min-h-[44px]">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Alterações'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Quick Create Health Insurance Modal */}
            <Dialog open={showQuickInsuranceModal} onOpenChange={setShowQuickInsuranceModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Cadastrar Novo Convênio
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Cadastre a operadora de saúde rapidamente. Ela ficará disponível para todos os atendimentos da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuickCreateInsurance} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quick_name_patient_detail">Nome do Convênio / Operadora *</Label>
                            <Input
                                id="quick_name_patient_detail"
                                placeholder="Ex: Unimed, Bradesco Saúde, Amil..."
                                value={quickInsuranceName}
                                onChange={(e) => setQuickInsuranceName(e.target.value)}
                                className="min-h-[44px]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick_code_patient_detail">Registro ANS / Código (opcional)</Label>
                            <Input
                                id="quick_code_patient_detail"
                                placeholder="Ex: 005711"
                                value={quickInsuranceCode}
                                onChange={(e) => setQuickInsuranceCode(e.target.value)}
                                className="min-h-[44px]"
                            />
                        </div>
                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowQuickInsuranceModal(false)} className="min-h-[44px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreatingQuickInsurance || !quickInsuranceName.trim()} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px] text-white font-semibold">
                                {isCreatingQuickInsurance ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Cadastrar Convênio'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Cadastro Biométrico */}
            <Dialog open={showEnrollment} onOpenChange={setShowEnrollment}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                    <DialogTitle className="sr-only">Cadastro Biométrico Facial</DialogTitle>
                    <DialogDescription className="sr-only">Cadastro e validação de perfil biométrico facial do paciente</DialogDescription>
                    <FaceEnrollment
                        patientId={patientId}
                        clinicId={user?.clinic_id || (patient as any)?.clinic_id || ''}
                        patientName={typeof patient.full_name === 'object' ? '' : patient.full_name}
                        onComplete={handleEnrollmentComplete}
                        onCancel={() => setShowEnrollment(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
