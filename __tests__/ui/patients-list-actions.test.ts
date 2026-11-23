import fs from 'fs'
import path from 'path'

describe('Lista de Pacientes (/dashboard/pacientes) — Ações Visíveis e Acessíveis', () => {
    const source = fs.readFileSync(
        path.join(process.cwd(), 'app/dashboard/(clinic)/pacientes/page.tsx'),
        'utf8'
    )

    it('deve exibir botões diretos e rotulados (Abrir Ficha, Prontuário, Contratos e WhatsApp) na Tabela e nos Cartões', () => {
        expect(source).toContain('Abrir Ficha')
        expect(source).toContain('Ações Rápidas')
        expect(source).toContain('Prontuário')
        expect(source).toContain('Contratos')
        expect(source).toContain('WhatsApp')
    })

    it('deve tornar a linha da tabela clicável com stopPropagation na célula de ações e corrigir Histórico de Agendamentos', () => {
        expect(source).toContain('onClick={(e) => e.stopPropagation()}')
        expect(source).toContain('?tab=appointments')
        expect(source).toContain('Histórico de Agendamentos')
        expect(source).toContain("const isReceptionist = user?.role === 'RECEPTIONIST'")
    })

    it('não deve conter ícones banidos nem nomes de clínicas clientes', () => {
        expect(source).not.toMatch(/\b(Sparkles|Crown|PartyPopper|Rocket|Wand2)\b/)
        expect(source).not.toMatch(/World Sensory|Espaço Incluir/i)
    })

    it('deve garantir correção do loop infinito, copy limpa e layout sem corte no CliniGo Família', () => {
        const familyMgr = fs.readFileSync(
            path.join(process.cwd(), 'components/family-portal/FamilyPortalManager.tsx'),
            'utf8'
        )
        const familyPub = fs.readFileSync(
            path.join(process.cwd(), 'components/family-portal/FamilyPortalPublicView.tsx'),
            'utf8'
        )
        expect(familyMgr).toContain('const EMPTY_SESSIONS: any[] = []')
        expect(familyMgr).not.toContain('WhatsApp sem Aplicativo')
        expect(familyPub).not.toContain('Sem App')
        expect(familyMgr).toContain('break-all select-all')
        expect(familyPub).toContain('src="/logo_black.svg"')
        expect(familyPub).toContain('href="https://clinigo.app"')
    })
})
