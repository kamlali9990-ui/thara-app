import React, { useContext, useState, useRef, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';
import { categories } from './data/mockData';
import L from 'leaflet';

export default function App() {
  const { 
    products, 
    cart, addToCart, removeFromCart, updateCartQty, cartTotal,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    placeOrder, getProductPrice, chatMessages, sendMessage,
    user, logout
  } = useContext(StoreContext);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  // Splash Screen
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <img src="/LOGO.jpg" alt="أسواق ثرا الشرق ون" className="splash-logo" />
          <h1 className="splash-title">أسواق ثرا الشرق ون</h1>
          <p className="splash-subtitle">توصيل لباب بيتك في الخفجي</p>
          <div className="splash-loader">
            <div className="splash-loader-bar"></div>
          </div>
      </div>
    </div>
  );
  }

  return (
    <div className="app-wrapper">
      <header>
        <div className="container header-content">
          <div className="logo-section">
            <img src="/LOGO.jpg" alt="أسواق ثرا الشرق ون" className="logo-img" onError={(e) => { e.target.src = 'https://placehold.co/45x45/127443/FFFFFF?text=ث' }} />
            <div>
              <h1 className="header-title">ثرا الشرق ون</h1>
              <span className="header-tagline">توصيل الخفجي</span>
            </div>
          </div>
          <div className="header-actions">
            {user ? (
              <div className="user-menu">
                <span className="user-email">{user.email?.split('@')[0]}</span>
                <button className="btn-logout" onClick={logout} title="تسجيل الخروج">🚪</button>
              </div>
            ) : (
              <Link to="/login" className="btn-login-header">دخول</Link>
            )}
            <button className="btn-cart-icon" onClick={() => setIsCartOpen(true)}>
              <span className="cart-icon-emoji">🛒</span>
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((sum, item) => sum + item.qty, 0)}</span>}
            </button>
          </div>
        </div>
        <div className="container container-no-pad-top">
          <div className="search-bar">
            <input 
              type="text" 
              className="search-input" 
              placeholder="🔍 ابحث عن المنتجات..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <img src="/LOGO.jpg" alt="" className="hero-logo" />
          <div className="hero-text">
            <h2 className="hero-title">أسواق ثرا الشرق ون</h2>
            <p className="hero-desc">كل ما تحتاجه من السوبرماركت يوصلك لباب بيتك 🚛</p>
            <div className="hero-badges">
              <span className="hero-badge">🕐 توصيل سريع</span>
              <span className="hero-badge">💰 أسعار منافسة</span>
              <span className="hero-badge">📦 +500 منتج</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container main-content">
        <div className="categories">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
          {products.length === 0 && (
            <div className="no-products">
              <h3>لا توجد منتجات مطابقة للبحث.</h3>
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>سلة المشتريات</h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>✕</button>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? <p className="cart-empty">السلة فارغة.</p> : null}
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.imageUrl} alt={item.name} className="cart-item-img" onError={(e) => { e.target.src = 'https://placehold.co/100x100/127443/FFFFFF?text=IMG'; }} />
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <div className="cart-item-price">{(item.currentPrice || item.price).toFixed(2)} ر.س</div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                      <span>{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                      <button className="cart-remove-btn" onClick={() => removeFromCart(item.id)}>حذف</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="summary-row">
                <span>المجموع الفرعي</span>
                <span>{cartTotal.toFixed(2)} ر.س</span>
              </div>
              <div className="summary-row total">
                <span>الإجمالي</span>
                <span>{cartTotal.toFixed(2)} ر.س</span>
              </div>
              <button 
                className="btn checkout-btn" 
                disabled={cart.length === 0}
                onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
              >
                إتمام الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal 
          cartTotal={cartTotal} 
          onClose={() => setIsCheckoutOpen(false)} 
          placeOrder={placeOrder}
        />
      )}

      {/* Floating Chat Widget */}
      <ChatWidget chatMessages={chatMessages} sendMessage={sendMessage} />
    </div>
  );
}

const ProductCard = memo(({ product, addToCart }) => {
  return (
    <div className="product-card">
      <div className="product-img-wrapper">
        {product.isOffer && <span className="offer-tag">عرض 🔥</span>}
        <img src={product.imageUrl} alt={product.name} className="product-img" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/400x400/127443/FFFFFF?text=' + encodeURIComponent(product.name); }} />
        <button className="add-quick-btn" onClick={() => addToCart(product)}>+</button>
      </div>
      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <h3 className="product-title">{product.name}</h3>
        <div className="product-footer">
          <span className="product-price">
            {product.isOffer ? (
              <>
                <span className="offer-old-price">{product.price.toFixed(2)}</span>
                {product.offerPrice.toFixed(2)}
              </>
            ) : (
              product.price.toFixed(2)
            )} <small>ر.س</small>
          </span>
        </div>
      </div>
    </div>
  );
});

const ChatWidget = memo(({ chatMessages, sendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleSend = () => {
    if(!text.trim()) return;
    sendMessage('customer', text);
    setText('');
  };

  return (
    <div className="chat-widget">
      <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>💬</button>
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">تحدث معنا</div>
          <div className="chat-body">
            {chatMessages.map(m => (
              <div key={m.id} className={`chat-bubble ${m.sender === 'customer' ? 'me' : 'them'}`}>
                {m.text}
                <div className="chat-time">{m.time}</div>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSend()} placeholder="اكتب رسالة..." />
            <button onClick={handleSend}>إرسال</button>
          </div>
        </div>
      )}
    </div>
  )
});

const KhafjiMap = memo(({ position, setPosition }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const khafjiCenter = [28.4355, 48.4988];
    const khafjiBounds = L.latLngBounds([28.35, 48.40], [28.50, 48.55]);

    const map = L.map(mapRef.current, {
      center: khafjiCenter,
      zoom: 13,
      maxBounds: khafjiBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 12
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
        }).addTo(map);
      }
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 400);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return <div ref={mapRef} className="khafji-map-inner" />;
});

const CheckoutModal = memo(({ cartTotal, onClose, placeOrder }) => {
  const [position, setPosition] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mada');
  
  const deliveryFee = cartTotal >= 100 ? 0 : 15;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="checkout-title">إتمام الطلب</h2>
        
        <div className="form-group">
          <label>1. موقع التوصيل (الخفجي فقط)</label>
          <p className="map-hint">الرجاء النقر على الخريطة لتحديد موقع بيتك بدقة:</p>
          <div className={`map-container ${position ? 'map-container-placed' : 'map-container-empty'}`}>
            <KhafjiMap position={position} setPosition={setPosition} />
          </div>
          {position && <div className="location-confirmed">✓ تم تحديد الموقع بنجاح</div>}
        </div>

        <div className="form-group">
          <label>2. طريقة الدفع</label>
          <div className="payment-methods">
            {[
              {id: 'mada', name: 'مدى'}, 
              {id: 'credit_card', name: 'بطاقة ائتمانية'}, 
              {id: 'apple_pay', name: 'Apple Pay'}, 
              {id: 'bank_transfer', name: 'تحويل بنكي'}, 
              {id: 'cod', name: 'الدفع عند الاستلام'}
            ].map(method => (
              <div 
                key={method.id}
                className={`payment-method ${paymentMethod === method.id ? 'active' : ''}`}
                onClick={() => setPaymentMethod(method.id)}
              >
                {method.name}
              </div>
            ))}
          </div>
        </div>

        {paymentMethod === 'bank_transfer' && (
          <div className="payment-group">
            <label>إرفاق إيصال التحويل</label>
            <p className="payment-label">IBAN: SA12 3456 7890 1234 5678 90</p>
            <input type="file" className="form-control" accept="image/*" />
          </div>
        )}

        <div className="order-summary">
          <div className="order-summary-row">
            <span>المجموع الفرعي</span>
            <span>{cartTotal.toFixed(2)} ر.س</span>
          </div>
          <div className={`order-summary-row ${deliveryFee === 0 ? 'delivery' : ''}`}>
            <span>رسوم التوصيل {deliveryFee === 0 && '(مجاني فوق 100 ر.س)'}</span>
            <span>{deliveryFee === 0 ? 'مجاناً' : `${deliveryFee.toFixed(2)} ر.س`}</span>
          </div>
          <div className="order-summary-total">
            <span>الإجمالي المطلوب</span>
            <span>{(cartTotal + deliveryFee).toFixed(2)} ر.س</span>
          </div>
        </div>

        <button 
          className="btn order-confirm-btn"
          onClick={() => {
            if(!position) return alert('الرجاء النقر على الخريطة لتحديد موقعك أولاً!');
            placeOrder({
              location: `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`,
              paymentMethod
            });
            alert('تم تأكيد الطلب بنجاح! جاري المزامنة مع لوحة التاجر.');
            onClose();
          }}
        >
          تأكيد الطلب
        </button>
      </div>
    </div>
  );
});
