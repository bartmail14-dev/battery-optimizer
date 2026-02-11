import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import type { CalculationResult } from '../../../src/types/index.js';

const SYSTEM_PROMPT = `Je bent een senior energieconsultant van COMCAM B.V., gespecialiseerd in batterijopslagprojecten voor de zakelijke markt in Nederland. Je analyseert berekeningen van ons Battery Optimizer platform en schrijft een helder, beslissingsgericht advies in het Nederlands.

Structuur je advies ALTIJD in deze 4 secties met markdown headers:

## Advies in het kort
Een korte samenvatting (2-3 zinnen) van het financiële verdict: is dit een go of no-go investering en waarom?

## Wat levert het op?
Concrete financiële opbrengsten: jaarlijkse besparing, terugverdientijd, NPV, IRR. Vergelijk scenario's (basis, optimistisch, pessimistisch). Benoem de belangrijkste opbrengstbronnen (arbitrage, piekbesparing, subsidie).

## Waar moet u op letten?
Risico's en aandachtspunten: degradatie, marktrisico's, technische levensduur vs economische levensduur, afhankelijkheid van subsidie, spreiding tussen scenario's.

## Onze aanbeveling
Concrete aanbeveling: wel/niet investeren, en zo ja onder welke voorwaarden. Noem eventuele next steps (bijv. echte verbruiksdata aanleveren, offerte opvragen).

Regels:
- Schrijf maximaal 600 woorden
- Gebruik geen technisch jargon zonder uitleg
- Wees eerlijk: als de investering niet rendabel is, zeg dat duidelijk
- Bedragen in euro's, percentages met 1 decimaal
- Verwijs naar de grafieken die de gebruiker op het scherm ziet ter onderbouwing
- Spreek de lezer aan met "u"
- Schrijf professioneel maar toegankelijk`;

function buildUserPrompt(result: CalculationResult): string {
  const base = result.scenarioResults.find(s => s.scenario === 'base');
  const optimistic = result.scenarioResults.find(s => s.scenario === 'optimistic');
  const pessimistic = result.scenarioResults.find(s => s.scenario === 'pessimistic');

  return `Analyseer de volgende batterijopslagberekening en schrijf een advies:

**Investering**
- Bruto investering: €${result.grossInvestment.toFixed(0)}
- Netto investering (na EIA): €${result.netInvestment.toFixed(0)}
- EIA belastingvoordeel: €${(result.grossInvestment - result.netInvestment).toFixed(0)}

**Financieel resultaat (basisscenario)**
- NPV: €${result.npv.toFixed(0)}
- IRR: ${(result.irr * 100).toFixed(1)}%
- Terugverdientijd: ${result.simplePayback.toFixed(1)} jaar
- Jaarlijkse besparing: €${result.arbitrageSavings.toFixed(0)}

**Opbrengstbronnen**
- Arbitrage (piek/dal): €${result.arbitrageSavings.toFixed(0)}/jaar
- Piekbesparing: €${result.peakShavingSavings.toFixed(0)}/jaar
- Piekreductie: ${result.peakReductionKw.toFixed(1)} kW
- SDE++ subsidie: €${result.annualSubsidy.toFixed(0)}/jaar
- Onderhoud: -€${(result.yearlyBreakdown?.[0]?.maintenanceCost ?? 0).toFixed(0)}/jaar

**Scenario-analyse**
${base ? `- Basis: NPV €${base.npv.toFixed(0)}, IRR ${(base.irr * 100).toFixed(1)}%, payback ${base.simplePayback.toFixed(1)} jr` : ''}
${optimistic ? `- Optimistisch: NPV €${optimistic.npv.toFixed(0)}, IRR ${(optimistic.irr * 100).toFixed(1)}%, payback ${optimistic.simplePayback.toFixed(1)} jr` : ''}
${pessimistic ? `- Pessimistisch: NPV €${pessimistic.npv.toFixed(0)}, IRR ${(pessimistic.irr * 100).toFixed(1)}%, payback ${pessimistic.simplePayback.toFixed(1)} jr` : ''}

**Batterij technisch**
- Jaarlijkse cycli: ${result.simulation.totalCycles.toFixed(0)}
- LCOS: €${result.lcos.toFixed(4)}/kWh
- Blended grid price: €${result.blendedGridPrice.toFixed(4)}/kWh
- CO2 reductie: ${result.co2ReductionKg.toFixed(0)} kg/jaar

${result.paybackConfidence ? `**Terugverdientijd bandbreedte**
- Best case: ${result.paybackConfidence.best.toFixed(1)} jaar
- Verwacht: ${result.paybackConfidence.expected.toFixed(1)} jaar
- Worst case: ${result.paybackConfidence.worst.toFixed(1)} jaar` : ''}

**Subsidie impact**
- NPV zonder subsidie: €${(result.noSubsidyNpv ?? 0).toFixed(0)}
- Payback zonder subsidie: ${(result.noSubsidyPayback ?? 0).toFixed(1)} jaar
- Subsidie impact: €${(result.subsidyImpactEur ?? 0).toFixed(0)}`;
}

export async function* streamAdvisory(result: CalculationResult): AsyncGenerator<string> {
  if (!config.geminiApiKey) {
    yield 'AI-advies is niet beschikbaar. Configureer een GEMINI_API_KEY om advies te genereren.';
    return;
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const response = await ai.models.generateContentStream({
    model: config.geminiModel,
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(result) }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

export async function generateAdvisory(result: CalculationResult): Promise<string> {
  let full = '';
  for await (const chunk of streamAdvisory(result)) {
    full += chunk;
  }
  return full;
}
