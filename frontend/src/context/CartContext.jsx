import React, { createContext, useState, useContext, useCallback } from 'react';
import { cartService } from '../services/api';

const CartContext = createContext({
  cartCount: 0,
  refreshCartCount: () => {},
});

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setCartCount(0); return; }
    try {
      const data = await cartService.getCart();
      setCartCount((data.items || []).reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      setCartCount(0);
    }
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
