import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService, wishlistService, inquiryService, cartService, reviewService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Heart, FileDown, Send, Package, MapPin,
  Tag, Palette, ShieldCheck, Pencil, Trash2, Eye, ShoppingCart,
  Star, Scale, Boxes,
} from 'lucide-react';
import { formatPrice, titleCase, timeAgo } from '../../utils/format';

const COMPARE_KEY = 'baskit_compare_ids';
const getCompareIds = () => {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; } catch { return []; }
};
const setCompareIds = (ids) => localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));

const StarRating = ({ rating, count }) => (
  <span className="star-rating">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={14} fill={i <= Math.round(rating) ? 'var(--star)' : 'none'} />
    ))}
    {count !== undefined && <span className="star-count">({count})</span>}
  </span>
);

const TrustBadge = ({ trust }) => {
  if (!trust) return null;
  const cls = trust.trust_label === 'Top Rated' ? 'top-rated' : trust.trust_label === 'New Seller' ? 'new-seller' : '';
  return (
    <span className={`trust-badge ${cls}`} title={`${trust.review_count} reviews · ${trust.orders_fulfilled} orders fulfilled`}>
      <ShieldCheck size={12} /> {trust.trust_label}
    </span>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const { refreshCartCount } = useCart();
  const { refreshWishlistCount } = useWishlist();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const p = await productService.getProduct(id);
        setProduct(p);
        const [rel, rev] = await Promise.all([
          productService.getSimilar(id),
          reviewService.getProductReviews(id),
        ]);
        setSimilar(rel);
        setReviews(rev);
        if (p.seller_id) {
          reviewService.getSellerTrustScore(p.seller_id).then(setTrust).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to fetch product detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setInCompare(getCompareIds().includes(parseInt(id)));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const wl = await wishlistService.getWishlist();
        setWishlisted(wl.some(item => item.product.id === parseInt(id)));
      } catch { }
    })();
  }, [user, id]);

  useEffect(() => {
    if (!lastMessage || !product) return;
    if (lastMessage.type === 'listing_status_update' && lastMessage.product_id === product.id) {
      setProduct(prev => ({ ...prev, status: lastMessage.status }));
    }
    if (lastMessage.type === 'price_drop' && lastMessage.product_id === product.id) {
      setProduct(prev => ({ ...prev, price: lastMessage.new_price }));
      toast.success(`Price dropped to ${formatPrice(lastMessage.new_price)}!`);
    }
  }, [lastMessage, product?.id]);

  const toggleWishlist = async () => {
    if (!user) return;
    setWishLoading(true);
    try {
      if (wishlisted) {
        await wishlistService.removeFromWishlist(parseInt(id));
        setWishlisted(false);
        toast('Removed from saved items');
      } else {
        await wishlistService.addToWishlist(parseInt(id));
        setWishlisted(true);
        toast.success('Saved to your wishlist');
      }
      refreshWishlistCount();
    } catch { }
    setWishLoading(false);
  };

  const toggleCompare = () => {
    const ids = getCompareIds();
    const numId = parseInt(id);
    if (ids.includes(numId)) {
      setCompareIds(ids.filter(i => i !== numId));
      setInCompare(false);
    } else {
      if (ids.length >= 4) {
        toast.error('You can compare up to 4 products at a time');
        return;
      }
      setCompareIds([...ids, numId]);
      setInCompare(true);
    }
  };

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAddingToCart(true);
    try {
      await cartService.addToCart(product.id, quantity);
      refreshCartCount();
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleInquiry = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await inquiryService.createInquiry({ product_id: parseInt(id), message, phone });
      setSent(true);
      setMessage('');
      setPhone('');
      toast.success('Inquiry sent to the seller');
    } catch (err) {
      toast.error('Failed to send inquiry');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadSheet = async () => {
    try {
      await inquiryService.downloadSpecSheet(product.id, product.title);
    } catch {
      toast.error('Could not download spec sheet');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await productService.deleteListing(product.id);
      toast.success('Listing deleted');
      navigate('/profile');
    } catch {
      toast.error('Failed to delete listing');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const review = await reviewService.createReview({ product_id: parseInt(id), rating: reviewRating, comment: reviewComment });
      setReviews(prev => [review, ...prev]);
      setReviewComment('');
      toast.success('Review posted');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not post review — only delivered purchases can be reviewed');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
  if (!product) return <div>Product not found</div>;

  const isOwner = user && product.seller_id === user.id;
  const isSoldOut = product.status === 'sold_out' || product.stock <= 0;
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <Link to="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', width: 'fit-content', color: 'var(--primary)', background: 'transparent', padding: 0 }}>
        <ArrowLeft size={20} /> Back to Listings
      </Link>

      <div className="detail-layout" style={{ marginBottom: '3.5rem' }}>
        <div>
          <div className="gallery-main">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <Package size={72} />
            )}
          </div>

          <table className="spec-table" style={{ marginTop: '1.5rem' }}>
            <tbody>
              <tr><td><Tag size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Brand</td><td>{product.brand}</td></tr>
              <tr><td>Category</td><td>{titleCase(product.category)}</td></tr>
              <tr><td><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Condition</td><td>{titleCase(product.condition)}</td></tr>
              <tr><td><Boxes size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Stock</td><td>{product.stock} available</td></tr>
              <tr><td><Palette size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Color</td><td>{product.color || '—'}</td></tr>
              <tr><td><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Location</td><td>{product.location || '—'}</td></tr>
              <tr><td><Eye size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Views</td><td>{product.views}</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span className={`badge badge-${product.status}`}>{titleCase(product.status)}</span>
            <TrustBadge trust={trust} />
          </div>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>{product.title}</h1>
          {reviews.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}><StarRating rating={avgRating} count={reviews.length} /></div>
          )}
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Listed {timeAgo(product.created_at)}</div>

          <div className="price-tag" style={{ fontSize: '2.1rem', marginBottom: '1.5rem' }}>{formatPrice(product.price)}</div>

          {product.description && (
            <p style={{ color: 'var(--text)', fontSize: '0.98rem', lineHeight: '1.75', marginBottom: '1.75rem' }}>
              {product.description}
            </p>
          )}

          {!isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <span className="qty-value">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || isSoldOut}
                className="btn-accent"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <ShoppingCart size={18} /> {isSoldOut ? 'Out of Stock' : addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <button onClick={toggleWishlist} disabled={wishLoading} className={wishlisted ? '' : 'btn-outline'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: wishlisted ? 'var(--danger)' : undefined }}>
              <Heart size={18} fill={wishlisted ? 'white' : 'none'} /> {wishlisted ? 'Saved' : 'Save'}
            </button>
            <button onClick={toggleCompare} className={inCompare ? '' : 'btn-outline'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: inCompare ? 'var(--secondary)' : undefined }}>
              <Scale size={18} /> {inCompare ? 'Comparing' : 'Compare'}
            </button>
            <button onClick={handleDownloadSheet} className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <FileDown size={18} /> Spec Sheet
            </button>
          </div>

          {isOwner ? (
            <div className="panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.9rem' }}>This is your listing</div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => navigate(`/product/${product.id}/edit`)} className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Pencil size={16} /> Edit
                </button>
                <button onClick={handleDelete} className="btn-danger" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.9rem' }}>Ask the Seller a Question</div>
              {sent ? (
                <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                  Your inquiry has been sent. The seller will reach out to you directly.
                </div>
              ) : (
                <form onSubmit={handleInquiry}>
                  <label>Your phone number</label>
                  <input className="input" placeholder="+91 XXXXX XXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <label>Message</label>
                  <textarea
                    className="input" rows={4} placeholder="Is this still in stock? Can you ship to..."
                    value={message} onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" disabled={sending} className="btn-accent btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <section style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
        {user && !isOwner && (
          <form onSubmit={handleSubmitReview} className="panel" style={{ marginBottom: '1.5rem', maxWidth: '520px' }}>
            <label>Your rating</label>
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => setReviewRating(i)} style={{ background: 'none', border: 'none', padding: '2px' }}>
                  <Star size={22} fill={i <= reviewRating ? 'var(--star)' : 'none'} color="var(--star)" />
                </button>
              ))}
            </div>
            <label>Comment (optional)</label>
            <textarea className="input" rows={3} placeholder="How was the product?" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            <button type="submit" disabled={submittingReview} className="btn-accent">
              {submittingReview ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        )}
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No reviews yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '640px' }}>
            {reviews.map(r => (
              <div key={r.id} className="card" style={{ transform: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <StarRating rating={r.rating} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{timeAgo(r.created_at)}</span>
                </div>
                {r.comment && <p style={{ margin: 0, fontSize: '0.92rem' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {similar.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Similar Products</h2>
          <div className="grid">
            {similar.map(item => (
              <Link to={`/product/${item.id}`} key={item.id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="image-container">
                  {item.image_url ? <img src={item.image_url} alt={item.title} /> : <Package size={36} />}
                </div>
                <div className="title-clamp">{item.title}</div>
                <div className="spec-plate">
                  <span>{item.brand}</span>
                  <span className="dot">&bull;</span>
                  <span>{titleCase(item.category)}</span>
                </div>
                <div className="price-tag">{formatPrice(item.price)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
