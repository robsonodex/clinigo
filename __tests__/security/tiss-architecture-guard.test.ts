/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

function getRouteFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getRouteFiles(fullPath));
        } else if (file === 'route.ts') {
            results.push(fullPath);
        }
    });
    return results;
}

describe('Teste Arquitetural: Defesa em Profundidade TISS e Convênios', () => {
    const workspaceRoot = process.cwd();
    const tissRoutesDir = path.join(workspaceRoot, 'app/api/tiss');
    const insuranceRoutesDir = path.join(workspaceRoot, 'app/api/insurance');

    const routeFiles = [
        ...getRouteFiles(tissRoutesDir),
        ...getRouteFiles(insuranceRoutesDir),
    ];

    const JUSTIFIED_EXCEPTIONS: string[] = [];
    const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

    it('1. Deve encontrar todas as rotas TISS e Insurance registradas (37 rotas mínimas)', () => {
        expect(routeFiles.length).toBeGreaterThanOrEqual(37);
    });

    it('2. Todo handler HTTP exportado sob /api/tiss e /api/insurance DEVE invocar enforceTissAdministrativeGuard', () => {
        const failures: string[] = [];
        let totalHandlersInspected = 0;

        routeFiles.forEach((filePath) => {
            const relPath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
            if (JUSTIFIED_EXCEPTIONS.includes(relPath)) {
                return;
            }

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const sourceFile = ts.createSourceFile(
                filePath,
                fileContent,
                ts.ScriptTarget.Latest,
                true
            );

            // Verificar funções exportadas
            ts.forEachChild(sourceFile, (node) => {
                if (ts.isFunctionDeclaration(node) && node.name) {
                    const funcName = node.name.text;
                    if (HTTP_METHODS.has(funcName)) {
                        // Verificar se é exportada
                        const isExported = node.modifiers?.some(
                            (m) => m.kind === ts.SyntaxKind.ExportKeyword
                        );

                        if (isExported) {
                            totalHandlersInspected++;
                            const bodyText = node.body ? node.body.getText(sourceFile) : '';
                            const hasGuard = bodyText.includes('enforceTissAdministrativeGuard') || bodyText.includes('requireTissAction');

                            if (!hasGuard) {
                                failures.push(`${relPath} [${funcName}] não invoca enforceTissAdministrativeGuard nem requireTissAction`);
                            }
                        }
                    }
                }
            });
        });

        expect(totalHandlersInspected).toBeGreaterThanOrEqual(50);
        expect(failures).toEqual([]);
    });
});
