# [ARQUIVADO] Plano Original de Implementação (Semana 1)

> **NOTA:** Este documento reflete o plano original. Para o estado atual do sistema, consulte `RELATORIO_DO_SISTEMA.md`.

## Objetivo
Transformar a landing page genérica em uma **máquina de conversão** com storytelling emocional, prova social massiva e CTAs de alta conversão.

## Estrutura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HERO SECTION (Video BG, Headline forte, 2 CTAs)          │
├─────────────────────────────────────────────────────────────┤
│ 2. BARRA DE CREDIBILIDADE (Logos + Rating)                  │
├─────────────────────────────────────────────────────────────┤
│ 3. PROBLEMA → SOLUÇÃO (3 dores + transição)                 │
├─────────────────────────────────────────────────────────────┤
│ 4. DEMONSTRAÇÃO (GIF/Vídeo do fluxo)                        │
├─────────────────────────────────────────────────────────────┤
│ 5. PROVA SOCIAL (Testimonials + Números)                    │
├─────────────────────────────────────────────────────────────┤
│ 6. COMPARAÇÃO ANTES/DEPOIS (Tabela visual)                  │
├─────────────────────────────────────────────────────────────┤
│ 7. INTEGRAÇÃO DE SITES ✅ (já implementado)                 │
├─────────────────────────────────────────────────────────────┤
│ 8. PLANOS + CALCULADORA ROI                                 │
├─────────────────────────────────────────────────────────────┤
│ 9. BANNER URGÊNCIA/BÔNUS                                    │
├─────────────────────────────────────────────────────────────┤
│ 10. FAQ ESTRATÉGICO                                         │
├─────────────────────────────────────────────────────────────┤
│ 11. FOOTER + WHATSAPP FLUTUANTE                             │
└─────────────────────────────────────────────────────────────┘
```

## Changes - Semana 1

### Componente: Landing Page Principal

#### [MODIFY] [page.tsx](file:///d:/clinigo/app/app/page.tsx)
Redesenhar completamente a página principal com as novas seções.

---

### [NEW] components/landing/hero-section.tsx

**Hero com conversão alta:**
- Headline: "Sua clínica fatura **40% mais** com agendamento online inteligente"
- Subtítulo: "Mais de 500 clínicas no RJ já atendem 24/7 sem secretária"
- CTA primário: "Teste Grátis por 14 dias" (verde, pulsando)
- CTA secundário: "Falar com Especialista" (branco)
- Badges: ✓ Sem cartão  ✓ Cancele quando quiser  ✓ Suporte em português

---

### [NEW] components/landing/credibility-bar.tsx

**Barra de credibilidade:**
- 5 logos de parceiros/clientes em cinza
- Rating: ⭐⭐⭐⭐⭐ 4.9/5.0 (227 avaliações)
- Badges: 🏆 LGPD | 🔒 SSL | ⚕️ CFM

---

### [NEW] components/landing/problem-solution-section.tsx

**Storytelling emocional:**
- Título: "Quantos pacientes você PERDE porque não atendem o telefone?"
- 3 cards de problema:
  - 😰 Telefone toca o dia todo
  - 📉 Pacientes desistem (67% não ligam de volta)
  - 💸 Você perde dinheiro (R$ 300/consulta perdida)
- Transição: "E se os pacientes agendassem sozinhos, 24h?"

---

### [NEW] components/landing/demo-section.tsx

**Demonstração visual:**
- GIF/Vídeo mostrando o fluxo completo
- Timeline de passos ao lado:
  1. 🔍 Paciente te acha no Google
  2. 📅 Vê horários em tempo real
  3. 📱 Confirmação automática
  4. 🎥 Consulta por vídeo

---

### [NEW] components/landing/social-proof-section.tsx

**Prova social massiva:**
- Carrossel de 3 depoimentos com foto
- Seção de números:
  - 15.847 Consultas este mês
  - +30% Crescimento de Receita (Corrigido)
  - 98% Satisfação dos pacientes

---

### [NEW] components/landing/comparison-section.tsx

**Tabela Antes/Depois:**
| ❌ SEM CLINIGO | ✅ COM CLINIGO |
|----------------|----------------|
| Telefone toca o dia todo | Agendamento 100% online |
| Paciente liga e não atende | Paciente agenda sozinho |
| Prontuário em Papel | Prontuário 100% Digital |

---

### [NEW] components/landing/faq-section.tsx

**FAQ estratégico (quebra objeções):**
- Preciso ter conhecimento técnico?
- E se meus pacientes são idosos?
- Posso cancelar a qualquer momento?
- Preciso instalar algum programa?
