import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../components/ThemeToggle';

describe('ThemeToggle', () => {
  it('renders button with theme-toggle-btn class', () => {
    render(<ThemeToggle currentTheme="emerald-light" onThemeChange={() => {}} />);
    expect(screen.getByTitle('تغيير المظهر')).toBeTruthy();
  });

  it('shows sun icon for light themes', () => {
    const { container } = render(<ThemeToggle currentTheme="emerald-light" onThemeChange={() => {}} />);
    const btn = container.querySelector('.theme-toggle-btn');
    expect(btn!.innerHTML).toContain('circle');
  });

  it('shows moon icon for dark themes', () => {
    const { container } = render(<ThemeToggle currentTheme="green-dark" onThemeChange={() => {}} />);
    const btn = container.querySelector('.theme-toggle-btn');
    expect(btn!.innerHTML).toContain('M21 12.79');
  });

  it('opens theme menu on click', () => {
    render(<ThemeToggle currentTheme="emerald-light" onThemeChange={() => {}} />);
    expect(screen.queryByText(/برتقالي/)).toBeFalsy();
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    expect(screen.getByText(/برتقالي/)).toBeTruthy();
  });

  it('calls onThemeChange when option clicked', () => {
    const onChange = vi.fn();
    render(<ThemeToggle currentTheme="emerald-light" onThemeChange={onChange} />);
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    fireEvent.click(screen.getByText(/كحلي/));
    expect(onChange).toHaveBeenCalledWith('navy');
  });

  it('applies custom className', () => {
    const { container } = render(<ThemeToggle currentTheme="emerald-light" onThemeChange={() => {}} className="my-class" />);
    expect(container.querySelector('.my-class')).toBeTruthy();
  });

  it('highlights active theme with check mark', () => {
    render(<ThemeToggle currentTheme="emerald-light" onThemeChange={() => {}} />);
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    const check = document.querySelector('.theme-check');
    expect(check?.textContent).toBe('✓');
  });
});
