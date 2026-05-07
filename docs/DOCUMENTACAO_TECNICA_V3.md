# Documentação Técnica V3 - CliniGo

Este documento rastreia as implantações cirúrgicas de UI/UX e Efeito UAU no sistema.

## Histórico de Alterações

### Módulo: Pacientes
* **Submódulo:** Perfil do Paciente / Prontuários
* **Arquivo:** `components/patients/PatientEvolutions.tsx`
* **Função/Componente Alterado:** `PatientEvolutions`
* **Data:** 07 de Maio de 2026
* **O que foi feito:**
  - Substituição da lista de evoluções básica por uma "Linha do Tempo Visual" interativa.
  - Adição de "Dashboard Resumo da Jornada" com 3 cards: Total de Sessões, Início do Tratamento e Última Sessão.
  - Implementação de marcadores visuais (`Timeline Dot`), emblemas de datas relativas (usando `date-fns`) e design em formato de Feed Clínico.
  - Tratamento de Empty States (Jornada em Branco) com ilustrações dedicadas.
  - Melhoria de legibilidade e separação de conteúdo (Queixa vs Evolução Resumida).

### Módulo: Clínica
* **Submódulo:** Controle de Faltas
* **Arquivo:** `app/dashboard/(clinic)/controle-faltas/page.tsx`
* **Função/Componente Alterado:** `ControleFaltasPage`
* **Data:** 07 de Maio de 2026
* **O que foi feito:**
  - Reformulação completa da UI/UX com adoção de Dashboard de métricas (Cards).
  - Implementação de Empty States luxuosos.
  - Adição de Automação de WhatsApp para reposições pendentes.
  - Criação de Templates (Padrão, Flexível, Rigorosa) para regras de falta.
