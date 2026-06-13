import { memo, useState, useContext, useEffect, useRef } from 'react';
import { StoreContext } from '../context/StoreContext';
import { showToast } from './Toast.jsx';
import KhafjiMap from './KhafjiMap';
import { customersApi } from '../supabase/customers';
import { ordersApi } from '../supabase/orders';
import { supabase } from '../supabase/client';
import { SHOP_POS, haversineKm } from '../utils/constants';

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
  const [position, setPosition] = useState(saved.position || null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [comingSoonMsg, setComingSoonMsg] = useState('');
  const [phone, setPhone] = useState(customerProfile?.phone || saved.phone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(customerProfile?.delivery_address || saved.deliveryAddress || '');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [serverFee, setServerFee] = useState(null); // null = loading, -1 = error, 0+ = confirmed
  const feeFetchRef = useRef(0);
  const locatedRef = useRef(false);
  const geoOptions = { enableHighAccuracy: true, timeout: 15000 };
  const onLocateSuccess = (pos) => {
    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setIsLocating(false);
    setLocationError('');
  };
  const handleLocate = () => {
    if (isLocating) return;
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم خاصية تحديد الموقع');
      return;
    }
    setLocationError('');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      onLocateSuccess,
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('⚠️ لم تسمح بتحديد الموقع — ارجع لإعدادات المتصفح > الموقع > سماح');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('⚠️ انتهت مهلة التحديد — تأكد من اتصال GPS أو WiFi');
        } else {
          setLocationError('⚠️ تعذر تحديد موقعك — حاول مرة أخرى');
        }
      },
      geoOptions
    );
  };
  useEffect(() => {
    if (locatedRef.current || !navigator.geolocation) return;
    locatedRef.current = true;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(onLocateSuccess, () => setIsLocating(false), geoOptions);
  }, []);
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
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: authEmail, password: loginPassword });
      if (signInErr) {
        const { data: userData } = await supabase.rpc('create_customer_auth_rpc', {
          p_email: authEmail, p_password: loginPassword, p_username: null
        });
        if (!userData?.existing) {
          try { await customersApi.create(authEmail, '', cleanPhone, null); } catch {}
        }
      }
      const { data: retryData } = await supabase.auth.signInWithPassword({ email: authEmail, password: loginPassword });
      if (retryData?.user) setUser(retryData.user);
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
            {isLocating && (
              <div style={{textAlign:'center',padding:'0.75rem',background:'#fef3c7',borderRadius:'8px',marginBottom:'0.75rem',color:'#92400e'}}>
                ⏳ جاري تحديد موقعك عبر GPS...
              </div>
            )}
            {position && !isLocating && (
              <div style={{textAlign:'center',padding:'0.75rem',background:'#d1fae5',borderRadius:'8px',marginBottom:'0.75rem',color:'#065f46'}}>
                ✓ تم تحديد موقعك بنجاح
              </div>
            )}
            {locationError && (
              <div style={{textAlign:'center',padding:'0.75rem',background:'#fee2e2',borderRadius:'8px',marginBottom:'0.75rem',color:'#991b1b',fontSize:'0.85rem'}}>
                {locationError}
              </div>
            )}
            <button onClick={handleLocate} disabled={isLocating} style={{width:'100%',padding:'0.85rem',border:'2px dashed var(--primary,#127443)',background:'transparent',borderRadius:'12px',fontSize:'1rem',fontWeight:600,color:'var(--primary,#127443)',cursor:'pointer',marginBottom:'0.75rem'}}>
              {isLocating ? 'جاري التحديد...' : '📍 تحديد موقعي'}
            </button>
            <div className="checkout-map">
              <KhafjiMap position={position} setPosition={setPosition} />
            </div>
          </div>

            <input
              className="checkout-phone-input"
              type="text"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="عنوان التوصيل (الشارع، رقم المبنى)"
              style={{ marginBottom: '0.75rem' }}
            />
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
    customersApi.update(user.email, customerProfile?.name || '', phone.trim(), deliveryAddress.trim() || '', '', '')
      .catch(() => {});
    saveCheckout(user.email, {
      phone: phone.trim(),
      position,
      deliveryAddress: deliveryAddress.trim() || null
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
          {!position && !isLocating && !locationError && <div className="checkout-hint-error">يرجى تحديد موقعك بالضغط على زر "تحديد موقعي"</div>}
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
