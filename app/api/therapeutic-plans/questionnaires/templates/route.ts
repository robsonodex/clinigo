import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Templates padrão embutidos no sistema para ABA e Terapias do Desenvolvimento
export const DEFAULT_QUESTIONNAIRE_TEMPLATES = [
    {
        id: 'default-aba-attempts',
        title: 'Registro de Tentativas ABA (Antecedente / Resposta / Dica / Resultado)',
        category: 'aba_attempts',
        description: 'Folha de registro de treinos estruturados ABA com registro de antecedente, resposta alvo, esvanecimento de dicas e acerto/erro.',
        is_default: true,
        structure: {
            columns: [
                { key: 'antecedent', label: 'Antecedente / Estímulo', type: 'text', placeholder: 'Ex: 3- o que é isso' },
                { key: 'target_response', label: 'Resposta', type: 'text', placeholder: 'Ex: Borracha, Sofá...' },
                { 
                    key: 'prompt_type', 
                    label: 'Dica (Prompt)', 
                    type: 'select', 
                    options: ['I (Sem Dica)', 'AFT (Física Total)', 'AFL (Física Leve)', 'AG (Gestual)', 'AV (Verbal)', 'M (Modelagem)'] 
                },
                { 
                    key: 'result', 
                    label: 'Resultado (R)', 
                    type: 'result_badge', 
                    options: [
                        { value: '+', label: '+ (Acerto sem dica)', color: 'emerald' },
                        { value: 'd+', label: 'd+ (Acerto com dica)', color: 'blue' },
                        { value: 'd-', label: 'd- (Erro com dica)', color: 'amber' },
                        { value: '-', label: '- (Erro sem dica)', color: 'red' }
                    ]
                }
            ],
            legend: {
                title: 'Legenda e Esvanecimento de Dicas',
                items: [
                    { symbol: 'R', description: 'Resposta observada' },
                    { symbol: 'd +', description: 'Acerto com dica' },
                    { symbol: 'd -', description: 'Erro com dica' },
                    { symbol: '+', description: 'Acerto sem dica (Independente)' },
                    { symbol: '-', description: 'Erro sem dica' },
                    { symbol: 'Física', description: 'AFT > AFL > AG > I' }
                ]
            },
            defaultRowsCount: 8
        }
    },
    {
        id: 'default-baseline',
        title: 'Folha de Registro — Linha de Base (1ªT, 2ªT, 3ªT)',
        category: 'baseline',
        description: 'Coleta de linha de base inicial sem dicas para avaliar repertório de entrada e critérios de aquisição.',
        is_default: true,
        structure: {
            columns: [
                { key: 'stimulus', label: 'Estímulos / Alvos', type: 'text', placeholder: 'Ex: Nomear cores, Imitação com objetos...' },
                { key: 'date', label: 'Data', type: 'date' },
                { key: 't1', label: '1ª Tentativa (1ªT)', type: 'trial_score', options: ['+', '-'] },
                { key: 't2', label: '2ª Tentativa (2ªT)', type: 'trial_score', options: ['+', '-'] },
                { key: 't3', label: '3ª Tentativa (3ªT)', type: 'trial_score', options: ['+', '-'] }
            ],
            acquisitionCriteria: {
                acquired: '03 acertos sem dicas ou 02 acertos sem dicas',
                notAcquired: '03 erros sem dicas ou 02 erros sem dicas'
            },
            legend: {
                title: 'Legenda da Linha de Base',
                items: [
                    { symbol: '1ªT / 2ªT / 3ªT', description: 'Tentativas 1, 2 e 3 sem dicas' },
                    { symbol: '+', description: 'Acerto' },
                    { symbol: '-', description: 'Erro' }
                ]
            },
            defaultRowsCount: 10
        }
    },
    {
        id: 'default-naturalistic',
        title: 'Folha de Registro — Ensino Naturalista / Incidental',
        category: 'naturalistic',
        description: 'Registro de treinos aplicados em contextos naturalistas (mando, troca de turno, autorregulação, atenção compartilhada).',
        is_default: true,
        structure: {
            columns: [
                { key: 'date', label: 'Data', type: 'date' },
                { key: 'response', label: 'Resposta / Comportamento Alvo', type: 'text', placeholder: 'Ex: Pediu água espontaneamente...' },
                { key: 'prompted_trials', label: 'Tentativas (c/ dica)', type: 'number', placeholder: '0' },
                { key: 'independent_trials', label: 'Tentativas Indep.', type: 'number', placeholder: '0' },
                { key: 'accuracy_percentage', label: '% Acertos', type: 'percentage_calc' }
            ],
            suggestedPrograms: [
                'Mando (Pedidos)',
                'Troca de Turno',
                'Autorregulação',
                'Atenção Compartilhada',
                'Seguimento de Instruções Naturais'
            ],
            defaultRowsCount: 8
        }
    }
]

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Busca templates salvos no banco da clínica
        let dbTemplates: any[] = []
        try {
            const { data, error } = await (supabase as any)
                .from('therapeutic_plan_questionnaire_templates')
                .select('*')
                .eq('clinic_id', profile.clinic_id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (!error && data) {
                dbTemplates = data
            }
        } catch {
            // Se a tabela ainda não existir em algum ambiente, não quebra
            dbTemplates = []
        }

        // Combina templates do banco com os defaults do sistema
        const allTemplates = [
            ...DEFAULT_QUESTIONNAIRE_TEMPLATES,
            ...dbTemplates
        ]

        return NextResponse.json({ data: allTemplates })
    } catch (error: any) {
        console.error('GET questionnaire templates error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const body = await request.json()
        const { title, category, description, structure } = body

        if (!title || !structure) {
            return NextResponse.json({ error: 'Título e estrutura do questionário são obrigatórios' }, { status: 400 })
        }

        const { data: template, error } = await (supabase as any)
            .from('therapeutic_plan_questionnaire_templates')
            .insert({
                clinic_id: profile.clinic_id,
                title,
                category: category || 'custom',
                description: description || null,
                structure,
                is_default: false,
                is_active: true,
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data: template, message: 'Template de questionário criado com sucesso' }, { status: 201 })
    } catch (error: any) {
        console.error('POST questionnaire template error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
