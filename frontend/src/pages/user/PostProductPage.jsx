import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productService } from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, Package, Save } from 'lucide-react';

const CATEGORIES = ['electronics', 'fashion', 'home_kitchen', 'beauty', 'sports_outdoors', 'books', 'toys_games', 'grocery'];
const CONDITIONS = ['new', 'used', 'refurbished'];

const EMPTY_FORM = {
  title: '', category: 'electronics', brand: '',
  price: '', stock: '', condition: 'new', color: '', location: '',
  description: '', image_url: '',
};

const PostProductPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    productService.getProduct(id).then(product => {
      setForm({
        title: product.title, category: product.category, brand: product.brand,
        price: product.price, stock: product.stock, condition: product.condition,
        color: product.color || '', location: product.location || '',
        description: product.description || '', image_url: product.image_url || '',
      });
    }).catch(() => toast.error('Could not load listing')).finally(() => setLoading(false));
  }, [id, isEdit]);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
      };
      if (isEdit) {
        await productService.updateListing(id, payload);
        toast.success('Listing updated');
        navigate(`/product/${id}`);
      } else {
        const product = await productService.createListing(payload);
        toast.success('Listing posted');
        navigate(`/product/${product.id}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Package size={28} color="var(--accent)" /> {isEdit ? 'Edit Listing' : 'Sell a Product'}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        {isEdit ? 'Update the details of your listing below.' : "Fill in your product's details to list it on Baskit."}
      </p>

      <form onSubmit={handleSubmit} className="panel">
        <label>Listing Title</label>
        <input className="input" placeholder="e.g. Wireless Noise-Cancelling Headphones" value={form.title} onChange={update('title')} required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Brand</label>
            <input className="input" placeholder="Sony" value={form.brand} onChange={update('brand')} required />
          </div>
          <div>
            <label>Category</label>
            <select className="input" value={form.category} onChange={update('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Price (₹)</label>
            <input className="input" type="number" min="0" placeholder="2499" value={form.price} onChange={update('price')} required />
          </div>
          <div>
            <label>Stock Quantity</label>
            <input className="input" type="number" min="0" placeholder="20" value={form.stock} onChange={update('stock')} required />
          </div>
        </div>

        <label>Condition</label>
        <select className="input" value={form.condition} onChange={update('condition')}>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Color</label>
            <input className="input" placeholder="Black" value={form.color} onChange={update('color')} />
          </div>
          <div>
            <label>Location</label>
            <input className="input" placeholder="Mumbai" value={form.location} onChange={update('location')} />
          </div>
        </div>

        <label>Image URL (optional)</label>
        <input className="input" placeholder="https://..." value={form.image_url} onChange={update('image_url')} />

        <label>Description</label>
        <textarea className="input" rows={4} placeholder="Brand new, sealed box, ships within 2 days..." value={form.description} onChange={update('description')} />

        <button type="submit" disabled={saving} className="btn-accent btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Listing'}
        </button>
      </form>
    </div>
  );
};

export default PostProductPage;
