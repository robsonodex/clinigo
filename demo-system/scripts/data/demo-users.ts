/**
 * Demo Users Data
 * All demo users with their details
 */

export interface DemoUser {
    id: string;
    email: string;
    fullName: string;
    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
    phone: string;
    bio?: string;
    clinicId: string | null;
    // Doctor-specific
    crm?: string;
    specialty?: string;
    consultationPrice?: number;
    consultationDuration?: number;
}

export const DEMO_CLINIC_ID = 'de000000-0000-0000-0000-000000000001';

export const DEMO_USERS: DemoUser[] = [
    // Super Admin
    {
        id: 'de000002-0000-0000-0000-000000000001',
        email: 'superadmin@demo.clinigo.internal',
        fullName: 'Admin Demo',
        role: 'SUPER_ADMIN',
        phone: '(11) 99999-0001',
        clinicId: null
    },
    // Admin da Clínica
    {
        id: 'de000002-0000-0000-0000-000000000002',
        email: 'admin@demo.clinigo.internal',
        fullName: 'Dr. Carlos Administrador',
        role: 'CLINIC_ADMIN',
        phone: '(11) 99999-0002',
        bio: 'Administrador da clínica com 20 anos de experiência.',
        clinicId: DEMO_CLINIC_ID,
        crm: '123456',
        specialty: 'Clínica Geral'
    },
    // Médico 1: Cardiologista
    {
        id: 'de000002-0000-0000-0000-000000000003',
        email: 'ana.cardoso@demo.clinigo.internal',
        fullName: 'Dra. Ana Cardoso',
        role: 'DOCTOR',
        phone: '(11) 99999-0003',
        bio: 'Especialista em cardiologia preventiva com 15 anos de experiência.',
        clinicId: DEMO_CLINIC_ID,
        crm: '234567',
        specialty: 'Cardiologia',
        consultationPrice: 350,
        consultationDuration: 30
    },
    // Médico 2: Ortopedista
    {
        id: 'de000002-0000-0000-0000-000000000004',
        email: 'bruno.ortiz@demo.clinigo.internal',
        fullName: 'Dr. Bruno Ortiz',
        role: 'DOCTOR',
        phone: '(11) 99999-0004',
        bio: 'Ortopedista especializado em cirurgia de joelho e quadril.',
        clinicId: DEMO_CLINIC_ID,
        crm: '345678',
        specialty: 'Ortopedia',
        consultationPrice: 400,
        consultationDuration: 30
    },
    // Médico 3: Pediatra
    {
        id: 'de000002-0000-0000-0000-000000000005',
        email: 'carla.pimentel@demo.clinigo.internal',
        fullName: 'Dra. Carla Pimentel',
        role: 'DOCTOR',
        phone: '(11) 99999-0005',
        bio: 'Pediatra com foco em desenvolvimento infantil.',
        clinicId: DEMO_CLINIC_ID,
        crm: '456789',
        specialty: 'Pediatria',
        consultationPrice: 280,
        consultationDuration: 30
    },
    // Médico 4: Dermatologista
    {
        id: 'de000002-0000-0000-0000-000000000006',
        email: 'daniel.derma@demo.clinigo.internal',
        fullName: 'Dr. Daniel Derma',
        role: 'DOCTOR',
        phone: '(11) 99999-0006',
        bio: 'Dermatologista clínico e estético.',
        clinicId: DEMO_CLINIC_ID,
        crm: '567890',
        specialty: 'Dermatologia',
        consultationPrice: 320,
        consultationDuration: 20
    },
    // Médico 5: Ginecologista
    {
        id: 'de000002-0000-0000-0000-000000000007',
        email: 'elena.gineco@demo.clinigo.internal',
        fullName: 'Dra. Elena Gineco',
        role: 'DOCTOR',
        phone: '(11) 99999-0007',
        bio: 'Ginecologista e obstetra.',
        clinicId: DEMO_CLINIC_ID,
        crm: '678901',
        specialty: 'Ginecologia',
        consultationPrice: 300,
        consultationDuration: 30
    },
    // Recepcionista 1
    {
        id: 'de000002-0000-0000-0000-000000000008',
        email: 'fernanda.recepcao@demo.clinigo.internal',
        fullName: 'Fernanda Recepção',
        role: 'RECEPTIONIST',
        phone: '(11) 99999-0008',
        clinicId: DEMO_CLINIC_ID
    },
    // Recepcionista 2
    {
        id: 'de000002-0000-0000-0000-000000000009',
        email: 'gabriel.atendimento@demo.clinigo.internal',
        fullName: 'Gabriel Atendimento',
        role: 'RECEPTIONIST',
        phone: '(11) 99999-0009',
        clinicId: DEMO_CLINIC_ID
    }
];

export const DEMO_DOCTORS = DEMO_USERS.filter(u => u.role === 'DOCTOR');
