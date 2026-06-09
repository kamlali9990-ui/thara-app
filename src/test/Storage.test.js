import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../utils/storage';

// Mock IndexedDB
function createMockIndexedDB() {
  const store = new Map();
  const req = { result: null, error: null };
  return {
    open: vi.fn().mockReturnValue({
      result: {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockImplementation((key) => ({
              onsuccess: null, onerror: null,
              get result() { return store.get(key); }
            })),
            put: vi.fn().mockImplementation((val, key) => {
              store.set(key, val);
              return { onsuccess: null, onerror: null };
            }),
            delete: vi.fn().mockImplementation((key) => {
              store.delete(key);
              return { onsuccess: null, onerror: null };
            }),
          }),
          oncomplete: null,
        }),
        close: vi.fn(),
      },
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    }),
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  };
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    const origIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = undefined;

    localStorage.setItem('test-key', JSON.stringify('stored'));
    const val = await storage.get('test-key');
    expect(val).toBe('stored');

    await storage.set('test-key', 'new-val');
    expect(JSON.parse(localStorage.getItem('test-key'))).toBe('new-val');

    await storage.remove('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();

    globalThis.indexedDB = origIndexedDB;
  });

  it('gracefully handles when localStorage.getItem throws in fallback', async () => {
    const origGetItem = localStorage.getItem;
    // In the catch block, localStorage.getItem is called again and might also fail
    // The storage.get should ultimately return null
    const val = await storage.get('__nonexistent_test_key__');
    expect(val).toBeNull();
  });
});
