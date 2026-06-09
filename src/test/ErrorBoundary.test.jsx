import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  const GoodChild = () => <div>الجميل</div>;
  const BadChild = () => { throw new Error('انهار!'); };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(localStorage.__proto__, 'setItem').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(<ErrorBoundary><GoodChild /></ErrorBoundary>);
    expect(screen.getByText('الجميل')).toBeTruthy();
  });

  it('renders fallback UI on error', () => {
    render(<ErrorBoundary><BadChild /></ErrorBoundary>);
    expect(screen.getByText('عذراً، حدث خطأ غير متوقع')).toBeTruthy();
  });

  it('shows reload button on error', () => {
    render(<ErrorBoundary><BadChild /></ErrorBoundary>);
    expect(screen.getByText('إعادة تحميل')).toBeTruthy();
  });

  it('shows storage-specific message for localStorage errors', () => {
    const StorageBad = () => { throw new Error('QuotaExceededError'); };
    render(<ErrorBoundary><StorageBad /></ErrorBoundary>);
    expect(screen.getByText(/يرجى تعطيل التصفح الخاص/)).toBeTruthy();
  });
});
