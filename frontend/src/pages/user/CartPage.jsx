import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { ShoppingCart, Trash2, ArrowRight, Loader2, Package } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const CartPage = () => {
  const { refreshCartCount } = useCart();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to load cart', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCart(); }, []);

  const updateQty = async (itemId, quantity) => {
    try {
      const data = await cartService.updateItem(itemId, quantity);
      setCart(data);
      refreshCartCount();
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const data = await cartService.removeItem(itemId);
      setCart(data);
      refreshCartCount();
      toast('Removed from cart', { icon: '🗑️' });
    } catch {
      toast.error('Failed to remove item');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ShoppingCart size={30} color="var(--accent)" /> Your Cart
      </h1>

      {cart.items.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={56} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>Your cart is empty</h3>
          <Link to="/"><button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem auto 0' }}>Browse Products <ArrowRight size={18} /></button></Link>
        </div>
      ) : (
        <>
          <div className="panel">
            {cart.items.map(item => (
              <div key={item.id} className="cart-line">
                <div className="image-container">
                  {item.product.image_url ? <img src={item.product.image_url} alt={item.product.title} /> : <Package size={28} />}
                </div>
                <div style={{ flex: 1 }}>
                  <Link to={`/product/${item.product.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{item.product.title}</Link>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{formatPrice(item.product.price)} each</div>
                </div>
                <div className="qty-stepper">
                  <button type="button" onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.id, Math.min(item.product.stock, item.quantity + 1))}>+</button>
                </div>
                <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 700 }}>{formatPrice(item.subtotal)}</div>
                <button onClick={() => removeItem(item.id)} className="btn-sm btn-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="panel" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Total</div>
              <div className="price-tag" style={{ fontSize: '1.6rem' }}>{formatPrice(cart.total)}</div>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
