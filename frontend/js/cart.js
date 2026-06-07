/* =====================================================
   cart.js — Cart State & UI Management (Fixed)
   ===================================================== */

let localCart = JSON.parse(localStorage.getItem('amazon_local_cart') || '[]');

function saveLocalCart() { localStorage.setItem('amazon_local_cart', JSON.stringify(localCart)); }

// Is this a real MongoDB ObjectId?
function isMongoId(id) { return /^[a-f\d]{24}$/i.test(String(id)); }

/* ── Helpers ── */
function formatPrice(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

function starsHTML(rating, count) {
  const r = parseFloat(rating) || 0;
  const full = Math.floor(r), half = r % 1 >= 0.5 ? 1 : 0, empty = 5 - full - half;
  return `<div class="stars"><span class="stars-icons" style="color:#FF9900">${'★'.repeat(full)}${half ? '½' : ''}${'☆'.repeat(empty)}</span><span class="stars-count" style="color:#007185;font-size:12px"> ${Number(count||0).toLocaleString()}</span></div>`;
}

function showToast(msg, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => { setTimeout(() => t.classList.add('visible'), 10); });
  setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 2800);
}

/* ── Cart Badge ── */
function updateCartBadge(count) {
  document.querySelectorAll('#cartBadge, .cart-count').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ── Get product info from local pools ── */
function findProductLocally(productId) {
  const pool = [
    ...(window.allProducts || []),
    ...(window.STATIC_PRODUCTS || []),
  ];
  return pool.find(x => (x._id || x.id) == productId) || null;
}

/* ── Add to Cart ── */
async function addToCart(productId, qty = 1) {
  const pid = String(productId);
  const prod = findProductLocally(pid);

  // If logged in AND it's a real MongoDB product → use API
  if (window.Auth && window.Auth.isLoggedIn() && isMongoId(pid)) {
    try {
      await window.API.cartAPI.add(pid, qty);
      await loadCartFromServer();
      showToast('Added to cart! 🛒', 'success');
      return;
    } catch (e) {
      showToast('Added to cart locally 🛒', 'success'); // fallback to local
    }
  }

  // Local cart (guest OR static product)
  const idx = localCart.findIndex(i => i.productId === pid);
  if (idx > -1) {
    localCart[idx].qty = Math.min(localCart[idx].qty + qty, 10);
  } else {
    localCart.push({
      productId: pid,
      qty,
      name:  prod ? prod.name  : 'Product',
      image: prod ? ((prod.images && prod.images[0]) || prod.img || '') : '',
      price: prod ? prod.price : 0,
    });
  }
  saveLocalCart();
  updateCartBadge(localCart.reduce((a, i) => a + i.qty, 0));
  showToast('Added to cart! 🛒', 'success');
}

/* ── Load Cart ── */
async function loadCartFromServer() {
  if (window.Auth && window.Auth.isLoggedIn()) {
    try {
      const { cart } = await window.API.cartAPI.get();
      // Merge server cart items with local cart (for static products)
      const serverItems = cart.items || [];
      const localItems  = localCart.filter(i => !isMongoId(i.productId)); // keep non-mongo items
      const merged = [...serverItems, ...localItems];
      const total  = (cart.totalPrice || 0) + localItems.reduce((a, i) => a + i.price * i.qty, 0);
      updateCartBadge((cart.totalItems || 0) + localItems.reduce((a, i) => a + i.qty, 0));
      window._serverCart = { items: merged, totalPrice: total };
      return window._serverCart;
    } catch (_) {}
  }
  // Guest mode — pure local
  const total = localCart.reduce((a, i) => a + (i.price || 0) * (i.qty || 1), 0);
  const count = localCart.reduce((a, i) => a + (i.qty || 1), 0);
  updateCartBadge(count);
  return { items: localCart, totalPrice: total, totalItems: count };
}

/* ── Render Cart Sidebar ── */
function renderCartSidebar(cart) {
  const container = document.getElementById('cartItemsList');
  const footer    = document.getElementById('cartFooter');
  const totalEl   = document.getElementById('cartTotal');
  const countEl   = document.getElementById('cartItemCount');
  if (!container) return;

  const items = cart.items || [];
  if (!items.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px 20px"><div style="font-size:60px;margin-bottom:12px">🛒</div><p style="color:#555;font-size:14px">Your cart is empty</p><a href="index.html" class="btn btn-primary btn-full" style="margin-top:12px;display:block">Start shopping</a></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  if (footer) footer.style.display = 'block';

  container.innerHTML = items.map(item => {
    const p     = item.product || {};
    const name  = item.name  || p.name  || 'Product';
    const img   = item.image || (p.images && p.images[0]) || p.img || 'https://via.placeholder.com/80';
    const price = item.price || p.price || 0;
    const qty   = item.quantity || item.qty || 1;
    const pid   = (item.product && (item.product._id || item.product)) || item.productId || '';
    return `<div class="cart-item-row" id="ci-${pid}" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #eee">
      <img src="${img}" alt="${name}" style="width:80px;height:80px;object-fit:contain;border:1px solid #eee;border-radius:3px;flex-shrink:0" onerror="this.src='https://via.placeholder.com/80'">
      <div style="flex:1">
        <div style="font-size:13px;color:#111;margin-bottom:4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${name}</div>
        <div style="color:#B12704;font-weight:700;font-size:15px;margin-bottom:6px">${formatPrice(price)}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="background:#f3f3f3;border:1px solid #ccc;border-radius:3px;display:flex;align-items:center">
            <button style="background:none;border:none;padding:4px 10px;font-size:18px;cursor:pointer;font-weight:700" onclick="changeQty('${pid}',${qty-1})">−</button>
            <span style="padding:4px 10px;font-weight:700;min-width:20px;text-align:center">${qty}</span>
            <button style="background:none;border:none;padding:4px 10px;font-size:18px;cursor:pointer;font-weight:700" onclick="changeQty('${pid}',${qty+1})">+</button>
          </div>
          <button style="background:none;border:none;color:#007185;font-size:12px;cursor:pointer;text-decoration:none" onclick="removeFromCart('${pid}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const total = cart.totalPrice || items.reduce((a, i) => a + (i.price || 0) * (i.quantity || i.qty || 1), 0);
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (countEl) countEl.textContent = items.reduce((a, i) => a + (i.quantity || i.qty || 1), 0);
}

/* ── Change Qty ── */
async function changeQty(productId, qty) {
  const pid = String(productId);
  if (window.Auth && window.Auth.isLoggedIn() && isMongoId(pid)) {
    try {
      await window.API.cartAPI.update(pid, qty);
      const cart = await loadCartFromServer();
      renderCartSidebar(cart);
      return;
    } catch (_) {}
  }
  // Local
  const idx = localCart.findIndex(i => i.productId === pid);
  if (idx > -1) {
    if (qty < 1) localCart.splice(idx, 1);
    else localCart[idx].qty = Math.min(qty, 10);
    saveLocalCart();
  }
  updateCartBadge(localCart.reduce((a, i) => a + i.qty, 0));
  const cart = await loadCartFromServer();
  renderCartSidebar(cart);
}

/* ── Remove ── */
async function removeFromCart(productId) {
  const pid = String(productId);
  if (window.Auth && window.Auth.isLoggedIn() && isMongoId(pid)) {
    try {
      await window.API.cartAPI.remove(pid);
    } catch (_) {}
  }
  localCart = localCart.filter(i => i.productId !== pid);
  saveLocalCart();
  const cart = await loadCartFromServer();
  renderCartSidebar(cart);
  showToast('Item removed', 'info');
}

/* ── Open / Close Cart Sidebar ── */
async function openCart() {
  const modal    = document.getElementById('cartModal');
  const backdrop = document.getElementById('cartBackdrop');
  if (modal)    modal.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  const cart = await loadCartFromServer();
  renderCartSidebar(cart);
}
function closeCart() {
  document.getElementById('cartModal')?.classList.remove('open');
  document.getElementById('cartBackdrop')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Checkout ── */
function goToCheckout() {
  const total = localCart.reduce((a, i) => a + i.qty, 0);
  if (!total && (!window._serverCart || !(window._serverCart.items || []).length)) {
    showToast('Your cart is empty!', 'error'); return;
  }
  if (!window.Auth || !window.Auth.isLoggedIn()) {
    showToast('Please sign in to checkout', 'info');
    setTimeout(() => window.location.href = 'login.html?redirect=checkout.html', 900);
    return;
  }
  window.location.href = 'checkout.html';
}

/* ── Buy Now ── */
async function buyNow(productId, qty = 1) {
  const pid = String(productId);
  // Store "buy now" item separately so checkout shows only this product
  const prod = findProductLocally(pid);
  const buyNowItem = {
    productId: pid,
    qty: qty || 1,
    name:  prod ? prod.name  : 'Product',
    image: prod ? ((prod.images && prod.images[0]) || '') : '',
    price: prod ? prod.price : 0,
  };
  sessionStorage.setItem('amazon_buy_now', JSON.stringify(buyNowItem));
  if (!window.Auth || !window.Auth.isLoggedIn()) {
    showToast('Please sign in to buy', 'info');
    setTimeout(() => window.location.href = 'login.html?redirect=checkout.html', 900);
    return;
  }
  window.location.href = 'checkout.html?buynow=1';
}

/* ── CartManager ── */
window.CartManager = {
  add: addToCart, open: openCart, close: closeCart,
  load: loadCartFromServer, render: renderCartSidebar,
  reset: () => { localCart = []; saveLocalCart(); updateCartBadge(0); },
  goToCheckout, buyNow,
};
window.addToCart      = addToCart;
window.openCart       = openCart;
window.closeCart      = closeCart;
window.changeQty      = changeQty;
window.removeFromCart = removeFromCart;
window.goToCheckout   = goToCheckout;
window.buyNow         = buyNow;
window.showToast      = showToast;
window.starsHTML      = starsHTML;
window.formatPrice    = formatPrice;

document.addEventListener('DOMContentLoaded', () => loadCartFromServer());
