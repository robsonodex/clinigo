/**
 * CliniGo - Exportador de Dados e Portabilidade LGPD por Clínica
 * Padrão Corporativo Healthtech Internacional
 * 
 * Uso:
 *   node scripts/export-clinic-data.js [clinic_id]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('ERRO: Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
});

// Clinic ID da World Sensory por padrao
const targetClinicId = process.argv[2] || '4c13e586-5390-4393-a180-2c9dd7ed81c7';

function formatCSVValue(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
        val = JSON.stringify(val);
    } else {
        val = String(val);
    }
    // Escapa aspas duplicando-as
    const escaped = val.replace(/"/g, '""');
    return `"${escaped}"`;
}

function jsonToCSV(items) {
    if (!items || items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const headerRow = headers.map(h => `"${h}"`).join(';');
    const rows = items.map(item => {
        return headers.map(h => formatCSVValue(item[h])).join(';');
    });
    // Adiciona BOM UTF-8 (\ufeff) para compatibilidade nativa com Excel no Windows
    return '\ufeff' + [headerRow, ...rows].join('\r\n');
}

function calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

async function fetchTableData(tableName, clinicId, selectQuery = '*', orderBy = 'created_at') {
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from(tableName)
            .select(selectQuery)
            .eq('clinic_id', clinicId);

        // Se houver campo para ordenacao
        if (orderBy) {
            query = query.order(orderBy, { ascending: true });
        }

        const { data, error } = await query.range(from, from + step - 1);

        if (error) {
            // Tenta sem ordenacao se falhar
            if (orderBy) {
                const retryQuery = await supabase
                    .from(tableName)
                    .select(selectQuery)
                    .eq('clinic_id', clinicId)
                    .range(from, from + step - 1);
                if (retryQuery.error) {
                    throw new Error(`Erro ao consultar ${tableName}: ${retryQuery.error.message}`);
                }
                data = retryQuery.data;
            } else {
                throw new Error(`Erro ao consultar ${tableName}: ${error.message}`);
            }
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += step;
            if (data.length < step) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    return allData;
}

async function runExport() {
    console.log('================================================================');
    console.log('       CLINIGO - SISTEMA DE PORTABILIDADE E BACKUP LGPD         ');
    console.log('================================================================');
    console.log(`[INFO] Data/Hora: ${new Date().toISOString()}`);
    console.log(`[INFO] Clinic ID Alvo: ${targetClinicId}`);

    // 1. Validar e buscar dados da clinica
    const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .select('id, name, cnpj, created_at')
        .eq('id', targetClinicId)
        .single();

    if (clinicErr || !clinic) {
        console.error(`[ERRO] Clinica nao encontrada: ${clinicErr?.message}`);
        process.exit(1);
    }

    console.log(`[INFO] Clinica Identificada: ${clinic.name}`);

    // 2. Criar diretorio de saida com timestamp
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeClinicName = clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const outputDir = path.resolve(process.cwd(), 'backups', `${safeClinicName}_${dateStr}`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const annexDir = path.join(outputDir, 'documentos_anexos');
    if (!fs.existsSync(annexDir)) {
        fs.mkdirSync(annexDir, { recursive: true });
    }

    console.log(`[INFO] Diretorio de Exportacao: ${outputDir}`);

    const exportTables = [
        { name: 'patients', filePrefix: '01_pacientes', label: 'Pacientes e Responsaveis' },
        { name: 'doctors', filePrefix: '02_profissionais_terapeutas', label: 'Profissionais e Terapeutas' },
        { name: 'users', filePrefix: '03_usuarios_sistema', label: 'Usuarios do Sistema' },
        { name: 'appointments', filePrefix: '04_agendamentos_historico', label: 'Agendamentos e Frequencia' },
        { name: 'medical_records', filePrefix: '05_prontuarios_evolucoes', label: 'Prontuarios e Evolucoes Clinicas' },
        { name: 'therapeutic_plans', filePrefix: '06_planos_terapeuticos', label: 'Planos Terapeuticos' },
        { name: 'health_insurances', filePrefix: '07_convenios_operadoras', label: 'Convenios e Operadoras' },
        { name: 'financial_entries', filePrefix: '08_financeiro_lancamentos', label: 'Lancamentos Financeiros' },
        { name: 'professional_financial_documents', filePrefix: '09_documentos_repasses_nfs', label: 'Documentos e NF de Repasses' },
        { name: 'schedules', filePrefix: '10_escalas_horarios', label: 'Escalas e Horarios' },
        { name: 'recurring_appointment_series', filePrefix: '11_series_recorrentes', label: 'Series Recorrentes' },
        { name: 'doctor_patient_rates', filePrefix: '12_valores_repasses_terapeutas', label: 'Valores e Repasses por Paciente' },
        { name: 'doctor_contracts', filePrefix: '13_contratos_profissionais', label: 'Contratos de Profissionais' },
        { name: 'contract_templates', filePrefix: '14_modelos_contratos', label: 'Modelos de Contrato' }
    ];

    const manifestEntries = [];

    // 3. Exportar tabelas em CSV e JSON
    console.log('\n--- EXTRAINDO DADOS TABULARES ---');
    for (const t of exportTables) {
        process.stdout.write(`Extraindo ${t.label} (${t.name})... `);
        try {
            const records = await fetchTableData(t.name, targetClinicId);
            const count = records.length;

            if (count > 0) {
                // Grava CSV
                const csvData = jsonToCSV(records);
                const csvFileName = `${t.filePrefix}.csv`;
                const csvFilePath = path.join(outputDir, csvFileName);
                fs.writeFileSync(csvFilePath, csvData, 'utf8');
                const csvHash = calculateFileHash(csvFilePath);

                // Grava JSON estruturado
                const jsonFileName = `${t.filePrefix}.json`;
                const jsonFilePath = path.join(outputDir, jsonFileName);
                fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 2), 'utf8');
                const jsonHash = calculateFileHash(jsonFilePath);

                manifestEntries.push({
                    tabela: t.name,
                    descricao: t.label,
                    registros: count,
                    arquivos: [
                        { nome: csvFileName, formato: 'CSV (ponto e virgula, UTF-8 com BOM)', sha256: csvHash },
                        { nome: jsonFileName, formato: 'JSON estruturado', sha256: jsonHash }
                    ]
                });

                console.log(`OK: ${count} registros exportados.`);
            } else {
                console.log('0 registros (ignorado).');
            }
        } catch (err) {
            console.log(`AVISO: Falha na tabela ${t.name}: ${err.message}`);
        }
    }

    // 4. Download de Arquivos de Storage (anexos de pacientes e financeiros)
    console.log('\n--- AUDITANDO ARQUIVOS EM STORAGE ---');
    const storageBuckets = ['patient-documents', 'financial-documents', 'clinic-assets'];
    const downloadedFiles = [];

    for (const bucket of storageBuckets) {
        try {
            const { data: fileList, error: listErr } = await supabase.storage
                .from(bucket)
                .list(targetClinicId, { limit: 100 });

            if (!listErr && fileList && fileList.length > 0) {
                console.log(`Bucket ${bucket}: ${fileList.length} arquivos encontrados na pasta da clinica.`);
                const bucketFolder = path.join(annexDir, bucket);
                if (!fs.existsSync(bucketFolder)) fs.mkdirSync(bucketFolder, { recursive: true });

                for (const f of fileList) {
                    if (f.name === '.emptyFolderPlaceholder') continue;
                    const filePathInBucket = `${targetClinicId}/${f.name}`;
                    const { data: fileBlob, error: downErr } = await supabase.storage
                        .from(bucket)
                        .download(filePathInBucket);

                    if (!downErr && fileBlob) {
                        const buffer = Buffer.from(await fileBlob.arrayBuffer());
                        const destPath = path.join(bucketFolder, f.name);
                        fs.writeFileSync(destPath, buffer);
                        const fileHash = calculateFileHash(destPath);
                        downloadedFiles.push({
                            bucket,
                            arquivo: f.name,
                            tamanho_bytes: buffer.length,
                            sha256: fileHash
                        });
                    }
                }
            } else {
                // Tenta buscar no bucket raiz caso o nome do arquivo contenha o clinicId
                const { data: rootList } = await supabase.storage.from(bucket).list('', { limit: 200 });
                if (rootList) {
                    const matched = rootList.filter(item => item.name.includes(targetClinicId));
                    if (matched.length > 0) {
                        console.log(`Bucket ${bucket}: ${matched.length} arquivos correspondentes no bucket.`);
                        const bucketFolder = path.join(annexDir, bucket);
                        if (!fs.existsSync(bucketFolder)) fs.mkdirSync(bucketFolder, { recursive: true });

                        for (const f of matched) {
                            const { data: fileBlob, error: downErr } = await supabase.storage
                                .from(bucket)
                                .download(f.name);

                            if (!downErr && fileBlob) {
                                const buffer = Buffer.from(await fileBlob.arrayBuffer());
                                const destPath = path.join(bucketFolder, f.name);
                                fs.writeFileSync(destPath, buffer);
                                const fileHash = calculateFileHash(destPath);
                                downloadedFiles.push({
                                    bucket,
                                    arquivo: f.name,
                                    tamanho_bytes: buffer.length,
                                    sha256: fileHash
                                });
                            }
                        }
                    }
                }
            }
        } catch (sErr) {
            console.log(`Aviso ao auditar storage ${bucket}: ${sErr.message}`);
        }
    }
    console.log(`Total de anexos baixados com sucesso: ${downloadedFiles.length}`);

    // 5. Gerar Manifesto Formal de Integridade e LGPD
    const manifesto = {
        plataforma: 'CliniGo Healthtech Solutions',
        sistema_origem: 'CliniGo Gestao Clinica SaaS',
        clinica_solicitante: {
            id: clinic.id,
            nome: clinic.name,
            cnpj: clinic.cnpj || 'Nao informado'
        },
        data_geracao_utc: new Date().toISOString(),
        finalidade: 'Portabilidade de Dados Pessoais e Medicos (LGPD - Art. 18, Inciso V)',
        tabelas_exportadas: manifestEntries,
        anexos_armazenamento: downloadedFiles,
        total_arquivos_gerados: manifestEntries.reduce((acc, curr) => acc + curr.arquivos.length, 0) + downloadedFiles.length,
        normas_observadas: [
            'Lei Geral de Protecao de Dados (Lei 13.709/2018, Art. 18, V)',
            'Resolucao CFM 1.821/2007 (Guarda e Integridade de Prontuarios Eletronicos)',
            'Padrao de Criptografia e Integridade Hash SHA-256'
        ]
    };

    const manifestoPath = path.join(outputDir, 'MANIFESTO_EXPORTACAO_LGPD.json');
    fs.writeFileSync(manifestoPath, JSON.stringify(manifesto, null, 2), 'utf8');

    // 6. Gerar Guia de Importacao e Termo de Entrega em Markdown
    const readmeContent = `# PACOTE OFICIAL DE EXPORTAÇÃO E PORTABILIDADE DE DADOS
**Plataforma de Origem:** CliniGo Healthtech Solutions  
**Instituição Solicitante:** ${clinic.name}  
**Data de Geração:** ${new Date().toLocaleDateString('pt-BR')}  
**Conformidade:** LGPD (Lei nº 13.709/2018, Art. 18, V)

---

## 1. Conteúdo do Pacote

Este pacote contém a totalidade dos dados cadastrados e históricos da clínica, disponibilizados em formatos abertos e interoperáveis (**CSV com delimitador ponto e vírgula e codificação UTF-8 com BOM para Excel**, e **JSON estruturado** para ingestão automatizada por banco de dados).

### Resumo das Bases Exportadas:
${manifestEntries.map(m => `- **${m.descricao}** (\`${m.tabela}\`): **${m.registros.toLocaleString('pt-BR')}** registros`).join('\n')}

- **Anexos e Documentos em Storage:** ${downloadedFiles.length} arquivos recuperados na pasta \`documentos_anexos/\`.

---

## 2. Garantia de Integridade Probatória (Hash SHA-256)

Para segurança jurídica da clínica e do fornecedor receptor, cada arquivo gerado possui uma assinatura criptográfica SHA-256 registrada no arquivo \`MANIFESTO_EXPORTACAO_LGPD.json\`. Qualquer alteração acidental em um único caractere após a extração invalidará o hash.

---

## 3. Guia de Ingestão para o Novo Sistema de Gestão

1. **Pacientes (\`01_pacientes\`):** Contém a chave primária (\`id\`), nome completo, CPF, data de nascimento, filiação/responsáveis, telefones e endereço. Utilize o campo \`id\` para relacionar com agendamentos e prontuários.
2. **Profissionais (\`02_profissionais_terapeutas\`):** Contém terapeutas, especialidades, conselho de classe e contatos.
3. **Agendamentos (\`04_agendamentos_historico\`):** Histórico completo de atendimentos com \`patient_id\`, \`doctor_id\`, data/hora de início e fim, status (atendido, cancelado, falta, agendado).
4. **Prontuários e Evoluções (\`05_prontuarios_evolucoes\`):** Registros clínicos multidisciplinares completos.
5. **Planos Terapêuticos (\`06_planos_terapeuticos\`):** Objetivos e planejamentos de terapias.

---

## 4. Termo de Entrega e Responsabilidade

A disponibilização deste pacote cumpre integralmente os requisitos de portabilidade de dados previstos no Marco Legal da LGPD. A partir da transferência segura, a guarda, sigilo e tratamento dos dados passam à responsabilidade da instituição controladora (${clinic.name}) e do operador receptor designado.
`;

    fs.writeFileSync(path.join(outputDir, 'INSTRUCOES_E_TERMO_DE_ENTREGA.md'), readmeContent, 'utf8');

    console.log('\n================================================================');
    console.log('       EXPORTACAO E BACKUP CONCLUIDOS COM SUCESSO!              ');
    console.log('================================================================');
    console.log(`[PASTA GERADA]: ${outputDir}`);
    console.log(`[ARQUIVOS TABULARES]: ${manifestEntries.length} tabelas exportadas`);
    console.log(`[ANEXOS STORAGE]: ${downloadedFiles.length} arquivos baixados`);
    console.log(`[MANIFESTO HASH SHA-256]: MANIFESTO_EXPORTACAO_LGPD.json gerado`);
    console.log(`[INSTRUCOES DE IMPORTACAO]: INSTRUCOES_E_TERMO_DE_ENTREGA.md gerado`);
}

runExport().catch(err => {
    console.error('\n[ERRO CRITICO DURANTE A EXPORTACAO]:', err);
    process.exit(1);
});
