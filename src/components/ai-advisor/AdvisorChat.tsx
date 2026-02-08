import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { ChatMessage, DashboardState } from '../../types';
import { isAIAvailable, getRemainingMessages, sendMessageStreaming } from '../../services/api';
import { formatEuro, formatYears, formatPercentage } from '../../utils/format';

interface AdvisorChatProps {
  dashboardState: DashboardState;
  isOpen: boolean;
  onToggle: () => void;
}

function buildSystemPrompt(state: DashboardState): string {
  const r = state.results;
  const resultsContext = r
    ? `
Huidige berekende resultaten:
- Jaarlijkse besparing: ${formatEuro(r.annualSavings)}
- Terugverdientijd: ${formatYears(r.simplePayback)}
- NPV: ${formatEuro(r.npv)}
- IRR: ${isFinite(r.irr) ? formatPercentage(r.irr) : 'n.v.t.'}
- LCOS: ${formatEuro(r.lcos, 2)}/kWh

Batterijconfiguratie:
- Capaciteit: ${state.batteryConfig.capacityKwh} kWh
- Vermogen: ${state.batteryConfig.powerKw} kW
- Kosten: ${formatEuro(state.batteryConfig.costPerKwh)}/kWh

Sector: ${state.energyProfile.sector}
Jaarverbruik: ${state.energyProfile.annualConsumptionKwh} kWh
`
    : 'Er zijn nog geen berekeningen uitgevoerd.';

  return `Je bent de COMCAM Energie-adviseur, een AI-assistent gespecialiseerd in batterijopslag voor de Nederlandse markt.

Je helpt facilitair managers en directies om hun batterij-investeringsbeslissing te begrijpen.

Richtlijnen:
- Antwoord in het Nederlands
- Gebruik eenvoudige taal, vermijd jargon
- Verwijs naar de berekende resultaten waar relevant
- Wees eerlijk over onzekerheden
- Eindig met een concrete aanbeveling of suggestie
- Als je het niet weet, zeg dat eerlijk
- Maximaal 200 woorden per antwoord

${resultsContext}`;
}

export function AdvisorChat({ dashboardState, isOpen, onToggle }: AdvisorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const available = isAIAvailable();
  const remaining = getRemainingMessages();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function handleSend() {
    if (!input.trim() || isLoading || remaining <= 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    const response = await sendMessageStreaming(
      buildSystemPrompt(dashboardState),
      userMessage.content,
      'fast',
      (chunk) => setStreamingText((prev) => prev + chunk)
    );

    setIsLoading(false);
    setStreamingText('');

    if (response) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response, timestamp: new Date() },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, ik kon uw vraag niet verwerken. Probeer het opnieuw of neem contact op met COMCAM.',
          timestamp: new Date(),
        },
      ]);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Open COMCAM Adviseur"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-96 max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-blue-600 px-4 py-3 text-white">
        <div>
          <h3 className="font-semibold">COMCAM Adviseur</h3>
          <p className="text-xs opacity-80">
            {remaining > 0 ? `${remaining} berichten resterend` : 'Sessielimiet bereikt'}
          </p>
        </div>
        <button onClick={onToggle} className="rounded p-1 hover:bg-blue-500" aria-label="Sluit chat">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '400px', minHeight: '200px' }}>
        {!available && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>AI-functies zijn niet geconfigureerd. Voeg een Anthropic API key toe in .env</span>
          </div>
        )}

        {messages.length === 0 && available && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Stel een vraag over uw batterij-investering. Bijvoorbeeld:
            <ul className="mt-2 space-y-1 text-xs">
              <li>&bull; "Is deze terugverdientijd normaal voor een hotel?"</li>
              <li>&bull; "Wat als de energieprijzen dalen?"</li>
              <li>&bull; "Wat zijn de risico's van deze investering?"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[85%] rounded-xl px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-gray-100 text-gray-800'
            )}
          >
            {msg.content}
          </div>
        ))}

        {streamingText && (
          <div className="mr-auto max-w-[85%] rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-800">
            {streamingText}
            <span className="animate-pulse">|</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Limit reached message */}
      {remaining <= 0 && (
        <div className="border-t border-gray-100 px-4 py-3 text-center text-sm text-gray-600">
          <p>Sessielimiet bereikt.</p>
          <a
            href="mailto:info@comcam.nl"
            className="mt-1 inline-block text-blue-600 underline hover:text-blue-700"
          >
            Neem contact op met COMCAM voor persoonlijk advies
          </a>
        </div>
      )}

      {/* Input */}
      {remaining > 0 && available && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 border-t border-gray-100 px-3 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel een vraag..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
            aria-label="Verstuur"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
