import { useState, useCallback, useEffect, useRef } from 'react';

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY;

const OVERLAY = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
const MODAL = { background: '#0f1a14', borderRadius: 16, border: '0.5px solid rgba(16,185,129,0.15)', width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const HEADER = { padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' };
const INPUT = { flex: 1, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.6rem 0.75rem', color: '#e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' };
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', padding: '1rem', overflowY: 'auto', flex: 1 };
const IMG_WRAP = { position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'rgba(255,255,255,0.04)' };
const IMG = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const LOADING = { textAlign: 'center', padding: '2rem', color: '#94a3b8' };
const ERROR = { textAlign: 'center', padding: '2rem', color: '#f87171', fontSize: '0.85rem' };
const TAB = (active) => ({
  flex: 1, border: 'none', borderRadius: 8, padding: '0.5rem', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
  background: active ? '#10b981' : 'rgba(255,255,255,0.06)',
  color: active ? '#020f08' : '#94a3b8', transition: 'all 0.2s'
});

const SRC_UNSPLASH = 'unsplash';
const SRC_SERPER = 'serper';

export default function ImageSearch({ defaultQuery, onSelect, onClose }) {
  const [query, setQuery] = useState(defaultQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState(SRC_UNSPLASH);
  const searched = useRef(false);

  const searchUnsplash = useCallback(async (term) => {
    if (!UNSPLASH_ACCESS_KEY) { setError('مطلوب مفتاح Unsplash API'); return; }
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=30&lang=ar`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    });
    if (!res.ok) throw new Error(`Unsplash: ${res.status}`);
    const data = await res.json();
    setResults((data.results || []).map(p => ({ id: p.id, url: p.urls.regular, thumb: p.urls.thumb, alt: p.alt_description || '' })));
  }, []);

  const searchSerper = useCallback(async (term) => {
    if (!SERPER_API_KEY) { setError('مطلوب مفتاح Serper API'); return; }
    const res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: term, num: 30 })
    });
    if (!res.ok) throw new Error(`Serper: ${res.status}`);
    const data = await res.json();
    setResults((data.images || []).map((img, i) => ({ id: img.url || i, url: img.imageUrl, thumb: img.thumbnailUrl || img.imageUrl, alt: img.title || '' })));
  }, []);

  const search = useCallback(async (q) => {
    const term = (q !== undefined ? q : query).trim();
    if (!term) return;
    setLoading(true);
    setError('');
    try {
      if (source === SRC_UNSPLASH) await searchUnsplash(term);
      else await searchSerper(term);
    } catch (err) {
      setError(err.message || 'فشل البحث');
    }
    setLoading(false);
  }, [query, source, searchUnsplash, searchSerper]);

  useEffect(() => {
    if (defaultQuery && !searched.current) { searched.current = true; search(defaultQuery); }
  }, [defaultQuery, search]);

  const switchSource = (s) => {
    setSource(s);
    setResults([]);
    setError('');
    if (query.trim()) search(query);
  };

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={MODAL} onClick={e => e.stopPropagation()}>
        <div style={HEADER}>
          <input style={INPUT} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }}
            placeholder={source === SRC_UNSPLASH ? 'ابحث عن صورة... مثل: تفاح، أرز، حليب' : 'ابحث في المتاجر... مثل: تفاح، أرز، حليب'} autoFocus />
          <button onClick={search} disabled={loading}
            style={{ background: '#10b981', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', color: '#020f08', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
            {loading ? '...' : '🔍 بحث'}
          </button>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.6rem 0.8rem', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.25rem' }}>
          <button style={TAB(source === SRC_UNSPLASH)} onClick={() => switchSource(SRC_UNSPLASH)}>📸 Unsplash</button>
          <button style={TAB(source === SRC_SERPER)} onClick={() => switchSource(SRC_SERPER)}>🌐 ويب (Google)</button>
        </div>
        {loading && <div style={LOADING}>جاري البحث...</div>}
        {error && <div style={ERROR}>{error}</div>}
        {!loading && !error && results.length === 0 && query && (
          <div style={LOADING}>لا توجد نتائج. جرب كلمة أخرى.</div>
        )}
        <div style={GRID}>
          {results.map(photo => (
            <div key={photo.id} style={IMG_WRAP} onClick={() => onSelect(photo.url)} title={photo.alt}>
              <img src={photo.thumb} alt={photo.alt} style={IMG} loading="lazy" />
            </div>
          ))}
        </div>
        {results.length > 0 && (
          <div style={{ textAlign: 'center', padding: '0.5rem 1rem 1rem', color: '#64748b', fontSize: '0.75rem' }}>
            {source === SRC_UNSPLASH ? 'صور من Unsplash' : 'صور من Google Images'} — اضغط على صورة لاختيارها
          </div>
        )}
      </div>
    </div>
  );
}
