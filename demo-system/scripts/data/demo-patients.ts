/**
 * Demo Patients Data
 * 15 patients with realistic Brazilian data
 */

import { DEMO_CLINIC_ID } from './demo-users';

export interface DemoPatient {
    id: string;
    cpf: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: 'M' | 'F';
    address: {
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
        zipCode: string;
    };
    healthInsurance?: {
        id: string;
        name: string;
        cardNumber: string;
    };
    bloodType?: string;
    allergies?: string;
}

export const DEMO_PATIENTS: DemoPatient[] = [
    {
        id: 'de000003-0000-0000-0000-000000000001',
        cpf: '111.111.111-11',
        fullName: 'Maria Silva Santos',
        email: 'maria.santos@demo.clinigo.internal',
        phone: '(11) 91111-1111',
        dateOfBirth: '1985-03-15',
        gender: 'F',
        address: {
            street: 'Rua das Flores',
            number: '100',
            neighborhood: 'Jardim Paulista',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000001',
            name: 'Unimed',
            cardNumber: '1234567890'
        },
        bloodType: 'A+',
        allergies: 'Dipirona'
    },
    {
        id: 'de000003-0000-0000-0000-000000000002',
        cpf: '222.222.222-22',
        fullName: 'João Pedro Oliveira',
        email: 'joao.oliveira@demo.clinigo.internal',
        phone: '(11) 92222-2222',
        dateOfBirth: '1990-07-22',
        gender: 'M',
        address: {
            street: 'Av. Brasil',
            number: '200',
            complement: 'Apto 45',
            neighborhood: 'Consolação',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01311-100'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000002',
            name: 'Bradesco Saúde',
            cardNumber: '2345678901'
        },
        bloodType: 'O+',
        allergies: null
    },
    {
        id: 'de000003-0000-0000-0000-000000000003',
        cpf: '333.333.333-33',
        fullName: 'Ana Carolina Ferreira',
        email: 'ana.ferreira@demo.clinigo.internal',
        phone: '(11) 93333-3333',
        dateOfBirth: '1978-11-05',
        gender: 'F',
        address: {
            street: 'Rua Augusta',
            number: '300',
            neighborhood: 'Cerqueira César',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01305-000'
        },
        bloodType: 'B-'
    },
    {
        id: 'de000003-0000-0000-0000-000000000004',
        cpf: '444.444.444-44',
        fullName: 'Carlos Eduardo Lima',
        email: 'carlos.lima@demo.clinigo.internal',
        phone: '(11) 94444-4444',
        dateOfBirth: '1995-01-18',
        gender: 'M',
        address: {
            street: 'Rua Oscar Freire',
            number: '400',
            neighborhood: 'Pinheiros',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01426-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000003',
            name: 'SulAmérica',
            cardNumber: '4567890123'
        },
        bloodType: 'AB+'
    },
    {
        id: 'de000003-0000-0000-0000-000000000005',
        cpf: '555.555.555-55',
        fullName: 'Beatriz Almeida Costa',
        email: 'beatriz.costa@demo.clinigo.internal',
        phone: '(11) 95555-5555',
        dateOfBirth: '2010-09-30',
        gender: 'F',
        address: {
            street: 'Alameda Santos',
            number: '500',
            neighborhood: 'Paraíso',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01419-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000004',
            name: 'Amil',
            cardNumber: '5678901234'
        },
        bloodType: 'A-'
    },
    {
        id: 'de000003-0000-0000-0000-000000000006',
        cpf: '666.666.666-66',
        fullName: 'Roberto Mendes Silva',
        email: 'roberto.silva@demo.clinigo.internal',
        phone: '(11) 96666-6666',
        dateOfBirth: '1982-04-12',
        gender: 'M',
        address: {
            street: 'Rua Haddock Lobo',
            number: '600',
            neighborhood: 'Cerqueira César',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01414-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000001',
            name: 'Unimed',
            cardNumber: '6789012345'
        },
        bloodType: 'O-'
    },
    {
        id: 'de000003-0000-0000-0000-000000000007',
        cpf: '777.777.777-77',
        fullName: 'Fernanda Rodrigues',
        email: 'fernanda.rodrigues@demo.clinigo.internal',
        phone: '(11) 97777-7777',
        dateOfBirth: '1988-08-25',
        gender: 'F',
        address: {
            street: 'Av. Paulista',
            number: '700',
            complement: 'Sala 710',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100'
        },
        bloodType: 'B+',
        allergies: 'Penicilina, Frutos do mar'
    },
    {
        id: 'de000003-0000-0000-0000-000000000008',
        cpf: '888.888.888-88',
        fullName: 'Lucas Pereira Santos',
        email: 'lucas.santos@demo.clinigo.internal',
        phone: '(11) 98888-8888',
        dateOfBirth: '1999-02-14',
        gender: 'M',
        address: {
            street: 'Rua Pamplona',
            number: '800',
            neighborhood: 'Jardins',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01405-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000002',
            name: 'Bradesco Saúde',
            cardNumber: '8901234567'
        }
    },
    {
        id: 'de000003-0000-0000-0000-000000000009',
        cpf: '999.999.999-99',
        fullName: 'Patricia Nascimento',
        email: 'patricia.nascimento@demo.clinigo.internal',
        phone: '(11) 99999-9999',
        dateOfBirth: '1975-06-08',
        gender: 'F',
        address: {
            street: 'Av. Rebouças',
            number: '900',
            neighborhood: 'Pinheiros',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '05401-000'
        },
        bloodType: 'A+',
        allergies: 'Lactose'
    },
    {
        id: 'de000003-0000-0000-0000-000000000010',
        cpf: '101.010.101-01',
        fullName: 'Marcos Antônio Vieira',
        email: 'marcos.vieira@demo.clinigo.internal',
        phone: '(11) 91010-1010',
        dateOfBirth: '1970-12-01',
        gender: 'M',
        address: {
            street: 'Rua Estados Unidos',
            number: '1000',
            neighborhood: 'Jardim América',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01427-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000003',
            name: 'SulAmérica',
            cardNumber: '1011121314'
        },
        bloodType: 'AB-'
    },
    {
        id: 'de000003-0000-0000-0000-000000000011',
        cpf: '121.212.121-21',
        fullName: 'Juliana Martins',
        email: 'juliana.martins@demo.clinigo.internal',
        phone: '(11) 91212-1212',
        dateOfBirth: '1992-05-20',
        gender: 'F',
        address: {
            street: 'Rua Bela Cintra',
            number: '1100',
            neighborhood: 'Consolação',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01415-000'
        },
        bloodType: 'O+'
    },
    {
        id: 'de000003-0000-0000-0000-000000000012',
        cpf: '131.313.131-31',
        fullName: 'André Souza Costa',
        email: 'andre.costa@demo.clinigo.internal',
        phone: '(11) 91313-1313',
        dateOfBirth: '1987-09-10',
        gender: 'M',
        address: {
            street: 'Alameda Lorena',
            number: '1200',
            neighborhood: 'Jardins',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01424-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000004',
            name: 'Amil',
            cardNumber: '1314151617'
        },
        bloodType: 'B+'
    },
    {
        id: 'de000003-0000-0000-0000-000000000013',
        cpf: '141.414.141-41',
        fullName: 'Camila Ribeiro',
        email: 'camila.ribeiro@demo.clinigo.internal',
        phone: '(11) 91414-1414',
        dateOfBirth: '2005-03-28',
        gender: 'F',
        address: {
            street: 'Rua Sampaio Vidal',
            number: '1300',
            neighborhood: 'Jardim Paulistano',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01443-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000001',
            name: 'Unimed',
            cardNumber: '1415161718'
        },
        bloodType: 'A+'
    },
    {
        id: 'de000003-0000-0000-0000-000000000014',
        cpf: '151.515.151-51',
        fullName: 'Eduardo Fernandes',
        email: 'eduardo.fernandes@demo.clinigo.internal',
        phone: '(11) 91515-1515',
        dateOfBirth: '1980-11-15',
        gender: 'M',
        address: {
            street: 'Rua Groenlândia',
            number: '1400',
            neighborhood: 'Jardim América',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01434-000'
        },
        bloodType: 'O-',
        allergies: 'Aspirina'
    },
    {
        id: 'de000003-0000-0000-0000-000000000015',
        cpf: '161.616.161-61',
        fullName: 'Renata Lima Oliveira',
        email: 'renata.oliveira@demo.clinigo.internal',
        phone: '(11) 91616-1616',
        dateOfBirth: '1993-07-07',
        gender: 'F',
        address: {
            street: 'Av. Cidade Jardim',
            number: '1500',
            complement: 'Apto 152',
            neighborhood: 'Itaim Bibi',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01453-000'
        },
        healthInsurance: {
            id: 'de000001-0000-0000-0000-000000000002',
            name: 'Bradesco Saúde',
            cardNumber: '1617181920'
        },
        bloodType: 'AB+'
    }
];

export { DEMO_CLINIC_ID };
