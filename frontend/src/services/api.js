import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (credentials) => {
    const params = new URLSearchParams();
    params.append('username', credentials.email);
    params.append('password', credentials.password);
    const response = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  googleLogin: async (credential) => {
    const response = await api.post('/auth/google', { id_token: credential });
    return response.data;
  },
};

export const productService = {
  getProducts: async ({ category, brand, condition, search, min_price, max_price, sort } = {}) => {
    const params = {};
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (condition) params.condition = condition;
    if (search) params.search = search;
    if (min_price !== undefined && min_price !== '') params.min_price = min_price;
    if (max_price !== undefined && max_price !== '') params.max_price = max_price;
    if (sort) params.sort = sort;
    const response = await api.get('/products/', { params });
    return response.data;
  },
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  getSimilar: async (id) => {
    const response = await api.get(`/products/${id}/similar`);
    return response.data;
  },
  getBrands: async () => {
    const response = await api.get('/products/brands');
    return response.data;
  },
  getSuggestions: async (q) => {
    const response = await api.get('/products/suggestions', { params: { q } });
    return response.data;
  },
  compare: async (ids) => {
    const response = await api.get('/products/compare', { params: { ids: ids.join(',') } });
    return response.data;
  },
  createListing: async (data) => {
    const response = await api.post('/products/', data);
    return response.data;
  },
  updateListing: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  deleteListing: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export const userService = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },
  getRecommendations: async () => {
    const response = await api.get('/user/recommendations');
    return response.data;
  },
  getMyListings: async () => {
    const response = await api.get('/user/my-listings');
    return response.data;
  },
};

export const wishlistService = {
  getWishlist: async () => {
    const response = await api.get('/wishlist/');
    return response.data;
  },
  getDeals: async () => {
    const response = await api.get('/wishlist/deals');
    return response.data;
  },
  addToWishlist: async (productId) => {
    const response = await api.post(`/wishlist/add/${productId}`);
    return response.data;
  },
  removeFromWishlist: async (productId) => {
    const response = await api.delete(`/wishlist/remove/${productId}`);
    return response.data;
  },
};

export const inquiryService = {
  createInquiry: async (data) => {
    const response = await api.post('/inquiry/', data);
    return response.data;
  },
  getMyInquiries: async () => {
    const response = await api.get('/inquiry/my-inquiries');
    return response.data;
  },
  getReceivedInquiries: async () => {
    const response = await api.get('/inquiry/received');
    return response.data;
  },
  downloadSpecSheet: async (productId, productTitle) => {
    const res = await fetch(`/api/inquiry/spec-sheet/${productId}`);
    if (!res.ok) throw new Error('Failed to download spec sheet');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(productTitle || 'product').replace(/\s+/g, '_')}_spec_sheet.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const cartService = {
  getCart: async () => {
    const response = await api.get('/cart/');
    return response.data;
  },
  addToCart: async (productId, quantity = 1) => {
    const response = await api.post(`/cart/add/${productId}`, { quantity });
    return response.data;
  },
  updateItem: async (itemId, quantity) => {
    const response = await api.put(`/cart/item/${itemId}`, { quantity });
    return response.data;
  },
  removeItem: async (itemId) => {
    const response = await api.delete(`/cart/item/${itemId}`);
    return response.data;
  },
  clearCart: async () => {
    const response = await api.delete('/cart/clear');
    return response.data;
  },
};

export const orderService = {
  checkout: async (shippingAddress) => {
    const response = await api.post('/orders/checkout', { shipping_address: shippingAddress });
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },
  getReceivedOrders: async () => {
    const response = await api.get('/orders/received');
    return response.data;
  },
  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },
};

export const reviewService = {
  createReview: async (data) => {
    const response = await api.post('/reviews/', data);
    return response.data;
  },
  getProductReviews: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}`);
    return response.data;
  },
  getSellerTrustScore: async (sellerId) => {
    const response = await api.get(`/reviews/seller/${sellerId}/trust-score`);
    return response.data;
  },
};

export const adminService = {
  getStats: async ({ skip = 0, limit = 50, search = '', status = '' } = {}) => {
    const params = { skip, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await api.get('/admin/dashboard/stats', { params });
    return response.data;
  },
  getOverview: async () => {
    const response = await api.get('/admin/analytics/overview');
    return response.data;
  },
  getByCategory: async () => {
    const response = await api.get('/admin/analytics/by-category');
    return response.data;
  },
  getListingsTrend: async () => {
    const response = await api.get('/admin/analytics/listings-trend');
    return response.data;
  },
  getOrdersOverview: async () => {
    const response = await api.get('/admin/analytics/orders-overview');
    return response.data;
  },
  updateListingStatus: async (productId, status) => {
    const response = await api.put(`/admin/listings/${productId}/status`, null, { params: { status } });
    return response.data;
  },
  deleteListing: async (productId) => {
    const response = await api.delete(`/admin/listings/${productId}`);
    return response.data;
  },
};

export default api;
