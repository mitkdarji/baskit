import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { carService, wishlistService, inquiryService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Heart, FileDown, Send, CarFront, MapPin,
  Gauge, Fuel, Cog, Calendar, Palette, ShieldCheck, Pencil, Trash2, Eye,
} from 'lucide-react';
import { formatPrice, formatMileage, titleCase, timeAgo } from '../../utils/format';

const CarDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [car, setCar] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const c = await carService.getCar(id);
        setCar(c);
        const rel = await carService.getSimilar(id);
        setSimilar(rel);
      } catch (err) {
        console.error('Failed to fetch car detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const wl = await wishlistService.getWishlist();
        setWishlisted(wl.some(item => item.car.id === parseInt(id)));
      } catch { }
    })();
  }, [user, id]);

  useEffect(() => {
    if (!lastMessage || !car) return;
    if (lastMessage.type === 'listing_status_update' && lastMessage.car_id === car.id) {
      setCar(prev => ({ ...prev, status: lastMessage.status }));
    }
  }, [lastMessage, car?.id]);

  const toggleWishlist = async () => {
    if (!user) return;
    setWishLoading(true);
    try {
      if (wishlisted) {
        await wishlistService.removeFromWishlist(parseInt(id));
        setWishlisted(false);
        toast('Removed from saved cars');
      } else {
        await wishlistService.addToWishlist(parseInt(id));
        setWishlisted(true);
        toast.success('Saved to your wishlist');
      }
    } catch { }
    setWishLoading(false);
  };

  const handleInquiry = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await inquiryService.createInquiry({ car_id: parseInt(id), message, phone });
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
      await inquiryService.downloadSpecSheet(car.id, car.title);
    } catch {
      toast.error('Could not download spec sheet');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await carService.deleteListing(car.id);
      toast.success('Listing deleted');
      navigate('/profile');
    } catch {
      toast.error('Failed to delete listing');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
  if (!car) return <div>Car not found</div>;

  const isOwner = user && car.seller_id === user.id;
  const isSold = car.status === 'sold';

  return (
    <div>
      <Link to="/" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', width: 'fit-content', color: 'var(--primary)', background: 'transparent', padding: 0 }}>
        <ArrowLeft size={20} /> Back to Listings
      </Link>

      <div className="detail-layout" style={{ marginBottom: '3.5rem' }}>
        <div>
          <div className="gallery-main">
            {car.image_url ? (
              <img src={car.image_url} alt={car.title} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <CarFront size={72} />
            )}
          </div>

          <table className="spec-table" style={{ marginTop: '1.5rem' }}>
            <tbody>
              <tr><td><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Year</td><td>{car.year}</td></tr>
              <tr><td><Gauge size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Mileage</td><td>{formatMileage(car.mileage)}</td></tr>
              <tr><td><Fuel size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Fuel Type</td><td>{titleCase(car.fuel_type)}</td></tr>
              <tr><td><Cog size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Transmission</td><td>{titleCase(car.transmission)}</td></tr>
              <tr><td>Body Type</td><td>{titleCase(car.body_type)}</td></tr>
              <tr><td><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Condition</td><td>{titleCase(car.condition)}</td></tr>
              <tr><td><Palette size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Color</td><td>{car.color || '—'}</td></tr>
              <tr><td><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Location</td><td>{car.location || '—'}</td></tr>
              <tr><td><Eye size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Views</td><td>{car.views}</td></tr>
            </tbody>
          </table>
        </div>

        <div>
          <span className={`badge badge-${car.status}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>{titleCase(car.status)}</span>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>{car.title}</h1>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Listed {timeAgo(car.created_at)}</div>

          <div className="price-tag" style={{ fontSize: '2.1rem', marginBottom: '1.5rem' }}>{formatPrice(car.price)}</div>

          {car.description && (
            <p style={{ color: 'var(--text)', fontSize: '0.98rem', lineHeight: '1.75', marginBottom: '1.75rem' }}>
              {car.description}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <button onClick={toggleWishlist} disabled={wishLoading} className={wishlisted ? '' : 'btn-outline'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: wishlisted ? 'var(--danger)' : undefined }}>
              <Heart size={18} fill={wishlisted ? 'white' : 'none'} /> {wishlisted ? 'Saved' : 'Save Car'}
            </button>
            <button onClick={handleDownloadSheet} className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <FileDown size={18} /> Spec Sheet
            </button>
          </div>

          {isOwner ? (
            <div className="panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.9rem' }}>This is your listing</div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button onClick={() => navigate(`/car/${car.id}/edit`)} className="btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Pencil size={16} /> Edit
                </button>
                <button onClick={handleDelete} className="btn-danger" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.9rem' }}>Contact the Seller</div>
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
                    className="input" rows={4} placeholder="I'm interested in this car, is it still available?"
                    value={message} onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" disabled={sending || isSold} className="btn-accent btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSold ? 'Already Sold' : sending ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Similar Cars</h2>
          <div className="grid">
            {similar.map(item => (
              <Link to={`/car/${item.id}`} key={item.id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="image-container">
                  {item.image_url ? <img src={item.image_url} alt={item.title} /> : <CarFront size={36} />}
                </div>
                <div className="title-clamp">{item.title}</div>
                <div className="spec-plate">
                  <span>{formatMileage(item.mileage)}</span>
                  <span className="dot">&bull;</span>
                  <span>{titleCase(item.fuel_type)}</span>
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

export default CarDetailPage;
