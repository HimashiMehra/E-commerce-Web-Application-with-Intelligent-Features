/* =====================================================
   auth.js — Authentication & User State Management
   ===================================================== */

const AUTH_KEY  = 'amazon_token';
const USER_KEY  = 'amazon_user';

/* ── State ── */
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null');

/* ── Helpers ── */
function saveAuth(token, user) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  currentUser = null;
}

function isLoggedIn() { return !!localStorage.getItem(AUTH_KEY); }
function isAdmin()    { return currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@amazon-clone.com'); }
function getUser()    { return currentUser; }
function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
  updateNavAuth();
}

/* ── Update Navbar UI ── */
function updateNavAuth() {
  const greetEl   = document.getElementById('greetLine');
  const signInBtn = document.getElementById('navSignInBtn');
  const signOutBtn = document.getElementById('navSignOutBtn');
  const adminLink  = document.getElementById('adminNavLink');

  if (isLoggedIn() && currentUser) {
    if (greetEl)    greetEl.textContent = `Hello, ${currentUser.name.split(' ')[0]}`;
    if (signInBtn)  signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'block';
    if (adminLink && isAdmin()) adminLink.style.display = 'block';
  } else {
    if (greetEl)    greetEl.textContent = 'Hello, Sign in';
    if (signInBtn)  signInBtn.style.display = 'block';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (adminLink)  adminLink.style.display = 'none';
  }
}

/* ── Register ── */
async function doRegister(name, email, password) {
  const data = await window.API.authAPI.register({ name, email, password });
  saveAuth(data.token, data.user);
  updateNavAuth();
  return data;
}

/* ── Login ── */
async function doLogin(email, password) {
  const data = await window.API.authAPI.login({ email, password });
  saveAuth(data.token, data.user);
  updateNavAuth();
  return data;
}

/* ── Logout ── */
async function doLogout() {
  try { await window.API.authAPI.logout(); } catch(_) {}
  clearAuth();
  updateNavAuth();
  // Clear cart UI
  if (window.CartManager) window.CartManager.reset();
  window.location.href = 'index.html';
}

/* ── Require auth (redirect if not logged in) ── */
function requireAuth(redirectTo = 'login.html') {
  if (!isLoggedIn()) {
    window.location.href = redirectTo + '?redirect=' + encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}

/* ── Require admin ── */
function requireAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ── Initialize on every page ── */
document.addEventListener('DOMContentLoaded', () => {
  // Re-hydrate user from storage
  const stored = localStorage.getItem(USER_KEY);
  if (stored) { try { currentUser = JSON.parse(stored); } catch(_) { clearAuth(); } }
  updateNavAuth();
});

/* ── Export ── */
window.Auth = { isLoggedIn, isAdmin, getUser, setUser, doLogin, doRegister, doLogout, requireAuth, requireAdmin, updateNavAuth, saveAuth, clearAuth };
