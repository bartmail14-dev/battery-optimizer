# Battery Optimizer — COMCAM

Investeringsbeslissing-tool voor batterijopslag, gericht op facilitair managers en directies in de Nederlandse hospitality- en healthcare-sector.

## Setup

```bash
npm install
cp .env.example .env  # Vul je Anthropic API key in voor AI-features
npm run dev
```

## Commando's

| Commando | Beschrijving |
|----------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run test` | Tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |

## Architectuur

### Deterministisch (geen API kosten, instant)
- Alle financiële berekeningen (NPV, IRR, terugverdientijd)
- Batterijsimulatie (uur-voor-uur optimalisatie)
- Scenarioanalyse en sensitiviteitsanalyse
- Locatie: `src/services/calculations/`

### AI-powered (Anthropic API, per-gebruik kosten)
- Chatbot "COMCAM Adviseur" voor vragen over resultaten
- Directierapport generator
- Data-extractie uit uploads (jaarafrekeningen)
- Locatie: `src/services/api/` en `src/components/ai-advisor/`

## Agent Team

Dit project gebruikt 4 gespecialiseerde Claude Code agents:

| Agent | Rol | Wanneer |
|-------|-----|---------|
| `de-skepticus` | Klantadvocaat & tester | Review van features |
| `de-bouwmeester` | Frontend architect | UI en visualisatie |
| `de-rekenmeester` | Energy engineer | Berekeningen en modellen |
| `de-strateeg` | Product owner | Prioritering en strategie |

### Agents gebruiken

De agents zijn beschikbaar als Claude Code "agent teams" (experimenteel). Ze worden automatisch herkend wanneer je in de `battery-optimizer` directory werkt met Claude Code.

**Workflow:**
1. **De Strateeg** bepaalt WAT en VOOR WIE
2. **De Rekenmeester** + **Bouwmeester** werken parallel (logica + UI)
3. **De Skepticus** reviewt het eindresultaat

## Tech Stack

- React 18 + TypeScript (strict mode)
- Vite + Tailwind CSS v4
- Recharts (datavisualisatie)
- Decimal.js (financiële berekeningen)
- @react-pdf/renderer (PDF export)
- @anthropic-ai/sdk (AI features)
- Vitest + React Testing Library
