import { memo } from 'react';
import { productImgError } from '../utils/constants';
import type { CartItem } from '../types';

interface CartScreenProps {
  cart: CartItem[];
  cartTotal: number;
  cartCount: number;
  updateCartQty: (id: number, delta: number) => void;
  removeFromCart: (id: number) => void;
  onClose: () => void;
  onCheckout: () => void;
}

const CartScreen = memo<CartScreenProps>(({ cart, cartTotal, cartCount, updateCartQty, removeFromCart, onClose, onCheckout }) => (
  <div className="cart-screen-overlay" onClick={onClose}>
    <div className="cart-screen" onClick={e => e.stopPropagation()}>
      <div className="cart-screen-header">
        <div className="cart-screen-handle" />
        <div className="cart-screen-title-row">
          <h2>سلة المشتريات</h2>
          <span className="cart-screen-count">{cartCount} منتج</span>
        </div>
        <button className="cart-screen-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="cart-screen-body">
        {cart.length === 0 ? (
          <div className="cart-screen-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <p>السلة فارغة</p>
          </div>
        ) : cart.map(item => (
          <div key={item.id} className="cart-screen-item">
            <img src={(item as any).imageUrl} alt={item.name} className="cart-screen-item-img"
              onError={productImgError} />
            <div className="cart-screen-item-info">
              <div className="cart-screen-item-name">{item.name}</div>
              <div className="cart-screen-item-price">{((item as any).currentPrice ?? item.price ?? 0).toFixed(2)} ر.س</div>
              <div className="cart-screen-item-controls">
                <button className="cart-screen-qty circular" onClick={() => updateCartQty(item.id, -1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span className="cart-screen-qty-value">{item.qty}</span>
                <button className="cart-screen-qty circular" onClick={() => updateCartQty(item.id, 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button className="cart-screen-item-remove" onClick={() => removeFromCart(item.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-screen-footer">
        <div className="cart-screen-total-row">
          <span>المجموع</span>
          <span className="cart-screen-total-price">{cartTotal.toFixed(2)} ر.س</span>
        </div>
        <button className="cart-screen-checkout-btn" disabled={cart.length === 0} onClick={onCheckout}>
          تأكيد الطلب
        </button>
      </div>
    </div>
  </div>
));

export default CartScreen;
