import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService, userService, cartService } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { Loader2, SlidersHorizontal, X, Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { formatPrice, titleCase } from '../../utils/format';

const CATEGORIES = ['electronics', 'fashion', 'home_kitchen', 'beauty', 'sports_outdoors', 'books', 'toys_games', 'grocery'];
const CONDITIONS = ['new', 'used', 'refurbished'];

const ProductCard = ({ product }) => {
  const { refreshCartCount } = useCart();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!localStorage.getItem('token')) return;
    setAdding(true);
    try {
      await cartService.addToCart(product.id, 1);
      refreshCartCount();
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="image-container">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <Package size={40} />
        )}
      </div>
      <div className="title-clamp">{product.title}</div>
      <div className="spec-plate">
        <span>{product.brand}</span>
        <span className="dot">&bull;</span>
        <span>{titleCase(product.category)}</span>
      </div>
      <div className="price-tag">{formatPrice(product.price)}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock <= 0}
          className="btn-sm btn-accent"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <ShoppingCart size={13} /> Add
        </button>
      </div>
    </Link>
  );
};

const FilterChips = ({ options, value, onChange }) => (
  <div className="filter-chip-row">
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        className={`filter-chip${value === opt ? ' active' : ''}`}
        onClick={() => onChange(value === opt ? '' : opt)}
      >
        {titleCase(opt)}
      </button>
    ))}
  </div>
);

const ProductListingPage = () => {
  const { lastMessage } = useWebSocket();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchProducts(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, brand, category, condition, minPrice, maxPrice, sort]);

  useEffect(() => {
    userService.getRecommendations().then(setRecommendations).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const list = await productService.getProducts({
        brand: brand || undefined,
        category: category || undefined,
        condition: condition || undefined,
        search: search.trim() || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        sort: sort || undefined,
      });
      setProducts(list);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'new_listing') {
      toast(`New listing: ${lastMessage.title}`, { icon: '🛍️' });
    }
  }, [lastMessage]);

  const clearFilters = () => {
    setBrand(''); setCategory(''); setCondition('');
    setMinPrice(''); setMaxPrice(''); setSort(''); setSearch('');
  };

  const hasActiveFilters = brand || category || condition || minPrice || maxPrice || sort || search;

  return (
    <div>
      {!hasActiveFilters && recommendations.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.2rem' }}>
            <TrendingUp color="var(--accent)" size={22} /> Recommended For You
          </h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {recommendations.slice(0, 6).map(product => (
              <div key={product.id} style={{ minWidth: '250px' }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="listing-layout">
        <aside className="filter-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <SlidersHorizontal size={16} /> Filters
            </h3>
            {hasActiveFilters && (
              <button className="btn-sm btn-outline" onClick={clearFilters}><X size={12} /> Clear</button>
            )}
          </div>

          <div className="filter-group">
            <div className="filter-title">Brand</div>
            <input className="input" style={{ marginBottom: 0 }} placeholder="e.g. Sony" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Category</div>
            <FilterChips options={CATEGORIES} value={category} onChange={setCategory} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Condition</div>
            <FilterChips options={CONDITIONS} value={condition} onChange={setCondition} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Price Range (₹)</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" type="number" placeholder="Min" style={{ marginBottom: 0 }} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <input className="input" type="number" placeholder="Max" style={{ marginBottom: 0 }} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title">Sort By</div>
            <select className="input" style={{ marginBottom: 0 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="views_desc">Most Popular</option>
            </select>
          </div>
        </aside>

        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '1.6rem' }}>{search ? `Results for "${search}"` : 'Browse Products'}</h1>
            {!loading && <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{products.length} product{products.length !== 1 ? 's' : ''}</span>}
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="empty-state">
              <Package size={56} color="var(--muted)" />
              <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>No products found</h3>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
                Try adjusting your filters or search terms.
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
                  <X size={16} /> Clear Filters
                </button>
              )}
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid">
              {products.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductListingPage;
