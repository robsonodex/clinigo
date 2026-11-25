/**
 * Templates HTML/CSS/SVG A4 (794px x 1123px) de Alta Fidelidade Editorial para os 3 PDFs Comerciais CliniGO.
 *
 * Regras absolutas:
 *  - Renderização UTF-8 nativa (zero corrupção de acentos ou setas)
 *  - ZERO símbolo "&" em qualquer texto visível (sempre usar "e")
 *  - Logo oficial redondo em todos os documentos
 *  - Apenas os 3 planos oficiais (Básico R$ 149 | Avançado R$ 249 | Professional R$ 449)
 *  - Dados de paciente 100% fictícios (LGPD)
 */

import {
    COMMERCIAL_SIGNATURE,
    EXTRA_LICENSE_PRICE_BRL,
    OFFICIAL_COMMERCIAL_PLANS,
    TRIAL_FREE_DAYS,
    formatCurrencyBrl,
    formatSpecialtiesList,
    recommendOfficialPlan,
} from './prospect-templates'

export interface PdfPersonalizationInput {
    clinicName: string
    programFocus: string
    specialties: string[]
    contactName?: string
    estimatedProfessionals?: number
    setupFeeBrl?: number
    setupFeeNote?: string
    proposalValidityDays?: number
    customProposalNote?: string
    needsTiss?: boolean
}

export interface RenderedPdfAssets {
    logoSrc: string
    qrDataUrl?: string | null
}

function escapeHtml(value: string): string {
    return (value || '')
        .replace(/&/g, ' e ')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function formatDatePtBr(date: Date): string {
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function slugifyPdfFilePart(value: string): string {
    return (
        (value || 'clinica')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'clinica'
    )
}

interface SpecialtyClinicalSpec {
    name: string
    shortName: string
    council: string
    therapist: string
    tussCode: string
    accentColor: string
    summary: string
    conduct: string
}

function getSpecialtyClinicalSpecs(specialties: string[]): SpecialtyClinicalSpec[] {
    const list = specialties.length > 0 ? specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const catalog: Record<string, SpecialtyClinicalSpec> = {
        fonoaudiologia: {
            name: 'Fonoaudiologia',
            shortName: 'Fonoaudiologia',
            council: 'CRFa 1-00000 (Exemplo Fictício)',
            therapist: 'Dra. Marina Albuquerque',
            tussCode: '50000616',
            accentColor: '#155E4B',
            summary:
                'Evolução mensurável em intenção comunicativa, atenção compartilhada e expansão do repertório de mandos funcionais (+36 pp em 90 dias), com redução consistente de episódios de frustração comunicativa em sala e em casa.',
            conduct:
                'Manutenção de 2 sessões semanais (50 min) com treino de linguagem pragmática, comandos em duas etapas e devolutiva quinzenal à família via CliniGo Família.',
        },
        'terapia ocupacional': {
            name: 'Terapia Ocupacional (Integração Sensorial)',
            shortName: 'Terapia Ocupacional',
            council: 'CREFITO-2 00000-TO (Exemplo Fictício)',
            therapist: 'Dra. Camila Nogueira',
            tussCode: '50000144',
            accentColor: '#1B365D',
            summary:
                'Ganho expressivo em regulação sensorial proprioceptiva e tátil, permanência em mesa terapêutica ampliada de 6 para 19 minutos e maior autonomia em Atividades de Vida Diária (seletividade alimentar e vestuário).',
            conduct:
                'Continuidade de 2 sessões semanais (50 min) com Integração Sensorial de Ayres e coordenação motora fina aplicada à rotina escolar.',
        },
        'psicologia (aba)': {
            name: 'Psicologia — Intervenção Comportamental (ABA)',
            shortName: 'Psicologia (ABA)',
            council: 'CRP 05/00000 (Exemplo Fictício)',
            therapist: 'Dra. Beatriz Lacerda',
            tussCode: '50000470',
            accentColor: '#B45309',
            summary:
                'Redução de 64% na frequência de comportamentos interferentes em ambiente estruturado e aquisição de 11 novos repertórios de imitação motora e pareamento sob ensino naturalístico (NET) e tentativas discretas (DTT).',
            conduct:
                'Continuidade do plano comportamental individualizado com supervisão clínica periódica e registro contínuo das curvas de domínio (critério acima de 80%).',
        },
        psicomotricidade: {
            name: 'Psicomotricidade Relacional',
            shortName: 'Psicomotricidade',
            council: 'ABP 0000 (Exemplo Fictício)',
            therapist: 'Prof. Rafael Monteiro',
            tussCode: '50000560',
            accentColor: '#0F766E',
            summary:
                'Melhora relevante em equilíbrio dinâmico, planejamento motor global (praxia) e percepção espaço-temporal, favorecendo brincadeiras simbólicas e interações em dupla.',
            conduct:
                'Manutenção de 1 sessão semanal integrada à Terapia Ocupacional para consolidação do esquema corporal.',
        },
        'fisioterapia pediátrica': {
            name: 'Fisioterapia Pediátrica',
            shortName: 'Fisioterapia Pediátrica',
            council: 'CREFITO-2 00000-F (Exemplo Fictício)',
            therapist: 'Dr. Henrique Vasconcelos',
            tussCode: '50000160',
            accentColor: '#1E40AF',
            summary:
                'Progresso em estabilidade de tronco, marcha funcional e controle postural nas transições de solo para ortostatismo, sem fadiga precoce.',
            conduct:
                'Continuidade de 2 sessões semanais focadas em fortalecimento funcional e coordenação bilateral.',
        },
        psicopedagogia: {
            name: 'Psicopedagogia Clínica',
            shortName: 'Psicopedagogia',
            council: 'ABPp 0000 (Exemplo Fictício)',
            therapist: 'Profa. Juliana Rezende',
            tussCode: '50000470',
            accentColor: '#6D28D9',
            summary:
                'Avanço em pré-requisitos de alfabetização, consciência fonológica, atenção sustentada e adaptação pedagógica alinhada à escola regular.',
            conduct:
                'Continuidade de 1 sessão semanal com devolutiva mensal à equipe pedagógica escolar.',
        },
        musicoterapia: {
            name: 'Musicoterapia',
            shortName: 'Musicoterapia',
            council: 'UBAM 0000 (Exemplo Fictício)',
            therapist: 'Prof. Lucas Tavares',
            tussCode: '50000470',
            accentColor: '#0369A1',
            summary:
                'Ampliação do tempo de troca de turnos, resposta a estímulos rítmicos e engajamento socioafetivo por meio de experiências sonoro-musicais estruturadas.',
            conduct:
                'Manutenção de 1 sessão semanal integrada aos objetivos comunicativos da Fonoaudiologia.',
        },
        'nutrição comportamental': {
            name: 'Nutrição Comportamental (Seletividade Alimentar)',
            shortName: 'Nutrição Comportamental',
            council: 'CRN-4 00000 (Exemplo Fictício)',
            therapist: 'Dra. Larissa Coutinho',
            tussCode: '50000560',
            accentColor: '#15803D',
            summary:
                'Expansão gradual de aceitação sensorial para 6 novos alimentos em diferentes texturas, com redução de recusa imediata à mesa e orientação à família.',
            conduct:
                'Acompanhamento quinzenal integrado à Terapia Ocupacional para consolidação do repertório alimentar.',
        },
    }

    const palette = ['#155E4B', '#1B365D', '#B45309', '#0F766E']
    return list.map((spec, idx) => {
        const key = spec.trim().toLowerCase()
        if (catalog[key]) return catalog[key]
        const clean = spec.trim()
        return {
            name: clean,
            shortName: clean,
            council: `Registro Profissional 0000${idx + 1} (Exemplo Fictício)`,
            therapist: `Especialista Responsável ${idx + 1}`,
            tussCode: '50000470',
            accentColor: palette[idx % palette.length],
            summary:
                'Evolução clínica documentada ao longo do trimestre, com adesão satisfatória ao protocolo individualizado e consolidação progressiva dos marcos estabelecidos no plano terapêutico.',
            conduct:
                'Manutenção da carga terapêutica semanal com reavaliação padronizada em 90 dias e alinhamento multidisciplinar contínuo.',
        }
    })
}

const FONT_STACK =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function buildPageShell(innerHtml: string, footerLeft: string, pageNum: number, totalPages: number): string {
    return `
<div data-pdf-page="${pageNum}" style="width: 794px; height: 1123px; background: #FFFFFF; color: #0F1F1B; font-family: ${FONT_STACK}; position: relative; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; -webkit-font-smoothing: antialiased;">
  <div style="flex: 1; display: flex; flex-direction: column;">
    ${innerHtml}
  </div>
  <div style="padding: 10px 36px 14px 36px; border-top: 1px solid #E2E8E5; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #5B6B66; background: #FAFBFB;">
    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 610px;">${escapeHtml(footerLeft)}</span>
    <span style="font-weight: 600; color: #155E4B; white-space: nowrap;">Página ${pageNum} de ${totalPages}</span>
  </div>
</div>`
}

function buildPeiCurveSvg(spec1: string, spec2: string): string {
    // Coordenadas dentro de viewBox 380x175
    const xCoords = [44, 146, 248, 350]
    const toY = (pct: number) => 136 - (pct / 100) * 112
    const s1 = [32, 46, 58, 68]
    const s2 = [40, 52, 64, 74]
    const s3 = [45, 54, 62, 71]

    const pathFrom = (pts: number[]) =>
        pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xCoords[i]} ${toY(v).toFixed(1)}`).join(' ')
    const areaFrom = (pts: number[]) =>
        `${pathFrom(pts)} L ${xCoords[3]} 136 L ${xCoords[0]} 136 Z`

    const gridLines = [0, 25, 50, 75, 100]
        .map((pct) => {
            const y = toY(pct).toFixed(1)
            return `
              <line x1="40" y1="${y}" x2="358" y2="${y}" stroke="#E6ECE9" stroke-width="1" />
              <text x="34" y="${Number(y) + 3.5}" text-anchor="end" font-size="9.5" fill="#647570" font-family="${FONT_STACK}">${pct}%</text>`
        })
        .join('')

    const goalY = toY(80).toFixed(1)

    const dots = (pts: number[], color: string, offsetLabelY: number) =>
        pts
            .map(
                (v, i) => `
                <circle cx="${xCoords[i]}" cy="${toY(v).toFixed(1)}" r="4.2" fill="#FFFFFF" stroke="${color}" stroke-width="2.4" />
                ${
                    i === 0 || i === 3
                        ? `<text x="${xCoords[i]}" y="${(toY(v) + offsetLabelY).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${color}" font-family="${FONT_STACK}">${v}%</text>`
                        : ''
                }`
            )
            .join('')

    const xLabels = ['Linha Base', 'Mês 1', 'Mês 2', 'Mês 3']
        .map(
            (lbl, i) =>
                `<text x="${xCoords[i]}" y="153" text-anchor="middle" font-size="9.5" font-weight="600" fill="#52635E" font-family="${FONT_STACK}">${lbl}</text>`
        )
        .join('')

    return `
<svg viewBox="0 0 380 175" width="100%" height="168" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <defs>
    <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#155E4B" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#155E4B" stop-opacity="0.01" />
    </linearGradient>
  </defs>
  ${gridLines}
  <line x1="40" y1="${goalY}" x2="358" y2="${goalY}" stroke="#D97706" stroke-width="1.3" stroke-dasharray="5 4" />
  <rect x="292" y="${Number(goalY) - 13}" width="66" height="14" rx="4" fill="#FEF3C7" />
  <text x="325" y="${Number(goalY) - 3.2}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#B45309" font-family="${FONT_STACK}">Meta 80%</text>
  <path d="${areaFrom(s2)}" fill="url(#areaGreen)" />
  <path d="${pathFrom(s3)}" fill="none" stroke="#E06C4F" stroke-width="2" stroke-dasharray="3 2" />
  <path d="${pathFrom(s1)}" fill="none" stroke="#155E4B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  <path d="${pathFrom(s2)}" fill="none" stroke="#1B365D" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  ${dots(s1, '#155E4B', 14)}
  ${dots(s2, '#1B365D', -8)}
  ${xLabels}
  <g transform="translate(40, 162)">
    <circle cx="5" cy="4" r="3.5" fill="#155E4B" />
    <text x="13" y="7.5" font-size="9" font-weight="600" fill="#0F1F1B" font-family="${FONT_STACK}">${escapeHtml(spec1.slice(0, 18))}</text>
    <circle cx="122" cy="4" r="3.5" fill="#1B365D" />
    <text x="130" y="7.5" font-size="9" font-weight="600" fill="#0F1F1B" font-family="${FONT_STACK}">${escapeHtml(spec2.slice(0, 20))}</text>
    <circle cx="246" cy="4" r="3.5" fill="#E06C4F" />
    <text x="254" y="7.5" font-size="9" font-weight="600" fill="#0F1F1B" font-family="${FONT_STACK}">Autonomia AVDs</text>
  </g>
</svg>`
}

function buildScoreDonutSvg(score = 98): string {
    const r = 24
    const c = 2 * Math.PI * r
    const dash = ((score / 100) * c).toFixed(1)
    return `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="6" />
  <circle cx="32" cy="32" r="${r}" fill="none" stroke="#6EE7B7" stroke-width="6" stroke-dasharray="${dash} ${c.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 32 32)" />
  <text x="32" y="31" text-anchor="middle" font-size="14" font-weight="800" fill="#FFFFFF" font-family="${FONT_STACK}">${score}</text>
  <text x="32" y="42" text-anchor="middle" font-size="7.5" font-weight="600" fill="#A7F3D0" font-family="${FONT_STACK}">DE 100</text>
</svg>`
}

/**
 * PDF 1 — Relatório de Continuidade Multidisciplinar (2 páginas A4 de altíssimo padrão)
 */
export function buildContinuityReportHtml(
    input: PdfPersonalizationInput,
    assets: RenderedPdfAssets
): string {
    const clinicName = (input.clinicName || '').trim() || 'Clínica Modelo Multidisciplinar'
    const programFocus = (input.programFocus || '').trim() || 'Programa de Terapias Seriadas (TEA)'
    const specialties = input.specialties?.length ? input.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const specs = getSpecialtyClinicalSpecs(specialties)
    const visibleCards = specs.slice(0, 4)
    const todayStr = formatDatePtBr(new Date())

    const specialtyPills = specialties
        .map(
            (s) =>
                `<span style="display:inline-block; background:#E6F2EE; color:#114D3E; border:1px solid #C2DFD5; border-radius:999px; padding:2px 9px; font-size:10px; font-weight:600; margin:2px 4px 2px 0;">${escapeHtml(s)}</span>`
        )
        .join('')

    const domainBars = [
        { label: 'Comunicação Funcional', before: 32, after: 68 },
        { label: 'Integração Sensorial', before: 40, after: 74 },
        { label: 'Autonomia em AVDs', before: 45, after: 71 },
        { label: 'Atenção Compartilhada', before: 38, after: 63 },
    ]
        .map((d) => {
            const gain = d.after - d.before
            return `
        <div style="margin-bottom: 11px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:11px; font-weight:700; color:#0F1F1B;">${escapeHtml(d.label)}</span>
            <span style="font-size:10.5px; font-weight:700; color:#155E4B;">${d.before}% para ${d.after}% <span style="background:#E6F2EE; color:#114D3E; padding:1px 6px; border-radius:999px; font-size:9.5px; margin-left:4px;">+${gain} pp</span></span>
          </div>
          <div style="height:10px; background:#E8EEEC; border-radius:999px; overflow:hidden; position:relative;">
            <div style="position:absolute; left:0; top:0; bottom:0; width:${d.after}%; background:#1C7C66; border-radius:999px;"></div>
            <div style="position:absolute; left:0; top:0; bottom:0; width:${d.before}%; background:#1B365D; border-radius:999px;"></div>
          </div>
        </div>`
        })
        .join('')

    const sampleDates = ['04/11', '06/11', '11/11', '13/11', '18/11', '20/11', '25/11', '27/11']
    const attendanceRows = sampleDates
        .map((day, idx) => {
            const spec = specs[idx % specs.length]
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F7FAF9'
            return `
        <tr style="background:${bg};">
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; font-weight:600; color:#0F1F1B;">${day}/2026</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; color:#4B5B56;">${idx % 2 === 0 ? '09:00 - 09:50' : '10:00 - 10:50'}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; font-weight:600; color:#1B365D;">${escapeHtml(spec.shortName)}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; font-family:monospace; color:#4B5B56;">${spec.tussCode}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; color:#0F1F1B;">${escapeHtml(spec.therapist)}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; color:#4B5B56;">${idx % 3 === 0 ? 'QR Code Responsável' : 'Biometria Facial (99,2%)'}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #E6ECE9; text-align:center;"><span style="background:#E6F2EE; color:#114D3E; padding:2px 8px; border-radius:999px; font-size:9.5px; font-weight:700;">Validada</span></td>
        </tr>`
        })
        .join('')

    const page1Inner = `
    <!-- Cabeçalho Escuro Editorial -->
    <div style="background:#0F2922; padding:22px 36px 20px 36px; border-bottom:4px solid #1C7C66; display:flex; align-items:center; justify-content:space-between; gap:16px;">
      <div style="display:flex; align-items:center; gap:16px; min-width:0; flex:1;">
        <img src="${assets.logoSrc}" alt="CliniGO" style="width:64px; height:64px; border-radius:9999px; object-fit:cover; background:#FFFFFF; border:2px solid #FFFFFF; flex-shrink:0;" />
        <div style="min-width:0;">
          <div style="font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#6EE7B7; margin-bottom:4px;">
            DOSSIÊ DE RENOVAÇÃO DE CONVÊNIO · ${escapeHtml(programFocus)}
          </div>
          <div style="font-size:22px; font-weight:800; color:#FFFFFF; line-height:1.15; letter-spacing:-0.3px;">
            ${escapeHtml(clinicName)}
          </div>
          <div style="font-size:11.5px; color:#D1E5DE; margin-top:4px;">
            Relatório Consolidado de Frequência, Evolução PEI/ABA e Condutas Assinadas · Emissão: ${todayStr}
          </div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(110,231,183,0.35); border-radius:12px; padding:8px 12px; display:flex; align-items:center; gap:10px; flex-shrink:0;">
        ${buildScoreDonutSvg(98)}
        <div>
          <div style="font-size:9px; font-weight:700; letter-spacing:0.8px; color:#A7F3D0; text-transform:uppercase;">Score Anti-Glosa</div>
          <div style="font-size:11px; font-weight:700; color:#FFFFFF; margin-top:2px;">Pronto para Auditoria</div>
          <div style="font-size:9px; color:#C4DDD4; margin-top:1px;">Padrão TISS-ANS / RN 539</div>
        </div>
      </div>
    </div>

    <div style="padding:16px 36px 12px 36px; display:flex; flex-direction:column; gap:13px;">
      <!-- Faixa LGPD -->
      <div style="background:#FEF7E6; border:1px solid #F0D290; border-radius:8px; padding:7px 12px; font-size:10px; font-weight:600; color:#8C520E;">
        MODELO DEMONSTRATIVO PERSONALIZADO (LGPD): Paciente, operadora, guias e registros profissionais abaixo são 100% fictícios para validação visual pela coordenação.
      </div>

      <!-- Identificação do Beneficiário -->
      <div style="background:#F6F9F8; border:1px solid #DCE5E1; border-left:4px solid #155E4B; border-radius:10px; padding:12px 16px;">
        <div style="font-size:10px; font-weight:800; letter-spacing:1px; color:#155E4B; text-transform:uppercase; margin-bottom:8px;">
          1. Identificação do Beneficiário e Solicitação de Renovação
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 18px; font-size:11px; color:#1F312C;">
          <div><strong>Paciente (Fictício):</strong> Lucas Henrique M. (6 anos e 4 meses)</div>
          <div><strong>Operadora:</strong> Saúde Exemplo S/A (Plano Especial)</div>
          <div><strong>Diagnóstico / CID-10:</strong> F84.0 — Transtorno do Espectro Autista</div>
          <div><strong>Guia TISS Referência:</strong> 2026-0098412-01 (Ciclo 90d para 180d)</div>
        </div>
        <div style="margin-top:8px; padding-top:7px; border-top:1px solid #E2EAE6; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
          <span style="font-size:10.5px; font-weight:700; color:#1B365D; margin-right:4px;">Especialidades Integradas:</span>
          ${specialtyPills}
        </div>
      </div>

      <!-- 4 KPI Cards -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px;">
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:3px solid #155E4B; border-radius:10px; padding:10px 12px;">
          <div style="font-size:9px; font-weight:700; color:#5B6B66; text-transform:uppercase; letter-spacing:0.6px;">Assiduidade Real</div>
          <div style="font-size:20px; font-weight:800; color:#0F1F1B; margin-top:3px;">95,8%</div>
          <div style="font-size:9.5px; color:#155E4B; font-weight:600;">46 de 48 sessões realizadas</div>
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:3px solid #1B365D; border-radius:10px; padding:10px 12px;">
          <div style="font-size:9px; font-weight:700; color:#5B6B66; text-transform:uppercase; letter-spacing:0.6px;">Prova de Presença</div>
          <div style="font-size:20px; font-weight:800; color:#0F1F1B; margin-top:3px;">100%</div>
          <div style="font-size:9.5px; color:#1B365D; font-weight:600;">Biometria Facial e QR Code</div>
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:3px solid #D97706; border-radius:10px; padding:10px 12px;">
          <div style="font-size:9px; font-weight:700; color:#5B6B66; text-transform:uppercase; letter-spacing:0.6px;">Metas PEI / ABA</div>
          <div style="font-size:20px; font-weight:800; color:#0F1F1B; margin-top:3px;">11 / 12</div>
          <div style="font-size:9.5px; color:#B45309; font-weight:600;">+30 pp de evolução média</div>
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:3px solid #E06C4F; border-radius:10px; padding:10px 12px;">
          <div style="font-size:9px; font-weight:700; color:#5B6B66; text-transform:uppercase; letter-spacing:0.6px;">Equipe Integrada</div>
          <div style="font-size:20px; font-weight:800; color:#0F1F1B; margin-top:3px;">${specs.length} ${specs.length === 1 ? 'Área' : 'Áreas'}</div>
          <div style="font-size:9.5px; color:#5B6B66; font-weight:600;">Assinatura Lei 14.063/2020</div>
        </div>
      </div>

      <!-- Painel Gráfico Duplo (Curva SVG + Barras de Ganho) -->
      <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:12px;">
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-radius:10px; padding:12px 14px;">
          <div style="font-size:10px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:4px;">
            Curva de Evolução Terapêutica (90 Dias)
          </div>
          ${buildPeiCurveSvg(specs[0]?.shortName || 'Fonoaudiologia', (specs[1] || specs[0])?.shortName || 'Terapia Ocupacional')}
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="font-size:10px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:8px;">
            Evolução por Domínio (Linha Base para 90 Dias)
          </div>
          <div>${domainBars}</div>
          <div style="display:flex; gap:12px; font-size:9px; color:#5B6B66; padding-top:6px; border-top:1px solid #EEF2F0;">
            <span><strong style="color:#1B365D;">■</strong> Linha de Base</span>
            <span><strong style="color:#1C7C66;">■</strong> Atingimento Atual (90 dias)</span>
          </div>
        </div>
      </div>

      <!-- Quadro Auditável de Frequência -->
      <div>
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:6px;">
          2. Extrato Auditável de Frequência e Prova de Presença (Amostra do Trimestre)
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10px; border:1px solid #DCE5E1; border-radius:8px; overflow:hidden;">
          <thead>
            <tr style="background:#0F2922; color:#FFFFFF; text-align:left;">
              <th style="padding:7px 8px;">Data</th>
              <th style="padding:7px 8px;">Horário</th>
              <th style="padding:7px 8px;">Especialidade</th>
              <th style="padding:7px 8px;">TUSS</th>
              <th style="padding:7px 8px;">Profissional</th>
              <th style="padding:7px 8px;">Prova de Presença</th>
              <th style="padding:7px 8px; text-align:center;">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRows}
          </tbody>
        </table>
      </div>
    </div>`

    const specialtyCardsHtml = visibleCards
        .map(
            (spec, idx) => `
      <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-left:4px solid ${spec.accentColor}; border-radius:10px; overflow:hidden;">
        <div style="background:#F5F8F7; padding:9px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E6ECE9;">
          <div>
            <span style="font-size:12px; font-weight:800; color:#0F1F1B;">${idx + 1}. ${escapeHtml(spec.name)}</span>
            <span style="font-size:10px; font-family:monospace; color:#5B6B66; margin-left:8px;">TUSS ${spec.tussCode}</span>
          </div>
          <div style="font-size:10px; font-weight:600; color:#4B5B56;">${escapeHtml(spec.therapist)} · ${escapeHtml(spec.council)}</div>
        </div>
        <div style="padding:10px 14px; font-size:11px; line-height:1.5; color:#1E2E29;">
          <div style="margin-bottom:6px;"><strong>Evolução clínica no período:</strong> ${escapeHtml(spec.summary)}</div>
          <div style="color:#4B5B56;"><strong>Conduta recomendada:</strong> ${escapeHtml(spec.conduct)}</div>
        </div>
        <div style="padding:6px 14px; background:#FAFBFB; border-top:1px solid #EEF2F0; font-size:9.5px; font-weight:700; color:#155E4B; display:flex; justify-content:space-between;">
          <span>Assinado eletronicamente (Lei 14.063/2020) em ${todayStr}</span>
          <span style="font-family:monospace; color:#5B6B66;">SHA-256: 9f4e8b...c18${idx + 2}a</span>
        </div>
      </div>`
        )
        .join('')

    const qrBlock = assets.qrDataUrl
        ? `<img src="${assets.qrDataUrl}" alt="QR Validação" style="width:76px; height:76px; border-radius:6px; border:1px solid #C2DFD5; background:#FFFFFF; padding:3px;" />`
        : `<div style="width:76px; height:76px; border-radius:6px; border:1px solid #C2DFD5; background:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#155E4B; text-align:center;">SELO<br/>DIGITAL</div>`

    const page2Inner = `
    <!-- Sub-cabeçalho Página 2 -->
    <div style="background:#0F2922; padding:14px 36px; border-bottom:3px solid #1C7C66; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${assets.logoSrc}" alt="CliniGO" style="width:36px; height:36px; border-radius:9999px; object-fit:cover; background:#FFFFFF; border:1.5px solid #FFFFFF;" />
        <div>
          <div style="font-size:13px; font-weight:800; color:#FFFFFF;">${escapeHtml(clinicName)} — ${escapeHtml(programFocus)}</div>
          <div style="font-size:10px; color:#A7F3D0;">Síntese Clínica Multidisciplinar com Assinatura Eletrônica</div>
        </div>
      </div>
      <div style="font-size:10px; color:#D1E5DE; font-weight:600;">Protocolo RC-${new Date().getFullYear()}-04819</div>
    </div>

    <div style="padding:18px 36px 14px 36px; display:flex; flex-direction:column; gap:12px; flex:1; justify-content:space-between;">
      <div style="display:flex; flex-direction:column; gap:11px;">
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase;">
          3. Evoluções Clínicas Consolidadas por Especialidade
        </div>
        ${specialtyCardsHtml}
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <!-- Parecer de Continuidade + QR Code Real -->
        <div style="background:#EBF5F1; border:1.5px solid #1C7C66; border-radius:10px; padding:14px 16px; display:flex; align-items:center; gap:16px;">
          <div style="flex:1;">
            <div style="font-size:10.5px; font-weight:800; letter-spacing:0.7px; color:#114D3E; text-transform:uppercase; margin-bottom:6px;">
              4. Parecer Multidisciplinar e Justificativa de Continuidade (RN 539/2022 ANS)
            </div>
            <div style="font-size:11px; line-height:1.55; color:#0F1F1B;">
              Diante da assiduidade comprovada de <strong>95,8%</strong> (registro biométrico e carimbo de data/hora), evolução média de <strong>+30 pontos percentuais</strong> nas metas do PEI (${escapeHtml(formatSpecialtiesList(specialties))}) e evoluções assinadas por conselho, a equipe multidisciplinar da <strong>${escapeHtml(clinicName)}</strong> recomenda a renovação integral do ciclo terapêutico por 180 dias, evitando regressão funcional por descontinuidade de vínculo.
            </div>
          </div>
          <div style="text-align:center; flex-shrink:0;">
            ${qrBlock}
            <div style="font-size:8.5px; font-weight:700; color:#114D3E; margin-top:4px; letter-spacing:0.4px;">INTEGRIDADE DIGITAL</div>
          </div>
        </div>

        <!-- Faixa Institucional CliniGO -->
        <div style="background:#1B365D; border-radius:10px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:14px; color:#FFFFFF;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${assets.logoSrc}" alt="CliniGO" style="width:44px; height:44px; border-radius:9999px; object-fit:cover; background:#FFFFFF; border:2px solid #FFFFFF; flex-shrink:0;" />
            <div>
              <div style="font-size:12.5px; font-weight:800; color:#FFFFFF;">Este dossiê sai pronto em 1 clique dentro do CliniGO</div>
              <div style="font-size:10.5px; color:#D4E1F2; margin-top:2px;">
                Agenda recorrente, biometria facial, curvas PEI/ABA, evoluções assinadas e lote XML TISS-ANS no mesmo sistema.
              </div>
              <div style="font-size:10px; font-weight:700; color:#6EE7B7; margin-top:4px;">
                ${escapeHtml(COMMERCIAL_SIGNATURE.name)} · ${escapeHtml(COMMERCIAL_SIGNATURE.role)} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.website}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`

    const footerText = `Exemplo demonstrativo CliniGO (clinigo.app) personalizado para ${clinicName} · Dados 100% fictícios (LGPD)`
    return `${buildPageShell(page1Inner, footerText, 1, 2)}${buildPageShell(page2Inner, footerText, 2, 2)}`
}

/**
 * PDF 2 — Apresentação Executiva CliniGO (1 página A4 visual de alto impacto)
 */
export function buildExecutivePresentationHtml(
    input: PdfPersonalizationInput,
    assets: RenderedPdfAssets
): string {
    const clinicName = (input.clinicName || '').trim() || 'Sua Clínica'
    const programFocus = (input.programFocus || '').trim() || 'Terapias Multidisciplinares'
    const specialties = input.specialties?.length ? input.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const specialtiesText = formatSpecialtiesList(specialties)
    const todayStr = formatDatePtBr(new Date())

    const flowSteps = [
        { n: '01', t: 'Agenda e Co-terapia', d: 'Séries semanais e reposições' },
        { n: '02', t: 'Biometria Facial', d: 'Prova auditável de presença' },
        { n: '03', t: 'Evolução e PEI', d: 'Sigilo por conselho' },
        { n: '04', t: 'Dossiê 1 Clique', d: 'Renovação de convênio' },
        { n: '05', t: 'TISS e Repasse', d: 'XML ANS e folha automática' },
    ]
        .map(
            (st, idx) => `
      <div style="display:flex; align-items:center; flex:1; gap:6px;">
        <div style="flex:1; background:#F4F9F7; border:1px solid #C6E0D6; border-radius:10px; padding:10px 8px; text-align:center;">
          <div style="width:24px; height:24px; border-radius:9999px; background:#155E4B; color:#FFFFFF; font-size:10px; font-weight:800; line-height:24px; margin:0 auto 6px auto;">${st.n}</div>
          <div style="font-size:10.5px; font-weight:800; color:#0F1F1B; line-height:1.2;">${st.t}</div>
          <div style="font-size:9px; color:#52635E; margin-top:3px; line-height:1.25;">${st.d}</div>
        </div>
        ${idx < 4 ? `<div style="font-size:14px; font-weight:800; color:#1C7C66; flex-shrink:0;">&#9656;</div>` : ''}
      </div>`
        )
        .join('')

    const comparisonRows = [
        [
            'Renovação de Convênio',
            'Coordenação pede textos por WhatsApp, junta PDFs soltos e confere frequência na planilha.',
            'PDF único pronto em 1 clique: frequência biométrica, curvas PEI/ABA e evoluções assinadas.',
        ],
        [
            'Glosas e Faturamento TISS',
            'Erros de guia ou carteirinha só aparecem 45 dias depois, sem provas organizadas para recurso.',
            'Escudo Anti-Glosa antes do XML ANS (ISO-8859-1) e dossiê de contestação pronto em 1 clique.',
        ],
        [
            'Repasse aos Terapeutas',
            'Fechamento manual em Excel sujeito a erros e divergências sobre sessões não evoluídas.',
            'Sessão evoluída e assinada libera automaticamente o repasse com transparência e sigilo RBAC.',
        ],
        [
            'Relação com as Famílias',
            'Pais cobram retorno no WhatsApp pessoal da equipe; baixa visibilidade do progresso clínico.',
            'CliniGo Família (sem instalar app): boletim acolhedor e atividades em casa ligadas ao prontuário.',
        ],
        [
            'Adoção pela Equipe',
            'Precisa parar a agenda inteira para treinamentos longos que novos colaboradores perdem.',
            'Guia de Uso passo a passo dentro de cada tela e CliniGo Academy por perfil de função.',
        ],
    ]
        .map(
            ([topic, before, after]) => `
      <tr>
        <td style="padding:8px 10px; border-bottom:1px solid #E2EAE6; font-weight:800; color:#1B365D; background:#F6F8F7; width:21%;">${topic}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #E2EAE6; color:#7F2A2A; background:#FEF5F5; width:38%;">${before}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #E2EAE6; color:#114D3E; background:#EFF8F4; font-weight:600; width:41%;">${after}</td>
      </tr>`
        )
        .join('')

    const planCards = OFFICIAL_COMMERCIAL_PLANS.map((plan) => {
        const isPro = plan.id === 'PROFESSIONAL'
        const desc =
            plan.id === 'BASICO'
                ? 'Agenda recorrente, Prontuário, QR Code e Teleconsulta'
                : plan.id === 'AVANCADO'
                  ? 'Tudo do Básico, BI de Terapia, DRE e Folha de Repasse'
                  : 'Tudo do Avançado, XML TISS-ANS, Glosas e Biometria Facial'
        return `
      <div style="background:${isPro ? '#EBF6F1' : '#FFFFFF'}; border:${isPro ? '2px solid #155E4B' : '1px solid #DCE5E1'}; border-radius:10px; padding:12px 14px; position:relative;">
        ${isPro ? `<span style="position:absolute; top:10px; right:10px; background:#155E4B; color:#FFFFFF; font-size:8.5px; font-weight:800; padding:2px 7px; border-radius:999px; letter-spacing:0.4px;">TISS E BIOMETRIA</span>` : ''}
        <div style="font-size:12px; font-weight:800; color:#1B365D;">${escapeHtml(plan.name)}</div>
        <div style="font-size:20px; font-weight:800; color:#155E4B; margin:4px 0 2px 0;">${escapeHtml(plan.priceFormatted)}</div>
        <div style="font-size:10.5px; font-weight:700; color:#0F1F1B; margin-bottom:5px;">${escapeHtml(plan.licensesLabel)}</div>
        <div style="font-size:9.5px; color:#52635E; line-height:1.35;">${desc}</div>
      </div>`
    }).join('')

    const pageInner = `
    <!-- Hero Executivo -->
    <div style="background:#0F2922; padding:24px 36px 22px 36px; border-bottom:4px solid #1C7C66; display:flex; align-items:center; gap:18px;">
      <img src="${assets.logoSrc}" alt="CliniGO" style="width:72px; height:72px; border-radius:9999px; object-fit:cover; background:#FFFFFF; border:2.5px solid #FFFFFF; flex-shrink:0;" />
      <div style="flex:1; min-width:0;">
        <div style="font-size:10px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:#6EE7B7; margin-bottom:5px;">
          APRESENTAÇÃO EXECUTIVA · PREPARADA PARA ${escapeHtml(clinicName)} (${escapeHtml(programFocus)})
        </div>
        <div style="font-size:21px; font-weight:800; color:#FFFFFF; line-height:1.18; letter-spacing:-0.3px;">
          Menos retrabalho na coordenação. Receita blindada contra glosas.
        </div>
        <div style="font-size:11px; color:#D4E7E0; margin-top:6px; line-height:1.45;">
          Plataforma única feita sob medida para clínicas de <strong>${escapeHtml(specialtiesText)}</strong>: da agenda recorrente ao relatório de renovação em 1 clique, XML TISS-ANS e folha de repasse.
        </div>
      </div>
    </div>

    <div style="padding:18px 36px 14px 36px; display:flex; flex-direction:column; gap:15px; flex:1; justify-content:space-between;">
      <!-- 3 Números de Impacto -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;">
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:4px solid #155E4B; border-radius:10px; padding:13px 14px;">
          <div style="font-size:24px; font-weight:800; color:#155E4B; letter-spacing:-0.5px;">-6h / sem</div>
          <div style="font-size:11.5px; font-weight:800; color:#0F1F1B; margin-top:4px;">Salvas pela coordenação</div>
          <div style="font-size:10px; color:#52635E; margin-top:3px; line-height:1.4;">Sem montar relatórios de convênio na mão nem cobrar evoluções soltas da equipe.</div>
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:4px solid #1B365D; border-radius:10px; padding:13px 14px;">
          <div style="font-size:24px; font-weight:800; color:#1B365D; letter-spacing:-0.5px;">1 clique</div>
          <div style="font-size:11.5px; font-weight:800; color:#0F1F1B; margin-top:4px;">Relatório e Dossiê Anti-Glosa</div>
          <div style="font-size:10px; color:#52635E; margin-top:3px; line-height:1.4;">Presença biométrica, curvas PEI/ABA e evoluções assinadas unificadas no mesmo PDF.</div>
        </div>
        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:4px solid #E06C4F; border-radius:10px; padding:13px 14px;">
          <div style="font-size:24px; font-weight:800; color:#C2410C; letter-spacing:-0.5px;">100% TISS</div>
          <div style="font-size:11.5px; font-weight:800; color:#0F1F1B; margin-top:4px;">XML ANS e Repasse Integrado</div>
          <div style="font-size:10px; color:#52635E; margin-top:3px; line-height:1.4;">Lotes XML validados, gestão de glosas em 3 níveis e folha automática dos terapeutas.</div>
        </div>
      </div>

      <!-- Fluxo Único em 5 Passos -->
      <div>
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:8px;">
          Fluxo único conectado de ponta a ponta na ${escapeHtml(clinicName)}
        </div>
        <div style="display:flex; align-items:stretch; gap:4px;">
          ${flowSteps}
        </div>
      </div>

      <!-- Tabela Antes vs Depois -->
      <div>
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:7px;">
          O que muda na prática já na primeira semana
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10.3px; line-height:1.4; border:1px solid #DCE5E1; border-radius:8px; overflow:hidden;">
          <thead>
            <tr style="background:#0F2922; color:#FFFFFF; text-align:left;">
              <th style="padding:8px 10px;">Rotina Crítica</th>
              <th style="padding:8px 10px;">Sem CliniGO (Planilhas e Retrabalho)</th>
              <th style="padding:8px 10px;">Com o CliniGO na Clínica</th>
            </tr>
          </thead>
          <tbody>
            ${comparisonRows}
          </tbody>
        </table>
      </div>

      <!-- Planos Oficiais -->
      <div>
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:7px;">
          Planos Transparentes · 1 Unidade Operacional · 7 Dias de Teste Gratuito
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">
          ${planCards}
        </div>
      </div>

      <!-- CTA Direto -->
      <div style="background:#1B365D; border-radius:10px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; color:#FFFFFF;">
        <div>
          <div style="font-size:13.5px; font-weight:800;">Experimente na rotina da ${escapeHtml(clinicName)} por 7 dias grátis</div>
          <div style="font-size:10.5px; color:#D4E1F2; margin-top:3px;">
            Teste sem compromisso no ritmo da equipe usando o Guia de Uso integrado em cada tela. Responda o e-mail ou chame no WhatsApp:
          </div>
          <div style="font-size:10.5px; font-weight:700; color:#6EE7B7; margin-top:5px;">
            ${escapeHtml(COMMERCIAL_SIGNATURE.name)} · ${escapeHtml(COMMERCIAL_SIGNATURE.role)} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}/trial
          </div>
        </div>
      </div>
    </div>`

    return buildPageShell(
        pageInner,
        `CliniGO — Apresentação Executiva para ${clinicName} · Emitida em ${todayStr} · Licença extra R$ 49,90/mês · Conformidade LGPD`,
        1,
        1
    )
}

/**
 * PDF 3 — Proposta Comercial Estratégica (1 página A4 com Simulador Visual de ROI + Timeline 7 Dias + Tabela Oficial)
 */
export function buildCommercialProposalHtml(
    input: PdfPersonalizationInput,
    assets: RenderedPdfAssets
): string {
    const clinicName = (input.clinicName || '').trim() || 'Clínica Parceira'
    const programFocus = (input.programFocus || '').trim() || 'Atendimento Multidisciplinar'
    const contactName = (input.contactName || '').trim() || 'Diretoria e Coordenação'
    const estimatedProfessionals = Math.max(1, Number(input.estimatedProfessionals) || 8)
    const needsTiss = input.needsTiss !== false
    const validityDays = Math.max(1, Number(input.proposalValidityDays) || 15)
    const setupFeeBrl = Math.max(0, Number(input.setupFeeBrl) || 0)
    const setupFeeNote = (input.setupFeeNote || '').trim()
    const customNote = (input.customProposalNote || '').trim()

    const recommendation = recommendOfficialPlan(estimatedProfessionals, needsTiss)
    const today = new Date()
    const validUntil = new Date(today)
    validUntil.setDate(validUntil.getDate() + validityDays)

    const estimatedSessionsMonth = estimatedProfessionals * 65
    const estimatedGlosaSavedBrl = Math.max(950, Math.round(estimatedSessionsMonth * 0.03 * 95))
    const roiMultiple = (estimatedGlosaSavedBrl / recommendation.monthlyTotal).toFixed(1)
    const investBarPct = Math.max(18, Math.min(48, Math.round((recommendation.monthlyTotal / estimatedGlosaSavedBrl) * 100)))

    const setupLabel =
        setupFeeBrl > 0
            ? `Taxa única de implantação: ${formatCurrencyBrl(setupFeeBrl)}${setupFeeNote ? ` (${setupFeeNote})` : ''}`
            : `Taxa de implantação: ${setupFeeNote || 'Isenta na condição comercial desta proposta'} · Avaliação inicial: ${TRIAL_FREE_DAYS} dias grátis`

    const tableRows = [
        ['Licenças de profissionais incluídas', '1 licença', 'Até 5 licenças', 'Até 30 licenças'],
        ['Unidade operacional por assinatura', '1 unidade', '1 unidade', '1 unidade'],
        ['Licença adicional avulsa', 'R$ 49,90/mês', 'R$ 49,90/mês', 'R$ 49,90/mês'],
        ['Agenda recorrente e atendimentos', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
        ['Prontuário por especialidade e PEI/ABA', 'Incluído', 'Incluído', 'Incluído'],
        ['Teleconsulta WebRTC e Check-in QR Code', 'Incluído', 'Incluído', 'Incluído'],
        ['Guia de Uso integrado e CliniGo Academy', 'Incluído', 'Incluído', 'Incluído'],
        ['BI de Terapia e conformidade de evoluções', '—', 'Incluído', 'Incluído'],
        ['Folha de repasse com sigilo RBAC e DRE', '—', 'Incluído', 'Incluído'],
        ['WhatsApp por setores, CRM e Importação Excel', '—', 'Incluído', 'Incluído'],
        ['Faturamento TISS completo e lotes XML ANS', '—', '—', 'Incluído'],
        ['Gestão de Glosas 3 níveis e Dossiê 1 Clique', '—', '—', 'Incluído'],
        ['Check-in Biométrico Facial, Totem e TV', '—', '—', 'Incluído'],
        ['API, webhooks e SLA 99,5%', '—', '—', 'Incluído'],
    ]
        .map(
            ([feat, b, a, p], idx) => `
      <tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F8FAF9'};">
        <td style="padding:5.5px 10px; border-bottom:1px solid #E5ECE8; font-weight:600; color:#0F1F1B;">${feat}</td>
        <td style="padding:5.5px 8px; border-bottom:1px solid #E5ECE8; text-align:center; color:#4B5B56;">${b}</td>
        <td style="padding:5.5px 8px; border-bottom:1px solid #E5ECE8; text-align:center; color:#4B5B56;">${a}</td>
        <td style="padding:5.5px 8px; border-bottom:1px solid #E5ECE8; text-align:center; font-weight:700; color:#114D3E; background:#EDF7F3;">${p}</td>
      </tr>`
        )
        .join('')

    const timelineHtml = [
        { day: 'DIA 1', title: 'Setup e Importação', desc: 'Pacientes e equipe via Excel' },
        { day: 'DIAS 2 e 3', title: 'Agenda e Recepção', desc: 'Séries semanais e Check-in' },
        { day: 'DIAS 4 e 5', title: 'Equipe Clínica', desc: 'Guia Integrado e Academy' },
        { day: 'DIAS 6 e 7', title: 'Relatório e TISS', desc: 'Validação real sem custo' },
    ]
        .map(
            (s) => `
      <div style="text-align:center; position:relative; z-index:1;">
        <div style="display:inline-block; background:#155E4B; color:#FFFFFF; font-size:9px; font-weight:800; padding:3px 10px; border-radius:999px; letter-spacing:0.5px;">${s.day}</div>
        <div style="font-size:10.5px; font-weight:800; color:#0F1F1B; margin-top:6px;">${s.title}</div>
        <div style="font-size:9.5px; color:#52635E; margin-top:2px;">${s.desc}</div>
      </div>`
        )
        .join('')

    const pageInner = `
    <!-- Cabeçalho Proposta -->
    <div style="background:#1B365D; padding:22px 36px 20px 36px; border-bottom:4px solid #1C7C66; display:flex; align-items:center; gap:18px;">
      <img src="${assets.logoSrc}" alt="CliniGO" style="width:66px; height:66px; border-radius:9999px; object-fit:cover; background:#FFFFFF; border:2px solid #FFFFFF; flex-shrink:0;" />
      <div style="flex:1; min-width:0;">
        <div style="font-size:10px; font-weight:800; letter-spacing:1.3px; text-transform:uppercase; color:#6EE7B7; margin-bottom:4px;">
          PROPOSTA COMERCIAL PERSONALIZADA · VALIDADE ${validityDays} DIAS
        </div>
        <div style="font-size:21px; font-weight:800; color:#FFFFFF; line-height:1.15;">
          ${escapeHtml(clinicName)} (${escapeHtml(programFocus)})
        </div>
        <div style="font-size:11px; color:#D4E1F2; margin-top:5px;">
          A/C: <strong>${escapeHtml(contactName)}</strong> · Emissão: ${formatDatePtBr(today)} · Válida até: ${formatDatePtBr(validUntil)}
        </div>
      </div>
    </div>

    <div style="padding:16px 36px 14px 36px; display:flex; flex-direction:column; gap:13px; flex:1; justify-content:space-between;">
      <!-- Bloco Duplo: Plano Recomendado + Simulador Visual ROI -->
      <div style="display:grid; grid-template-columns:1.25fr 0.95fr; gap:12px;">
        <div style="background:#EBF6F1; border:1.5px solid #155E4B; border-radius:10px; padding:14px 16px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-size:9.5px; font-weight:800; letter-spacing:0.8px; color:#155E4B; text-transform:uppercase;">
              Configuração Recomendada (${estimatedProfessionals} Profissionais)
            </div>
            <div style="font-size:19px; font-weight:800; color:#1B365D; margin:4px 0 6px 0;">
              ${escapeHtml(recommendation.plan.name)} — ${escapeHtml(recommendation.monthlyTotalFormatted)}/mês
            </div>
            <div style="font-size:10.5px; color:#1E2E29; line-height:1.45;">
              ${escapeHtml(recommendation.rationale)}
            </div>
          </div>
          <div style="margin-top:8px; padding-top:7px; border-top:1px solid #C2DFD5; font-size:10px; font-weight:700; color:#114D3E;">
            ${escapeHtml(setupLabel)}
          </div>
        </div>

        <div style="background:#FFFFFF; border:1px solid #DCE5E1; border-top:3.5px solid #1B365D; border-radius:10px; padding:13px 15px; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="font-size:9.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase;">
            Retorno Estimado (ROI Anti-Glosa)
          </div>
          <div style="margin:8px 0;">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#4B5B56; margin-bottom:4px;">
              <span>Investimento CliniGO</span>
              <strong>${escapeHtml(recommendation.monthlyTotalFormatted)}/mês</strong>
            </div>
            <div style="height:10px; background:#E8EEEC; border-radius:999px; overflow:hidden; margin-bottom:10px;">
              <div style="height:100%; width:${investBarPct}%; background:#1B365D; border-radius:999px;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#155E4B; font-weight:700; margin-bottom:4px;">
              <span>Receita protegida estimada</span>
              <span>~${escapeHtml(formatCurrencyBrl(estimatedGlosaSavedBrl))}/mês</span>
            </div>
            <div style="height:10px; background:#E8EEEC; border-radius:999px; overflow:hidden;">
              <div style="height:100%; width:94%; background:#1C7C66; border-radius:999px;"></div>
            </div>
          </div>
          <div style="background:#F2F8F5; border-radius:6px; padding:5px 8px; font-size:10px; font-weight:800; color:#114D3E; text-align:center;">
            Potencial de retorno de ${roiMultiple}x o valor mensal
          </div>
        </div>
      </div>

      <!-- Tabela Oficial dos 3 Planos -->
      <div>
        <div style="font-size:10.5px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:6px;">
          Tabela Oficial de Planos e Capacidades
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10px; border:1px solid #DCE5E1; border-radius:8px; overflow:hidden;">
          <thead>
            <tr style="background:#0F2922; color:#FFFFFF;">
              <th style="padding:7px 10px; text-align:left; width:46%;">Recurso / Capacidade</th>
              <th style="padding:7px 8px; text-align:center;">Básico<br/><span style="font-weight:500; color:#A7F3D0;">R$ 149/mês</span></th>
              <th style="padding:7px 8px; text-align:center;">Avançado<br/><span style="font-weight:500; color:#A7F3D0;">R$ 249/mês</span></th>
              <th style="padding:7px 8px; text-align:center; background:#155E4B;">Professional<br/><span style="font-weight:600; color:#FFFFFF;">R$ 449/mês</span></th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- Timeline de Implantação Autônoma em 7 Dias -->
      <div style="background:#F7FAF9; border:1px solid #DCE5E1; border-radius:10px; padding:12px 16px;">
        <div style="font-size:10px; font-weight:800; letter-spacing:0.8px; color:#1B365D; text-transform:uppercase; margin-bottom:10px;">
          Implantação Rápida e Autônoma em 7 Dias (Sem Parar a Agenda da Clínica)
        </div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; position:relative;">
          <div style="position:absolute; top:11px; left:12%; right:12%; height:2px; background:#BBDCD0; z-index:0;"></div>
          ${timelineHtml}
        </div>
      </div>

      <!-- Condições Comerciais + CTA -->
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#F6F8F7; border:1px solid #E2E8E5; border-radius:8px; padding:9px 14px; font-size:9.8px; color:#33453F; line-height:1.5;">
          <div>• Avaliação gratuita de <strong>${TRIAL_FREE_DAYS} dias sem compromisso</strong> · 1 unidade operacional por assinatura · Licença extra avulsa: <strong>${escapeHtml(formatCurrencyBrl(EXTRA_LICENSE_PRICE_BRL))}/mês</strong>.</div>
          <div>• Capacitação 100% autônoma pelo <strong>Guia de Uso Integrado e CliniGo Academy</strong> · Conformidade LGPD, isolamento RLS e assinatura eletrônica (Lei 14.063/2020).</div>
          ${customNote ? `<div style="color:#114D3E; font-weight:700; margin-top:2px;">• Condição especial: ${escapeHtml(customNote)}</div>` : ''}
        </div>

        <div style="background:#155E4B; border-radius:10px; padding:14px 18px; color:#FFFFFF;">
          <div style="font-size:13px; font-weight:800;">PRÓXIMO PASSO: ATIVAR OS 7 DIAS GRÁTIS DA ${escapeHtml(clinicName.toUpperCase())}</div>
          <div style="font-size:10.5px; color:#D4EDE4; margin-top:3px;">
            Responda este e-mail ou envie uma mensagem no WhatsApp para liberarmos o acesso da clínica hoje mesmo:
          </div>
          <div style="font-size:10.5px; font-weight:700; color:#FFFFFF; margin-top:5px;">
            ${escapeHtml(COMMERCIAL_SIGNATURE.name)} · ${escapeHtml(COMMERCIAL_SIGNATURE.role)} · ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}
          </div>
        </div>
      </div>
    </div>`

    return buildPageShell(
        pageInner,
        `Proposta Comercial CliniGO — ${clinicName} · Válida até ${formatDatePtBr(validUntil)} · clinigo.app`,
        1,
        1
    )
}
