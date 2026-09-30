# Matriz Real de Permissoes RBAC - Execucao Direta de Handlers (B2.0)
**Data de Geracao:** 2026-09-30T13:17:20.400Z  
**Metodologia:** Execucao real de cada handler exportado com sessao simulada para os 5 perfis de usuario (DOCTOR, READONLY, RECEPTIONIST, FINANCIAL, CLINIC_ADMIN).  
**Fonte da Verdade:** Retorno HTTP real da execucao do handler (2xx/4xx vs 403 Forbidden).

---

## 1. Tabela de Execucao Real por Rota e Metodo

| # | Rota | Metodo | DOCTOR | READONLY | RECEPTIONIST | FINANCIAL | CLINIC_ADMIN | Status Real | Divergencias |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `app/api/tiss/analyze-glosa-risk/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 2 | `app/api/tiss/appointments-for-batch/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 3 | `app/api/tiss/audit/route.ts` | `GET` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 4 | `app/api/tiss/autorizacao/route.ts` | `GET` | 403 (OK) | 500 | 500 | 500 | 500 | **CONFORME** | Nenhuma |
| 5 | `app/api/tiss/autorizacao/route.ts` | `POST` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 6 | `app/api/tiss/autorizacao/[id]/enviar/route.ts` | `POST` | 403 (OK) | 403 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 7 | `app/api/tiss/batch-process/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 8 | `app/api/tiss/batches/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 9 | `app/api/tiss/batches/route.ts` | `POST` | 403 (OK) | 403 | 403 | 201 | 201 | **CONFORME** | Nenhuma |
| 10 | `app/api/tiss/batches/[id]/errors/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 11 | `app/api/tiss/batches/[id]/errors/route.ts` | `PATCH` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 12 | `app/api/tiss/batches/[id]/generate-xml/route.ts` | `GET` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 13 | `app/api/tiss/batches/[id]/generate-xml/route.ts` | `POST` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 14 | `app/api/tiss/batches/[id]/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 15 | `app/api/tiss/batches/[id]/route.ts` | `PUT` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 16 | `app/api/tiss/batches/[id]/route.ts` | `DELETE` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 17 | `app/api/tiss/batches/[id]/sign/route.ts` | `GET` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 18 | `app/api/tiss/batches/[id]/sign/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 19 | `app/api/tiss/batches/[id]/submit/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 20 | `app/api/tiss/dashboard/stats/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 21 | `app/api/tiss/eligibility/route.ts` | `POST` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 22 | `app/api/tiss/glosas/metrics/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 23 | `app/api/tiss/glosas/reasons/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 24 | `app/api/tiss/glosas/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 25 | `app/api/tiss/glosas/[id]/contest/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 26 | `app/api/tiss/glosas/[id]/contest/route.ts` | `POST` | 403 (OK) | 403 | 403 | 409 | 409 | **CONFORME** | Nenhuma |
| 27 | `app/api/tiss/glosas/[id]/contest/route.ts` | `PUT` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 28 | `app/api/tiss/guides/batch-generate/route.ts` | `POST` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 29 | `app/api/tiss/guides/from-appointment/route.ts` | `POST` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 30 | `app/api/tiss/guides/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 31 | `app/api/tiss/guides/route.ts` | `POST` | 403 (OK) | 403 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 32 | `app/api/tiss/guides/validate/route.ts` | `POST` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 33 | `app/api/tiss/guides/[id]/duplicate/route.ts` | `POST` | 403 (OK) | 403 | 201 | 201 | 201 | **CONFORME** | Nenhuma |
| 34 | `app/api/tiss/guides/[id]/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 35 | `app/api/tiss/guides/[id]/route.ts` | `PUT` | 403 (OK) | 403 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 36 | `app/api/tiss/guides/[id]/route.ts` | `DELETE` | 403 (OK) | 403 | 403 | 400 | 400 | **DIVERGENTE** | `app/api/tiss/guides/[id]/route.ts` | `DELETE` | RECEPTIONIST | 2xx/4xx | 403 | Handler bloqueou acao autorizada de RECEPTIONIST |
| 37 | `app/api/tiss/guides/[id]/xml/route.ts` | `POST` | 403 (OK) | 400 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 38 | `app/api/tiss/import/route.ts` | `POST` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 39 | `app/api/tiss/operators/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 40 | `app/api/tiss/operators/route.ts` | `POST` | 403 (OK) | 403 | 403 | 403 | 200 | **CONFORME** | Nenhuma |
| 41 | `app/api/tiss/patient-insurance/route.ts` | `GET` | 403 (OK) | 400 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 42 | `app/api/tiss/patient-insurance/route.ts` | `POST` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 43 | `app/api/tiss/patient-insurance/route.ts` | `DELETE` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 44 | `app/api/tiss/patient-insurance/route.ts` | `PATCH` | 403 (OK) | 403 | 400 | 400 | 400 | **CONFORME** | Nenhuma |
| 45 | `app/api/tiss/pricing/route.ts` | `GET` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 46 | `app/api/tiss/pricing/route.ts` | `POST` | 403 (OK) | 403 | 403 | 403 | 200 | **CONFORME** | Nenhuma |
| 47 | `app/api/tiss/pricing/route.ts` | `DELETE` | 403 (OK) | 403 | 403 | 403 | 400 | **CONFORME** | Nenhuma |
| 48 | `app/api/tiss/reports/loss-analysis/route.ts` | `GET` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 49 | `app/api/tiss/returns/generate-upload-url/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 50 | `app/api/tiss/returns/notify-upload-complete/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 51 | `app/api/tiss/returns/upload/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 52 | `app/api/tiss/returns/[id]/parse/route.ts` | `POST` | 403 (OK) | 403 | 403 | 404 | 404 | **CONFORME** | Nenhuma |
| 53 | `app/api/tiss/returns/[id]/status/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 54 | `app/api/tiss/returns/[id]/undo/route.ts` | `POST` | 403 (OK) | 403 | 403 | 403 | 400 | **CONFORME** | Nenhuma |
| 55 | `app/api/tiss/settings/premium/route.ts` | `GET` | 403 (OK) | 403 | 403 | 200 | 200 | **CONFORME** | Nenhuma |
| 56 | `app/api/tiss/settings/premium/route.ts` | `POST` | 403 (OK) | 403 | 403 | 403 | 200 | **CONFORME** | Nenhuma |
| 57 | `app/api/tiss/tuss/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 58 | `app/api/tiss/tuss/route.ts` | `POST` | 403 (OK) | 403 | 403 | 403 | 200 | **CONFORME** | Nenhuma |
| 59 | `app/api/tiss/validate-xsd/route.ts` | `GET` | 403 (OK) | 200 | 200 | 200 | 200 | **CONFORME** | Nenhuma |
| 60 | `app/api/tiss/validate-xsd/route.ts` | `POST` | 403 (OK) | 403 | 403 | 400 | 400 | **CONFORME** | Nenhuma |
| 61 | `app/api/insurance/check-eligibility/route.ts` | `POST` | 403 (OK) | 403 | 200 | 200 | 200 | **CONFORME** | Nenhuma |

---

## 2. Resumo Quantitativo de Execucao

- **Total de Rotas Auditadas:** 40
- **Total de Metodos HTTP Exportados:** 61
- **Total de Execucoes Reais:** 305 (5 perfis por metodo)
- **Total de Divergencias Encontradas:** 1

## 3. Lista Detalhada de Divergencias (Secao 5 vs Real)

| # | Rota | Metodo | Perfil | Esperado | Real | Causa Raiz |
|---|---|---|---|---|---|---|
| 1 | `app/api/tiss/guides/[id]/route.ts` | `DELETE` | RECEPTIONIST | 2xx/4xx | 403 | Handler bloqueou acao autorizada de RECEPTIONIST |
