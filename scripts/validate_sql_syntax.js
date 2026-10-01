const fs = require('fs');
const path = require('path');
const { parse, parsePlPgSQL, loadModule } = require('libpg-query');

const filesToValidate = [
    'supabase/migrations/20260929120000_tiss_convenios_glosas_repasse.sql',
    'supabase/migrations/20260929130000_tiss_undo_rpc_and_reimport.sql',
    'supabase/migrations/20260929140000_tiss_batch_hash_tracking.sql',
    'supabase/migrations/20260929150000_tiss_premium_foundation.sql',
    'supabase/migrations/20260929160000_tiss_premium_hardening.sql',
    'supabase/migrations/20260929170000_tiss_guide_cancelled_status.sql',
    'supabase/migrations/20260930100000_create_patient_intake_module.sql',
    'supabase/migrations/20260930110000_tiss_premium_p0_extensions.sql',
    'docs/release/00_pre_checagem_duplicatas.sql',
    'docs/release/99_verificar_apos_migrations.sql',
    'docs/release/ligar_flag.sql',
    'docs/release/desligar_flag.sql',
    'scripts/staging/verify-tiss-migrations.sql',
    'scripts/staging/verify-tiss-premium.sql',
];

async function runValidation() {
    console.log('================================================================');
    console.log('VALIDADOR DE SINTAXE POSTGRESQL OFFLINE (libpg-query + PL/pgSQL)');
    console.log('================================================================');

    await loadModule();

    let allPassed = true;
    const summary = [];

    for (const relPath of filesToValidate) {
        const fullPath = path.join(process.cwd(), relPath);
        if (!fs.existsSync(fullPath)) {
            console.error(`[FALHA] Arquivo não encontrado: ${relPath}`);
            allPassed = false;
            summary.push({
                file: relPath,
                total: 0,
                parsed: 0,
                plpgsql: 0,
                ignored: 'N/A (arquivo inexistente)',
                status: 'FALHOU',
            });
            continue;
        }

        const sqlContent = fs.readFileSync(fullPath, 'utf8');

        let parsedStmtsCount = 0;
        let plpgsqlFuncsCount = 0;
        let ignoredCount = 0;
        let parseError = null;
        let plError = null;

        // 1. Parse de todas as instruções SQL via libpg-query (Postgres Parser nativo WASM)
        try {
            const result = await parse(sqlContent);
            parsedStmtsCount = result.stmts ? result.stmts.length : 0;
        } catch (err) {
            parseError = err.message;
            allPassed = false;
        }

        // 2. Parse de todas as funções e blocos procedurais PL/pgSQL
        try {
            const plResult = await parsePlPgSQL(sqlContent);
            plpgsqlFuncsCount = plResult.plpgsql_funcs ? plResult.plpgsql_funcs.length : 0;
        } catch (err) {
            plError = err.message;
            allPassed = false;
        }

        const totalInstructions = parsedStmtsCount;

        if (parseError || plError) {
            console.error(`[FALHA] ${relPath}`);
            if (parseError) console.error(`  Erro de sintaxe SQL: ${parseError}`);
            if (plError) console.error(`  Erro de sintaxe PL/pgSQL: ${plError}`);
            summary.push({
                file: relPath,
                total: totalInstructions,
                parsed: parsedStmtsCount,
                plpgsql: plpgsqlFuncsCount,
                ignored: 'ERRO',
                status: 'FALHOU',
            });
        } else {
            console.log(`[PASSOU] ${relPath}`);
            console.log(`  - Total de instruções SQL: ${totalInstructions}`);
            console.log(`  - Instruções SQL parseadas com sucesso: ${parsedStmtsCount}`);
            console.log(`  - Funções/Blocos PL/pgSQL parseados: ${plpgsqlFuncsCount}`);
            console.log(`  - Instruções ignoradas: ${ignoredCount}`);
            console.log(`  - Status: VÁLIDO`);

            summary.push({
                file: relPath,
                total: totalInstructions,
                parsed: parsedStmtsCount,
                plpgsql: plpgsqlFuncsCount,
                ignored: ignoredCount,
                status: 'VÁLIDO',
            });
        }
    }

    console.log('================================================================');
    console.log('RESUMO CONSOLIDADO POR ARQUIVO:');
    console.log('----------------------------------------------------------------');
    console.log(
        'Arquivo'.padEnd(52) +
        'Total'.padStart(7) +
        'Parse'.padStart(7) +
        'PL/pgSQL'.padStart(10) +
        'Ignoradas'.padStart(11) +
        'Status'.padStart(10)
    );
    console.log('----------------------------------------------------------------');
    for (const item of summary) {
        console.log(
            item.file.padEnd(52) +
            String(item.total).padStart(7) +
            String(item.parsed).padStart(7) +
            String(item.plpgsql).padStart(10) +
            String(item.ignored).padStart(11) +
            item.status.padStart(10)
        );
    }
    console.log('================================================================');

    if (!allPassed) {
        console.error('ERRO: Uma ou mais validações de sintaxe falharam.');
        process.exit(1);
    } else {
        console.log('SUCESSO: Todas as instruções e blocos procedurais foram 100% validados.');
        process.exit(0);
    }
}

runValidation().catch((err) => {
    console.error('Erro fatal no executor de validação:', err);
    process.exit(1);
});
