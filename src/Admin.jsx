import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from './context/StoreContext';

export default function Admin() {
  const { 
    allProducts, orders, updateOrderStatus, addProduct, updateProduct, deleteProduct,
    chatMessages, sendMessage, logout
  } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders');

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">لوحة التاجر</h2>
        
        <button className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>الطلبات ({orders.length})</button>
        <button className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>المنتجات</button>
        <button className={`admin-tab ${activeTab === 'offers' ? 'active' : ''}`} onClick={() => setActiveTab('offers')}>العروض الخاصة</button>
        <button className={`admin-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>خدمة العملاء</button>
        
        <div className="admin-sidebar-footer">
          <a href="/" className="admin-sidebar-link">العودة للمتجر</a>
          <br/><br/>
          <button onClick={handleLogout} className="admin-tab" style={{ color: 'rgba(255,255,255,0.7)' }}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'orders' && <AdminOrders orders={orders} updateOrderStatus={updateOrderStatus} />}
        {activeTab === 'products' && <AdminProducts products={allProducts} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} />}
        {activeTab === 'offers' && <AdminOffers products={allProducts} updateProduct={updateProduct} />}
        {activeTab === 'chat' && <AdminChat chatMessages={chatMessages} sendMessage={sendMessage} />}
      </main>
    </div>
  );
}

function AdminOrders({ orders, updateOrderStatus }) {
  if(orders.length === 0) return <h3 className="empty-orders">لا توجد طلبات حالياً.</h3>;
  return (
    <div>
      <h2 className="admin-section-title">إدارة الطلبات</h2>
      <div className="admin-orders-list">
        {orders.map(order => (
          <div key={order.id} className="admin-card">
            <div className="admin-card-header">
              <div>
                <strong>طلب رقم:</strong> #{order.id.slice(-6)} <br/>
                <small>{new Date(order.date).toLocaleString('ar-SA')}</small>
              </div>
              <div className="admin-order-right" style={{textAlign: 'left'}}>
                <strong>الإجمالي:</strong> <span className="order-total-text">{order.total.toFixed(2)} ر.س</span><br/>
                <select 
                  value={order.status} 
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  className="order-status-select"
                >
                  <option value="جديد">جديد</option>
                  <option value="قيد التحضير">قيد التحضير</option>
                  <option value="في الطريق">في الطريق</option>
                  <option value="مكتمل">مكتمل</option>
                  <option value="ملغي">ملغي</option>
                </select>
              </div>
            </div>
            <div>
              <strong>المنتجات المطلوبة:</strong>
              <ul className="order-items-list">
                {order.items.map(item => (
                  <li key={item.id}>{item.name} (الكمية: {item.qty})</li>
                ))}
              </ul>
            </div>
            <div className="admin-card-info">
              <strong>الدفع:</strong> {order.paymentMethod} | <strong>الموقع:</strong> {order.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProducts({ products, addProduct, updateProduct, deleteProduct }) {
  const handleAddDummy = () => {
    addProduct({
      name: 'منتج جديد ' + Math.floor(Math.random() * 1000),
      category: 'المؤن',
      price: 10,
      stock_quantity: 10,
      imageUrl: 'https://placehold.co/400x400/127443/FFFFFF?text=جديد',
      unit: 'حبة',
      isOffer: false
    });
  };

  return (
    <div>
      <div className="admin-products-header">
        <h2 className="admin-section-title">إدارة المنتجات ({products.length})</h2>
        <button className="btn" onClick={handleAddDummy}>+ إضافة منتج تجريبي</button>
      </div>
      
      <div className="admin-products-grid">
        {products.map(p => (
          <div key={p.id} className="admin-product-card">
            <img src={p.imageUrl} alt="" className="admin-product-img" />
            <input 
              type="text" 
              value={p.name} 
              onChange={e => updateProduct(p.id, {name: e.target.value})} 
              className="admin-product-field"
            />
            <div className="admin-input-row">
              <input type="number" value={p.price} onChange={e => updateProduct(p.id, {price: parseFloat(e.target.value) || 0})} className="admin-input-half" placeholder="السعر" />
              <input type="text" value={p.category} onChange={e => updateProduct(p.id, {category: e.target.value})} className="admin-input-half" />
            </div>
            <button className="admin-delete-btn" onClick={() => deleteProduct(p.id)}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminOffers({ products, updateProduct }) {
  return (
    <div>
      <h2 className="admin-section-title">إدارة العروض الخاصة</h2>
      <p style={{marginBottom: '1rem', color: 'var(--text-light)'}}>فعل خيار العرض وحدد سعر العرض ليظهر المنتج في قسم العروض في التطبيق.</p>
      
      <div className="admin-offers-list">
        {products.map(p => (
          <div key={p.id} className="admin-offer-row">
            <img src={p.imageUrl} className="admin-offer-img" />
            <div className="admin-offer-info">
              <div className="admin-offer-name">{p.name}</div>
              <div className="admin-offer-price">السعر الأصلي: {p.price.toFixed(2)} ر.س</div>
            </div>
            
            <label className="admin-offer-checkbox">
              <input type="checkbox" checked={p.isOffer || false} onChange={e => updateProduct(p.id, {isOffer: e.target.checked, offerPrice: p.price})} />
              ضمن العروض
            </label>

            {p.isOffer && (
              <div className="admin-offer-price-input">
                سعر العرض: 
                <input 
                  type="number" 
                  value={p.offerPrice || 0} 
                  onChange={e => updateProduct(p.id, {offerPrice: parseFloat(e.target.value) || 0})}
                  className="admin-offer-input"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminChat({ chatMessages, sendMessage }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if(!text.trim()) return;
    sendMessage('admin', text);
    setText('');
  };

  return (
    <div className="admin-chat-container">
      <h2 className="admin-section-title">خدمة العملاء (محادثات مباشرة)</h2>
      
      <div className="admin-chat-body">
        {chatMessages.length === 0 && <p className="empty-chat">لا توجد رسائل بعد.</p>}
        {chatMessages.map(m => (
          <div key={m.id} className={`admin-bubble ${m.sender === 'admin' ? 'admin' : 'customer'}`}>
            <div className="admin-bubble-sender">{m.sender === 'admin' ? 'أنت (التاجر)' : 'العميل'}</div>
            <div>{m.text}</div>
            <div className="admin-bubble-time">{m.time}</div>
          </div>
        ))}
      </div>
      
      <div className="admin-chat-input-area">
        <input 
          type="text" 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyDown={e => e.key==='Enter' && handleSend()}
          placeholder="اكتب ردك للعميل هنا..."
          className="admin-chat-input"
        />
        <button className="btn" onClick={handleSend}>إرسال</button>
      </div>
    </div>
  );
}
