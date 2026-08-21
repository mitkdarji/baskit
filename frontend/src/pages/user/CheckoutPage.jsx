import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService, orderService } from '../../services/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { CreditCard, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const CheckoutPage = () => {
  const { refreshCartCount } = useCart();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    cartService.getCart().then(setCart).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    try {
      const placedOrder = await orderService.checkout(address);
      setOrder(placedOrder);
      refreshCartCount();
      toast.success('Order placed!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Checkout failed');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  if (order) {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto', textAlign: 'center' }}>
        <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ marginBottom: '0.5rem' }}>Order Confirmed</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Order #{order.id} for {formatPrice(order.total_amount)} has been placed. This is a demo checkout — no real payment was processed.
        </p>
        <Link to="/profile"><button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>View My Orders <ArrowRight size={18} /></button></Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-state">
        <h3 style={{ fontWeight: 700 }}>Your cart is empty</h3>
        <Link to="/"><button style={{ margin: '1rem auto 0' }}>Browse Products</button></Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CreditCard size={28} color="var(--accent)" /> Checkout
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Demo checkout — no real payment is processed.</p>

      <form onSubmit={handlePlaceOrder} className="panel">
        <label>Shipping Address</label>
        <textarea className="input" rows={3} placeholder="House no, street, city, PIN code" value={address} onChange={(e) => setAddress(e.target.value)} required />

        <div style={{ margin: '1rem 0', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {cart.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span>{item.product.title} × {item.quantity}</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
            <span>Total</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
        </div>

        <button type="submit" disabled={placing} className="btn-accent btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {placing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
          {placing ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

export default CheckoutPage;
