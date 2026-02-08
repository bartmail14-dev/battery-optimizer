import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Jaarlijkse besparing" value="€ 12.500" />);
    expect(screen.getByText('Jaarlijkse besparing')).toBeTruthy();
    expect(screen.getByText('€ 12.500')).toBeTruthy();
  });

  it('renders unit when provided', () => {
    render(<MetricCard label="Terugverdientijd" value="6,3" unit="jaar" />);
    expect(screen.getByText('jaar')).toBeTruthy();
  });

  it('renders trend when provided', () => {
    render(<MetricCard label="NPV" value="€ 50.000" trend="+15% t.o.v. vorig jaar" />);
    expect(screen.getByText('+15% t.o.v. vorig jaar')).toBeTruthy();
  });

  it('renders explanation when provided', () => {
    render(
      <MetricCard
        label="NPV"
        value="€ 50.000"
        explanation="Positieve NCW: de investering creëert waarde"
      />
    );
    expect(screen.getByText('Positieve NCW: de investering creëert waarde')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<MetricCard label="Test" value="123" onClick={handler} />);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('applies positive status styling', () => {
    const { container } = render(
      <MetricCard label="Test" value="123" status="positive" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-green');
  });

  it('applies negative status styling', () => {
    const { container } = render(
      <MetricCard label="Test" value="123" status="negative" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-red');
  });

  // --- Extended: Accessibility ---

  it('has no button role when onClick is not provided', () => {
    render(<MetricCard label="Geen click" value="100" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has button role when onClick is provided', () => {
    render(<MetricCard label="Click" value="100" onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has tabIndex 0 when clickable', () => {
    render(<MetricCard label="Tab" value="100" onClick={() => {}} />);
    const card = screen.getByRole('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('has no tabIndex when not clickable', () => {
    const { container } = render(<MetricCard label="No tab" value="100" />);
    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('tabindex')).toBeNull();
  });

  it('triggers onClick on Enter key', () => {
    const handler = vi.fn();
    render(<MetricCard label="Enter" value="100" onClick={handler} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not trigger onClick on Space key (only Enter)', () => {
    const handler = vi.fn();
    render(<MetricCard label="Space" value="100" onClick={handler} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(handler).not.toHaveBeenCalled();
  });

  // --- Extended: Default status ---

  it('defaults to neutral status', () => {
    const { container } = render(<MetricCard label="Default" value="100" />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('text-gray');
  });

  // --- Extended: Optional props ---

  it('does not render trend when not provided', () => {
    const { container } = render(<MetricCard label="Geen trend" value="100" />);
    // Only label + value should be present, no trend paragraph
    const paragraphs = container.querySelectorAll('p');
    // One for label, zero for trend
    expect(paragraphs).toHaveLength(1);
  });

  it('does not render unit when not provided', () => {
    render(<MetricCard label="Geen unit" value="100" />);
    const baselineDiv = screen.getByText('100').parentElement;
    expect(baselineDiv?.children).toHaveLength(1); // only the value span
  });

  it('renders all props together', () => {
    render(
      <MetricCard
        label="Volledige kaart"
        value="€ 50.000"
        unit="per jaar"
        trend="+10%"
        explanation="Goede investering"
        status="positive"
        onClick={() => {}}
      />
    );
    expect(screen.getByText('Volledige kaart')).toBeTruthy();
    expect(screen.getByText('€ 50.000')).toBeTruthy();
    expect(screen.getByText('per jaar')).toBeTruthy();
    expect(screen.getByText('+10%')).toBeTruthy();
    expect(screen.getByText('Goede investering')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has cursor-pointer class when clickable', () => {
    const { container } = render(
      <MetricCard label="Cursor" value="100" onClick={() => {}} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cursor-pointer');
  });

  it('does not have cursor-pointer when not clickable', () => {
    const { container } = render(
      <MetricCard label="No cursor" value="100" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('cursor-pointer');
  });
});
