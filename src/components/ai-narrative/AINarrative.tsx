import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface AINarrativeProps {
  narrative: string;
  isStreaming: boolean;
  error?: string | null;
}

function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="my-3 ml-4 list-disc space-y-1 text-gray-700">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function inlineFormat(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-sm">$1</code>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="mt-6 mb-3 text-lg font-bold text-gray-900 first:mt-0">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="mt-4 mb-2 text-base font-semibold text-gray-800">
          {line.slice(4)}
        </h3>
      );
    } else if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="my-2 leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
  }

  flushList();
  return elements;
}

export function AINarrative({ narrative, isStreaming, error }: AINarrativeProps) {
  const rendered = useMemo(() => renderMarkdown(narrative), [narrative]);

  if (error && !narrative) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800">AI-advies niet beschikbaar</h3>
            <p className="mt-1 text-sm text-amber-700">
              {error}. De berekeningen zijn wel beschikbaar — bekijk de grafieken hieronder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!narrative && isStreaming) {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
        <p className="mt-3 text-sm text-blue-700">AI-advies wordt gegenereerd...</p>
      </div>
    );
  }

  if (!narrative) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">AI Advies</h2>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          COMCAM
        </span>
      </div>
      <div className="prose-sm max-w-none">
        {rendered}
        {isStreaming && (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-blue-600" />
        )}
      </div>
      {error && (
        <p className="mt-4 text-xs text-amber-600">
          Let op: het AI-advies is mogelijk incompleet. {error}
        </p>
      )}
    </div>
  );
}
