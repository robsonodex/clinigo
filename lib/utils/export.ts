// lib/utils/export.ts
// CliniGo - Utilitários de exportação CSV/PDF

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
    if (!data.length) {
        console.warn('exportToCSV: No data to export');
        return;
    }

    const headers = Object.keys(data[0]);

    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const val = String(row[h] ?? '');
                // Escape valores com vírgula ou aspas
                return val.includes(',') || val.includes('"')
                    ? `"${val.replace(/"/g, '""')}"`
                    : val;
            }).join(',')
        )
    ].join('\n');

    // BOM para Excel reconhecer UTF-8
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Exporta elemento HTML para PDF
 * Requer html2pdf.js instalado
 */
export async function exportToPDF(elementId: string, filename: string) {
    try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = document.getElementById(elementId);

        if (!element) {
            console.error(`exportToPDF: Element with id "${elementId}" not found`);
            return;
        }

        await html2pdf()
            .set({
                margin: 10,
                filename: `${filename}-${new Date().toISOString().split('T')[0]}.pdf`,
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .from(element)
            .save();
    } catch (error) {
        console.error('exportToPDF error:', error);
        throw new Error('Erro ao exportar PDF. Verifique se html2pdf.js está instalado.');
    }
}

/**
 * Formata dados de relatório para export
 */
export function formatReportData(
    kpis: any,
    revenueByDoctor: any[],
    dateRange: string
): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    // KPIs gerais
    rows.push({
        tipo: 'KPI',
        metrica: 'Receita Total',
        valor: kpis?.total_revenue || 0,
        periodo: dateRange
    });
    rows.push({
        tipo: 'KPI',
        metrica: 'Total Agendamentos',
        valor: kpis?.total_appointments || 0,
        periodo: dateRange
    });
    rows.push({
        tipo: 'KPI',
        metrica: 'Taxa No-Show',
        valor: `${(kpis?.no_show_rate || 0).toFixed(1)}%`,
        periodo: dateRange
    });

    // Receita por médico
    revenueByDoctor.forEach(doc => {
        rows.push({
            tipo: 'Médico',
            metrica: doc.doctor_name,
            valor: doc.total_revenue,
            periodo: `${doc.completed_appointments} consultas`
        });
    });

    return rows;
}
