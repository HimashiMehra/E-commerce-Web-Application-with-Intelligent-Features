/* ── orders.js ── */
async function loadMyOrders() {
  const el = document.getElementById('ordersContainer');
  if (!el) return;
  if (!window.Auth || !window.Auth.isLoggedIn()) { window.location.href = 'login.html?redirect=orders.html'; return; }
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const { orders } = await window.API.ordersAPI.getMyOrders();
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><h2>No Orders Yet</h2><p>Your order history will appear here.</p><a href="index.html" class="btn btn-primary">Start Shopping</a></div>`;
      return;
    }
    el.innerHTML = orders.map(order => {
      const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const num  = order.orderNumber || `AMZ-${order._id.slice(-8).toUpperCase()}`;
      const steps = ['processing','confirmed','shipped','out_for_delivery','delivered'];
      const stepIdx = steps.indexOf(order.orderStatus);
      return `<div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <div>
            <div style="font-size:13px;color:#555">ORDER PLACED</div>
            <div style="font-weight:600">${date}</div>
          </div>
          <div>
            <div style="font-size:13px;color:#555">TOTAL</div>
            <div style="font-weight:700">₹${Number(order.totalPrice).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style="font-size:13px;color:#555">ORDER #</div>
            <div style="font-weight:600;font-size:13px">${num}</div>
          </div>
          <span class="status-badge status-${order.orderStatus}">${order.orderStatus.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          ${order.orderItems.map(item => `<div style="display:flex;gap:10px;align-items:center;min-width:200px">
            <img src="${item.image}" style="width:64px;height:64px;object-fit:contain;border:1px solid #eee;border-radius:3px" onerror="this.src='https://via.placeholder.com/64'">
            <div><div style="font-size:13px;font-weight:600">${item.name.substring(0,50)}</div><div style="font-size:12px;color:#555">Qty: ${item.quantity} × ₹${Number(item.price).toLocaleString('en-IN')}</div></div>
          </div>`).join('')}
        </div>
        <div class="order-timeline">
          ${steps.map((step, i) => `<div class="timeline-item">
            <div class="timeline-dot ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}"></div>
            <div class="timeline-title">${step.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</div>
            ${i === stepIdx ? '<div class="timeline-desc">Current status</div>' : ''}
          </div>`).join('')}
        </div>
        ${order.paymentStatus === 'pending' && order.paymentMethod === 'stripe' ? `<button class="btn btn-orange btn-full" style="margin-top:12px" onclick="retryPayment('${order._id}')">💳 Complete Payment</button>` : ''}
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = `<div class="alert alert-error">Failed to load orders: ${e.message}</div>`; }
}

async function retryPayment(orderId) {
  try {
    const { sessionUrl } = await window.API.paymentAPI.createCheckout(orderId);
    window.location.href = sessionUrl;
  } catch(e) { showToast('Payment failed: ' + e.message, 'error'); }
}

window.loadMyOrders  = loadMyOrders;
window.retryPayment  = retryPayment;
document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('ordersContainer')) loadMyOrders(); });
