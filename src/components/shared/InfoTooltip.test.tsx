import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTooltip } from './InfoTooltip';

describe('InfoTooltip', () => {
  // --- Basic rendering ---

  it('renders the info button', () => {
    render(<InfoTooltip text="Uitleg hier" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    expect(button).toBeTruthy();
  });

  it('tooltip is not visible by default', () => {
    render(<InfoTooltip text="Verborgen tekst" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // --- Click interaction ---

  it('shows tooltip on click', () => {
    render(<InfoTooltip text="Klik uitleg" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(screen.getByText('Klik uitleg')).toBeTruthy();
  });

  it('hides tooltip on second click (toggle)', () => {
    render(<InfoTooltip text="Toggle tekst" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // --- Hover interaction ---

  it('shows tooltip on mouse enter', () => {
    render(<InfoTooltip text="Hover tekst" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    expect(screen.getByText('Hover tekst')).toBeTruthy();
  });

  it('hides tooltip on mouse leave', () => {
    render(<InfoTooltip text="Weg tekst" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // --- Accessibility ---

  it('has aria-label on the button', () => {
    render(<InfoTooltip text="Aria test" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    expect(button.getAttribute('aria-label')).toBe('Meer informatie');
  });

  it('aria-expanded is false by default', () => {
    render(<InfoTooltip text="Aria expanded" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded is true when tooltip is open', () => {
    render(<InfoTooltip text="Aria expanded" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('button has type="button" (not submit)', () => {
    render(<InfoTooltip text="Button type" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    expect(button.getAttribute('type')).toBe('button');
  });

  // --- Link rendering ---

  it('renders link when linkText and linkHref are provided', () => {
    render(
      <InfoTooltip
        text="Met link"
        linkText="Meer info"
        linkHref="https://example.com"
      />
    );
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    const link = screen.getByText('Meer info');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('does not render link when only linkText is provided (no href)', () => {
    render(<InfoTooltip text="Zonder href" linkText="Klik" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(screen.queryByText('Klik')).toBeNull();
  });

  it('does not render link when only linkHref is provided (no text)', () => {
    render(<InfoTooltip text="Zonder text" linkHref="https://example.com" />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    // Tooltip shows, but no link element
    expect(screen.getByText('Zonder text')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  // --- Click outside ---

  it('closes tooltip when clicking outside', () => {
    render(
      <div>
        <InfoTooltip text="Buiten klik" />
        <span data-testid="outside">Outside</span>
      </div>
    );
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeTruthy();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // --- Long text ---

  it('handles long tooltip text', () => {
    const longText = 'A'.repeat(500);
    render(<InfoTooltip text={longText} />);
    const button = screen.getByRole('button', { name: 'Meer informatie' });
    fireEvent.click(button);
    expect(screen.getByText(longText)).toBeTruthy();
  });
});
