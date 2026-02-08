import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  linkText?: string;
  linkHref?: string;
}

export function InfoTooltip({ text, linkText, linkHref }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex" ref={tooltipRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label="Meer informatie"
        aria-expanded={isOpen}
      >
        <Info className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
          role="tooltip"
        >
          <p className="leading-relaxed">{text}</p>
          {linkText && linkHref && (
            <a
              href={linkHref}
              className="mt-2 inline-block text-blue-300 underline hover:text-blue-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkText}
            </a>
          )}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
