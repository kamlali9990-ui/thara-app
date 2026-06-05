import React, { useState, useEffect, useRef, useContext } from 'react';
import { StoreContext } from '../../context/StoreContext';
import { supabase } from '../../supabase/client';
import { showToast } from '../Toast';
import { safeProductUrl } from '../../utils/constants';

export default function AutoImageManager({ products, updateProduct }) {
  const { staffRole } = useContext(StoreContext);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('thara_serper_key') || '');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const isRunningRef = useRef(isRunning);
  const logsRef = useRef(logs);
  const apiKeyRef = useRef(apiKey);

  const isAdminOrManager = staffRole === 'admin' || staffRole === 'manager';

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
    localStorage.setItem('thara_serper_key', apiKey);
  }, [apiKey]);

  const addLog = (msg, type = 'info') => {
    const newLog = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const getMissingImageProducts = () => {
    return products.filter(p => {
      const url = p.imageUrl;
      if (!url || typeof url !== 'string') return true; // No image
      if (url.includes('res.cloudinary.com')) return false; // Already has Cloudinary image
      if (url.includes('data:')) return false; // Default placeholder
      if (url.includes('LOGO.jpg') || url.includes('logo222')) return false; // Default logo
      return true; // Has local image or broken external image
    });
  };

  const startManager = async () => {
    if (!apiKeyRef.current) {
      showToast('الرجاء إدخال مفتاح Serper API أولاً', 'error');
      return;
    }

    const targets = getMissingImageProducts();
    if (targets.length === 0) {
      addLog('🎉 لا توجد منتجات تحتاج لمعالجة الصور! كل شيء محدث.', 'success');
      showToast('كل المنتجات تحتوي على صور جاهزة.', 'success');
      return;
    }

    setIsRunning(true);
    addLog(`🚀 بدء التشغيل! تم العثور على ${targets.length} منتج يحتاج لمعالجة.`, 'info');
    setProgress({ current: 0, total: targets.length });

    let done = 0;
    
    // Get Cloudinary Signature for direct upload
    let sigData = null;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    try {
      const sigRes = await fetch(baseUrl.replace(/\/+$/, '') + '/functions/v1/cloudinary-sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      if (!sigRes.ok) throw new Error('فشل التوقيع');
      sigData = await sigRes.json();
    } catch {
      addLog('❌ فشل الاتصال بخدمة رفع Cloudinary. تم الإيقاف.', 'error');
      setIsRunning(false);
      return;
    }

    // Process Loop
    for (const p of targets) {
      if (!isRunningRef.current) {
        addLog('⏸️ تم إيقاف المعالجة مؤقتاً.', 'warning');
        break;
      }

      addLog(`📦 معالجة: ${p.name}`);
      let targetUrl = null;

      // Check cache for this specific product ID (if we already know it doesn't exist online)
      const cacheKey = `thara_img_cache_${p.id}`;
      if (localStorage.getItem(cacheKey) === 'not_found') {
        addLog(`⏭️ تم التخطي: لا توجد صورة لهذا المنتج مسبقاً (مخزن مؤقتاً).`, 'warning');
        done++;
        setProgress({ current: done, total: targets.length });
        continue;
      }

      // Step 1: If it's a local image (e.g. /products/1.jpg), we could upload it directly, 
      // but in frontend we can't read local files via path easily. 
      // We will rely on Serper for everything that is not Cloudinary.

      try {
        addLog(`🔍 جاري البحث في Serper...`, 'info');
        const searchRes = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKeyRef.current, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: p.name + ' ' + (p.category || ''), num: 1, hl: 'ar', gl: 'sa' })
        });

        if (!searchRes.ok) {
           addLog(`❌ خطأ في البحث (تأكد من الرصيد أو مفتاح API)`, 'error');
           setIsRunning(false);
           break;
        }

        const data = await searchRes.json();
        if (data.images && data.images.length > 0) {
          let foundUrl = data.images[0].imageUrl;
          if (foundUrl && typeof foundUrl === 'string' && foundUrl.startsWith('http://')) {
            foundUrl = 'https://' + foundUrl.slice(7);
          }
          
          addLog(`☁️ تم العثور على صورة، جاري الرفع لـ Cloudinary...`, 'info');
          
          // Upload to Cloudinary
          const form = new FormData();
          form.append('file', foundUrl);
          form.append('api_key', sigData.api_key);
          form.append('timestamp', String(sigData.timestamp));
          form.append('signature', sigData.signature);
          form.append('folder', 'thara-products');
          
          const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`, { method: 'POST', body: form });
          
          if (!upRes.ok) {
             addLog(`⚠️ لم يقبل Cloudinary الرابط المصدر، سيتم البحث مجدداً لاحقاً.`, 'warning');
          } else {
             const upData = await upRes.json();
             if (upData.secure_url) {
               addLog(`🗄️ تم الرفع! جاري تحديث قاعدة البيانات...`, 'success');
               await updateProduct(p.id, { imageUrl: upData.secure_url });
               addLog(`✅ اكتمل تحديث المنتج: ${p.name}`, 'success');
             }
          }
        } else {
          addLog(`⚠️ لم يتم العثور على صور لهذا المنتج.`, 'warning');
          localStorage.setItem(cacheKey, 'not_found');
        }
      } catch (err) {
        addLog(`❌ خطأ غير متوقع: ${err.message}`, 'error');
      }

      done++;
      setProgress({ current: done, total: targets.length });
      
      // Delay 3 seconds
      await new Promise(r => setTimeout(r, 3000));
    }

    if (isRunningRef.current && done >= targets.length) {
      addLog(`🎉 اكتملت معالجة جميع المنتجات بنجاح!`, 'success');
      setIsRunning(false);
    }
  };

  if (!isAdminOrManager) return null;

  return (
    <div className="admin-store-section">
      <h2 className="admin-section-title">🤖 مساعد الصور الآلي</h2>
      <p style={{ color: '#cbd5e1', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
        هذا المساعد يقوم بالبحث تلقائياً عن صور للمنتجات التي لا تمتلك صورة، ويرفعها إلى Cloudinary، ثم يحدث قاعدة البيانات.<br/>
        <strong style={{ color: '#fbbf24' }}>ملاحظة هامة:</strong> يجب إبقاء هذه الصفحة مفتوحة لكي يستمر المساعد في العمل.
      </p>

      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            مفتاح Serper.dev API:
          </label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={e => setApiKey(e.target.value)}
            placeholder="أدخل مفتاح API الخاص بـ Serper.dev"
            style={{ 
              width: '100%', maxWidth: '400px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', 
              borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#fff', outline: 'none', fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button 
            className="btn" 
            onClick={startManager} 
            disabled={isRunning}
            style={{ 
              background: isRunning ? 'rgba(34,197,94,0.2)' : '#22c55e', 
              color: isRunning ? '#86efac' : '#fff',
              border: 'none', minWidth: '120px'
            }}
          >
            {isRunning ? '▶️ قيد العمل...' : '▶️ تشغيل المساعد'}
          </button>
          
          <button 
            className="btn" 
            onClick={() => setIsRunning(false)} 
            disabled={!isRunning}
            style={{ 
              background: !isRunning ? 'rgba(239,68,68,0.2)' : '#ef4444', 
              color: !isRunning ? '#fca5a5' : '#fff',
              border: 'none', minWidth: '120px'
            }}
          >
            ⏸️ إيقاف مؤقت
          </button>

          {progress.total > 0 && (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>
              التقدم: {progress.current} / {progress.total}
            </span>
          )}
        </div>

        {progress.total > 0 && (
          <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: `${(progress.current / progress.total) * 100}%`, height: '100%', 
              background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', borderRadius: 5, transition: 'width 0.3s' 
            }} />
          </div>
        )}

        <div style={{ background: '#000', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 1rem', background: '#111', borderBottom: '1px solid #333', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>سجل العمليات المباشر (Live Logs)</span>
            <button onClick={() => setLogs([])} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>مسح السجل</button>
          </div>
          <div style={{ height: '300px', overflowY: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column-reverse' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#444', textAlign: 'center', marginTop: '2rem' }}>لا توجد عمليات مسجلة بعد...</div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ 
                  marginBottom: '0.4rem', 
                  color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : log.type === 'warning' ? '#fbbf24' : '#cbd5e1'
                }}>
                  <span style={{ color: '#64748b', marginRight: '0.5rem' }}>[{log.time}]</span>
                  {log.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
