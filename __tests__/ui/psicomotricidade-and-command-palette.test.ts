import fs from 'fs'
import path from 'path'
import {
    CATEGORIAS_OBJETIVOS_ORDEM,
    OBJETIVOS_PSICOMOTRICIDADE_CATALOGO,
} from '@/components/psicomotricidade/catalogo-objetivos'

describe('Pacote 1 Redução Radical de Cliques — Biblioteca Visual Psicomotricidade + Busca Global Ctrl+K', () => {
    it('deve manter os 55 objetivos de Psicomotricidade nas 11 categorias (A–K) sem códigos duplicados e sem nome de clínica cliente', () => {
        expect(OBJETIVOS_PSICOMOTRICIDADE_CATALOGO).toHaveLength(55)
        expect(CATEGORIAS_OBJETIVOS_ORDEM).toHaveLength(11)

        const codes = OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.map((o) => o.codigo)
        expect(new Set(codes).size).toBe(55)

        for (const item of OBJETIVOS_PSICOMOTRICIDADE_CATALOGO) {
            expect(item.codigo).toMatch(/^[A-Z]{3}\d{2}$/)
            expect(item.descricao.trim().length).toBeGreaterThan(10)
            expect(item.categoriaLetra).toBeTruthy()
            expect(item.descricao).not.toMatch(/World\s*Sensory|Espa[cç]o\s*Incluir/i)
        }
    })

    it('deve exibir descrição completa antes da seleção, autopreencher critério e fazer auto-seed multi-clínica em objetivos/page.tsx', () => {
        const pageSource = fs.readFileSync(
            path.join(
                process.cwd(),
                'app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/objetivos/page.tsx'
            ),
            'utf8'
        )

        // Não deve voltar ao Select cego que ocultava a descrição
        expect(pageSource).not.toContain('SelectTrigger')
        expect(pageSource).toContain('b.descricao_template')
        expect(pageSource).toContain('handlePickObjective')
        expect(pageSource).toContain('Usar texto do modelo')
        expect(pageSource).toContain('Ver Biblioteca')
        expect(pageSource).toContain('PsicomotricidadeBibliotecaModal')
        // Auto-seed multi-clínica idempotente via unique index (clinica_id, codigo)
        expect(pageSource).toContain("onConflict: 'clinica_id,codigo'")
        expect(pageSource).toContain('ignoreDuplicates: true')
        // Confirmação obrigatória em ações destrutivas (Regra dos Botões)
        expect(pageSource).toContain('AlertDialog')
        expect(pageSource).toContain('Descontinuar objetivo?')
        expect(pageSource).toContain('Limpar campos?')
    })

    it('deve oferecer busca, filtro A–K, cópia e impressão/PDF white-label em PsicomotricidadeBibliotecaModal', () => {
        const modalSource = fs.readFileSync(
            path.join(
                process.cwd(),
                'components/psicomotricidade/PsicomotricidadeBibliotecaModal.tsx'
            ),
            'utf8'
        )

        expect(modalSource).toContain('Imprimir / Salvar PDF')
        expect(modalSource).toContain('CATEGORIAS_OBJETIVOS_ORDEM')
        expect(modalSource).toContain('navigator.clipboard.writeText')
        expect(modalSource).toContain('escapeHtml')
        expect(modalSource).not.toMatch(/World\s*Sensory|Espa[cç]o\s*Incluir/i)
    })

    it('deve montar a Busca Global Ctrl+K no Header com respeito ao RBAC, AbortController e ações rápidas diretas por paciente', () => {
        const headerSource = fs.readFileSync(
            path.join(process.cwd(), 'components/layout/header.tsx'),
            'utf8'
        )
        const paletteSource = fs.readFileSync(
            path.join(process.cwd(), 'components/layout/GlobalCommandPalette.tsx'),
            'utf8'
        )

        expect(headerSource).toContain('GlobalCommandPalette')
        expect(headerSource).toContain('Ctrl K')

        expect(paletteSource).toContain("event.key.toLowerCase() === 'k'")
        expect(paletteSource).toContain('AbortController')
        expect(paletteSource).toContain('/api/patients?search=')
        expect(paletteSource).toContain('canSeeMedicalRecords = !isReceptionist')
        expect(paletteSource).toContain('Abrir Ficha')
        expect(paletteSource).toContain('?tab=evolutions')
        expect(paletteSource).toContain('?tab=contracts')
        expect(paletteSource).toContain('https://wa.me/')
    })
})
