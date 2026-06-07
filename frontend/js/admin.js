/* ── admin.js ── */
let adminProducts = [], adminOrders = [], adminStats = {};
let editingProductId = null;

function formatTableError(message, cols) {
  if (message.toLowerCase().includes('authorized') || message.toLowerCase().includes('token') || message.toLowerCase().includes('expired') || message.toLowerCase().includes('401')) {
    return `<tr><td colspan="${cols}" style="text-align:center;padding:30px 20px;color:#c5221f;background:#fdf2f2;font-size:13px;font-weight:600;border:1px solid #f8d7da;border-radius:4px;font-family:inherit;">🔒 Access Denied: Please sign in with the Admin account (admin@amazon-clone.com / admin123) to view and manage this section.</td></tr>`;
  }
  return `<tr><td colspan="${cols}" class="alert alert-error">⚠️ ${message}</td></tr>`;
}

async function initAdmin() {
  if (!window.Auth || !window.Auth.isAdmin()) { window.location.href = 'index.html'; return; }
  showAdminSection('dashboard');
}

function showAdminSection(section) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  const el  = document.getElementById(`admin-${section}`);
  const nav = document.getElementById(`nav-${section}`);
  if (el)  el.style.display = 'block';
  if (nav) nav.classList.add('active');

  if (section === 'dashboard')     loadDashboard();
  if (section === 'products')      loadAdminProducts();
  if (section === 'orders')        loadAdminOrders();
  if (section === 'cancellations') loadAdminCancellations();
  if (section === 'missing')       loadAdminMissing();
  if (section === 'reviews')       loadAdminReviews();
  if (section === 'users')         loadAdminUsers();
  if (section === 'carts')         loadAdminCarts();
  if (section === 'profile')       loadAdminProfile();
}

async function loadDashboard() {
  const missing  = JSON.parse(localStorage.getItem('amazon_missing_reports') || '[]');
  const exchanges= JSON.parse(localStorage.getItem('amazon_exchanges') || '[]');

  try {
    const res = await window.API.ordersAPI.getAnalytics();
    if(!res.success) throw new Error('Analytics failed');
    
    const { stats, categorySales, paymentMethodStats, topProducts } = res;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-users',     stats.totalUsers);
    set('stat-products',  stats.lowStockCount); // Show low stock product count!
    // Update label for low stock warning
    const prodCard = document.getElementById('stat-products')?.parentElement;
    if (prodCard) {
      prodCard.querySelector('h3').textContent = "Low Stock Alerts";
      prodCard.querySelector('.stat-change').textContent = "Products < 5 units";
      prodCard.style.borderColor = stats.lowStockCount > 0 ? "#c5221f" : "#e47911";
    }

    set('stat-orders',    stats.totalOrders);
    set('stat-revenue',   '₹' + stats.totalRevenue.toLocaleString('en-IN'));
    set('stat-cancelled', stats.refundPendingCount); // refund pending count
    set('stat-missing',   stats.cancelledOrders); // cancelled orders count
    set('stat-exchanges', exchanges.length);
    set('stat-reviews',   missing.length); // missing reports in review

    const payLabel = m => {return {upi:'📱 UPI',card:'💳 Card',netbanking:'🏦 Net Banking',cod:'💵 COD',stripe:'💳 Stripe',wallet:'👛 Wallet'}[m]||m||'Unknown';};

    // Render Category Sales Progress bars
    const catContainer = document.getElementById('analytics-categories');
    if (catContainer) {
      if (!categorySales || categorySales.length === 0) {
        catContainer.innerHTML = '<div style="text-align:center;color:#666;font-size:13px;padding:20px">No category sales volume.</div>';
      } else {
        const maxSales = Math.max(...categorySales.map(c => c.totalSales), 1);
        catContainer.innerHTML = categorySales.map((c, i) => {
          const pct = Math.min((c.totalSales / maxSales) * 100, 100);
          const color = `hsl(${(i * 42) % 360}, 75%, 45%)`;
          return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <strong>${c.category}</strong>
                <span style="font-weight:700">₹${c.totalSales.toLocaleString('en-IN')}</span>
              </div>
              <div style="height:8px;background:#eee;border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
              </div>
            </div>`;
        }).join('');
      }
    }

    // Render Payment Methods Stats
    const payContainer = document.getElementById('analytics-payments');
    if (payContainer) {
      if (!paymentMethodStats || paymentMethodStats.length === 0) {
        payContainer.innerHTML = '<div style="text-align:center;color:#666;font-size:13px;padding:20px">No transactions recorded.</div>';
      } else {
        payContainer.innerHTML = paymentMethodStats.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f2f2f2;padding:8px 0;font-size:13px">
            <span><strong>${payLabel(p.method)}</strong></span>
            <span style="color:#666">${p.count} transaction(s)</span>
            <strong style="color:#007600">₹${p.revenue.toLocaleString('en-IN')}</strong>
          </div>`).join('');
      }
    }

    // Render Top Products Table
    const topProdTable = document.getElementById('analytics-products');
    if (topProdTable) {
      if (!topProducts || topProducts.length === 0) {
        topProdTable.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;font-size:13px;padding:20px">No products sold.</td></tr>';
      } else {
        topProdTable.innerHTML = topProducts.map(p => `
          <tr>
            <td>
              <img src="${p.image}" style="width:36px;height:36px;object-fit:contain;margin-right:8px;vertical-align:middle;background:#fff;border:1px solid #eee;border-radius:4px">
              <span style="font-weight:600;font-size:13px">${p.name.substring(0,60)}...</span>
            </td>
            <td>₹${p.price.toLocaleString('en-IN')}</td>
            <td><strong style="font-size:14px">${p.totalQty}</strong></td>
            <td style="color:#B12704"><strong>₹${p.totalRevenue.toLocaleString('en-IN')}</strong></td>
          </tr>`).join('');
      }
    }

  } catch (e) {
    console.error('Error loading dashboard stats:', e);
    // Gracefully stop loaders and show access denied message
    const catContainer = document.getElementById('analytics-categories');
    if (catContainer) catContainer.innerHTML = '<div style="text-align:center;color:#c5221f;font-size:13px;padding:20px;font-weight:600;">⚠️ Access Denied: Admin role required.</div>';
    
    const payContainer = document.getElementById('analytics-payments');
    if (payContainer) payContainer.innerHTML = '<div style="text-align:center;color:#c5221f;font-size:13px;padding:20px;font-weight:600;">⚠️ Access Denied.</div>';
    
    const topProdTable = document.getElementById('analytics-products');
    if (topProdTable) topProdTable.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#c5221f;font-size:13px;padding:20px;font-weight:600;">⚠️ Error loading top products.</td></tr>';
  }
}

async function loadAdminProducts() {
  const el = document.getElementById('adminProductsTable');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try {
    const { products } = await window.API.productsAPI.getAll({ limit: 100 });
    adminProducts = products;
    el.innerHTML = products.map(p => {
      // Highlight low stock warning badge
      const isLow = p.stock < 5;
      const stockBadge = isLow 
        ? `<span class="status-badge status-cancelled" style="background:#fce8e6;color:#c5221f;font-weight:700">⚠️ Low Stock (${p.stock})</span>`
        : `<span class="status-badge status-delivered">${p.stock} units</span>`;
        
      return `<tr>
        <td><img class="table-img" src="${p.images && p.images[0]}" onerror="this.src='https://via.placeholder.com/48'" style="background:#fff;padding:2px;border:1px solid #eee"></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</td>
        <td>${p.category}</td>
        <td>₹${Number(p.price).toLocaleString('en-IN')}</td>
        <td>${p.stock}</td>
        <td>${stockBadge}</td>
        <td><div class="action-btns">
          <button class="btn btn-sm btn-outline" onclick="editProduct('${p._id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}','${p.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');
  } catch(e) { el.innerHTML = formatTableError(e.message, 7); }
}

async function loadAdminOrders() {
  const el = document.getElementById('adminOrdersTable');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try {
    const { orders } = await window.API.ordersAPI.getAll({ limit: 50 });
    adminOrders = orders;
    el.innerHTML = orders.map(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-IN');
      const user = o.user ? (o.user.name || o.user.email || o.user) : 'N/A';
      const num  = o.orderNumber || `AMZ-${o._id.slice(-8).toUpperCase()}`;
      return `<tr>
        <td style="font-size:12px;font-family:monospace">${num}</td>
        <td>${user}</td>
        <td>${date}</td>
        <td>₹${Number(o.totalPrice).toLocaleString('en-IN')}</td>
        <td><span class="status-badge status-${o.paymentStatus}">${o.paymentStatus}</span></td>
        <td><span class="status-badge status-${o.orderStatus}">${o.orderStatus.replace(/_/g,' ')}</span></td>
        <td>
          <select onchange="updateOrderStatus('${o._id}',this.value)" style="border:1px solid #ccc;border-radius:3px;padding:4px;font-size:12px">
            ${['processing','confirmed','shipped','out_for_delivery','delivered','cancelled'].map(s => `<option value="${s}" ${s===o.orderStatus?'selected':''}>${s.replace(/_/g,' ')}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { el.innerHTML = formatTableError(e.message, 7); }
}

async function updateOrderStatus(orderId, status) {
  try {
    await window.API.ordersAPI.updateStatus(orderId, status);
    showToast('Order status updated ✅');
    loadDashboard();
  } catch(e) { showToast(e.message, 'error'); }
}

/* ── BACKEND: Cancellations & Refund Queue ── */
async function loadAdminCancellations() {
  const el = document.getElementById('adminCancelTable');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try {
    const { orders } = await window.API.ordersAPI.getAll({ limit: 100 });
    const refundPending = orders.filter(o => o.paymentStatus === 'refund_pending' || o.orderStatus === 'cancelled');
    if (!refundPending.length) {
      el.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#555">No pending refunds or cancellations.</td></tr>';
      return;
    }
    el.innerHTML = refundPending.map(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-IN');
      const user = o.user ? (o.user.name || o.user.email) : 'N/A';
      const num = o.orderNumber || `AMZ-${o._id.slice(-8).toUpperCase()}`;
      const refundBtn = o.paymentStatus === 'refund_pending' 
        ? `<button class="btn btn-sm btn-yellow" onclick="approveRefund('${o._id}')">💰 Approve Refund</button>`
        : `<span style="font-size:12px;color:#777">COD / Restored</span>`;
      return `<tr>
        <td style="font-size:12px;font-family:monospace">${num}</td>
        <td>${user}</td>
        <td>${date}</td>
        <td>₹${Number(o.totalPrice).toLocaleString('en-IN')}</td>
        <td>${o.paymentMethod.toUpperCase()}</td>
        <td><span class="status-badge status-${o.paymentStatus}">${o.paymentStatus}</span></td>
        <td><span class="status-badge status-${o.orderStatus}">${o.orderStatus.replace(/_/g,' ')}</span></td>
        <td>${refundBtn}</td>
      </tr>`;
    }).join('');
  } catch(e) { el.innerHTML = formatTableError(e.message, 8); }
}

async function approveRefund(orderId) {
  if (!confirm('Approve and complete this refund?')) return;
  try {
    await window.API.ordersAPI.refund(orderId);
    showToast('Refund processed successfully! 💰');
    loadAdminCancellations();
    loadDashboard();
  } catch(e) { showToast(e.message, 'error'); }
}

/* ── LOCAL: Missing Reports ── */
function loadAdminMissing() {
  const el = document.getElementById('adminMissingTable');
  if (!el) return;
  const reports = JSON.parse(localStorage.getItem('amazon_missing_reports') || '[]');
  if (!reports.length) {
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#555">No missing product reports.</td></tr>';
    return;
  }
  const typeMap = { not_received:'Not Received', wrong_item:'Wrong Item', damaged:'Damaged', incomplete:'Incomplete Package' };
  el.innerHTML = reports.map((r, i) => {
    const date = new Date(r.date).toLocaleDateString('en-IN');
    return `<tr>
      <td>${date}</td>
      <td style="font-size:12px;font-family:monospace">${r.orderId}</td>
      <td><span class="status-badge status-Shipped">${typeMap[r.type]||r.type}</span></td>
      <td style="max-width:200px">${r.desc}</td>
      <td><button class="btn btn-sm btn-outline" onclick="resolveReport(${i})">✅ Resolve</button></td>
    </tr>`;
  }).join('');
}

function resolveReport(idx) {
  const reports = JSON.parse(localStorage.getItem('amazon_missing_reports') || '[]');
  reports.splice(idx, 1);
  localStorage.setItem('amazon_missing_reports', JSON.stringify(reports));
  showToast('Report resolved ✅');
  loadAdminMissing();
  loadDashboard();
}

/* ── LOCAL: Reviews ── */
function loadAdminReviews() {
  const el = document.getElementById('adminReviewsTable');
  if (!el) return;
  const orders = JSON.parse(localStorage.getItem('amazon_orders_local') || '[]');
  const rows = [];
  orders.forEach(o => {
    if (!o.reviews) return;
    Object.entries(o.reviews).forEach(([idx, rv]) => {
      const item = (o.items||[])[parseInt(idx)];
      const stars = '★'.repeat(rv.rating) + '☆'.repeat(5 - rv.rating);
      const date  = new Date(rv.date).toLocaleDateString('en-IN');
      rows.push(`<tr>
        <td style="font-size:12px;font-family:monospace">${o.id}</td>
        <td>${item ? item.name.substring(0,40) : '—'}</td>
        <td style="color:#FF9900;font-size:16px">${stars} <span style="color:#555;font-size:12px">(${rv.rating}/5)</span></td>
        <td>${rv.text||'—'}</td>
        <td>${date}</td>
      </tr>`);
    });
  });
  if (!rows.length) {
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#555">No reviews yet.</td></tr>';
    return;
  }
  el.innerHTML = rows.join('');
}

function editProduct(id) {
  const p = adminProducts.find(x => x._id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('prodFormTitle').textContent = 'Edit Product';
  document.getElementById('prodId').value    = p._id;
  document.getElementById('prodName').value  = p.name;
  document.getElementById('prodDesc').value  = p.description;
  document.getElementById('prodCat').value   = p.category;
  document.getElementById('prodBrand').value = p.brand || '';
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodOrigPrice').value = p.originalPrice || '';
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodImages').value = (p.images || []).join('\n');
  document.getElementById('prodFeatured').checked = p.featured;
  document.getElementById('prodFeatures').value = (p.features || []).join('\n');
  document.getElementById('productFormModal').classList.add('open');
}

function openAddProduct() {
  editingProductId = null;
  document.getElementById('prodFormTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productFormModal').classList.add('open');
}

function closeProductForm() { document.getElementById('productFormModal').classList.remove('open'); editingProductId = null; }

async function saveProduct(e) {
  e.preventDefault();
  const body = {
    name:          document.getElementById('prodName').value.trim(),
    description:   document.getElementById('prodDesc').value.trim(),
    category:      document.getElementById('prodCat').value,
    brand:         document.getElementById('prodBrand').value.trim(),
    price:         parseFloat(document.getElementById('prodPrice').value),
    originalPrice: parseFloat(document.getElementById('prodOrigPrice').value) || null,
    stock:         parseInt(document.getElementById('prodStock').value),
    badge:         document.getElementById('prodBadge').value,
    images:        document.getElementById('prodImages').value.split('\n').map(s => s.trim()).filter(Boolean),
    featured:      document.getElementById('prodFeatured').checked,
    features:      document.getElementById('prodFeatures').value.split('\n').map(s => s.trim()).filter(Boolean),
  };
  try {
    if (editingProductId) await window.API.productsAPI.update(editingProductId, body);
    else await window.API.productsAPI.create(body);
    showToast(editingProductId ? 'Product updated ✅' : 'Product created ✅');
    closeProductForm();
    loadAdminProducts();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await window.API.productsAPI.delete(id);
    showToast('Product deleted');
    loadAdminProducts();
  } catch(e) { showToast(e.message, 'error'); }
}

/* ── NEW ADMIN FEATURES ── */

async function loadAdminUsers() {
  const el = document.getElementById('adminUsersTable');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try {
    const { users } = await window.API.authAPI.getAllUsers();
    el.innerHTML = users.map(u => `<tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="status-badge ${u.role==='admin'?'status-Confirmed':'status-processing'}">${u.role}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
      <td>
        ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}', '${u.name}')">🗑️ Delete</button>` : `<span style="color:#888;font-size:12px">Admin</span>`}
      </td>
    </tr>`).join('');
  } catch(e) { el.innerHTML = formatTableError(e.message, 5); }
}

async function deleteUser(id, name) {
  if (!confirm(`Are you sure you want to delete user ${name}?`)) return;
  try {
    await window.API.authAPI.deleteUser(id);
    showToast('User deleted successfully ✅');
    loadAdminUsers();
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadAdminCarts() {
  const el = document.getElementById('adminCartsTable');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px"><div class="spinner"></div></td></tr>';
  try {
    const { carts } = await window.API.cartAPI.getAllAdmin();
    if (!carts || carts.length === 0) {
      el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">No active carts found.</td></tr>';
      return;
    }
    el.innerHTML = carts.map(c => {
      const totalAmount = c.items.reduce((s, item) => s + (item.price * item.quantity), 0);
      const userName = c.user ? c.user.name : 'Unknown User';
      const userEmail = c.user ? c.user.email : '';
      return `<tr>
        <td><div><strong>${userName}</strong></div><div style="font-size:12px;color:#555">${userEmail}</div></td>
        <td>${c.items.length} items</td>
        <td>₹${totalAmount.toLocaleString('en-IN')}</td>
        <td>${new Date(c.updatedAt).toLocaleString('en-IN')}</td>
      </tr>`;
    }).join('');
  } catch(e) { el.innerHTML = formatTableError(e.message, 4); }
}

async function loadAdminProfile() {
  const u = window.Auth.getUser();
  if (u) {
    document.getElementById('adminProfName').value = u.name || '';
    document.getElementById('adminProfEmail').value = u.email || '';
    document.getElementById('adminProfPhone').value = u.address?.phone || u.phone || '';
  }
}

async function updateAdminProfile(e) {
  e.preventDefault();
  const name = document.getElementById('adminProfName').value;
  const phone = document.getElementById('adminProfPhone').value;
  const password = document.getElementById('adminProfPass').value;
  
  const body = { name, phone };
  if (password) body.password = password;

  try {
    const res = await window.API.authAPI.updateProfile(body);
    showToast('Profile updated successfully ✅');
    if (res.user) window.Auth.setUser(res.user);
    document.getElementById('adminProfPass').value = '';
    document.getElementById('adminUserName').textContent = res.user.name;
  } catch(e) {
    showToast(e.message, 'error');
  }
}

window.initAdmin             = initAdmin;
window.showAdminSection      = showAdminSection;
window.openAddProduct        = openAddProduct;
window.closeProductForm      = closeProductForm;
window.saveProduct           = saveProduct;
window.editProduct           = editProduct;
window.deleteProduct         = deleteProduct;
window.updateOrderStatus     = updateOrderStatus;
window.loadAdminCancellations= loadAdminCancellations;
window.loadAdminMissing      = loadAdminMissing;
window.loadAdminReviews      = loadAdminReviews;
window.approveRefund         = approveRefund;
window.resolveReport         = resolveReport;
window.deleteUser            = deleteUser;
window.updateAdminProfile    = updateAdminProfile;

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('adminLayout')) initAdmin(); });
