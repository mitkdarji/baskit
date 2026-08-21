import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { productService } from '../../services/api';
import { Loader2, Scale, X, Package } from 'lucide-react';
import { formatPrice, titleCase } from '../../utils/format';

const COMPARE_KEY = 'baskit_compare_ids';
const getCompareIds = () => {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; } catch { return []; }
};
const setCompareIds = (ids) => localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));

const ROWS = [
  { label: 'Price', key: (p) => formatPrice(p.price) },
  { label: 'Brand', key: (p) => p.brand },
  { label: 'Category', key: (p) => titleCase(p.category) },
  { label: 'Condition', key: (p) => titleCase(p.condition) },
  { label: 'Stock', key: (p) => `${p.stock} available` },
  { label: 'Color', key: (p) => p.color || '—' },
  { label: 'Location', key: (p) => p.location || '—' },
];

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map(Number) : getCompareIds();
    if (ids.length === 0) { setLoading(false); return; }
    productService.compare(ids).then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, [searchParams]);

  const removeProduct = (id) => {
    const ids = getCompareIds().filter(i => i !== id);
    setCompareIds(ids);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <Scale size={56} color="var(--muted)" />
        <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>Nothing to compare yet</h3>
        <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem' }}>Add products to comparison from their detail page.</p>
        <button onClick={() => navigate('/')} style={{ margin: '0 auto' }}>Browse Products</button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Scale size={30} color="var(--accent)" /> Compare Products
      </h1>

      <div style={{ overflowX: 'auto' }}>
        <table className="spec-table" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <td></td>
              {products.map(p => (
                <td key={p.id} style={{ textAlign: 'center', fontWeight: 700 }}>
                  <button onClick={() => removeProduct(p.id)} className="btn-sm btn-outline" style={{ marginBottom: '0.6rem' }}><X size={12} /></button>
                  <div className="image-container" style={{ height: '110px', margin: '0 auto 0.5rem' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.title} /> : <Package size={28} />}
                  </div>
                  <Link to={`/product/${p.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{p.title}</Link>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.label}>
                <td style={{ fontWeight: 600 }}>{row.label}</td>
                {products.map(p => (
                  <td key={p.id} style={{ textAlign: 'center' }}>{row.key(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparePage;
