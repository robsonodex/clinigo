import ExcelJS from 'exceljs';

export async function generatePatientTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Aba 1: Dados
    const dataSheet = workbook.addWorksheet('Dados');
    dataSheet.columns = [
        { header: 'Nome Completo*', key: 'full_name', width: 30 },
        { header: 'CPF*', key: 'cpf', width: 15 },
        { header: 'Data de Nascimento* (DD/MM/AAAA)', key: 'date_of_birth', width: 25 },
        { header: 'Telefone*', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Sexo (M/F/Outro)', key: 'gender', width: 18 },
        { header: 'CEP', key: 'cep', width: 12 },
        { header: 'Endereço', key: 'street', width: 35 },
        { header: 'Número', key: 'number', width: 10 },
        { header: 'Complemento', key: 'complement', width: 20 },
        { header: 'Bairro', key: 'neighborhood', width: 25 },
        { header: 'Cidade', key: 'city', width: 25 },
        { header: 'Estado (UF)', key: 'state', width: 12 },
        { header: 'Convênio', key: 'insurance_name', width: 25 },
        { header: 'Número da Carteirinha', key: 'insurance_card', width: 25 }
    ];

    // Linhas de exemplo
    dataSheet.addRow({
        full_name: 'Maria da Silva Santos',
        cpf: '123.456.789-00',
        date_of_birth: '15/03/1985',
        phone: '(11) 98765-4321',
        email: 'maria.silva@email.com',
        gender: 'F',
        cep: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Apto 101',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        insurance_name: 'Unimed',
        insurance_card: '123456789012345'
    });

    // Estilizar cabeçalho
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Aba 2: Instruções
    const instructionsSheet = workbook.addWorksheet('Instruções');
    instructionsSheet.columns = [
        { header: 'Campo', key: 'field', width: 30 },
        { header: 'Descrição', key: 'description', width: 60 },
        { header: 'Obrigatório', key: 'required', width: 15 }
    ];

    const instructions = [
        { field: 'Nome Completo', description: 'Nome completo do paciente sem abreviações', required: 'Sim' },
        { field: 'CPF', description: 'CPF com ou sem formatação', required: 'Sim' },
        { field: 'Data de Nascimento', description: 'Formato DD/MM/AAAA. Exemplo: 15/03/1985', required: 'Sim' },
        { field: 'Telefone', description: 'Com DDD. Ex: (11) 99999-9999', required: 'Sim' },
        { field: 'Email', description: 'Email válido', required: 'Não' },
    ];

    instructions.forEach(inst => instructionsSheet.addRow(inst));

    // Aba 3: Validações
    const validationsSheet = workbook.addWorksheet('Validações');
    validationsSheet.getCell('A1').value = 'REGRAS DE VALIDAÇÃO';
    validationsSheet.getCell('A1').font = { bold: true, size: 14 };

    validationsSheet.getCell('A3').value = '✓ CPF deve ter 11 dígitos válidos';
    validationsSheet.getCell('A4').value = '✓ Data de nascimento não pode ser futura';
    validationsSheet.getCell('A5').value = '✓ Telefone deve ter DDD válido';

    return await (workbook.xlsx.writeBuffer() as Promise<Buffer>);
}

export async function generateDoctorTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet('Dados');
    dataSheet.columns = [
        { header: 'Nome Completo*', key: 'full_name', width: 30 },
        { header: 'CRM*', key: 'crm', width: 15 },
        { header: 'Estado CRM* (UF)', key: 'crm_state', width: 10 },
        { header: 'Especialidade*', key: 'specialty', width: 25 },
        { header: 'Valor Consulta', key: 'consultation_price', width: 15 },
        { header: 'Biografia', key: 'bio', width: 40 }
    ];
    dataSheet.addRow({ full_name: 'Dr. João Silva', crm: '123456', crm_state: 'SP', specialty: 'Cardiologia', consultation_price: '350.00', bio: 'Especialista em coração' });
    dataSheet.getRow(1).font = { bold: true };
    return await (workbook.xlsx.writeBuffer() as Promise<Buffer>);
}

export async function generateInsuranceTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet('Dados');
    dataSheet.columns = [
        { header: 'Nome*', key: 'name', width: 30 },
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Telefone Contato', key: 'contact_phone', width: 20 },
        { header: 'Email Contato', key: 'contact_email', width: 30 }
    ];
    dataSheet.addRow({ name: 'Unimed', code: '001', contact_phone: '0800-123456', contact_email: 'contato@unimed.com.br' });
    dataSheet.getRow(1).font = { bold: true };
    return await (workbook.xlsx.writeBuffer() as Promise<Buffer>);
}

export async function generateFinancialTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet('Dados');
    dataSheet.columns = [
        { header: 'Data* (DD/MM/AAAA)', key: 'date', width: 20 },
        { header: 'Tipo* (RECEITA/DESPESA)', key: 'type', width: 20 },
        { header: 'Categoria*', key: 'category', width: 20 },
        { header: 'Valor*', key: 'amount', width: 15 },
        { header: 'Descrição', key: 'description', width: 30 },
        { header: 'Método Pagamento', key: 'payment_method', width: 20 },
        { header: 'Status', key: 'status', width: 15 }
    ];
    dataSheet.addRow({ date: '15/01/2024', type: 'RECEITA', category: 'Consulta', amount: '350.00', description: 'Consulta Dr. João', payment_method: 'Cartão de Crédito', status: 'pago' });
    dataSheet.getRow(1).font = { bold: true };
    return await (workbook.xlsx.writeBuffer() as Promise<Buffer>);
}
