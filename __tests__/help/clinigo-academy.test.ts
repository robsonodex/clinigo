import fs from 'fs'
import path from 'path'
import {
    ACADEMY_LESSONS,
    ACADEMY_STATIONS,
    ACADEMY_TRACKS,
} from '@/components/help/academy/academy-data'
import { KNOWLEDGE_BASE_ARTICLES } from '@/lib/help/knowledge-base'

const ROOT = process.cwd()

describe('CliniGo Academy — Integridade, RBAC, LGPD e Padrão Premium', () => {
    it('deve possuir exatamente 8 estações ordenadas do Mapa Vivo com âncoras válidas e roteiro de demo completo', () => {
        expect(ACADEMY_STATIONS).toHaveLength(8)

        const catalogAnchors = new Set(KNOWLEDGE_BASE_ARTICLES.map((a) => a.anchor))

        ACADEMY_STATIONS.forEach((station, idx) => {
            expect(station.order).toBe(idx + 1)
            expect(station.comesFrom.length).toBeGreaterThan(10)
            expect(station.goesTo.length).toBeGreaterThan(10)
            expect(station.targetRoute.startsWith('/dashboard')).toBe(true)
            expect(catalogAnchors.has(station.manualAnchor)).toBe(true)
            expect(station.demoScript.pitch30s.length).toBeGreaterThan(30)
            expect(station.demoScript.goldenQuestion.length).toBeGreaterThan(20)
            expect(station.demoScript.objection.length).toBeGreaterThan(10)
            expect(station.demoScript.objectionAnswer.length).toBeGreaterThan(20)
        })
    })

    it('deve possuir as 3 trilhas (Recepção, Terapeutas e Administração/TISS) e todas as lições vinculadas corretamente', () => {
        expect(ACADEMY_TRACKS.map((t) => t.id)).toEqual([
            'recepcao',
            'terapeutas',
            'administracao',
        ])

        const stationIds = new Set(ACADEMY_STATIONS.map((s) => s.id))
        const catalogAnchors = new Set(KNOWLEDGE_BASE_ARTICLES.map((a) => a.anchor))

        expect(ACADEMY_LESSONS.length).toBeGreaterThanOrEqual(12)

        for (const lesson of ACADEMY_LESSONS) {
            expect(stationIds.has(lesson.linkedStationId)).toBe(true)
            expect(catalogAnchors.has(lesson.manualAnchor)).toBe(true)
            expect(lesson.quickClicks.length).toBeGreaterThanOrEqual(3)
        }
    })

    it('deve manter isolamento RBAC rigoroso: Recepção e Terapeutas não acessam trilha nem estações administrativas de TISS/Glosas', () => {
        const admTrack = ACADEMY_TRACKS.find((t) => t.id === 'administracao')!
        expect(admTrack.allowedRoles).not.toContain('RECEPTIONIST')
        expect(admTrack.allowedRoles).not.toContain('DOCTOR')

        const glosasStation = ACADEMY_STATIONS.find((s) => s.id === 'glosas-dossie')!
        const escudoStation = ACADEMY_STATIONS.find((s) => s.id === 'escudo-tiss')!
        expect(glosasStation.allowedRoles).toEqual(['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'])
        expect(escudoStation.allowedRoles).toEqual(['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'])
    })

    it('deve garantir zero emojis, zero gradientes chamativos e Modo Roteiro de Demo restrito exclusivamente a SUPER_ADMIN', () => {
        const academyFiles = [
            'components/help/academy/academy-data.ts',
            'components/help/academy/AcademyVisualPreview.tsx',
            'components/help/academy/GlosaZeroSimulator.tsx',
            'components/help/academy/CliniGoAcademy.tsx',
            'app/dashboard/(clinic)/help/page.tsx',
        ]
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

        for (const relPath of academyFiles) {
            const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
            expect(emojiRegex.test(content)).toBe(false)
            expect(content).not.toMatch(/bg-gradient-to-/)
        }

        const mainComp = fs.readFileSync(
            path.join(ROOT, 'components/help/academy/CliniGoAcademy.tsx'),
            'utf8'
        )
        expect(mainComp).toContain("const isSuperAdmin = currentRole === 'SUPER_ADMIN'")
        expect(mainComp).toContain('{isSuperAdmin && founderDemoMode && (')
    })
})

