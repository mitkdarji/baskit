import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WishlistProvider, useWishlist } from './context/WishlistContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import LoginPage from './pages/LoginPage';
import CarListingPage from './pages/user/CarListingPage';
import CarDetailPage from './pages/user/CarDetailPage';
import WishlistPage from './pages/user/WishlistPage';
import ProfilePage from './pages/user/ProfilePage';
import PostCarPage from './pages/user/PostCarPage';
import Dashboard from './pages/admin/Dashboard';
import { carService } from './services/api';
import { Heart, LayoutDashboard, LogOut, Search, UserCircle, Clock, X, CarFront, PlusCircle } from 'lucide-react';

const RECENT_SEARCHES_KEY = 'autowave_recent_searches';
const MAX_RECENT = 5;

const getRecentSearches = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
  } catch { return []; }
};

const saveRecentSearch = (term) => {
  if (!term.trim()) return;
  const recent = getRecentSearches().filter(s => s !== term.trim());
  recent.unshift(term.trim());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const removeRecentSearch = (term) => {
  const recent = getRecentSearches().filter(s => s !== term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
};

const WishlistInitializer = () => {
  const { user } = useAuth();
  const { refreshWishlistCount, setWishlistCount, setLastWsMessage } = useWishlist();
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (user) refreshWishlistCount();
    else setWishlistCount(0);
  }, [user]);

  useEffect(() => {
    if (lastMessage) setLastWsMessage(lastMessage);
  }, [lastMessage, setLastWsMessage]);

  return null;
};

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchVal.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await carService.getSuggestions(searchVal.trim());
          setSuggestions(results);
          setShowDropdown(true);
        } catch { setSuggestions([]); }
      }, 300);
    } else {
      setSuggestions([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchVal]);

  if (!user) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      saveRecentSearch(searchVal.trim());
      navigate(`/?q=${encodeURIComponent(searchVal.trim())}`);
      setShowDropdown(false);
    }
  };

  const handleFocus = () => {
    setRecentSearches(getRecentSearches());
    setShowDropdown(true);
  };

  const handleSuggestionClick = (suggestion) => {
    saveRecentSearch(suggestion.title);
    setSearchVal('');
    setSuggestions([]);
    setShowDropdown(false);
    navigate(`/car/${suggestion.id}`);
  };

  const handleRecentClick = (term) => {
    setSearchVal(term);
    saveRecentSearch(term);
    setShowDropdown(false);
    navigate(`/?q=${encodeURIComponent(term)}`);
  };

  const handleRemoveRecent = (e, term) => {
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  };

  const hasDropdownContent = suggestions.length > 0 || (searchVal.trim().length < 2 && recentSearches.length > 0);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo"><CarFront size={22} color="var(--accent)" />Auto<span>Wave</span></Link>

        {user.role !== 'admin' && (
          <div style={{ position: 'relative', flex: 1, maxWidth: '580px' }} ref={dropdownRef}>
            <form onSubmit={handleSearch} className="nav-search">
              <input
                ref={inputRef}
                className="nav-search-input"
                placeholder="Search make, model or title..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={handleFocus}
              />
              <button type="submit" className="nav-search-btn">
                <Search size={18} />
              </button>
            </form>

            {showDropdown && hasDropdownContent && (
              <div className="search-dropdown">
                {suggestions.length > 0 ? (
                  suggestions.map(s => (
                    <div key={s.id} className="search-dropdown-item" onClick={() => handleSuggestionClick(s)}>
                      <Search size={14} color="var(--muted)" />
                      <span>{s.title}</span>
                    </div>
                  ))
                ) : (
                  recentSearches.length > 0 && searchVal.trim().length < 2 && (
                    <>
                      <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Recent Searches
                      </div>
                      {recentSearches.map(term => (
                        <div key={term} className="search-dropdown-item" onClick={() => handleRecentClick(term)}>
                          <Clock size={14} color="var(--muted)" />
                          <span style={{ flex: 1 }}>{term}</span>
                          <button
                            onClick={(e) => handleRemoveRecent(e, term)}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        )}

        <div className="nav-actions">
          {user.role === 'admin' ? (
            <Link to="/admin" className="nav-link">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/sell" className="nav-link">
                <PlusCircle size={20} /> Sell a Car
              </Link>
              <Link to="/wishlist" className="nav-cart">
                <Heart size={22} />
                {wishlistCount > 0 && <span className="cart-badge">{wishlistCount > 99 ? '99+' : wishlistCount}</span>}
                <span>Saved</span>
              </Link>
              <Link to="/profile" className="nav-link" title="My Profile">
                <UserCircle size={20} />
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0] || 'Profile'}
                </span>
              </Link>
            </>
          )}
          <button onClick={logout} className="nav-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <WebSocketProvider>
        <Router>
          <WishlistInitializer />
          <Navbar />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 2500,
              style: {
                borderRadius: '10px',
                background: '#1B1F23',
                color: '#F7F5F0',
                fontSize: '0.9rem',
                fontWeight: 500,
                padding: '12px 16px',
              },
              success: {
                iconTheme: { primary: '#1F6D46', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#C1432E', secondary: '#fff' },
              },
            }}
          />
          <main className="container">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute role="user"><CarListingPage /></PrivateRoute>} />
              <Route path="/car/:id" element={<PrivateRoute role="user"><CarDetailPage /></PrivateRoute>} />
              <Route path="/wishlist" element={<PrivateRoute role="user"><WishlistPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute role="user"><ProfilePage /></PrivateRoute>} />
              <Route path="/sell" element={<PrivateRoute role="user"><PostCarPage /></PrivateRoute>} />
              <Route path="/car/:id/edit" element={<PrivateRoute role="user"><PostCarPage /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute role="admin"><Dashboard /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </Router>
        </WebSocketProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;
