import ExcelJS from 'exceljs';

export async function parseExcelFile(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Dados') || workbook.worksheets[0];
    const rows: any[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            if (Array.isArray(row.values)) {
                row.values.forEach((cell: any) => {
                    if (cell) headers.push(String(cell));
                });
            }
            return;
        }

        const rowData: Record<string, any> = {};
        const values = row.values as any[];

        // ExcelJS row.values is 1-based, index 0 is empty usually? No, it's sparse array.
        // But typically row.getCell(i) matches column key if defined.
        // Let's iterate columns instead to be safe if keys are defined, or use headers map.

        // Simple approach: Map headers by index
        // Note: ExcelJS 'values' property: if columns have keys, it returns object. If not, array.
        // Since we created it with keys in our generator, but here we read potentially ANY file...
        // Let's assume the user uses our template or simple tabular data.

        // Better strategy for reading: iterate columns based on header row.

        worksheet.columns.forEach((col, index) => {
            // This relies on worksheet.columns being populated which might not happen on load unless we use getCell
        });

        // Standard robust way
        const rowValues = row.values; // Array [ <empty>, 'Value1', 'Value2' ] because ExcelJS is 1-indexed

        // We need to map the header column index to this row's value
        // Headers were collected from row 1.
        // ExcelJS row.values[1] is the value of the first column.

        // Let's reconstruct the headers from row 1 cells explicitly

        if (rowNumber > 1) {
            // Re-read headers from row 1 to be sure? No, done above.

            // Map to keys we expect (simple normalization)
            // For now, just return raw dict with header names as keys to be processed by validator
            const rowObj: any = {};

            // Headers array is 0-indexed. But row.getCell(i+1).value is the data.
            const headerRow = worksheet.getRow(1);

            headerRow.eachCell((cell, colNumber) => {
                const headerVal = String(cell.value);
                const cellVal = row.getCell(colNumber).text; // .text gives formatted value, .value gives raw
                // Use keys from our generator if possible? 
                // We will map "Nome Completo*" -> "full_name" in the importer/validator logic or strict mapping.
                // For now, let's just return key-value pairs where key is the column header.
                rowObj[headerVal] = cellVal;

                // Also try to map to internal keys if it matches our template headers
                if (headerVal.includes('Nome Completo')) rowObj['full_name'] = cellVal;
                if (headerVal.includes('CPF')) rowObj['cpf'] = cellVal;
                if (headerVal.includes('Data de Nascimento')) rowObj['date_of_birth'] = cellVal;
                if (headerVal.includes('Telefone')) rowObj['phone'] = cellVal;
                if (headerVal.includes('Email')) rowObj['email'] = cellVal;
                if (headerVal.includes('Sexo')) rowObj['gender'] = cellVal;
                if (headerVal.includes('CEP')) rowObj['cep'] = cellVal;
                if (headerVal.includes('Endereço')) rowObj['street'] = cellVal;
                if (headerVal.includes('Número')) rowObj['number'] = cellVal;
                if (headerVal.includes('Complemento')) rowObj['complement'] = cellVal;
                if (headerVal.includes('Bairro')) rowObj['neighborhood'] = cellVal;
                if (headerVal.includes('Cidade')) rowObj['city'] = cellVal;
                if (headerVal.includes('Estado')) rowObj['state'] = cellVal;
                if (headerVal.includes('Convênio')) rowObj['insurance_name'] = cellVal;
                if (headerVal.includes('Carteirinha')) rowObj['insurance_card'] = cellVal;

                // Doctor mappings
                if (headerVal.includes('CRM') && !headerVal.includes('Estado')) rowObj['crm'] = cellVal;
                if (headerVal.includes('Estado CRM')) rowObj['crm_state'] = cellVal;
                if (headerVal.includes('Especialidade')) rowObj['specialty'] = cellVal;
                if (headerVal.includes('Valor Consulta')) rowObj['consultation_price'] = cellVal;
                if (headerVal.includes('Biografia')) rowObj['bio'] = cellVal;

                // Financial mappings
                if (headerVal.includes('Data') && !headerVal.includes('Nascimento')) rowObj['date'] = cellVal;
                if (headerVal.includes('Tipo')) rowObj['type'] = cellVal;
                if (headerVal.includes('Categoria')) rowObj['category'] = cellVal;
                if (headerVal.includes('Valor') && !headerVal.includes('Consulta')) rowObj['amount'] = cellVal;
                if (headerVal.includes('Descrição')) rowObj['description'] = cellVal;
            });

            rows.push(rowObj);
        }
    });

    return { rows, headers };
}
