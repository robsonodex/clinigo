const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Modelo de Importação');
    
    ws.columns = [
        { header: 'Nome do Paciente *', key: 'patient_name', width: 25 },
        { header: 'Responsável', key: 'responsible_name', width: 25 },
        { header: 'Telefone', key: 'patient_phone', width: 18 },
        { header: 'E-mail', key: 'patient_email', width: 25 },
        { header: 'Turno Preferido (Qualquer/Manhã/Tarde/Noite)', key: 'preferred_shift', width: 40 },
        { header: 'Terapias (Separadas por vírgula)', key: 'therapy_type', width: 30 },
        { header: 'Observação Comercial', key: 'commercial_notes', width: 40 },
    ];
    
    ws.addRow({
        patient_name: 'João da Silva',
        responsible_name: 'Maria da Silva',
        patient_phone: '11999999999',
        patient_email: 'joao@email.com',
        preferred_shift: 'Tarde',
        therapy_type: 'Fonoaudiologia, Terapia Ocupacional',
        commercial_notes: 'Criança de 5 anos, aguardando avaliação diagnóstica.'
    });
    
    ws.addRow({
        patient_name: 'Pedro Santos',
        responsible_name: 'Carlos Santos',
        patient_phone: '11988888888',
        patient_email: 'pedro@email.com',
        preferred_shift: 'Qualquer',
        therapy_type: 'Psicologia',
        commercial_notes: 'Encaminhamento escolar para psicoterapia.'
    });
    
    // Estilizar cabeçalho
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0D9488' } // Teal 600
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    
    const outputPath = path.join(__dirname, '..', 'public', 'modelo_importacao_fila.xlsx');
    await wb.xlsx.writeFile(outputPath);
    console.log('✅ Planilha modelo criada em:', outputPath);
}

main().catch(console.error);
