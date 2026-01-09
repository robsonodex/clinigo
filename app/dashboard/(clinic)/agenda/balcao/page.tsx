'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CalendarDays, User, Clock, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WalkInAppointmentPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        patientName: '',
        patientCPF: '',
        patientPhone: '',
        doctorId: '',
        appointmentDate: new Date(),
        appointmentTime: '',
        notes: ''
    });
    const [doctors, setDoctors] = useState<any[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
    ]); // Mock slots for now, should fetch from API
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Buscar médicos
    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await fetch('/api/doctors?page_size=100');
            const data = await response.json();
            if (data.data) {
                setDoctors(data.data);
            }
        } catch (error) {
            console.error("Error fetching doctors", error);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/appointments/walk-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    appointmentDate: formData.appointmentDate.toISOString().split('T')[0], // YYYY-MM-DD
                    appointment_type: 'walk_in',
                    status: 'CONFIRMED'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao agendar');
            }

            toast({
                title: '✅ Agendamento realizado',
                description: 'Consulta presencial agendada com sucesso.'
            });

            // Resetar formulário
            setFormData({
                patientName: '',
                patientCPF: '',
                patientPhone: '',
                doctorId: '',
                appointmentDate: new Date(),
                appointmentTime: '',
                notes: ''
            });
            setStep(1);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '❌ Erro',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CalendarDays className="w-8 h-8 text-blue-600" />
                    Agendamento Presencial (Balcão)
                </h1>
                <p className="text-muted-foreground">Registre pacientes e agende consultas na hora.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Steps Indicator */}
                <div className="md:col-span-1 space-y-4">
                    <div className={`p-4 rounded-lg border ${step === 1 ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</div>
                            <div>
                                <h3 className="font-semibold">Paciente</h3>
                                <p className="text-xs text-muted-foreground">Dados pessoais</p>
                            </div>
                        </div>
                    </div>
                    <div className={`p-4 rounded-lg border ${step === 2 ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</div>
                            <div>
                                <h3 className="font-semibold">Consulta</h3>
                                <p className="text-xs text-muted-foreground">Médico e horário</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{step === 1 ? 'Identificação do Paciente' : 'Detalhes da Consulta'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Nome Completo *</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                value={formData.patientName}
                                                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                                placeholder="Nome do paciente"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>CPF *</Label>
                                            <Input
                                                value={formData.patientCPF}
                                                onChange={(e) => setFormData({ ...formData, patientCPF: e.target.value })}
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Telefone *</Label>
                                            <Input
                                                value={formData.patientPhone}
                                                onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button onClick={() => setStep(2)} disabled={!formData.patientName || !formData.patientPhone}>
                                            Próximo
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Médico *</Label>
                                        <Select
                                            value={formData.doctorId}
                                            onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
                                        >
                                            <SelectTrigger>
                                                <div className="flex items-center gap-2">
                                                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                                                    <SelectValue placeholder="Selecione um médico" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {doctors.map((doctor) => (
                                                    <SelectItem key={doctor.id} value={doctor.id}>
                                                        {doctor.user?.full_name || doctor.full_name || 'Médico'} - {doctor.specialty}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Data *</Label>
                                            <Calendar
                                                mode="single"
                                                selected={formData.appointmentDate}
                                                onSelect={(date) => date && setFormData({ ...formData, appointmentDate: date })}
                                                className="rounded-md border"
                                                locale={ptBR}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Horário *</Label>
                                            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                                                {availableSlots.map((slot) => (
                                                    <Button
                                                        key={slot}
                                                        variant={formData.appointmentTime === slot ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setFormData({ ...formData, appointmentTime: slot })}
                                                        className="w-full"
                                                    >
                                                        <Clock className="w-3 h-3 mr-2" />
                                                        {slot}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-between pt-4">
                                        <Button variant="outline" onClick={() => setStep(1)}>
                                            Voltar
                                        </Button>
                                        <Button onClick={handleSubmit} disabled={isLoading || !formData.doctorId || !formData.appointmentTime}>
                                            {isLoading ? 'Agendando...' : 'Confirmar Agendamento'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
