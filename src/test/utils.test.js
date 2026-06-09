import { describe, it, expect } from 'vitest';
import { safeProductUrl, isBlockedImageUrl, haversineKm, imgFallback, BASE, cleanProductImages } from '../utils/constants';
import { parseOrderLocation } from '../utils/location';
import { THEMES } from '../utils/theme';

describe('constants', () => {
  it('BASE is a string starting with /', () => {
    expect(BASE).toBeTypeOf('string');
    expect(BASE.startsWith('/')).toBe(true);
  });

  it('safeProductUrl returns logoPath for empty url', () => {
    expect(safeProductUrl('', 'test')).toBe(BASE + 'logo222.jpg');
    expect(safeProductUrl(null, 'test')).toBe(BASE + 'logo222.jpg');
    expect(safeProductUrl(undefined, 'test')).toBe(BASE + 'logo222.jpg');
  });

  it('safeProductUrl returns valid http url as-is', () => {
    expect(safeProductUrl('https://example.com/img.jpg', 'test'))
      .toBe('https://example.com/img.jpg');
  });

  it('cleanProductImages replaces empty images', () => {
    const products = [{ id: 1, imageUrl: '' }, { id: 2, imageUrl: 'https://example.com/img.jpg' }];
    const cleaned = cleanProductImages(products);
    expect(cleaned[0].imageUrl).toBe(BASE + 'logo222.jpg');
    expect(cleaned[1].imageUrl).toBe('https://example.com/img.jpg');
  });

  it('isBlockedImageUrl detects blocked domains', () => {
    expect(isBlockedImageUrl('https://facebook.com/foo.jpg')).toBe(true);
    expect(isBlockedImageUrl('https://example.com/foo.jpg')).toBe(false);
  });

  it('haversineKm calculates correct distance', () => {
    const d = haversineKm({ lat: 28.42, lng: 48.48 }, { lat: 28.43, lng: 48.49 });
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5);
  });

  it('haversineKm returns 0 for same point', () => {
    const d = haversineKm({ lat: 28.42, lng: 48.48 }, { lat: 28.42, lng: 48.48 });
    expect(d).toBe(0);
  });

  it('imgFallback returns an SVG string', () => {
    const svg = imgFallback(100, 100, '#000', '#fff', 'T');
    expect(svg).toContain('svg');
    expect(svg).toContain('T');
  });
});

describe('parseOrderLocation', () => {
  it('parses Lat/Lng text format', () => {
    const result = parseOrderLocation('Lat: 28.419995, Lng: 48.489575');
    expect(result.lat).toBe(28.419995);
    expect(result.lng).toBe(48.489575);
  });

  it('returns null for invalid location', () => {
    expect(parseOrderLocation('')).toBeNull();
    expect(parseOrderLocation(null)).toBeNull();
    expect(parseOrderLocation('not-json')).toBeNull();
  });
});

describe('THEMES', () => {
  it('has 5 themes', () => {
    expect(THEMES.length).toBe(5);
  });

  it('each theme has required fields', () => {
    THEMES.forEach(t => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('color');
      expect(t).toHaveProperty('metaColor');
    });
  });

  it('includes light and dark themes', () => {
    const ids = THEMES.map(t => t.id);
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
  });
});
