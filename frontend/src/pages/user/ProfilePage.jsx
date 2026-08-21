import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userService, productService, inquiryService, orderService, reviewService } from '../../services/api';
import {
  UserCircle, Settings, List, Inbox, Send, Loader2, Check,
  Package, Trash2, Pencil, Eye, MessageSquare, Phone, ShoppingBag, ShieldCheck,
} from 'lucide-react';
import { formatPrice, formatDate, titleCase, timeAgo } from '../../utils/format';

/* ── Account tab ── */
const AccountTab = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [trust, setTrust] = useState(null);

  useEffect(() => {
    if (user?.id) reviewService.getSellerTrustScore(user.id).then(setTrust).catch(() => {});
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({ name, phone });
      toast.success('Profile updated');
      onProfileUpdated?.();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <label>Name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <label>Phone</label>
      <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
      <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Changes
      </button>
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--muted)' }}>
        <div><strong>Role:</strong> {user?.role?.toUpperCase()}</div>
        <div><strong>Member since:</strong> {formatDate(user?.created_at)}</div>
      </div>
      {trust && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={`trust-badge ${trust.trust_label === 'Top Rated' ? 'top-rated' : trust.trust_label === 'New Seller' ? 'new-seller' : ''}`}>
            <ShieldCheck size={12} /> {trust.trust_label}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{trust.avg_rating.toFixed(1)}★ avg · {trust.review_count} reviews · {trust.orders_fulfilled} orders fulfilled</span>
        </div>
      )}
    </div>
  );
};

/* ── My Listings tab ── */
const MyListingsTab = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await userService.getMyListings();
      setListings(data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await productService.deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast('Listing deleted', { icon: '🗑️' });
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} /></div>;

  if (listings.length === 0) return (
    <div className="empty-state">
      <Package size={48} color="var(--muted)" />
      <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>No listings yet</h3>
      <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>Post your first product to start selling.</p>
      <Link to="/sell"><button style={{ margin: '0 auto' }}>Sell a Product</button></Link>
    </div>
  );

  return (
    <div className="grid">
      {listings.map(product => (
        <div key={product.id} className="card">
          <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="image-container">
              {product.image_url ? <img src={product.image_url} alt={product.title} /> : <Package size={36} />}
            </div>
            <div className="title-clamp">{product.title}</div>
            <div className="price-tag">{formatPrice(product.price)}</div>
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', alignItems: 'center' }}>
            <span className={`badge badge-${product.status}`}>{titleCase(product.status)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Eye size={12} /> {product.views}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={() => navigate(`/product/${product.id}/edit`)} className="btn-outline btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={() => handleDelete(product.id)} className="btn-danger btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Orders tab (buyer purchase history) ── */
const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getMyOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} /></div>;

  if (orders.length === 0) return (
    <div className="empty-state">
      <ShoppingBag size={48} color="var(--muted)" />
      <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>No orders yet</h3>
      <Link to="/"><button style={{ margin: '1rem auto 0' }}>Browse Products</button></Link>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {orders.map(order => (
        <div key={order.id} className="card" style={{ transform: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontWeight: 700 }}>Order #{order.id}</span>
            <span className="badge badge-new">{titleCase(order.status)}</span>
          </div>
          {order.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
              <Link to={`/product/${item.product.id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{item.product.title} × {item.quantity}</Link>
              <span>{formatPrice(item.price_at_purchase * item.quantity)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
            <span>Total</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>{timeAgo(order.created_at)}</div>
        </div>
      ))}
    </div>
  );
};

/* ── Inquiries (shared for sent/received) ── */
const InquiryList = ({ fetcher, direction }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher().then(setInquiries).catch(() => {}).finally(() => setLoading(false));
  }, [fetcher]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} /></div>;

  if (inquiries.length === 0) return (
    <div className="empty-state">
      <Inbox size={48} color="var(--muted)" />
      <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>No inquiries {direction === 'sent' ? 'sent' : 'received'} yet</h3>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {inquiries.map(inq => (
        <div key={inq.id} className="card" style={{ transform: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Link to={`/product/${inq.product_id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              View Listing #{inq.product_id}
            </Link>
            <span className="badge badge-new">{titleCase(inq.status)}</span>
          </div>
          {inq.message && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              <MessageSquare size={15} style={{ flexShrink: 0, marginTop: '2px' }} /> {inq.message}
            </div>
          )}
          {inq.phone && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <Phone size={14} /> {inq.phone}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>{timeAgo(inq.created_at)}</div>
        </div>
      ))}
    </div>
  );
};

const TABS = [
  { id: 'listings', label: 'My Listings', icon: List },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'sent', label: 'My Inquiries', icon: Send },
  { id: 'received', label: 'Received', icon: Inbox },
  { id: 'account', label: 'Account', icon: Settings },
];

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');

  if (!user) return null;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '1.5rem', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', transform: 'none' }}>
        <div style={{ background: 'var(--primary)', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCircle size={40} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{user?.name || user?.email?.split('@')[0]}</h2>
          <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-new">{user?.role?.toUpperCase()}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Member since {formatDate(user?.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="tab-row">
        {TABS.map(tab => (
          <button key={tab.id} className={`tab-btn${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'listings' && <MyListingsTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'sent' && <InquiryList fetcher={inquiryService.getMyInquiries} direction="sent" />}
      {activeTab === 'received' && <InquiryList fetcher={inquiryService.getReceivedInquiries} direction="received" />}
      {activeTab === 'account' && <AccountTab user={user} onProfileUpdated={refreshProfile} />}
    </div>
  );
};

export default ProfilePage;
