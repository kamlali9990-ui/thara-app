import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../components/ThemeToggle';

describe('ThemeToggle', () => {
  it('renders button with theme-toggle-btn class', () => {
    render(<ThemeToggle currentTheme="light" onThemeChange={() => {}} />);
    expect(screen.getByTitle('تغيير المظهر')).toBeTruthy();
  });

  it('shows sun icon for light themes', () => {
    const { container } = render(<ThemeToggle currentTheme="light" onThemeChange={() => {}} />);
    const btn = container.querySelector('.theme-toggle-btn');
    expect(btn.innerHTML).toContain('circle');
  });

  it('shows moon icon for dark themes', () => {
    const { container } = render(<ThemeToggle currentTheme="dark" onThemeChange={() => {}} />);
    const btn = container.querySelector('.theme-toggle-btn');
    expect(btn.innerHTML).toContain('M21 12.79');
  });

  it('opens theme menu on click', () => {
    render(<ThemeToggle currentTheme="light" onThemeChange={() => {}} />);
    expect(screen.queryByText(/لؤلؤي/)).toBeFalsy();
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    expect(screen.getByText(/لؤلؤي/)).toBeTruthy();
  });

  it('calls onThemeChange when option clicked', () => {
    const onChange = vi.fn();
    render(<ThemeToggle currentTheme="light" onThemeChange={onChange} />);
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    fireEvent.click(screen.getByText(/ليلي/));
    expect(onChange).toHaveBeenCalledWith('midnight');
  });

  it('applies custom className', () => {
    const { container } = render(<ThemeToggle currentTheme="light" onThemeChange={() => {}} className="my-class" />);
    expect(container.querySelector('.my-class')).toBeTruthy();
  });

  it('highlights active theme with check mark', () => {
    render(<ThemeToggle currentTheme="light" onThemeChange={() => {}} />);
    fireEvent.click(screen.getByTitle('تغيير المظهر'));
    const check = document.querySelector('.theme-check');
    expect(check?.textContent).toBe('✓');
  });
});
