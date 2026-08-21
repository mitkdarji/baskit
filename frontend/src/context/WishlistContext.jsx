import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { wishlistService } from '../services/api';

const WishlistContext = createContext({
  wishlistCount: 0,
  refreshWishlistCount: () => {},
  lastWsMessage: null,
  setLastWsMessage: () => {},
});

export const WishlistProvider = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
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

  // Auto-refresh wishlist count when WebSocket reports a wishlist change for this user
  useEffect(() => {
    if (!lastWsMessage) return;
    const msg = lastWsMessage;
    const userId = parseInt(localStorage.getItem('userId') || '0');

    if (msg.type === 'wishlist_update' && msg.user_id === userId) {
      refreshWishlistCount();
    }
  }, [lastWsMessage, refreshWishlistCount]);

  return (
    <WishlistContext.Provider value={{ wishlistCount, setWishlistCount, refreshWishlistCount, lastWsMessage, setLastWsMessage }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
