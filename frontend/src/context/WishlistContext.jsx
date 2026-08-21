import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { wishlistService } from '../services/api';

const WishlistContext = createContext({
  wishlistCount: 0,
  refreshWishlistCount: () => {},
  dealsCount: 0,
  refreshDeals: () => {},
  lastWsMessage: null,
  setLastWsMessage: () => {},
});

export const WishlistProvider = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [dealsCount, setDealsCount] = useState(0);
  const [lastWsMessage, setLastWsMessage] = useState(null);

  const refreshWishlistCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setWishlistCount(0); return; }
    try {
      const data = await wishlistService.getWishlist();
      setWishlistCount((data || []).length);
    } catch {
      setWishlistCount(0);
    }
  }, []);

  const refreshDeals = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setDealsCount(0); return; }
    try {
      const data = await wishlistService.getDeals();
      setDealsCount((data || []).length);
    } catch {
      setDealsCount(0);
    }
  }, []);

  // Auto-refresh wishlist/deals state when the WebSocket reports a relevant event.
  useEffect(() => {
    if (!lastWsMessage) return;
    const msg = lastWsMessage;
    const userId = parseInt(localStorage.getItem('userId') || '0');

    if (msg.type === 'wishlist_update' && msg.user_id === userId) {
      refreshWishlistCount();
    }
    if (msg.type === 'price_drop') {
      refreshDeals();
    }
  }, [lastWsMessage, refreshWishlistCount, refreshDeals]);

  return (
    <WishlistContext.Provider value={{
      wishlistCount, setWishlistCount, refreshWishlistCount,
      dealsCount, refreshDeals,
      lastWsMessage, setLastWsMessage,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
