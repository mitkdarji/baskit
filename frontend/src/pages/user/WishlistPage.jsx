import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wishlistService } from '../../services/api';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';
import { Heart, Trash2, ArrowRight, Loader2, CarFront } from 'lucide-react';
import { formatPrice, formatMileage, titleCase } from '../../utils/format';

const WishlistPage = () => {
  const { refreshWishlistCount } = useWishlist();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      const data = await wishlistService.getWishlist();
      setSaved(data);
    } catch (err) {
      console.error('Failed to load wishlist', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWishlist(); }, []);

  const handleRemove = async (carId) => {
    try {
      await wishlistService.removeFromWishlist(carId);
      setSaved(prev => prev.filter(item => item.car.id !== carId));
      refreshWishlistCount();
      toast('Removed from saved cars', { icon: '🗑️' });
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Heart size={30} color="var(--accent)" /> Saved Cars
      </h1>

      {saved.length === 0 ? (
        <div className="empty-state">
          <Heart size={56} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>No saved cars yet</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
            Tap the heart icon on any listing to save it here for later.
          </p>
          <Link to="/"><button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>Browse Cars <ArrowRight size={18} /></button></Link>
        </div>
      ) : (
        <div className="grid">
          {saved.map(item => (
            <div key={item.id} className="card" style={{ position: 'relative' }}>
              <button
                onClick={() => handleRemove(item.car.id)}
                style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, background: 'white', color: 'var(--danger)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem' }}
                title="Remove from saved"
              >
                <Trash2 size={15} />
              </button>
              <Link to={`/car/${item.car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="image-container">
                  {item.car.image_url ? <img src={item.car.image_url} alt={item.car.title} /> : <CarFront size={40} />}
                </div>
                <div className="title-clamp">{item.car.title}</div>
                <div className="spec-plate">
                  <span>{formatMileage(item.car.mileage)}</span>
                  <span className="dot">&bull;</span>
                  <span>{titleCase(item.car.fuel_type)}</span>
                </div>
                <div className="price-tag">{formatPrice(item.car.price)}</div>
                <span className={`badge badge-${item.car.status}`} style={{ marginTop: '0.5rem', width: 'fit-content' }}>{titleCase(item.car.status)}</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
