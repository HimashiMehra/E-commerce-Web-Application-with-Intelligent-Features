/* =====================================================
   products.js — Product Rendering, Search, Filters
   ===================================================== */

let allProducts = [], filteredProducts = [], currentPage = 1;
const PAGE_SIZE = 12;
let searchDebounceTimer = null;
let currentProductModal = null;

/* ── Render Product Card ── */
function productCardHTML(p) {
  const disc = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const badgeClass = { 'Best Seller': 'best-seller', 'Deal': 'deal', 'New Arrival': 'new', 'Hot': 'hot' }[p.badge] || '';
  const inWL = isInWishlist(p._id || p.id);
  const pid  = p._id || p.id;
  return `<div class="product-card" id="pc-${pid}" onclick="openProductModal('${pid}')">
    <button class="wishlist-btn ${inWL ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist('${pid}',this)" title="Wishlist">${inWL ? '❤️' : '🤍'}</button>
    ${p.badge ? `<span class="badge badge-${badgeClass}" style="display:block;margin-bottom:6px">${p.badge}</span>` : ''}
    <img class="product-img" src="${(p.images && p.images[0]) || p.img || ''}" alt="${p.name || p.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
    ${p.prime ? `<div class="prime-badge">⚡ <span style="color:#00A8E0;font-weight:900">prime</span></div>` : ''}
    <div class="product-title">${p.name || p.title}</div>
    ${starsHTML(p.rating, p.numReviews || p.reviews || 0)}
    <div style="margin-bottom:8px">
      <span class="price-symbol">₹</span><span class="price-main">${Number(p.price).toLocaleString('en-IN')}</span>
      ${p.originalPrice ? `<span class="price-original" style="margin-left:4px">₹${Number(p.originalPrice).toLocaleString('en-IN')}</span>` : ''}
      ${disc >= 5 ? `<span class="price-save"> (${disc}% off)</span>` : ''}
    </div>
    <button class="add-cart-btn" onclick="event.stopPropagation();addToCart('${pid}',1)">Add to Cart</button>
  </div>`;
}

function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `<div class="skeleton skeleton-card"></div>`).join('');
}

/* ── Wishlist ── */
function isInWishlist(id) {
  const wl = JSON.parse(localStorage.getItem('amazon_wishlist') || '[]');
  return wl.includes(String(id));
}

async function toggleWishlist(productId, btn) {
  const wl  = JSON.parse(localStorage.getItem('amazon_wishlist') || '[]');
  const idx = wl.indexOf(String(productId));
  if (idx > -1) { wl.splice(idx, 1); if (btn) { btn.textContent = '🤍'; btn.classList.remove('active'); } }
  else { wl.push(String(productId)); if (btn) { btn.textContent = '❤️'; btn.classList.add('active'); } }
  localStorage.setItem('amazon_wishlist', JSON.stringify(wl));

  if (window.Auth && window.Auth.isLoggedIn()) {
    try { await window.API.authAPI.toggleWishlist(productId); } catch(_) {}
  }
  showToast(idx > -1 ? 'Removed from wishlist' : 'Added to wishlist ❤️');
}

/* ── Product Modal ── */
async function openProductModal(productId) {
  const modal = document.getElementById('productModal');
  const body  = document.getElementById('pmBody');
  if (!modal || !body) {
    window.location.href = `product.html?id=${productId}`;
    return;
  }
  modal.classList.add('open');
  body.innerHTML = `<div style="padding:40px;text-align:center"><div class="spinner"></div></div>`;

  // 1. Try local cache first (instant)
  let p = allProducts.find(x => (x._id || x.id) == productId);

  // 2. Try static data fallback
  if (!p && window.STATIC_PRODUCTS) {
    p = window.STATIC_PRODUCTS.find(x => (x._id || x.id) == productId);
  }

  // 3. Try API
  if (!p && window.API) {
    try {
      const d = await window.API.productsAPI.getById(productId);
      p = d.product;
    } catch(_) {}
  }

  if (!p) {
    body.innerHTML = `<div style="padding:24px;text-align:center"><p style="color:#cc0c39">⚠️ Product not found.</p><button class="btn btn-primary" onclick="closeProductModal()">Close</button></div>`;
    return;
  }
  renderProductModal(p, body);
  currentProductModal = p;
}

function renderProductModal(p, body) {
  const pid  = p._id || p.id;
  const imgs = p.images || (p.img ? [p.img] : ['https://via.placeholder.com/500']);
  const disc = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const savings = p.originalPrice ? p.originalPrice - p.price : 0;
  const delivDate = new Date(Date.now() + 2*24*3600*1000).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  const emi = Math.round(p.price / 12);
  body.innerHTML = `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
  <div>
    <div style="border:1px solid #ddd;border-radius:4px;padding:12px;text-align:center;background:#fafafa">
      <img id="pmMainImg" src="${imgs[0]}" alt="${p.name}" style="width:100%;max-height:320px;object-fit:contain" onerror="this.src='https://via.placeholder.com/400'">
    </div>
    ${imgs.length>1?`<div style="display:flex;gap:6px;margin-top:8px;overflow-x:auto">${imgs.map((im,i)=>`<img src="${im}" onclick="setPMImage(this,'${im}')" style="width:56px;height:56px;object-fit:contain;border:${i===0?'2px solid #e77600':'1px solid #ccc'};border-radius:3px;cursor:pointer;padding:3px;flex-shrink:0">`).join('')}</div>`:''}
    <div style="margin-top:10px;padding:8px;background:#f0f9ff;border:1px solid #b6d9f0;border-radius:4px;font-size:11px;color:#555">
      ✔ Secure Transaction &nbsp;✔ Easy Returns &nbsp;✔ 100% Authentic
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${p.badge?`<span style="display:inline-block;background:${p.badge==='Best Seller'?'#CC0C39':'#e77600'};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:2px;align-self:flex-start">${p.badge}</span>`:''}
    <h2 style="font-size:16px;font-weight:400;line-height:1.4;color:#0F1111;margin:0">${p.name}</h2>
    ${p.brand?`<div style="font-size:12px;color:#007185">Brand: <strong>${p.brand}</strong></div>`:''}
    <div style="display:flex;align-items:center;gap:6px">
      <span style="color:#FF9900">${'★'.repeat(Math.floor(p.rating||0))}${'☆'.repeat(5-Math.floor(p.rating||0))}</span>
      <span style="color:#007185;font-size:12px">${p.numReviews?Number(p.numReviews).toLocaleString()+' ratings':''}</span>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:2px 0">
    ${p.originalPrice?`<div style="font-size:12px;color:#565959">M.R.P.: <s>&#8377;${Number(p.originalPrice).toLocaleString('en-IN')}</s></div>`:''}
    <div style="display:flex;align-items:baseline;gap:8px">
      <span style="color:#B12704;font-size:12px">Price:</span>
      <span style="font-size:26px;font-weight:400">&#8377;${Number(p.price).toLocaleString('en-IN')}</span>
    </div>
    ${disc>=5?`<div style="background:#FDEBD0;padding:5px 8px;border-radius:3px;font-size:12px">🏷️ <strong>${disc}% off</strong> &#8212; Save &#8377;${Number(savings).toLocaleString('en-IN')}</div>`:''}
    ${p.prime?`<div style="color:#00A8E0;font-size:12px;font-weight:700">⚡ prime FREE Delivery</div>`:''}
    <div style="background:#f7faf7;border:1px solid #ddd;border-radius:3px;padding:8px;font-size:11px">
      🚚 <strong>FREE delivery</strong> by ${delivDate}<br>
      💳 No-Cost EMI from &#8377;${Number(emi).toLocaleString('en-IN')}/month
    </div>
    <div style="color:${(p.stock||0)>0?'#007600':'#B12704'};font-size:14px;font-weight:700">${(p.stock||0)>0?'&#10003; In Stock':'&#10007; Out of Stock'}</div>
    <div style="display:flex;align-items:center;gap:8px">
      <label style="font-size:12px;font-weight:700">Qty:</label>
      <select id="pmQty" style="border:1px solid #ccc;border-radius:3px;padding:5px 8px;background:#f3f3f3">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>
    </div>
    <button style="background:#FFD814;border:1px solid #FCD200;border-radius:20px;padding:9px;font-size:14px;font-weight:700;cursor:pointer" onclick="addToCart('${pid}',parseInt(document.getElementById('pmQty').value))">🛒 Add to Cart</button>
    <button style="background:#FFA41C;border:1px solid #FF8F00;border-radius:20px;padding:9px;font-size:14px;font-weight:700;cursor:pointer" onclick="window.buyNow('${pid}',parseInt(document.getElementById('pmQty').value))">⚡ Buy Now</button>
    <div style="font-size:11px;color:#555;line-height:1.8">
      🏪 <strong>Ships from:</strong> Amazon.in &nbsp;|&nbsp;
      ↩️ <strong>Return:</strong> 10-day Replacement
    </div>
    ${p.features&&p.features.length?`<div style="background:#f8f8f8;border-radius:3px;padding:8px"><div style="font-size:12px;font-weight:700;margin-bottom:4px">About this item</div><ul style="list-style:disc;padding-left:16px;font-size:11px;color:#333;line-height:1.9;margin:0">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>`:''}
    ${p.description?`<p style="font-size:11px;color:#555;line-height:1.5;margin:0">${p.description}</p>`:''}
  </div>
</div>`;
}

function setPMImage(el, src) {
  document.getElementById('pmMainImg').src = src;
  document.querySelectorAll('.pm-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.remove('open');
  currentProductModal = null;
}

async function buyNow(productId, qty) {
  closeProductModal();
  if (window.CartManager && window.CartManager.buyNow) {
    await window.CartManager.buyNow(productId, qty || 1);
  } else {
    await addToCart(productId, qty || 1);
    if (window.Auth && window.Auth.isLoggedIn()) window.location.href = 'checkout.html';
    else window.location.href = 'login.html?redirect=checkout.html';
  }
}

/* ── Search ── */
function handleSearchInput() {
  clearTimeout(searchDebounceTimer);
  const q  = document.getElementById('searchInput')?.value?.trim() || '';
  const sg = document.getElementById('searchSuggestions');
  if (sg) sg.style.display = 'none';
  if (!q) return;
  searchDebounceTimer = setTimeout(() => {
    const matches = allProducts.filter(p => (p.name || p.title || '').toLowerCase().includes(q.toLowerCase())).slice(0, 6);
    if (sg && matches.length) {
      sg.innerHTML = matches.map(p => `<div class="suggestion-item" onclick="doSearch('${(p.name||p.title).replace(/'/g,"\\'")}')"><span>${p.name || p.title}</span></div>`).join('');
      sg.style.display = 'block';
    }
  }, 400);
}

async function doSearch(keyword) {
  document.getElementById('searchSuggestions') && (document.getElementById('searchSuggestions').style.display = 'none');
  const q   = keyword || document.getElementById('searchInput')?.value?.trim() || '';
  const cat = document.getElementById('searchCategory')?.value || 'All';
  if (!q) return;
  showResultsPage(q, cat === 'All' ? '' : cat);
}

/* ── Pages ── */
function showHome() {
  document.getElementById('homePage')    && (document.getElementById('homePage').style.display = '');
  document.getElementById('resultsPage') && (document.getElementById('resultsPage').style.display = 'none');
  document.getElementById('dealsPage')   && (document.getElementById('dealsPage').style.display = 'none');
  document.getElementById('signInPage')  && (document.getElementById('signInPage').style.display = 'none');
  window.scrollTo(0, 0);
}

async function showResultsPage(keyword = '', category = '') {
  document.getElementById('homePage')    && (document.getElementById('homePage').style.display = 'none');
  document.getElementById('resultsPage') && (document.getElementById('resultsPage').style.display = '');
  document.getElementById('dealsPage')   && (document.getElementById('dealsPage').style.display = 'none');
  document.getElementById('signInPage')  && (document.getElementById('signInPage').style.display = 'none');
  window.scrollTo(0, 0);

  const grid = document.getElementById('resultsGrid');
  const info = document.getElementById('resultsInfo');
  if (grid) grid.innerHTML = skeletonCards(8);

  let pool = allProducts.length ? allProducts : (window.STATIC_PRODUCTS || []);

  try {
    const params = { limit: 50 };
    if (keyword)  params.keyword  = keyword;
    if (category) params.category = category;
    const data = await window.API.productsAPI.getAll(params);
    if (data.products && data.products.length) pool = data.products;
  } catch(_) { /* use pool fallback */ }

  // Filter locally
  let result = pool;
  if (keyword)  result = result.filter(p => (p.name||'').toLowerCase().includes(keyword.toLowerCase()));
  if (category) result = result.filter(p => p.category === category);

  filteredProducts = result;
  if (info) info.textContent = `${result.length} results${keyword ? ` for "${keyword}"` : ''}${category ? ` in ${category}` : ''}`;
  renderResultsGrid(filteredProducts);
  renderDeptFilters(filteredProducts);
}

function filterByCategory(cat) {
  if (cat === 'all') showResultsPage('', '');
  else showResultsPage('', cat);
}

function renderResultsGrid(products) {
  const grid = document.getElementById('resultsGrid');
  const noR  = document.getElementById('noResults');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = '';
    if (noR) noR.style.display = 'block';
    return;
  }
  if (noR) noR.style.display = 'none';
  grid.innerHTML = products.map(productCardHTML).join('');
}

function renderDeptFilters(products) {
  const el = document.getElementById('deptFilters');
  if (!el) return;
  const cats = [...new Set(products.map(p => p.category))];
  el.innerHTML = cats.map(c => `<label class="filter-option"><input type="checkbox" value="${c}" onchange="applyFilters()"> ${c}</label>`).join('');
}

function applyFilters() {
  const checkedCats = [...document.querySelectorAll('#deptFilters input:checked')].map(i => i.value);
  const priceVal    = document.querySelector('input[name="price"]:checked')?.value || 'all';
  const sortVal     = document.getElementById('sortSelect')?.value || 'featured';
  const minRating   = window._starFilter || 0;

  let result = [...filteredProducts];
  if (checkedCats.length) result = result.filter(p => checkedCats.includes(p.category));
  if (priceVal !== 'all') {
    if (priceVal.endsWith('+')) { const min = parseFloat(priceVal); result = result.filter(p => p.price >= min); }
    else { const [mn, mx] = priceVal.split('-').map(Number); result = result.filter(p => p.price >= mn && p.price <= mx); }
  }
  if (minRating) result = result.filter(p => p.rating >= minRating);

  if (sortVal === 'priceAsc')  result.sort((a, b) => a.price - b.price);
  if (sortVal === 'priceDesc') result.sort((a, b) => b.price - a.price);
  if (sortVal === 'rating')    result.sort((a, b) => b.rating - a.rating);

  renderResultsGrid(result);
}

function setStarFilter(n) { window._starFilter = n; applyFilters(); }

/* ── Carousel ── */
let carouselSlide = 0, carouselTimer = null;
const SLIDES = [
  { img: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1500&h=380&fit=crop&q=80', alt: 'Deal 1' },
  { img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1500&h=380&fit=crop&q=80', alt: 'Tech' },
  { img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1500&h=380&fit=crop&q=80', alt: 'Fashion' },
  { img: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1500&h=380&fit=crop&q=80', alt: 'Cameras' },
  { img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1500&h=380&fit=crop&q=80', alt: 'Audio' },
];

function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots  = document.getElementById('carouselDots');
  if (!track) return;
  track.innerHTML = SLIDES.map(s => `<div class="carousel-slide"><img src="${s.img}" alt="${s.alt}"><div class="slide-overlay"></div></div>`).join('');
  if (dots) dots.innerHTML = SLIDES.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`).join('');
  carouselTimer = setInterval(() => goToSlide((carouselSlide + 1) % SLIDES.length), 5000);
}

function goToSlide(n) {
  carouselSlide = n;
  const track = document.getElementById('carouselTrack');
  if (track) track.style.transform = `translateX(-${n * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

window.prevSlide = () => { clearInterval(carouselTimer); goToSlide((carouselSlide - 1 + SLIDES.length) % SLIDES.length); };
window.nextSlide = () => { clearInterval(carouselTimer); goToSlide((carouselSlide + 1) % SLIDES.length); };

/* ── Scroll Section ── */
function scrollSection(id, dir) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 700, behavior: 'smooth' });
}

/* ── Reveal on Scroll ── */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ── Deal Timer ── */
let dealSeconds = 8 * 3600 + 45 * 60 + 22;
function initDealTimer() {
  setInterval(() => {
    dealSeconds = Math.max(0, dealSeconds - 1);
    const h = String(Math.floor(dealSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((dealSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(dealSeconds % 60).padStart(2, '0');
    const t = `${h}:${m}:${s}`;
    document.getElementById('dealTimer')      && (document.getElementById('dealTimer').textContent = t);
    document.getElementById('dealsPageTimer') && (document.getElementById('dealsPageTimer').textContent = t);
  }, 1000);
}

/* ── Progress Bar ── */
function initProgressBar() {
  window.addEventListener('scroll', () => {
    const el  = document.getElementById('page-progress');
    if (!el) return;
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    el.style.width = `${Math.min(100, pct)}%`;
  });
}

/* ── Load Home Sections ── */
async function loadHomeSections() {
  // Start with static data immediately — no waiting
  allProducts = window.STATIC_PRODUCTS ? [...window.STATIC_PRODUCTS] : [];
  _renderHomeSections();

  // Then try to upgrade with live API data
  try {
    const data = await window.API.productsAPI.getAll({ limit: 50 });
    if (data.products && data.products.length > 0) {
      allProducts = data.products;
      _renderHomeSections();
    }
  } catch(_) { /* keep static data */ }
}

function _renderHomeSections() {
  const bs    = allProducts.filter(p => p.badge === 'Best Seller').slice(0, 10);
  const bsEl  = document.getElementById('bestSellers');
  if (bsEl) bsEl.innerHTML = bs.map(productCardHTML).join('');

  const recEl = document.getElementById('recommended');
  if (recEl) recEl.innerHTML = [...allProducts].sort(() => Math.random() - .5).slice(0, 10).map(productCardHTML).join('');

  const naEl  = document.getElementById('newArrivals');
  if (naEl) naEl.innerHTML  = [...allProducts].slice(0, 10).map(productCardHTML).join('');

  renderDealsGrid();
  renderCategoryGrid();
}

function renderCategoryGrid() {
  const el = document.getElementById('categoryGrid');
  if (!el) return;
  const CATS = [
    { name: 'Electronics', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=160&fit=crop&q=80' },
    { name: 'Books',       img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=160&fit=crop&q=80' },
    { name: 'Clothing',    img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=160&fit=crop&q=80' },
    { name: 'Home & Kitchen', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=160&fit=crop&q=80' },
    { name: 'Sports',      img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=160&fit=crop&q=80' },
    { name: 'Beauty',      img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=160&fit=crop&q=80' },
    { name: 'Toys',        img: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&h=160&fit=crop&q=80' },
    { name: 'Automotive',  img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&h=160&fit=crop&q=80' },
  ];
  el.innerHTML = CATS.map(c => `<div class="category-card" onclick="filterByCategory('${c.name}')">
    <h3>${c.name}</h3>
    <img src="${c.img}" alt="${c.name}" loading="lazy">
    <a class="see-more">Shop now</a>
  </div>`).join('');
}

function renderDealsGrid() {
  const el = document.getElementById('dealsGrid');
  if (!el) return;
  const deals = allProducts.filter(p => p.badge === 'Deal' || p.originalPrice > p.price).slice(0, 8);
  el.innerHTML = deals.map(p => {
    const disc = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
    return `<div class="deal-card" onclick="openProductModal('${p._id || p.id}')">
      <img src="${(p.images && p.images[0]) || p.img}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/200'">
      <div class="deal-card-info">
        <div class="deal-discount">Up to ${disc}% off</div>
        <div style="font-size:12px;color:#555;margin-top:2px">${p.name.substring(0, 50)}...</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px">₹${Number(p.price).toLocaleString('en-IN')}</div>
        <div class="deal-bar"><div class="deal-bar-fill" style="width:${Math.random()*60+20}%"></div></div>
      </div>
    </div>`;
  }).join('');
}

function showDeals() {
  document.getElementById('homePage')    && (document.getElementById('homePage').style.display = 'none');
  document.getElementById('resultsPage') && (document.getElementById('resultsPage').style.display = 'none');
  document.getElementById('dealsPage')   && (document.getElementById('dealsPage').style.display = '');
  document.getElementById('signInPage')  && (document.getElementById('signInPage').style.display = 'none');
  const el = document.getElementById('dealsPageGrid');
  if (el) el.innerHTML = allProducts.filter(p => p.badge === 'Deal' || p.originalPrice > p.price).map(productCardHTML).join('');
}

/* ── Exports ── */
window.openProductModal   = openProductModal;
window.closeProductModal  = closeProductModal;
window.handleSearchInput  = handleSearchInput;
window.doSearch           = doSearch;
window.filterByCategory   = filterByCategory;
window.showHome           = showHome;
window.showResultsPage    = showResultsPage;
window.showDeals          = showDeals;
window.applyFilters       = applyFilters;
window.setStarFilter      = setStarFilter;
window.scrollSection      = scrollSection;
window.toggleWishlist     = toggleWishlist;
window.setPMImage         = setPMImage;
window.buyNow             = buyNow;
window.initCarousel       = initCarousel;
window.initDealTimer      = initDealTimer;
window.initProgressBar    = initProgressBar;
window.initScrollReveal   = initScrollReveal;
window.loadHomeSections   = loadHomeSections;
window.goToSlide          = goToSlide;
