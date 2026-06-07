/* =====================================================
   api.js — Fetch wrapper for backend communication
   ===================================================== */

const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('amazon_token') || '';
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Auth
const authAPI = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  activatePrime: () => apiFetch('/auth/prime', { method: 'POST' }),
  logout:   ()     => apiFetch('/auth/logout',   { method: 'POST' }),
  getMe:    ()     => apiFetch('/auth/me'),
  updateProfile: (body) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  toggleWishlist: (id)  => apiFetch(`/auth/wishlist/${id}`, { method: 'POST' }),
  getAllUsers:    ()    => apiFetch('/auth/users'),
  deleteUser:     (id)  => apiFetch(`/auth/users/${id}`, { method: 'DELETE' }),
};

// Products
const productsAPI = {
  getAll:      (params = {}) => apiFetch('/products?' + new URLSearchParams(params)),
  getById:     (id)          => apiFetch(`/products/${id}`),
  create:      (body)        => apiFetch('/products', { method: 'POST', body: JSON.stringify(body) }),
  update:      (id, body)    => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:      (id)          => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  addReview:   (id, body)    => apiFetch(`/products/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  getCategories: ()          => apiFetch('/products/categories'),
};

// Cart
const cartAPI = {
  get:    ()              => apiFetch('/cart'),
  add:    (productId, qty) => apiFetch('/cart/add',    { method: 'POST',   body: JSON.stringify({ productId, quantity: qty }) }),
  update: (productId, qty) => apiFetch('/cart/update', { method: 'PUT',    body: JSON.stringify({ productId, quantity: qty }) }),
  remove: (productId)      => apiFetch(`/cart/remove/${productId}`, { method: 'DELETE' }),
  clear:  ()               => apiFetch('/cart/clear',  { method: 'DELETE' }),
  getAllAdmin: ()          => apiFetch('/cart/all'),
};

// Orders
const ordersAPI = {
  create:    (body)    => apiFetch('/orders',           { method: 'POST', body: JSON.stringify(body) }),
  getMyOrders: ()      => apiFetch('/orders/myorders'),
  getById:   (id)      => apiFetch(`/orders/${id}`),
  getAll:    (params)  => apiFetch('/orders?' + new URLSearchParams(params)),
  updateStatus: (id, status) => apiFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ orderStatus: status }) }),
  cancel:    (id)      => apiFetch(`/orders/${id}/cancel`,   { method: 'PUT' }),
  pay:       (id)      => apiFetch(`/orders/${id}/pay`,      { method: 'PUT' }),
  refund:    (id)      => apiFetch(`/orders/${id}/refund`,   { method: 'PUT' }),
  getAnalytics: ()     => apiFetch('/orders/analytics/dashboard'),
};

// Payment
const paymentAPI = {
  createCheckout: (orderId) => apiFetch('/payment/create-checkout-session', { method: 'POST', body: JSON.stringify({ orderId }) }),
};

// Export for use across pages
window.API = { authAPI, productsAPI, cartAPI, ordersAPI, paymentAPI, API_BASE };
