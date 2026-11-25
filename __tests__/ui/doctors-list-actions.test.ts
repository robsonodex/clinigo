import fs from 'fs'
import path from 'path'

describe('Lista de Profissionais / Terapeutas (/dashboard/medicos) — Ações Visíveis (Padrão Pacientes)', () => {
    const source = fs.readFileSync(
        path.join(process.cwd(), 'app/dashboard/(clinic)/medicos/page.tsx'),
        'utf8'
    )

    it('deve exibir botões diretos e visíveis na tabela sem esconder ações em menu de três pontinhos (MoreVertical)', () => {
        expect(source).toContain('Ações Rápidas')
        expect(source).toContain('Abrir Ficha')
        expect(source).toContain('Contratos')
        expect(source).toContain('Valores')
        expect(source).toContain('Horários')
        expect(source).toContain('Editar')
        expect(source).toContain('Indisponibilizar')
        expect(source).not.toContain('MoreVertical')
    })

    it('deve tornar a linha da tabela clicável com stopPropagation nas células de checkbox e ações e sem confirm() nativo', () => {
        expect(source).toContain('onClick={(e) => e.stopPropagation()}')
        expect(source).toContain('router.push(`/dashboard/medicos/${doctor.id}`)')
        expect(source).not.toMatch(/\bconfirm\s*\(/)
    })
})

