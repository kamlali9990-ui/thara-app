import { memo, useState, useCallback, useContext, useEffect, useRef } from 'react';
import { StoreContext } from '../context/StoreContext';
import { showToast } from './Toast.jsx';
import KhafjiMap from './KhafjiMap';
import { customersApi } from '../supabase/customers';
import { ordersApi } from '../supabase/orders';
import { supabase } from '../supabase/client';
import { KHAFJI_BOUNDS, SHOP_POS, haversineKm } from '../utils/constants';

const allNeighborhoods = [
  'العزيزية', 'الفيصلية', 'النهضة', 'الروضة', 'السلام', 'الخالدية', 'اليرموك',
  'الورود', 'المروج', 'الأندلس', 'الربوة', 'النزهة', 'الفيحاء', 'الزهور',
  'الواحة', 'الصفا', 'الخليج', 'الشاطئ', 'الدفي', 'السليمانية', 'الناصرية',
  'قرطبة', 'الشروق', 'المريكبات', 'الخفجي الجديدة',
];

function getSavedCheckout(userEmail) {
  try {
    const raw = localStorage.getItem('thara_checkout_' + userEmail);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCheckout(userEmail, data) {
  try {
    const prev = getSavedCheckout(userEmail);
    localStorage.setItem('thara_checkout_' + userEmail, JSON.stringify({ ...prev, ...data }));
  } catch {}
}

const CheckoutModal = memo(({ cartTotal, onClose, placeOrder }) => {
  const { user, customerProfile, setUser } = useContext(StoreContext);
  const saved = user?.email ? getSavedCheckout(user.email) : {};
  const dbLoc = (() => { try { return customerProfile?.location ? JSON.parse(customerProfile.location) : null; } catch { return null; } })();
  const [position, setPosition] = useState(dbLoc || saved.position || null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [comingSoonMsg, setComingSoonMsg] = useState('');
  const [phone, setPhone] = useState(customerProfile?.phone || saved.phone || '');
  const [notes, setNotes] = useState('');
  const [areaResults, setAreaResults] = useState([]);
  const [areaErr, setAreaErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(customerProfile?.delivery_address || saved.deliveryAddress || '');
  const [serverFee, setServerFee] = useState(null); // null = loading, -1 = error, 0+ = confirmed
  const feeFetchRef = useRef(0);
  useEffect(() => {
    if (!position) { setServerFee(null); return; }
    if (cartTotal >= 100) { setServerFee(0); return; }
    setServerFee(null);
    const id = ++feeFetchRef.current;
    ordersApi.getDeliveryFee(position.lat, position.lng, cartTotal).then(f => {
      if (id === feeFetchRef.current) setServerFee(f);
    }).catch(() => {
      if (id === feeFetchRef.current) setServerFee(-1);
    });
  }, [position?.lat, position?.lng, cartTotal]);
  const fee = (() => {
    if (serverFee >= 0) return serverFee;
    if (serverFee === -1 || !position) { // fallback or no position
      if (!position) return 0;
      const d = haversineKm(SHOP_POS, position);
      return d <= 3 ? 5 : d <= 6 ? 10 : d <= 10 ? 15 : 20;
    }
    return null; // loading
  })();
  const phoneReady = (() => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return false;
    if (digits.startsWith('966')) return digits.length === 12;
    if (digits.startsWith('05')) return digits.length === 10;
    return false;
  })();

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(customerProfile?.neighborhood || saved.neighborhood || '');

  const fetchAreaSuggestions = useCallback(async (q) => {
    const query = String(q || '').trim();
    if (!query) { setAreaResults([]); setAreaErr(''); return; }
    setAreaErr('');
    try {
      const viewbox = `${KHAFJI_BOUNDS.minLng},${KHAFJI_BOUNDS.maxLat},${KHAFJI_BOUNDS.maxLng},${KHAFJI_BOUNDS.minLat}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ar&countrycodes=sa&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(query + ' الخفجي')}`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await r.json();
      const mapped = Array.isArray(data) ? data.map(x => ({
        display: x.display_name,
        lat: parseFloat(x.lat),
        lng: parseFloat(x.lon),
      })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng)) : [];
      setAreaResults(mapped);
      if (mapped.length === 0) setAreaErr('لا توجد نتائج داخل الخفجي');
    } catch {
      setAreaErr('تعذر البحث حالياً');
    } finally {
    }
  }, []);

  const pickArea = useCallback((r) => {
    setPosition({ lat: r.lat, lng: r.lng });
    setAreaResults([]);
  }, []);

  const handleLoginCheckout = async () => {
    const digits = phone.replace(/\D/g, '');
    const valid = digits.startsWith('966') ? digits.length === 12 : digits.startsWith('05') && digits.length === 10;
    if (!valid) { setLoginError('رقم الجوال غير صحيح'); return; }
    if (!loginPassword || loginPassword.length < 6) { setLoginError('كلمة المرور 6 أحرف على الأقل'); return; }
    setLoggingIn(true);
    setLoginError('');
    try {
      const cleanPhone = phone.trim();
      const authEmail = `p${cleanPhone.replace(/[^0-9]/g, '')}@thara.app`;
      let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: authEmail, password: loginPassword });
      if (signInErr) {
        const { data: userData } = await supabase.rpc('create_customer_auth_rpc', {
          p_email: authEmail, p_password: loginPassword, p_username: null
        });
        if (!userData?.existing) {
          try { await customersApi.create(authEmail, '', cleanPhone, null); } catch {}
        }
        const { data: sessData, error: sessErr } = await supabase.rpc('create_customer_session_rpc', { p_email: authEmail });
        if (!sessErr && sessData?.refresh_token) {
          const { data: refData } = await supabase.auth.refreshSession({ refresh_token: sessData.refresh_token });
          signInData = refData;
        }
      }
      if (signInData?.user) setUser(signInData.user);
      setShowLoginPrompt(false);
    } catch {
      setLoginError('حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-sheet" onClick={e => e.stopPropagation()}>
        <div className="checkout-handle" />
        <div className="checkout-head">
          <h2>إتمام الطلب</h2>
          <button onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="checkout-body">
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">1</span> موقع التوصيل</div>
            <p className="checkout-hint">سيتم تحديد موقعك تلقائياً — يمكنك التعديل بالنقر على الخريطة</p>
            <div className="checkout-area-search">
              <select
                className="checkout-area-select"
                value={selectedNeighborhood}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSelectedNeighborhood(val);
                  setDeliveryAddress(val ? `حي ${val}` : '');
                  if (!val) return;
                  const query = `${val} الخفجي`;
                  try {
                    const viewbox = `${KHAFJI_BOUNDS.minLng},${KHAFJI_BOUNDS.maxLat},${KHAFJI_BOUNDS.maxLng},${KHAFJI_BOUNDS.minLat}`;
                    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ar&countrycodes=sa&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(query)}`;
                    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
                    const data = await r.json();
                    if (Array.isArray(data) && data.length > 0) {
                      const first = data[0];
                      setPosition({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
                    }
                  } catch (e) { console.error('[geocode neighborhood]', e); }
                }}
              >
                <option value="">-- اختر الحي --</option>
                {allNeighborhoods.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {areaErr && <div className="checkout-area-err">{areaErr}</div>}
              {areaResults.length > 0 && (
                <div className="checkout-area-results">
                  {areaResults.map((r, i) => (
                    <button key={i} type="button" className="checkout-area-item" onClick={() => pickArea(r)}>
                      {r.display}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={`checkout-map ${position ? '' : 'checkout-map-empty'}`}>
              <KhafjiMap position={position} setPosition={setPosition} />
            </div>
            {position && <div className="checkout-confirmed">✓ تم تحديد الموقع</div>}
          </div>

            {deliveryAddress && (
              <input
                className="checkout-phone-input"
                type="text"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="عنوان التوصيل (الشارع، رقم المبنى)"
                style={{ marginBottom: '0.75rem' }}
              />
            )}
            <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">2</span> بيانات التواصل</div>
            <input
              className="checkout-phone-input"
              type="tel"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              maxLength={10}
            />
            <textarea
              className="checkout-notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات الطلب، مثل رقم الشقة أو وقت التوصيل المناسب"
              rows="3"
            />
          </div>
          <div className="checkout-section">
            <div className="checkout-section-title"><span className="checkout-num">3</span> طريقة الدفع</div>
            <div className="checkout-payments">
              {[
                { id: 'cod', label: 'الدفع عند الاستلام', icon: '💵' },
                { id: 'mada', label: 'مدى', icon: '💳' },
                { id: 'stc', label: 'STC Pay', icon: '📱' },
                { id: 'barq', label: 'بنك برق', icon: '💳' },
                { id: '360', label: 'بنك 360', icon: '🔄' },
                { id: 'bank_transfer', label: 'تحويل بنكي', icon: '🏦' },
              ].map(m => (
                <button key={m.id} className={`checkout-pay-btn ${paymentMethod === m.id ? 'active' : ''}`}
                  onClick={() => {
                    if (m.id === 'cod') { setPaymentMethod('cod'); setComingSoonMsg(''); }
                    else { setComingSoonMsg('سيتم إضافة ' + m.label + ' قريباً'); }
                  }}>
                  <span className="checkout-pay-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
              {comingSoonMsg && <div className="checkout-coming-soon">{comingSoonMsg}</div>}
            </div>
          </div>
            <div className="checkout-total-box">
            <div className="checkout-total-row"><span>المجموع الفرعي</span><span>{cartTotal.toFixed(2)} ر.س</span></div>
            <div className="checkout-total-row">{fee === null ? <span>رسوم التوصيل <span className="checkout-free" style={{fontSize:'0.8rem'}}>جاري الحساب...</span></span> : fee === 0 ? <span>رسوم التوصيل <span className="checkout-free">مجاناً</span></span> : <span>رسوم التوصيل</span>}<span>{fee === null ? '...' : fee === 0 ? '0' : fee.toFixed(2)} ر.س</span></div>
            <div className="checkout-total-row checkout-total-final"><span>الإجمالي</span><span>{(fee === null ? cartTotal : cartTotal + fee).toFixed(2)} ر.س</span></div>
          </div>
<button className="checkout-confirm-btn" onClick={async () => {
  if (submitting) return;
  if (!user) {
    setShowLoginPrompt(true);
    return;
  }
  if (!position || !phoneReady || fee === null) return;
  if (!navigator.onLine) {
    showToast('أنت غير متصل بالإنترنت، يرجى الاتصال أولاً', 'error');
    setSubmitting(false);
    return;
  }
  if (user?.email) {
    const locStr = position ? JSON.stringify({ lat: position.lat, lng: position.lng }) : '';
    customersApi.update(user.email, customerProfile?.name || '', phone.trim(), deliveryAddress.trim() || '', selectedNeighborhood, locStr)
      .catch(() => {});
    saveCheckout(user.email, {
      phone: phone.trim(),
      position,
      deliveryAddress: deliveryAddress.trim() || null,
      neighborhood: selectedNeighborhood,
    });
  }
  setSubmitting(true);
  try {
    await placeOrder({
      location: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`,
      paymentMethod,
      phone: phone.trim(),
      notes: notes.trim(),
      deliveryFee: fee,
      deliveryAddress: deliveryAddress.trim() || null
    }, fee);
  } catch (e) {
    showToast(e?.message || 'فشل إرسال الطلب', 'error');
    setSubmitting(false);
    return;
  }
  onClose();
}} disabled={submitting || !position || !phoneReady || fee === null}>{submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}</button>
          {!position && <div className="checkout-hint-error">يرجى تحديد موقع التوصيل على الخريطة</div>}
{position && fee === null && <div className="checkout-hint-error">جاري حساب رسوم التوصيل من النظام...</div>}
          {!phoneReady && phone.trim() && <div className="checkout-hint-error">رقم الجوال غير صحيح، يجب أن يبدأ بـ 05 (مثال: 0500000000)</div>}

          {/* Login Prompt Modal */}
          {showLoginPrompt && (
            <div className="delivery-info-overlay" onClick={() => setShowLoginPrompt(false)}>
              <div className="auth-prompt-modal" onClick={(e) => e.stopPropagation()}>
                <button className="delivery-info-close" onClick={() => setShowLoginPrompt(false)}>✕</button>
                <h3 style={{ color: 'var(--primary, #127443)', margin: '0 0 0.5rem' }}>أكمل طلبك</h3>
                <p className="auth-prompt-text">سجل برقم الجوال لإتمام الطلب — إن لم يكن لديك حساب سيتم إنشاؤه تلقائياً</p>
                <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>رقم الجوال</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx" required className="auth-input" dir="ltr" />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>كلمة المرور</label>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••" required className="auth-input" />
                </div>
                {loginError && <div className="auth-error">{loginError}</div>}
                <button className="auth-prompt-btn" disabled={loggingIn} onClick={handleLoginCheckout}>
                  {loggingIn ? 'جاري...' : 'تسجيل الدخول وإتمام الطلب'}
                </button>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                  نسيت كلمة المرور؟ <strong style={{ color: 'var(--primary, #127443)' }}>تواصل مع الإدارة لاسترجاعها</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default CheckoutModal;
