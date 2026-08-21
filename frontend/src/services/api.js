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

export const carService = {
  getCars: async ({ make, body_type, fuel_type, transmission, condition, search, min_price, max_price, min_year, max_year, sort } = {}) => {
    const params = {};
    if (make) params.make = make;
    if (body_type) params.body_type = body_type;
    if (fuel_type) params.fuel_type = fuel_type;
    if (transmission) params.transmission = transmission;
    if (condition) params.condition = condition;
    if (search) params.search = search;
    if (min_price !== undefined && min_price !== '') params.min_price = min_price;
    if (max_price !== undefined && max_price !== '') params.max_price = max_price;
    if (min_year !== undefined && min_year !== '') params.min_year = min_year;
    if (max_year !== undefined && max_year !== '') params.max_year = max_year;
    if (sort) params.sort = sort;
    const response = await api.get('/cars/', { params });
    return response.data;
  },
  getCar: async (id) => {
    const response = await api.get(`/cars/${id}`);
    return response.data;
  },
  getSimilar: async (id) => {
    const response = await api.get(`/cars/${id}/similar`);
    return response.data;
  },
  getMakes: async () => {
    const response = await api.get('/cars/makes');
    return response.data;
  },
  getSuggestions: async (q) => {
    const response = await api.get('/cars/suggestions', { params: { q } });
    return response.data;
  },
  createListing: async (data) => {
    const response = await api.post('/cars/', data);
    return response.data;
  },
  updateListing: async (id, data) => {
    const response = await api.put(`/cars/${id}`, data);
    return response.data;
  },
  deleteListing: async (id) => {
    const response = await api.delete(`/cars/${id}`);
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
  addToWishlist: async (carId) => {
    const response = await api.post(`/wishlist/add/${carId}`);
    return response.data;
  },
  removeFromWishlist: async (carId) => {
    const response = await api.delete(`/wishlist/remove/${carId}`);
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
  downloadSpecSheet: async (carId, carTitle) => {
    const res = await fetch(`/api/inquiry/spec-sheet/${carId}`);
    if (!res.ok) throw new Error('Failed to download spec sheet');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(carTitle || 'car').replace(/\s+/g, '_')}_spec_sheet.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
  getByBodyType: async () => {
    const response = await api.get('/admin/analytics/by-body-type');
    return response.data;
  },
  getListingsTrend: async () => {
    const response = await api.get('/admin/analytics/listings-trend');
    return response.data;
  },
  updateListingStatus: async (carId, status) => {
    const response = await api.put(`/admin/listings/${carId}/status`, null, { params: { status } });
    return response.data;
  },
  deleteListing: async (carId) => {
    const response = await api.delete(`/admin/listings/${carId}`);
    return response.data;
  },
};

export default api;
