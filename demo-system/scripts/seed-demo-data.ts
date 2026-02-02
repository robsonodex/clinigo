/**
 * Demo Seed Script
 * Creates all demo data in the database using Supabase Admin API
 * 
 * Usage: npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { DEMO_USERS, DEMO_DOCTORS, DEMO_CLINIC_ID } from './data/demo-users';
import { DEMO_PATIENTS } from './data/demo-patients';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from parent .env files (resolve relative to script location)
const appRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(appRoot, '.env') });
dotenv.config({ path: path.join(appRoot, '.env.local') });
dotenv.config({ path: path.join(appRoot, 'demo-system', '.env.demo') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_PASSWORD = 'Demo@2026!';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ============================================================
// SEED FUNCTIONS
// ============================================================

async function createAuthUser(email: string, password: string, userId: string): Promise<string | null> {
    console.log(`   Creating auth user: ${email}`);

    // First check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserById(userId);
    if (existingUser?.user) {
        console.log(`   ✓ User already exists: ${email}`);
        return userId;
    }

    // Create with specific ID
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            is_demo: true
        }
    });

    if (error) {
        // User might already exist with different ID
        if (error.message.includes('already been registered')) {
            console.log(`   ⚠ User exists with different ID, fetching...`);
            const { data: users } = await supabase.auth.admin.listUsers();
            const existingUser = users?.users?.find(u => u.email === email);
            if (existingUser) {
                return existingUser.id;
            }
        }
        console.error(`   ❌ Failed to create user ${email}:`, error.message);
        return null;
    }

    return data.user?.id || null;
}

async function seedClinic() {
    console.log('\n📦 Seeding Demo Clinic...');

    const { error } = await supabase.from('clinics').upsert({
        id: DEMO_CLINIC_ID,
        name: 'Clínica Demo Excellence',
        slug: 'clinica-demo',
        cnpj: '00.000.000/0001-99',
        email: 'admin@demo.clinigo.internal',
        phone: '(11) 99999-0000',
        address: {
            street: 'Av. Demonstração',
            number: '1000',
            complement: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100'
        },
        plan_type: 'ENTERPRISE',
        plan_limits: {
            max_doctors: 999,
            max_appointments_month: 99999,
            telemedicine: true,
            tiss: true,
            crm: true,
            multi_unit: true,
            whatsapp_automation: true
        },
        is_active: true,
        primary_color: '#3B82F6',
        theme: {
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981'
        },
        public_page_settings: {
            heroTitle: 'Agende sua consulta com excelência',
            heroSubtitle: 'Atendimento humanizado com tecnologia de ponta',
            showTestimonials: true,
            showStats: true
        }
    }, { onConflict: 'id' });

    if (error) {
        console.error('❌ Error creating clinic:', error.message);
        return false;
    }

    console.log('✅ Demo clinic created/updated');
    return true;
}

async function seedHealthInsurances() {
    console.log('\n📦 Seeding Health Insurances...');

    const insurances = [
        { id: 'de000001-0000-0000-0000-000000000001', name: 'Unimed', code: '12345', phone: '0800-111-1111', email: 'contato@unimed.demo.internal' },
        { id: 'de000001-0000-0000-0000-000000000002', name: 'Bradesco Saúde', code: '23456', phone: '0800-222-2222', email: 'contato@bradesco.demo.internal' },
        { id: 'de000001-0000-0000-0000-000000000003', name: 'SulAmérica', code: '34567', phone: '0800-333-3333', email: 'contato@sulamerica.demo.internal' },
        { id: 'de000001-0000-0000-0000-000000000004', name: 'Amil', code: '45678', phone: '0800-444-4444', email: 'contato@amil.demo.internal' }
    ];

    for (const insurance of insurances) {
        const { error } = await supabase.from('health_insurances').upsert({
            id: insurance.id,
            clinic_id: DEMO_CLINIC_ID,
            name: insurance.name,
            code: insurance.code,
            phone: insurance.phone,
            email: insurance.email,
            status: 'ACTIVE'
        }, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Error creating insurance ${insurance.name}:`, error.message);
        } else {
            console.log(`   ✓ ${insurance.name}`);
        }
    }

    console.log('✅ Health insurances created');
    return true;
}

async function seedUsers() {
    console.log('\n📦 Seeding Demo Users...');

    for (const user of DEMO_USERS) {
        // First create in auth.users
        const authId = await createAuthUser(user.email, DEMO_PASSWORD, user.id);

        if (!authId) {
            console.error(`   ❌ Skipping user ${user.email} - auth creation failed`);
            continue;
        }

        // Then create in public.users with the auth ID
        const { error } = await supabase.from('users').upsert({
            id: authId, // Use the actual auth ID
            clinic_id: user.clinicId,
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            phone: user.phone,
            bio: user.bio || null,
            is_active: true,
            activation_status: 'active'
        }, { onConflict: 'id' });

        if (error) {
            console.error(`   ❌ Error creating user ${user.email}:`, error.message);
        } else {
            console.log(`   ✓ ${user.fullName} (${user.role})`);

            // If doctor, also create doctor record
            if (user.role === 'DOCTOR' && user.crm) {
                const doctorId = user.id.replace('de000002', 'de000004'); // Different prefix for doctors
                const { error: docError } = await supabase.from('doctors').upsert({
                    id: doctorId,
                    user_id: authId,
                    clinic_id: DEMO_CLINIC_ID,
                    crm: user.crm,
                    crm_state: 'SP',
                    specialty: user.specialty,
                    bio: user.bio,
                    consultation_price: user.consultationPrice || 300,
                    consultation_duration: user.consultationDuration || 30,
                    is_accepting_appointments: true,
                    is_active: true,
                    rating: 4.8,
                    review_count: 150,
                    experience_years: 10
                }, { onConflict: 'id' });

                if (docError) {
                    console.error(`   ❌ Error creating doctor record:`, docError.message);
                }
            }
        }
    }

    console.log('✅ Demo users created');
    return true;
}

async function seedPatients() {
    console.log('\n📦 Seeding Demo Patients...');

    for (const patient of DEMO_PATIENTS) {
        const { error } = await supabase.from('patients').upsert({
            id: patient.id,
            clinic_id: DEMO_CLINIC_ID,
            cpf: patient.cpf,
            full_name: patient.fullName,
            email: patient.email,
            phone: patient.phone,
            date_of_birth: patient.dateOfBirth,
            gender: patient.gender,
            address: patient.address,
            health_insurance: patient.healthInsurance || null,
            blood_type: patient.bloodType || null,
            allergies: patient.allergies || null,
            is_active: true,
            activation_status: 'active'
        }, { onConflict: 'id' });

        if (error) {
            console.error(`   ❌ Error creating patient ${patient.fullName}:`, error.message);
        } else {
            console.log(`   ✓ ${patient.fullName}`);
        }
    }

    console.log('✅ Demo patients created');
    return true;
}

async function seedSchedules() {
    console.log('\n📦 Seeding Doctor Schedules...');

    // Get all demo doctors
    const { data: doctors } = await supabase
        .from('doctors')
        .select('id, user_id')
        .eq('clinic_id', DEMO_CLINIC_ID);

    if (!doctors || doctors.length === 0) {
        console.log('   ⚠ No doctors found, skipping schedules');
        return false;
    }

    // Create schedule for each doctor (Mon-Fri, 8:00-18:00)
    for (const doctor of doctors) {
        for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
            const scheduleId = `de000005-${doctor.id.substring(9, 13)}-${dayOfWeek.toString().padStart(4, '0')}-0000-000000000001`;

            const { error } = await supabase.from('schedules').upsert({
                id: scheduleId,
                doctor_id: doctor.id,
                day_of_week: dayOfWeek,
                start_time: '08:00',
                end_time: '18:00',
                slot_duration: 30,
                is_active: true
            }, { onConflict: 'id' });

            if (error && !error.message.includes('duplicate')) {
                console.error(`   ⚠ Schedule error:`, error.message);
            }
        }
        console.log(`   ✓ Schedule for doctor ${doctor.id.substring(0, 8)}...`);
    }

    console.log('✅ Doctor schedules created');
    return true;
}

async function seedAppointments() {
    console.log('\n📦 Seeding Demo Appointments (50)...');

    // Get doctors and patients
    const { data: doctors } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', DEMO_CLINIC_ID);

    if (!doctors || doctors.length === 0) {
        console.log('   ⚠ No doctors found, skipping appointments');
        return false;
    }

    const statuses = [
        { status: 'SCHEDULED', count: 10 },
        { status: 'CONFIRMED', count: 5 },
        { status: 'WAITING', count: 3 },
        { status: 'IN_PROGRESS', count: 2 },
        { status: 'COMPLETED', count: 15 },
        { status: 'CANCELLED', count: 5 },
        { status: 'NO_SHOW', count: 5 },
        { status: 'SCHEDULED', count: 5, type: 'TELEMEDICINA' } // teleconsults
    ];

    const today = new Date();
    let appointmentIndex = 1;

    for (const statusConfig of statuses) {
        for (let i = 0; i < statusConfig.count; i++) {
            const doctorIndex = appointmentIndex % doctors.length;
            const patientIndex = appointmentIndex % DEMO_PATIENTS.length;

            // Generate date based on status
            let appointmentDate: Date;
            if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(statusConfig.status)) {
                // Past appointments
                appointmentDate = new Date(today);
                appointmentDate.setDate(today.getDate() - Math.floor(Math.random() * 30));
            } else {
                // Future appointments
                appointmentDate = new Date(today);
                appointmentDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
            }

            const hours = 8 + Math.floor(Math.random() * 10); // 8:00 - 18:00
            const minutes = Math.random() > 0.5 ? 0 : 30;

            const appointmentId = `de000006-0000-0000-0000-${appointmentIndex.toString().padStart(12, '0')}`;

            const { error } = await supabase.from('appointments').upsert({
                id: appointmentId,
                clinic_id: DEMO_CLINIC_ID,
                doctor_id: doctors[doctorIndex].id,
                patient_id: DEMO_PATIENTS[patientIndex].id,
                appointment_date: appointmentDate.toISOString().split('T')[0],
                appointment_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                status: statusConfig.status,
                type: statusConfig.type || 'IN_PERSON',
                payment_type: Math.random() > 0.3 ? 'CONVENIO' : 'PARTICULAR',
                notes: statusConfig.status === 'COMPLETED' ? 'Consulta realizada com sucesso.' : null
            }, { onConflict: 'id' });

            if (error) {
                console.error(`   ⚠ Appointment error:`, error.message);
            }

            appointmentIndex++;
        }
        console.log(`   ✓ ${statusConfig.count}x ${statusConfig.status}${statusConfig.type ? ' (TELEMEDICINA)' : ''}`);
    }

    console.log('✅ Demo appointments created');
    return true;
}

async function seedMedicalRecords() {
    console.log('\n📦 Seeding Demo Medical Records (15)...');

    // Get completed appointments
    const { data: appointments } = await supabase
        .from('appointments')
        .select('id, doctor_id, patient_id')
        .eq('clinic_id', DEMO_CLINIC_ID)
        .eq('status', 'COMPLETED')
        .limit(15);

    if (!appointments || appointments.length === 0) {
        console.log('   ⚠ No completed appointments found');
        return false;
    }

    const diagnoses = [
        'Hipertensão arterial controlada',
        'Diabetes mellitus tipo 2',
        'Lombalgia mecânica',
        'Rinite alérgica',
        'Dermatite de contato',
        'Ansiedade generalizada',
        'Gastrite',
        'Enxaqueca',
        'Osteoartrite de joelho',
        'Bronquite asmática',
        'Hipotireoidismo',
        'Fibromialgia',
        'Refluxo gastroesofágico',
        'Sinusite crônica',
        'Tendinite de ombro'
    ];

    let recordIndex = 1;
    for (const appointment of appointments) {
        const recordId = `de000007-0000-0000-0000-${recordIndex.toString().padStart(12, '0')}`;

        const { error } = await supabase.from('medical_records').upsert({
            id: recordId,
            clinic_id: DEMO_CLINIC_ID,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            appointment_id: appointment.id,
            chief_complaint: 'Consulta de rotina',
            present_illness: 'Paciente refere sintomas estáveis desde última consulta.',
            physical_exam: 'PA: 120/80 mmHg, FC: 72 bpm, Peso: 70 kg',
            diagnosis: diagnoses[recordIndex % diagnoses.length],
            prescription: 'Manter medicações em uso. Retorno em 30 dias.',
            treatment_plan: 'Acompanhamento regular. Solicitar exames de rotina.',
            notes: 'Paciente orientado sobre cuidados gerais.'
        }, { onConflict: 'id' });

        if (error) {
            console.error(`   ⚠ Medical record error:`, error.message);
        }

        recordIndex++;
    }

    console.log('✅ Demo medical records created');
    return true;
}

async function seedFinancialEntries() {
    console.log('\n📦 Seeding Demo Financial Entries (25)...');

    const incomeCategories = [
        { category: 'Consulta Particular', amount: 250 },
        { category: 'Consulta Convênio', amount: 150 },
        { category: 'Teleconsulta', amount: 180 },
        { category: 'Procedimento', amount: 500 }
    ];

    const expenseCategories = [
        { category: 'Aluguel', amount: 5000 },
        { category: 'Salários', amount: 15000 },
        { category: 'Material Médico', amount: 2500 },
        { category: 'Energia Elétrica', amount: 800 },
        { category: 'Internet', amount: 300 },
        { category: 'Telefone', amount: 200 },
        { category: 'Manutenção', amount: 1200 },
        { category: 'Material Escritório', amount: 450 },
        { category: 'Limpeza', amount: 600 },
        { category: 'Taxas Bancárias', amount: 120 }
    ];

    let entryIndex = 1;

    // Create 15 income entries
    for (let i = 0; i < 15; i++) {
        const categoryIndex = i % incomeCategories.length;
        const entryId = `de000008-0000-0000-0000-${entryIndex.toString().padStart(12, '0')}`;
        const entryDate = new Date();
        entryDate.setDate(entryDate.getDate() - Math.floor(Math.random() * 30));

        const status = Math.random() > 0.7 ? 'pending' : 'paid';

        const { error } = await supabase.from('financial_entries').upsert({
            id: entryId,
            clinic_id: DEMO_CLINIC_ID,
            type: 'income',
            category: incomeCategories[categoryIndex].category,
            description: `${incomeCategories[categoryIndex].category} - Paciente ${i + 1}`,
            amount: incomeCategories[categoryIndex].amount,
            status,
            payment_method: status === 'paid' ? 'PIX' : null,
            paid_at: status === 'paid' ? entryDate.toISOString() : null
        }, { onConflict: 'id' });

        if (error) {
            console.error(`   ⚠ Income entry error:`, error.message);
        }

        entryIndex++;
    }
    console.log('   ✓ 15 income entries');

    // Create 10 expense entries
    for (let i = 0; i < 10; i++) {
        const categoryIndex = i % expenseCategories.length;
        const entryId = `de000008-0000-0000-0000-${entryIndex.toString().padStart(12, '0')}`;
        const entryDate = new Date();
        entryDate.setDate(entryDate.getDate() - Math.floor(Math.random() * 30));

        const statusRand = Math.random();
        const status = statusRand > 0.8 ? 'pending' : statusRand > 0.9 ? 'cancelled' : 'paid';

        const { error } = await supabase.from('financial_entries').upsert({
            id: entryId,
            clinic_id: DEMO_CLINIC_ID,
            type: 'expense',
            category: expenseCategories[categoryIndex].category,
            description: expenseCategories[categoryIndex].category,
            amount: expenseCategories[categoryIndex].amount,
            status,
            payment_method: status === 'paid' ? 'Boleto' : null,
            paid_at: status === 'paid' ? entryDate.toISOString() : null
        }, { onConflict: 'id' });

        if (error) {
            console.error(`   ⚠ Expense entry error:`, error.message);
        }

        entryIndex++;
    }
    console.log('   ✓ 10 expense entries');

    console.log('✅ Demo financial entries created');
    return true;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
    console.log('🎬 ==========================================');
    console.log('   CliniGo Demo Environment Seeder v3.2.0');
    console.log('   ==========================================\n');

    console.log('📌 Supabase URL:', SUPABASE_URL);
    console.log('📌 Clinic ID:', DEMO_CLINIC_ID);
    console.log('📌 Password:', DEMO_PASSWORD);

    try {
        // Phase 1: Core data
        await seedClinic();
        await seedHealthInsurances();

        // Phase 2: Users (requires auth)
        await seedUsers();

        // Phase 3: Patients
        await seedPatients();

        // Phase 4: Schedules
        await seedSchedules();

        // Phase 5: Appointments
        await seedAppointments();

        // Phase 6: Medical records
        await seedMedicalRecords();

        // Phase 7: Financial
        await seedFinancialEntries();

        console.log('\n🎉 ==========================================');
        console.log('   DEMO ENVIRONMENT CREATED SUCCESSFULLY!');
        console.log('   ==========================================\n');
        console.log('📧 Login: admin@demo.clinigo.internal');
        console.log('🔑 Password: Demo@2026!');
        console.log('🌐 URL: https://clinigo.app/login\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
