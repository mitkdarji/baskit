import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { carService } from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, CarFront, Save } from 'lucide-react';

const BODY_TYPES = ['sedan', 'suv', 'hatchback', 'coupe', 'truck', 'convertible', 'wagon', 'minivan'];
const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'cng'];
const TRANSMISSIONS = ['manual', 'automatic'];
const CONDITIONS = ['new', 'used', 'certified_pre_owned'];

const EMPTY_FORM = {
  title: '', make: '', model: '', year: new Date().getFullYear(),
  price: '', mileage: '', fuel_type: 'petrol', transmission: 'manual',
  body_type: 'sedan', condition: 'used', color: '', location: '',
  description: '', image_url: '',
};

const PostCarPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    carService.getCar(id).then(car => {
      setForm({
        title: car.title, make: car.make, model: car.model, year: car.year,
        price: car.price, mileage: car.mileage, fuel_type: car.fuel_type,
        transmission: car.transmission, body_type: car.body_type, condition: car.condition,
        color: car.color || '', location: car.location || '',
        description: car.description || '', image_url: car.image_url || '',
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
        year: parseInt(form.year),
        price: parseFloat(form.price),
        mileage: parseInt(form.mileage) || 0,
      };
      if (isEdit) {
        await carService.updateListing(id, payload);
        toast.success('Listing updated');
        navigate(`/car/${id}`);
      } else {
        const car = await carService.createListing(payload);
        toast.success('Listing posted');
        navigate(`/car/${car.id}`);
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
        <CarFront size={28} color="var(--accent)" /> {isEdit ? 'Edit Listing' : 'Sell Your Car'}
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        {isEdit ? 'Update the details of your listing below.' : 'Fill in your car\'s details to list it on AutoWave.'}
      </p>

      <form onSubmit={handleSubmit} className="panel">
        <label>Listing Title</label>
        <input className="input" placeholder="e.g. 2021 Hyundai Creta SX" value={form.title} onChange={update('title')} required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Make</label>
            <input className="input" placeholder="Hyundai" value={form.make} onChange={update('make')} required />
          </div>
          <div>
            <label>Model</label>
            <input className="input" placeholder="Creta" value={form.model} onChange={update('model')} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Year</label>
            <input className="input" type="number" min="1980" max="2100" value={form.year} onChange={update('year')} required />
          </div>
          <div>
            <label>Price (₹)</label>
            <input className="input" type="number" min="0" placeholder="850000" value={form.price} onChange={update('price')} required />
          </div>
        </div>

        <label>Mileage (km)</label>
        <input className="input" type="number" min="0" placeholder="45000" value={form.mileage} onChange={update('mileage')} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Fuel Type</label>
            <select className="input" value={form.fuel_type} onChange={update('fuel_type')}>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label>Transmission</label>
            <select className="input" value={form.transmission} onChange={update('transmission')}>
              {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Body Type</label>
            <select className="input" value={form.body_type} onChange={update('body_type')}>
              {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label>Condition</label>
            <select className="input" value={form.condition} onChange={update('condition')}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Color</label>
            <input className="input" placeholder="White" value={form.color} onChange={update('color')} />
          </div>
          <div>
            <label>Location</label>
            <input className="input" placeholder="Ahmedabad" value={form.location} onChange={update('location')} />
          </div>
        </div>

        <label>Image URL (optional)</label>
        <input className="input" placeholder="https://..." value={form.image_url} onChange={update('image_url')} />

        <label>Description</label>
        <textarea className="input" rows={4} placeholder="Single owner, full service history..." value={form.description} onChange={update('description')} />

        <button type="submit" disabled={saving} className="btn-accent btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Listing'}
        </button>
      </form>
    </div>
  );
};

export default PostCarPage;
