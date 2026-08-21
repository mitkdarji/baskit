import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { carService, userService } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import toast from 'react-hot-toast';
import { Loader2, SlidersHorizontal, X, CarFront, Gauge, Fuel, Cog, TrendingUp } from 'lucide-react';
import { formatPrice, formatMileage, titleCase } from '../../utils/format';

const DEFAULT_IMG = null;

const BODY_TYPES = ['sedan', 'suv', 'hatchback', 'coupe', 'truck', 'convertible', 'wagon', 'minivan'];
const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'cng'];
const TRANSMISSIONS = ['manual', 'automatic'];
const CONDITIONS = ['new', 'used', 'certified_pre_owned'];

const CarCard = ({ car }) => (
  <Link to={`/car/${car.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
    <div className="image-container">
      {car.image_url ? (
        <img src={car.image_url} alt={car.title} onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <CarFront size={40} />
      )}
    </div>
    <div className="title-clamp">{car.title}</div>
    <div className="spec-plate">
      <span>{formatMileage(car.mileage)}</span>
      <span className="dot">&bull;</span>
      <span>{titleCase(car.fuel_type)}</span>
      <span className="dot">&bull;</span>
      <span>{titleCase(car.transmission)}</span>
    </div>
    <div className="price-tag">{formatPrice(car.price)}</div>
    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{car.location || 'Location N/A'}</div>
  </Link>
);

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

const CarListingPage = () => {
  const { lastMessage } = useWebSocket();
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [make, setMake] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [sort, setSort] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchCars(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, make, bodyType, fuelType, transmission, condition, minPrice, maxPrice, minYear, maxYear, sort]);

  useEffect(() => {
    userService.getRecommendations().then(setRecommendations).catch(() => {});
  }, []);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const list = await carService.getCars({
        make: make || undefined,
        body_type: bodyType || undefined,
        fuel_type: fuelType || undefined,
        transmission: transmission || undefined,
        condition: condition || undefined,
        search: search.trim() || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        min_year: minYear || undefined,
        max_year: maxYear || undefined,
        sort: sort || undefined,
      });
      setCars(list);
    } catch (err) {
      console.error('Failed to fetch cars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'new_listing') {
      toast(`New listing: ${lastMessage.title}`, { icon: '🚗' });
    }
  }, [lastMessage]);

  const clearFilters = () => {
    setMake(''); setBodyType(''); setFuelType(''); setTransmission(''); setCondition('');
    setMinPrice(''); setMaxPrice(''); setMinYear(''); setMaxYear(''); setSort(''); setSearch('');
  };

  const hasActiveFilters = make || bodyType || fuelType || transmission || condition || minPrice || maxPrice || minYear || maxYear || sort || search;

  return (
    <div>
      {!hasActiveFilters && recommendations.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', fontSize: '1.2rem' }}>
            <TrendingUp color="var(--accent)" size={22} /> Recommended For You
          </h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {recommendations.slice(0, 6).map(car => (
              <div key={car.id} style={{ minWidth: '250px' }}>
                <CarCard car={car} />
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
            <div className="filter-title">Make</div>
            <input className="input" style={{ marginBottom: 0 }} placeholder="e.g. Hyundai" value={make} onChange={(e) => setMake(e.target.value)} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Body Type</div>
            <FilterChips options={BODY_TYPES} value={bodyType} onChange={setBodyType} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Fuel Type</div>
            <FilterChips options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
          </div>

          <div className="filter-group">
            <div className="filter-title">Transmission</div>
            <FilterChips options={TRANSMISSIONS} value={transmission} onChange={setTransmission} />
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
            <div className="filter-title">Year</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" type="number" placeholder="From" style={{ marginBottom: 0 }} value={minYear} onChange={(e) => setMinYear(e.target.value)} />
              <input className="input" type="number" placeholder="To" style={{ marginBottom: 0 }} value={maxYear} onChange={(e) => setMaxYear(e.target.value)} />
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-title">Sort By</div>
            <select className="input" style={{ marginBottom: 0 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="year_desc">Year: Newest</option>
              <option value="mileage_asc">Mileage: Lowest</option>
            </select>
          </div>
        </aside>

        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '1.6rem' }}>{search ? `Results for "${search}"` : 'Browse Cars'}</h1>
            {!loading && <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{cars.length} listing{cars.length !== 1 ? 's' : ''}</span>}
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
          )}

          {!loading && cars.length === 0 && (
            <div className="empty-state">
              <CarFront size={56} color="var(--muted)" />
              <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>No cars found</h3>
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

          {!loading && cars.length > 0 && (
            <div className="grid">
              {cars.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CarListingPage;
