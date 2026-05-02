// ============================================================
// BackendMain.js — All-in-one backend for X-Gym
// Handles: Firebase Auth, Realtime Database, Role Routing, Cart,
//          Client Features, Trainer Features, UI Utilities
// ============================================================

// ============================================================
// SECTION 1: FIREBASE CONFIGURATION
// ============================================================
/// Create a Firebase Type Webapp and paste your configuration , warning dont use message ID
const firebaseConfig = {
  apiKey: "AIzaSyDynE1tulBXI_ZBDqU9WjOHojRGVpuRodo",
  authDomain: "agile-development-gym.firebaseapp.com",
  databaseURL: "https://agile-development-gym-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "agile-development-gym",
  storageBucket: "agile-development-gym.firebasestorage.app",
  messagingSenderId: "143443368712",
  appId: "1:143443368712:web:0f79e0f8f613773ab46abd"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

// Trainer email whitelist � emails here are assigned "trainer" role on registration.
// All other emails default to "client".
const TRAINER_EMAILS = ["trainer1@xgym.com", "trainer2@xgym.com"];

// Hardcoded admin accounts � these are NOT stored/fetched from Firebase.
// To add a new admin, add their email (lowercase) to this map.
const ADMIN_ACCOUNTS = {
  "mm@gmail.com":    { name: "MM",  email: "mm@gmail.com",    role: "admin" },
  "kj123@gmail.com": { name: "kj",  email: "KJ123@gmail.com", role: "admin" }
};

// ============================================================
// SECTION 2: UTILITY FUNCTIONS
// ============================================================

/**
 * Generate a random 8-character alphanumeric share code.
 */
function generateShareCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format a timestamp (ISO string or epoch ms) into a readable string.
 * @param {string|number} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

/**
 * Display a toast notification at the bottom of the screen.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "info") {
  let container = document.getElementById("xgym-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "xgym-toast-container";
    container.style.cssText = `
      position: fixed; bottom: 30px; right: 30px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const colors = {
    success: "rgba(0,200,80,0.9)",
    error:   "rgba(220,30,30,0.9)",
    info:    "rgba(255,80,0,0.85)"
  };

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    background: ${colors[type] || colors.info};
    color: #fff;
    padding: 14px 22px;
    border-radius: 10px;
    font-family: 'Poppins', sans-serif;
    font-size: 0.95rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/**
 * Show a modal dialog with custom HTML content and an optional confirm callback.
 * @param {string} title
 * @param {string} contentHTML
 * @param {Function|null} onConfirm
 */
function showModal(title, contentHTML, onConfirm = null) {
  const existing = document.getElementById("xgym-modal");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "xgym-modal";
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background: rgba(20,20,20,0.95);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 36px 40px;
    max-width: 500px;
    width: 90%;
    color: #fff;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 0 40px rgba(255,0,60,0.3);
  `;

  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  titleEl.style.cssText = "margin: 0 0 18px; font-size: 1.5rem; color: #0887e2;";

  const body = document.createElement("div");
  body.innerHTML = contentHTML;
  body.style.marginBottom = "24px";

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display: flex; gap: 12px; justify-content: flex-end;";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.cssText = `
    padding: 10px 22px; border: none; border-radius: 8px;
    background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
    font-family: 'Poppins', sans-serif;
  `;
  closeBtn.addEventListener("click", () => overlay.remove());

  btnRow.appendChild(closeBtn);

  if (onConfirm) {
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.style.cssText = `
      padding: 10px 22px; border: none; border-radius: 8px;
      background: linear-gradient(90deg, #ff0033, #ff5500);
      color: #fff; cursor: pointer; font-family: 'Poppins', sans-serif;
    `;
    confirmBtn.addEventListener("click", () => {
      onConfirm();
      overlay.remove();
    });
    btnRow.appendChild(confirmBtn);
  }

  box.appendChild(titleEl);
  box.appendChild(body);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ============================================================
// SECTION 3: FIREBASE AUTH FUNCTIONS
// ============================================================

// Flag: true while a login or register redirect is in progress.
// Prevents onAuthStateChanged from racing and interfering.
let _authActionInProgress = false;

/**
 * Helper: force-navigate to a page.
 * Waits briefly for Firebase Auth to persist the session before navigating.
 */
function _forceRedirect(target) {
  console.log("[X-Gym] Redirecting to:", target);
  _clearRedirectLoop();
  // Small delay to let Firebase Auth persist the session to IndexedDB
  // before the page navigates away (prevents waitForAuth returning null
  // on the destination page)
  setTimeout(function() {
    window.location.href = target;
  }, 400);
}

/**
 * Register a new user with email/password and save their profile to RTDB.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {"client"|"trainer"} role
 */
async function registerUser(email, password, name, role) {
  _authActionInProgress = true;
  console.log("[X-Gym] registerUser called for:", email, role);
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  console.log("[X-Gym] Auth user created:", cred.user.uid);
  const uid  = cred.user.uid;
  const shareCode = generateShareCode();

  // AWAIT the profile write — do NOT fire-and-forget.
  // This ensures the profile exists in RTDB before any redirect.
  try {
    await db.ref("users/" + uid).set({
      name: name,
      email: email,
      role: role,
      shareCode: shareCode,
      createdAt: Date.now()
    });
    console.log("[X-Gym] RTDB profile written successfully for", uid, "role:", role);
  } catch (err) {
    console.error("[X-Gym] RTDB profile write failed:", err);
    // Retry once
    try {
      await db.ref("users/" + uid).set({
        name: name,
        email: email,
        role: role,
        shareCode: shareCode,
        createdAt: Date.now()
      });
      console.log("[X-Gym] RTDB profile written on retry");
    } catch (retryErr) {
      console.error("[X-Gym] RTDB profile write failed on retry:", retryErr);
      throw new Error("Failed to save profile. Please check your connection and try again.");
    }
  }

  return { user: cred.user, role: role };
}

/**
 * Sign in an existing user. Returns the user credential.
 * @param {string} email
 * @param {string} password
 */
async function loginUser(email, password) {
  _authActionInProgress = true;
  console.log("[X-Gym] loginUser called for:", email);
  const cred = await auth.signInWithEmailAndPassword(email, password);
  console.log("[X-Gym] Login successful, uid:", cred.user.uid);
  return cred;
}

/**
 * Sign out the current user and redirect to the index page.
 */
async function logoutUser() {
  await auth.signOut();
  // Wait for auth state to fully clear before navigating
  await new Promise(function(resolve) {
    var unsub = auth.onAuthStateChanged(function(user) {
      if (!user) { unsub(); resolve(); }
    });
  });
  window.location.href = "index.html";
}

/**
 * Listen for auth state changes.
 * @param {Function} callback  Called with (user|null)
 */
function onAuthChange(callback) {
  auth.onAuthStateChanged(callback);
}

/**
 * Wait for Firebase Auth to fully resolve the persisted session.
 * Returns the authenticated user or null (single-shot, no race condition).
 * @returns {Promise<firebase.User|null>}
 */
function waitForAuth() {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      resolve(user);
    });
  });
}

/**
 * Return the currently signed-in Firebase user (or null).
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if an email belongs to a hardcoded admin.
 * @param {string} email
 * @returns {Object|null} The admin profile object, or null.
 */
function getHardcodedAdmin(email) {
  if (!email) return null;
  return ADMIN_ACCOUNTS[email.toLowerCase()] || null;
}

/**
 * Fetch a user's profile from RTDB, or return the hardcoded admin profile.
 * @param {string} uid
 * @param {string} [email] — if supplied, checks hardcoded admins first.
 * @returns {Object|null}
 */
async function getUserProfile(uid, email) {
  // Check hardcoded admins first (by email)
  const admin = getHardcodedAdmin(email);
  if (admin) return { id: uid, ...admin };

  const snap = await db.ref("users/" + uid).once("value");
  if (!snap.exists()) return null;
  const profile = { id: uid, ...snap.val() };

  // Also check if the stored email matches a hardcoded admin
  const adminByStored = getHardcodedAdmin(profile.email);
  if (adminByStored) return { id: uid, ...adminByStored };

  return profile;
}

// ============================================================
// SECTION 4: CART (localStorage-based)
// ============================================================

const CART_KEY = "xgym_cart";

/** Return the current cart array. */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

/** Persist the cart array. */
function _saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Add an item to the cart.
 * @param {{ id: string, name: string, price: number }} item
 */
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  _saveCart(cart);
  _updateCartBadge();
}

/** Set a cart item's quantity (removes item if qty <= 0). */
function setCartItemQty(itemId, qty) {
  const cart = getCart();
  const item = cart.find(c => c.id === itemId);
  if (!item) return;
  const q = parseInt(qty, 10) || 0;
  if (q <= 0) {
    _saveCart(cart.filter(c => c.id !== itemId));
  } else {
    item.qty = q;
    _saveCart(cart);
  }
  _updateCartBadge();
}

/** Increment a cart item's quantity by 1. */
function incrementCartItem(itemId) {
  const cart = getCart();
  const item = cart.find(c => c.id === itemId);
  if (!item) return;
  item.qty = (item.qty || 1) + 1;
  _saveCart(cart);
  _updateCartBadge();
}

/** Decrement a cart item's quantity by 1 (removes at zero). */
function decrementCartItem(itemId) {
  const cart = getCart();
  const item = cart.find(c => c.id === itemId);
  if (!item) return;
  const next = (item.qty || 1) - 1;
  if (next <= 0) {
    _saveCart(cart.filter(c => c.id !== itemId));
  } else {
    item.qty = next;
    _saveCart(cart);
  }
  _updateCartBadge();
}

/**
 * Remove an item from the cart by id.
 * @param {string} itemId
 */
function removeFromCart(itemId) {
  _saveCart(getCart().filter(c => c.id !== itemId));
  _updateCartBadge();
}

/** Clear all items from the cart. */
function clearCart() {
  _saveCart([]);
  _updateCartBadge();
}

/** Update sidebar cart badge count. */
function _updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = getCart().reduce((sum, c) => sum + (c.qty || 1), 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

// ============================================================
// SECTION 5: CLIENT DASHBOARD FEATURES
// ============================================================

/** Fetch all trainers from RTDB. */
async function getAvailableTrainers() {
  const snap = await db.ref("users").orderByChild("role").equalTo("trainer").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Update trainer public profile fields from trainer dashboard only.
 */
async function updateTrainerPublicProfile(trainerId, payload) {
  const safe = {
    bio: String(payload.bio || "").trim(),
    specialty: String(payload.specialty || "").trim(),
    specialties: Array.isArray(payload.specialties) ? payload.specialties.filter(Boolean).map(s => String(s).trim()) : [],
    experience: String(payload.experience || "").trim(),
    certifications: Array.isArray(payload.certifications) ? payload.certifications.filter(Boolean).map(s => String(s).trim()) : [],
    availability: Array.isArray(payload.availability) ? payload.availability.filter(Boolean).map(s => String(s).trim()) : [],
    pricePerSession: Number(payload.pricePerSession || 0),
    pricePerMonth: Number(payload.pricePerMonth || 0),
    accentColor: String(payload.accentColor || "#0887e2").trim() || "#0887e2",
    updatedAt: Date.now()
  };

  await db.ref("users/" + trainerId).update(safe);
}

/**
 * Get all reviews for a trainer, newest first.
 */
async function getTrainerReviews(trainerId) {
  const snap = await db.ref("trainer_reviews/" + trainerId).once("value");
  if (!snap.exists()) return [];
  const rows = [];
  snap.forEach(child => rows.push({ id: child.key, ...child.val() }));
  rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return rows;
}

/**
 * Add a client review and refresh trainer aggregate rating fields.
 */
async function addTrainerReview(trainerId, clientId, clientName, rating, text) {
  const numericRating = Math.max(1, Math.min(5, Number(rating || 0)));
  if (!numericRating) throw new Error("Rating is required.");

  const reviewRef = db.ref("trainer_reviews/" + trainerId).push();
  await reviewRef.set({
    trainerId,
    clientId,
    clientName: clientName || "Client",
    rating: numericRating,
    text: String(text || "").trim(),
    createdAt: Date.now()
  });

  const all = await getTrainerReviews(trainerId);
  const sum = all.reduce((s, r) => s + Number(r.rating || 0), 0);
  const avg = all.length ? (sum / all.length) : 0;
  await db.ref("users/" + trainerId).update({
    rating: Number(avg.toFixed(1)),
    reviewCount: all.length,
    updatedAt: Date.now()
  });
}

/**
 * Hire a trainer by creating a client_trainer link.
 * @param {string} clientId
 * @param {string} trainerId
 */
async function hireTrainer(clientId, trainerId) {
  const ts = Date.now();
  const newRef = db.ref("client_trainer").push();
  await newRef.set({ clientId, trainerId, status: "active", createdAt: ts });
  // Mirror into invite paths so both read paths stay consistent
  await db.ref("client_invites/" + clientId + "/" + trainerId).set({ status: "accepted", createdAt: ts });
  await db.ref("trainer_invites/" + trainerId + "/" + clientId).set({ status: "accepted", createdAt: ts });
  await db.ref("trainer_clients").push().set({ trainerId, clientId, createdAt: ts });
}

/**
 * Get hired trainer IDs for a client.
 * @param {string} clientId
 * @returns {string[]}
 */
async function _getHiredTrainerIds(clientId) {
  const [snap1, snap2, snap3] = await Promise.all([
    db.ref("client_trainer").orderByChild("clientId").equalTo(clientId).once("value"),
    db.ref("client_invites/" + clientId).once("value"),
    db.ref("trainer_clients").orderByChild("clientId").equalTo(clientId).once("value")
  ]);
  const ids = new Set();
  if (snap1.exists()) {
    snap1.forEach(child => {
      const data = child.val();
      const status = String(data?.status || "").toLowerCase();
      const isActiveLike = !status || status === "active" || status === "accepted";
      if (data && data.trainerId && isActiveLike) ids.add(data.trainerId);
    });
  }
  if (snap2.exists()) {
    snap2.forEach(child => {
      const data = child.val();
      const status = String(data?.status || "").toLowerCase();
      const trainerId = data?.trainerId || child.key;
      if ((status === "accepted" || status === "active") && trainerId) ids.add(trainerId);
    });
  }
  if (snap3.exists()) {
    snap3.forEach(child => {
      const data = child.val();
      if (data && data.trainerId) ids.add(data.trainerId);
    });
  }
  return [...ids];
}

/**
 * Fetch workouts assigned to a client.
 * @param {string} clientId
 */
async function getClientWorkouts(clientId) {
  const snap = await db.ref("workouts").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Log a progress entry for a client.
 * @param {string} clientId
 * @param {Object} data
 */
async function logProgress(clientId, data) {
  const newRef = db.ref("progress").push();
  await newRef.set({
    clientId: clientId,
    ...data,
    createdAt: Date.now()
  });
}

/**
 * Fetch progress entries for a client, sorted by date ascending.
 * @param {string} clientId
 */
async function getProgress(clientId) {
  const snap = await db.ref("progress").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  // Sort by createdAt ascending
  result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return result;
}

/**
 * Log a meal entry for a client.
 * @param {string} clientId
 * @param {Object} data
 */
async function logMeal(clientId, data) {
  const newRef = db.ref("meals").push();
  await newRef.set({
    clientId: clientId,
    ...data,
    createdAt: Date.now()
  });
}

/**
 * Fetch meal entries for a client.
 * @param {string} clientId
 */
async function getMeals(clientId) {
  const snap = await db.ref("meals").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  // Sort by createdAt descending
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

/**
 * Fetch membership info for a user.
 * @param {string} userId
 */
async function getMembership(userId) {
  const snap = await db.ref("memberships").orderByChild("clientId").equalTo(userId).once("value");
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const plans = await getMembershipPlans().catch(() => []);

  function rankFromNameAndPrice(name, price) {
    const n = String(name || "").toLowerCase();
    if (n.includes("starter")) return 1;
    if (n.includes("core")) return 2;
    if (n.includes("elite")) return 3;
    return Number(price) || 0;
  }

  function membershipRank(m) {
    const linkedPlan = plans.find(p => p.id === m.planId)
      || plans.find(p => String(p.name || "").toLowerCase() === String(m.type || "").toLowerCase())
      || null;
    return rankFromNameAndPrice(linkedPlan?.name || m.type, linkedPlan?.price ?? m.price);
  }

  function membershipRecency(m) {
    return m.upgradedAt || m.updatedAt || m.startedAt || m.createdAt || 0;
  }

  if (!snap.exists()) {
    const paid = await getClientMembershipPayments(userId).catch(() => []);
    const latestPaid = paid.find(p => (p.status || "paid") === "paid");
    if (!latestPaid) return null;

    const paidPlan = plans.find(p => p.id === latestPaid.planId)
      || plans.find(p => String(p.name || "").toLowerCase() === String(latestPaid.planName || latestPaid.membershipType || "").toLowerCase())
      || null;

    const startedAt = Number(latestPaid.createdAt) || now;
    const durationDays = Number(latestPaid.durationDays) || Number(paidPlan?.durationDays) || 30;
    const expiresAt = startedAt + durationDays * oneDay;

    if (expiresAt < now) return null;

    const recoveredId = await createMembership({
      clientId: userId,
      planId: latestPaid.planId || paidPlan?.id || "",
      type: latestPaid.planName || latestPaid.membershipType || paidPlan?.name || "Membership",
      status: "active",
      startedAt,
      durationDays,
      expiresAt,
      price: Number(latestPaid.planPrice) || Number(paidPlan?.price) || Number(latestPaid.amount) || 0,
      paymentMethod: latestPaid.method || "card",
      recoveredAt: now,
      recoveryReason: "Recovered from payment history (membership record missing)"
    });

    if (latestPaid.id) {
      await db.ref("membership_payments/" + latestPaid.id).update({
        membershipId: recoveredId,
        updatedAt: now
      }).catch(() => {});
    }

    return {
      id: recoveredId,
      clientId: userId,
      planId: latestPaid.planId || paidPlan?.id || "",
      type: latestPaid.planName || latestPaid.membershipType || paidPlan?.name || "Membership",
      status: "active",
      startedAt,
      durationDays,
      expiresAt,
      price: Number(latestPaid.planPrice) || Number(paidPlan?.price) || Number(latestPaid.amount) || 0,
      paymentMethod: latestPaid.method || "card"
    };
  }

  const all = [];
  snap.forEach(child => all.push({ id: child.key, ...child.val() }));

  all.sort((a, b) => membershipRecency(b) - membershipRecency(a));

  const activeCandidates = all.filter(m => (m.status || "active") === "active" && (!m.expiresAt || m.expiresAt >= now));
  if (activeCandidates.length) {
    activeCandidates.sort((a, b) => {
      const rankDiff = membershipRank(b) - membershipRank(a);
      if (rankDiff !== 0) return rankDiff;
      return membershipRecency(b) - membershipRecency(a);
    });

    const chosen = activeCandidates[0];

    // Heal duplicate actives so UI and billing always use one authoritative active plan.
    for (const extra of activeCandidates.slice(1)) {
      await updateMembership(extra.id, {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "Superseded by higher-tier or newer active membership"
      }).catch(() => {});
    }

    return chosen;
  }

  // No active candidates — try payment-linked recovery only.
  // (The old "recoverable" path that blindly reactivated any non-cancelled record
  //  has been removed because it was resurrecting stale/garbage records from old test runs.)
  const paid = await getClientMembershipPayments(userId).catch(() => []);
  const paidWithMembership = paid.find(p => (p.status || "paid") === "paid" && p.membershipId);
  if (paidWithMembership) {
    const paidMembership = all.find(m => m.id === paidWithMembership.membershipId);
    if (paidMembership && (!paidMembership.expiresAt || paidMembership.expiresAt >= now)) {
      if ((paidMembership.status || "").toLowerCase() !== "active") {
        await updateMembership(paidMembership.id, {
          status: "active",
          recoveredAt: now,
          recoveryReason: "Recovered from paid membership record"
        }).catch(() => {});
      }
      return { ...paidMembership, status: "active" };
    }
  }

  const latestPaid = paid.find(p => (p.status || "paid") === "paid");
  if (latestPaid) {
    const paidPlan = plans.find(p => p.id === latestPaid.planId)
      || plans.find(p => String(p.name || "").toLowerCase() === String(latestPaid.planName || latestPaid.membershipType || "").toLowerCase())
      || null;

    const startedAt = Number(latestPaid.createdAt) || now;
    const durationDays = Number(latestPaid.durationDays) || Number(paidPlan?.durationDays) || 30;
    const expiresAt = startedAt + durationDays * oneDay;

    if (expiresAt >= now) {
      const recoveredId = await createMembership({
        clientId: userId,
        planId: latestPaid.planId || paidPlan?.id || "",
        type: latestPaid.planName || latestPaid.membershipType || paidPlan?.name || "Membership",
        status: "active",
        startedAt,
        durationDays,
        expiresAt,
        price: Number(latestPaid.planPrice) || Number(paidPlan?.price) || Number(latestPaid.amount) || 0,
        paymentMethod: latestPaid.method || "card",
        recoveredAt: now,
        recoveryReason: "Recovered from payment history (membership status stale)"
      });

      if (latestPaid.id) {
        await db.ref("membership_payments/" + latestPaid.id).update({
          membershipId: recoveredId,
          updatedAt: now
        }).catch(() => {});
      }

      return {
        id: recoveredId,
        clientId: userId,
        planId: latestPaid.planId || paidPlan?.id || "",
        type: latestPaid.planName || latestPaid.membershipType || paidPlan?.name || "Membership",
        status: "active",
        startedAt,
        durationDays,
        expiresAt,
        price: Number(latestPaid.planPrice) || Number(paidPlan?.price) || Number(latestPaid.amount) || 0,
        paymentMethod: latestPaid.method || "card"
      };
    }
  }

  return all[0] || null;
}

// ============================================================
// SECTION 6: TRAINER DASHBOARD FEATURES
// ============================================================

/**
 * Find a user by share code and role.
 * @param {string} shareCode
 * @param {string} role
 * @returns {Object|null} { id, ...profile }
 */
async function _findUserByShareCode(shareCode, role) {
  const snap = await db.ref("users").orderByChild("shareCode").equalTo(shareCode).once("value");
  if (!snap.exists()) return null;
  let found = null;
  snap.forEach(child => {
    const data = child.val();
    if (data.role === role) {
      found = { id: child.key, ...data };
    }
  });
  return found;
}

/**
 * Trainer adds a client using the client's share code.
 * @param {string} trainerUid
 * @param {string} clientShareCode
 */
async function addClientByShareCode(trainerUid, clientShareCode) {
  const client = await _findUserByShareCode(clientShareCode, "client");
  if (!client) throw new Error("No client found with that share code.");

  // Check if already linked
  const snap = await db.ref("trainer_clients").orderByChild("trainerId").equalTo(trainerUid).once("value");
  if (snap.exists()) {
    let alreadyLinked = false;
    snap.forEach(child => {
      if (child.val().clientId === client.id) alreadyLinked = true;
    });
    if (alreadyLinked) throw new Error("Client is already in your list.");
  }

  await db.ref("trainer_clients").push().set({
    trainerId: trainerUid,
    clientId: client.id,
    createdAt: Date.now()
  });

  return client;
}

/**
 * Fetch all clients linked to a trainer, with their profiles.
 * @param {string} trainerId
 */
async function getTrainerClients(trainerId) {
  const snap = await db.ref("trainer_clients").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return [];
  const profilePromises = [];
  snap.forEach(child => {
    profilePromises.push(getUserProfile(child.val().clientId));
  });
  const profiles = await Promise.all(profilePromises);
  return profiles.filter(Boolean);
}

// ============================================================
// CLIENT BIOGRAPHY
// ============================================================
async function saveClientBiography(clientId, data) {
  await db.ref("client_biography/" + clientId).set({ ...data, updatedAt: Date.now() });
}
async function getClientBiography(clientId) {
  const snap = await db.ref("client_biography/" + clientId).once("value");
  return snap.val() || null;
}

// ============================================================
// PAYMENT CARDS  (stored at paymentCards/{uid}/{pushKey})
// ============================================================
async function savePaymentCard(uid, cardData) {
  const ref = db.ref("paymentCards/" + uid).push();
  await ref.set({ ...cardData, addedAt: Date.now() });
  return ref.key;
}

async function getPaymentCards(uid) {
  const snap = await db.ref("paymentCards/" + uid).once("value");
  if (!snap.exists()) return [];
  const cards = [];
  snap.forEach(c => cards.push({ id: c.key, ...c.val() }));
  return cards;
}

async function removePaymentCard(uid, cardId) {
  await db.ref("paymentCards/" + uid + "/" + cardId).remove();
}

async function setDefaultCard(uid, cardId) {
  const snap = await db.ref("paymentCards/" + uid).once("value");
  const updates = {};
  snap.forEach(c => { updates[c.key + "/isDefault"] = (c.key === cardId); });
  if (Object.keys(updates).length) await db.ref("paymentCards/" + uid).update(updates);
}

// ============================================================
// TRAINER INVITES & HIRE FLOW
// ============================================================
async function sendTrainerInvite(clientId, trainerId) {
  const clientProfile = await getUserProfile(clientId).catch(() => null);
  const clientName = clientProfile?.name || "";
  const data = { clientId, trainerId, clientName, status: "pending", sentAt: Date.now() };
  await db.ref("trainer_invites/" + trainerId + "/" + clientId).set(data);
  await db.ref("client_invites/" + clientId + "/" + trainerId).set(data);
}

async function getClientSentInvites(clientId) {
  const snap = await db.ref("client_invites/" + clientId).once("value");
  return snap.val() || {};
}

async function getTrainerInvites(trainerId) {
  const snap = await db.ref("trainer_invites/" + trainerId).once("value");
  if (!snap.exists()) return [];
  const invites = [];
  snap.forEach(child => {
    const data = child.val() || {};
    invites.push({
      ...data,
      clientKey: child.key,
      clientId: data.clientId || child.key,
      trainerId: data.trainerId || trainerId
    });
  });
  return invites;
}

async function acceptTrainerInvite(trainerId, clientId) {
  const inviteSnap = await db.ref("trainer_invites/" + trainerId + "/" + clientId).once("value");
  const inviteData = inviteSnap.exists() ? (inviteSnap.val() || {}) : null;
  const resolvedClientId = (inviteData && inviteData.clientId) || clientId;
  const resolvedTrainerId = (inviteData && inviteData.trainerId) || trainerId;
  const ts = Date.now();
  await db.ref("trainer_invites/" + trainerId + "/" + clientId + "/status").set("accepted");
  await db.ref("trainer_invites/" + trainerId + "/" + clientId + "/clientId").set(resolvedClientId);
  await db.ref("trainer_invites/" + trainerId + "/" + clientId + "/trainerId").set(resolvedTrainerId);
  await db.ref("client_invites/" + resolvedClientId + "/" + resolvedTrainerId + "/status").set("accepted");
  await db.ref("client_invites/" + resolvedClientId + "/" + resolvedTrainerId + "/clientId").set(resolvedClientId);
  await db.ref("client_invites/" + resolvedClientId + "/" + resolvedTrainerId + "/trainerId").set(resolvedTrainerId);
  // Mirror into client_trainer so _getHiredTrainerIds() also sees this link
  const existing = await db.ref("client_trainer").orderByChild("clientId").equalTo(resolvedClientId).once("value");
  let alreadyLinked = false;
  if (existing.exists()) {
    existing.forEach(child => {
      if (child.val().trainerId === resolvedTrainerId) alreadyLinked = true;
    });
  }
  if (!alreadyLinked) {
    await db.ref("client_trainer").push().set({
      clientId: resolvedClientId,
      trainerId: resolvedTrainerId,
      status: "active",
      createdAt: ts
    });
  }
  // Idempotency check: avoid duplicate trainer_clients rows
  const tcSnap = await db.ref("trainer_clients").orderByChild("trainerId").equalTo(resolvedTrainerId).once("value");
  let alreadyInTC = false;
  if (tcSnap.exists()) {
    tcSnap.forEach(child => { if (child.val().clientId === resolvedClientId) alreadyInTC = true; });
  }
  if (!alreadyInTC) {
    await db.ref("trainer_clients").push().set({
      trainerId: resolvedTrainerId,
      clientId: resolvedClientId,
      createdAt: ts
    });
  }
  const tSnap = await db.ref("users/" + resolvedTrainerId).once("value");
  const trainer = tSnap.val() || {};
  await db.ref("payment_notifications/" + resolvedClientId).push().set({
    trainerId: resolvedTrainerId,
    trainerName: trainer.name || "Trainer",
    pricePerMonth: trainer.pricePerMonth || 150,
    pricePerSession: trainer.pricePerSession || 40,
    status: "pending", createdAt: ts
  });
}

async function dismissTrainerInvite(trainerId, clientId) {
  const inviteSnap = await db.ref("trainer_invites/" + trainerId + "/" + clientId).once("value");
  const inviteData = inviteSnap.exists() ? (inviteSnap.val() || {}) : null;
  const resolvedClientId = (inviteData && inviteData.clientId) || clientId;
  const resolvedTrainerId = (inviteData && inviteData.trainerId) || trainerId;
  await db.ref("trainer_invites/" + trainerId + "/" + clientId + "/status").set("dismissed");
  await db.ref("client_invites/" + resolvedClientId + "/" + resolvedTrainerId + "/status").set("dismissed");
}

async function getPaymentNotifications(clientId) {
  const snap = await db.ref("payment_notifications/" + clientId).once("value");
  if (!snap.exists()) return [];
  const notifs = [];
  snap.forEach(child => notifs.push({ ...child.val(), id: child.key }));
  return notifs.filter(n => n.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
}

async function markPaymentPaid(clientId, notifId) {
  await db.ref("payment_notifications/" + clientId + "/" + notifId + "/status").set("paid");
}

async function getTrainerClientCount(trainerId) {
  const snap = await db.ref("trainer_clients").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return 0;
  let count = 0;
  snap.forEach(() => count++);
  return count;
}

async function getTrainerHiredClients(trainerId) {
  // Returns profile objects for all accepted clients
  const snap = await db.ref("trainer_invites/" + trainerId).once("value");
  if (!snap.exists()) return [];
  const ids = [];
  snap.forEach(child => {
    const data = child.val() || {};
    if (data.status === "accepted") ids.push(data.clientId || child.key);
  });
  // Also check legacy trainer_clients
  const snap2 = await db.ref("trainer_clients").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (snap2.exists()) {
    snap2.forEach(child => {
      const cid = child.val().clientId;
      if (cid && !ids.includes(cid)) ids.push(cid);
    });
  }
  const profiles = await Promise.all(ids.map(id => getUserProfile(id)));
  return profiles.filter(Boolean).map((p, i) => ({ ...p, id: p.id || ids[i] }));
}

// ============================================================
// END NEW HELPERS
// ============================================================

/** Alias — fetch progress for a specific client (trainer view). */
async function getClientProgress(clientId) {
  return getProgress(clientId);
}

/** Alias — fetch meals for a specific client (trainer view). */
async function getClientMeals(clientId) {
  return getMeals(clientId);
}

/**
 * Create a workout plan for a client.
 * @param {string} trainerId
 * @param {string} clientId
 * @param {Object} workout
 */
async function createWorkout(trainerId, clientId, workout) {
  await db.ref("workouts").push().set({
    trainerId: trainerId,
    clientId: clientId,
    ...workout,
    createdAt: Date.now()
  });
}

/**
 * Create a meal plan for a client.
 * @param {string} trainerId
 * @param {string} clientId
 * @param {Object} plan
 */
async function createMealPlan(trainerId, clientId, plan) {
  await db.ref("meal_plans").push().set({
    trainerId: trainerId,
    clientId: clientId,
    ...plan,
    createdAt: Date.now()
  });
}

// ============================================================
// SECTION 6B: CLASS BOOKING — DATA FUNCTIONS
// ============================================================

/**
 * Create a gym class.
 */
async function createClass(trainerId, trainerName, data) {
  // source: "admin" = global (all clients see it)
  //         "trainer" = linked clients only (clients who hired this trainer)
  const isPublic = data.isPublic !== false;
  await db.ref("classes").push().set({
    trainerId,
    trainerName,
    name: data.name,
    day: data.day,
    time: data.time,
    duration: Number(data.duration) || 60,
    capacity: Number(data.capacity) || 20,
    description: String(data.description || "").trim(),
    type: data.type || "General",
    location: String(data.location || "").trim(),
    isPublic,
    source: isPublic ? "admin" : "trainer",
    createdAt: Date.now()
  });
}

/**
 * Fetch all gym classes.
 */
async function getClasses() {
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const snap = await db.ref("classes").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => {
    const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    return di !== 0 ? di : (a.time || "").localeCompare(b.time || "");
  });
  return result;
}

/**
 * Fetch classes owned by a trainer.
 */
async function getTrainerClasses(trainerId) {
  const snap = await db.ref("classes").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  return result;
}

/**
 * Admin updates a class.
 */
async function updateClass(classId, updates) {
  await db.ref("classes/" + classId).update(updates);
}

/**
 * Delete a class and all its bookings.
 */
async function deleteClass(classId) {
  await db.ref("classes/" + classId).remove();
  const bSnap = await db.ref("bookings").orderByChild("classId").equalTo(classId).once("value");
  if (bSnap.exists()) {
    const deletes = {};
    bSnap.forEach(child => { deletes["bookings/" + child.key] = null; });
    await db.ref().update(deletes);
  }
}

/**
 * Count bookings for a class.
 */
async function getClassBookingCount(classId) {
  const snap = await db.ref("classes/" + classId + "/participants").once("value");
  if (!snap.exists()) return 0;
  let count = 0;
  snap.forEach(() => count++);
  return count;
}

/**
 * Client books a class. Checks capacity and duplicates.
 */
async function bookClass(classId, clientId, clientName) {
  const [classSnap, partSnap] = await Promise.all([
    db.ref("classes/" + classId).once("value"),
    db.ref("classes/" + classId + "/participants/" + clientId).once("value")
  ]);
  if (!classSnap.exists()) throw new Error("Class not found.");
  if (partSnap.exists()) throw new Error("You have already booked this class.");
  const cls = classSnap.val();
  const countSnap = await db.ref("classes/" + classId + "/participants").once("value");
  let count = 0;
  if (countSnap.exists()) countSnap.forEach(() => count++);
  if (count >= (cls.capacity || 20)) throw new Error("Class is full.");
  const bookingRef = db.ref("bookings").push();
  await Promise.all([
    bookingRef.set({ classId, clientId, clientName, createdAt: Date.now() }),
    db.ref("classes/" + classId + "/participants/" + clientId).set({
      clientName, bookingId: bookingRef.key, joinedAt: Date.now()
    })
  ]);
}

/**
 * Fetch bookings for a client, enriched with class data.
 */
async function getClientBookings(clientId) {
  const snap = await db.ref("bookings").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const bookings = [];
  snap.forEach(child => bookings.push({ id: child.key, ...child.val() }));
  const enriched = (await Promise.all(bookings.map(async b => {
    const cSnap = await db.ref("classes/" + b.classId).once("value");
    if (cSnap.exists()) {
      const c = cSnap.val();
      b.className = c.name;
      b.day = c.day;
      b.time = c.time;
      b.trainerName = c.trainerName;
      return b;
    }
    return null;
  }))).filter(Boolean);
  return enriched;
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId) {
  const snap = await db.ref("bookings/" + bookingId).once("value");
  if (snap.exists()) {
    const { classId, clientId } = snap.val();
    const ops = [db.ref("bookings/" + bookingId).remove()];
    if (classId && clientId) ops.push(db.ref("classes/" + classId + "/participants/" + clientId).remove());
    await Promise.all(ops);
  }
}

/**
 * Get the list of clients enrolled in a class (from participants node).
 */
async function getClassRoster(classId) {
  const snap = await db.ref("classes/" + classId + "/participants").once("value");
  if (!snap.exists()) return [];
  const roster = [];
  snap.forEach(child => roster.push({ clientId: child.key, ...child.val() }));
  roster.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  return roster;
}

/**
 * Get all trainer IDs that a client has accepted (could be multiple).
 */
async function getClientLinkedTrainerIds(clientId) {
  const ids = new Set();

  // Path 1: client_invites/{clientId} — direct read, no index required, most reliable
  try {
    const snap = await db.ref("client_invites/" + clientId).once("value");
    if (snap.exists()) {
      snap.forEach(child => {
        const data = child.val();
        const status = String(data?.status || "").toLowerCase();
        const tid = data?.trainerId || child.key; // child.key IS the trainerId
        if ((status === "accepted" || status === "active") && tid) ids.add(tid);
      });
    }
  } catch (e) { console.warn("[X-Gym] linked-trainers path1 failed:", e.message); }

  // Path 2: client_trainer table (requires index on clientId, kept as fallback)
  try {
    const snap = await db.ref("client_trainer").orderByChild("clientId").equalTo(clientId).once("value");
    if (snap.exists()) {
      snap.forEach(child => {
        const data = child.val();
        const status = String(data?.status || "").toLowerCase();
        if (data?.trainerId && (!status || status === "active" || status === "accepted")) {
          ids.add(data.trainerId);
        }
      });
    }
  } catch (e) { console.warn("[X-Gym] linked-trainers path2 failed:", e.message); }

  // Path 3: trainer_clients table (requires index on clientId, kept as fallback)
  try {
    const snap = await db.ref("trainer_clients").orderByChild("clientId").equalTo(clientId).once("value");
    if (snap.exists()) {
      snap.forEach(child => {
        const data = child.val();
        if (data?.trainerId) ids.add(data.trainerId);
      });
    }
  } catch (e) { console.warn("[X-Gym] linked-trainers path3 failed:", e.message); }

  return [...ids];
}

// ============================================================
// SECTION 6C: MEAL PLAN & WORKOUT — EXTRA HELPERS
// ============================================================

/**
 * Fetch meal plans assigned to a client (from meal_plans node).
 */
async function getMealPlans(clientId) {
  const snap = await db.ref("meal_plans").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

/**
 * Fetch meal plans a trainer created for a specific client.
 */
async function getTrainerMealPlans(trainerId, clientId) {
  const snap = await db.ref("meal_plans").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    const val = child.val();
    if (val.clientId === clientId) result.push({ id: child.key, ...val });
  });
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

/**
 * Delete a meal plan.
 */
async function deleteMealPlan(planId) {
  await db.ref("meal_plans/" + planId).remove();
}

/**
 * Fetch workouts a trainer created for a specific client.
 */
async function getTrainerWorkouts(trainerId, clientId) {
  const snap = await db.ref("workouts").orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    const val = child.val();
    if (val.clientId === clientId) result.push({ id: child.key, ...val });
  });
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

/**
 * Delete a workout.
 */
async function deleteWorkout(workoutId) {
  await db.ref("workouts/" + workoutId).remove();
}

// ============================================================
// SECTION 7: ADMIN PANEL — DATA FUNCTIONS
// ============================================================

// ---------- Admin Auth Check ----------
/**
 * Check if a user has admin role (hardcoded or from profile).
 * @param {string} uid
 * @param {string} [email] — optional, enables hardcoded admin check.
 * @returns {boolean}
 */
async function isAdmin(uid, email) {
  if (email && getHardcodedAdmin(email)) return true;
  const profile = await getUserProfile(uid);
  return profile && profile.role === "admin";
}

// ---------- Members CRUD ----------
/**
 * Fetch ALL registered users (members).
 * @returns {Array<Object>}
 */
async function getAllMembers() {
  const snap = await db.ref("users").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Update a member's profile fields.
 * @param {string} uid
 * @param {Object} updates
 */
async function updateMember(uid, updates) {
  await db.ref("users/" + uid).update(updates);
}

/**
 * Delete a member entirely from the database.
 * @param {string} uid
 */
async function deleteMember(uid) {
  await db.ref("users/" + uid).remove();
}

// ---------- Store Items CRUD ----------
/**
 * Fetch all store items.
 * @returns {Array<Object>}
 */
async function getAllStoreItems() {
  const snap = await db.ref("store_items").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Add a new store item.
 * @param {Object} item  { name, price, category, description, stock }
 * @returns {string} new item id
 */
async function addStoreItem(item) {
  const ref = db.ref("store_items").push();
  await ref.set({ ...item, createdAt: Date.now() });
  return ref.key;
}

/**
 * Update a store item.
 * @param {string} itemId
 * @param {Object} updates
 */
async function updateStoreItem(itemId, updates) {
  await db.ref("store_items/" + itemId).update(updates);
}

/**
 * Delete a store item.
 * @param {string} itemId
 */
async function deleteStoreItem(itemId) {
  await db.ref("store_items/" + itemId).remove();
}

// ---------- Memberships CRUD ----------
/**
 * Fetch ALL memberships from the database.
 * @returns {Array<Object>}
 */
async function getAllMemberships() {
  const snap = await db.ref("memberships").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Create a new membership record.
 * @param {Object} data  { clientId, type, status, expiresAt, price }
 * @returns {string} new membership id
 */
async function createMembership(data) {
  const ref = db.ref("memberships").push();
  await ref.set({ ...data, createdAt: Date.now() });
  return ref.key;
}

/**
 * Update a membership record.
 * @param {string} membershipId
 * @param {Object} updates
 */
async function updateMembership(membershipId, updates) {
  await db.ref("memberships/" + membershipId).update(updates);
}

/**
 * Delete a membership record.
 * @param {string} membershipId
 */
async function deleteMembership(membershipId) {
  await db.ref("memberships/" + membershipId).remove();
}

const DEFAULT_MEMBERSHIP_PLANS = [
  {
    slug: "starter",
    name: "Starter",
    durationDays: 30,
    price: 29.99,
    description: "Essential gym access for independent training.",
    features: ["Gym floor access", "1 group class / week", "Locker access"]
  },
  {
    slug: "core",
    name: "Core",
    durationDays: 30,
    price: 49.99,
    description: "Balanced plan for routine training and classes.",
    features: ["Unlimited gym access", "4 classes / week", "Progress check-ins"]
  },
  {
    slug: "elite",
    name: "Elite",
    durationDays: 30,
    price: 79.99,
    description: "Advanced package with premium recovery and coaching.",
    features: ["Unlimited classes", "Priority booking", "Monthly trainer consult"]
  }
];

/**
 * Fetch all available membership plans.
 * Returns defaults when custom plans have not been created yet.
 */
async function getMembershipPlans() {
  const snap = await db.ref("membership_plans").once("value");
  if (!snap.exists()) {
    return DEFAULT_MEMBERSHIP_PLANS.map(p => ({ id: `default-${p.slug}`, ...p, isDefault: true }));
  }

  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val(), isDefault: false }));
  result.sort((a, b) => (a.price || 0) - (b.price || 0));
  return result;
}

async function createMembershipPlan(data) {
  const ref = db.ref("membership_plans").push();
  await ref.set({ ...data, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.key;
}

async function updateMembershipPlan(planId, updates) {
  await db.ref("membership_plans/" + planId).update({ ...updates, updatedAt: Date.now() });
}

async function deleteMembershipPlan(planId) {
  await db.ref("membership_plans/" + planId).remove();
}

async function createMembershipPayment(data) {
  const ref = db.ref("membership_payments").push();
  await ref.set({ ...data, createdAt: Date.now() });
  return ref.key;
}

async function getClientMembershipPayments(clientId) {
  const snap = await db.ref("membership_payments").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

async function getAllMembershipPayments() {
  const snap = await db.ref("membership_payments").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

// ---------- Financial Transactions ----------
/**
 * Record a financial transaction.
 * @param {Object} txn  { type, amount, description, category }
 */
async function recordTransaction(txn) {
  const ref = db.ref("transactions").push();
  await ref.set({ ...txn, createdAt: Date.now() });
  return ref.key;
}

async function createStorePurchase(clientId, data) {
  const ref = db.ref("store_purchases/" + clientId).push();
  await ref.set({ ...data, createdAt: Date.now() });
  return ref.key;
}

async function getClientStorePurchases(clientId) {
  const snap = await db.ref("store_purchases/" + clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

/**
 * Fetch all financial transactions.
 * @returns {Array<Object>}
 */
async function getAllTransactions() {
  const snap = await db.ref("transactions").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return result;
}

// ---------- Trainer-Client Links ----------
/**
 * Fetch ALL trainer-client linkages.
 * @returns {Array<Object>}
 */
async function getAllTrainerClientLinks() {
  const snap = await db.ref("trainer_clients").once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => {
    result.push({ id: child.key, ...child.val() });
  });
  return result;
}

/**
 * Delete a trainer-client link.
 * @param {string} linkId
 */
async function deleteTrainerClientLink(linkId) {
  await db.ref("trainer_clients/" + linkId).remove();
}

// ---------- Dashboard Statistics Helpers ----------
/**
 * Compute gym-wide statistics for the admin dashboard.
 * @returns {Object}
 */
async function getAdminStats() {
  const [members, memberships, transactions, storeItems, trainerLinks] = await Promise.all([
    getAllMembers(),
    getAllMemberships(),
    getAllTransactions(),
    getAllStoreItems(),
    getAllTrainerClientLinks()
  ]);

  const clients  = members.filter(m => m.role === "client");
  const trainers = members.filter(m => m.role === "trainer");
  const activeMemberships = memberships.filter(m => m.status === "active");
  const expiredMemberships = memberships.filter(m => m.status !== "active");

  // Revenue breakdown by month
  const monthlyRevenue = {};
  const monthlyExpenses = {};
  transactions.forEach(txn => {
    const d = new Date(txn.createdAt);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (txn.type === "income" || txn.type === "membership" || txn.type === "store_sale") {
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (txn.amount || 0);
    } else if (txn.type === "expense") {
      monthlyExpenses[key] = (monthlyExpenses[key] || 0) + (txn.amount || 0);
    }
  });

  const totalRevenue  = Object.values(monthlyRevenue).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(monthlyExpenses).reduce((s, v) => s + v, 0);

  return {
    totalMembers: members.length,
    totalClients: clients.length,
    totalTrainers: trainers.length,
    activeMemberships: activeMemberships.length,
    expiredMemberships: expiredMemberships.length,
    totalStoreItems: storeItems.length,
    trainerClientLinks: trainerLinks.length,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    monthlyRevenue,
    monthlyExpenses,
    members,
    memberships,
    transactions,
    storeItems,
    trainerLinks
  };
}

// ============================================================
// SECTION 7B: WORKOUT TRACKER (LiftStreak) — Shared Trainer/Client
// ============================================================

/**
 * Log a workout session (client-side, stored under workout_sessions).
 * @param {string} clientId
 * @param {Object} session  { name, exercises: [{name,sets,reps,weight}], duration, notes }
 */
async function logWorkoutSession(clientId, session) {
  const ref = db.ref("workout_sessions").push();
  await ref.set({
    clientId,
    ...session,
    completedAt: Date.now()
  });
  return ref.key;
}

/**
 * Fetch all workout sessions for a client, sorted by date descending.
 * @param {string} clientId
 */
async function getWorkoutSessions(clientId) {
  const snap = await db.ref("workout_sessions")
    .orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  return result;
}

// ============================================================
// SECTION 7D: TRAINING SESSION TRACKING (Trainer ↔ Client)
// ============================================================

function _calcSessionDuration(startTime, endTime) {
  // "HH:MM" strings — returns minutes
  const [sh, sm] = String(startTime || "00:00").split(":").map(Number);
  const [eh, em] = String(endTime || "01:00").split(":").map(Number);
  return Math.max(5, (eh * 60 + em) - (sh * 60 + sm));
}

async function logTrainingSession(trainerId, clientId, data) {
  const durationMinutes = data.durationMinutes ||
    (data.startTime && data.endTime ? _calcSessionDuration(data.startTime, data.endTime) : 60);
  const ref = db.ref("training_sessions").push();
  await ref.set({
    trainerId,
    clientId,
    date: data.date || new Date().toISOString().split("T")[0],
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    durationMinutes: Math.max(5, Number(durationMinutes) || 60),
    type: data.type || "Personal Training",
    notes: data.notes || "",
    paid: data.paid === true,
    status: data.status || "completed",
    createdAt: Date.now()
  });
  return ref.key;
}

async function getTrainerSessions(trainerId) {
  const snap = await db.ref("training_sessions")
    .orderByChild("trainerId").equalTo(trainerId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => {
    const da = a.date || "", db2 = b.date || "";
    return da < db2 ? 1 : da > db2 ? -1 : (b.createdAt || 0) - (a.createdAt || 0);
  });
  return result;
}

async function getClientSessions(clientId) {
  const snap = await db.ref("training_sessions")
    .orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => {
    const da = a.date || "", db2 = b.date || "";
    return da < db2 ? 1 : da > db2 ? -1 : (b.createdAt || 0) - (a.createdAt || 0);
  });
  return result;
}

async function updateTrainingSession(sessionId, updates) {
  await db.ref("training_sessions/" + sessionId).update(updates);
}

async function deleteTrainingSession(sessionId) {
  await db.ref("training_sessions/" + sessionId).remove();
}

async function getTrainerHoursSummary(trainerId) {
  const sessions = await getTrainerSessions(trainerId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const thisMonth = sessions.filter(s => (s.createdAt || 0) >= monthStart);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const monthMinutes = thisMonth.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const perClient = {};
  for (const s of sessions) {
    const cid = s.clientId;
    if (!perClient[cid]) perClient[cid] = { sessions: 0, minutes: 0, paidSessions: 0 };
    perClient[cid].sessions++;
    perClient[cid].minutes += s.durationMinutes || 0;
    if (s.paid) perClient[cid].paidSessions++;
  }

  return {
    totalHours: totalMinutes / 60,
    monthHours: monthMinutes / 60,
    totalSessions: sessions.length,
    monthSessions: thisMonth.length,
    perClient
  };
}

// ============================================================
// SECTION 6D: CLASS WAITLIST & ATTENDANCE
// ============================================================

async function addToWaitlist(classId, clientId, clientName) {
  const snap = await db.ref("waitlist/" + classId + "/" + clientId).once("value");
  if (snap.exists()) throw new Error("You are already on the waitlist.");
  await db.ref("waitlist/" + classId + "/" + clientId).set({
    clientName, joinedAt: Date.now()
  });
}

async function removeFromWaitlist(classId, clientId) {
  await db.ref("waitlist/" + classId + "/" + clientId).remove();
}

async function getWaitlist(classId) {
  const snap = await db.ref("waitlist/" + classId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ clientId: child.key, ...child.val() }));
  result.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  return result;
}

async function promoteFromWaitlist(classId) {
  const waitlist = await getWaitlist(classId);
  if (!waitlist.length) return null;
  const first = waitlist[0];
  try {
    await bookClass(classId, first.clientId, first.clientName);
    await removeFromWaitlist(classId, first.clientId);
    return first;
  } catch (e) { return null; }
}

async function markAttendance(classId, clientId, attended) {
  await db.ref("attendance/" + classId + "/" + clientId).set({
    attended: !!attended, markedAt: Date.now()
  });
}

async function getClassAttendance(classId) {
  const snap = await db.ref("attendance/" + classId).once("value");
  return snap.exists() ? (snap.val() || {}) : {};
}

/**
 * Get weekly workout stats for a client.
 * @param {string} clientId
 */
async function getWeeklyStats(clientId) {
  const sessions = await getWorkoutSessions(clientId);
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessions.filter(s => (s.completedAt || 0) >= weekAgo);

  let totalVolume = 0;
  thisWeek.forEach(s => {
    (s.exercises || []).forEach(ex => {
      totalVolume += (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
    });
  });

  // Calculate streak
  let streak = 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 0; d < 365; d++) {
    const dayStart = today.getTime() - d * dayMs;
    const dayEnd = dayStart + dayMs;
    const hasSession = sessions.some(s => s.completedAt >= dayStart && s.completedAt < dayEnd);
    if (hasSession) streak++;
    else if (d > 0) break; // allow current day to be empty
  }

  return {
    workoutsThisWeek: thisWeek.length,
    streak,
    totalVolume,
    totalSessions: sessions.length
  };
}

/**
 * Trainer sends a message/note to a client workout tracker.
 */
async function sendTrainerNote(trainerId, clientId, message) {
  await db.ref("trainer_notes").push().set({
    trainerId,
    clientId,
    message,
    createdAt: Date.now(),
    read: false
  });
}

/**
 * Fetch trainer notes for a client, most recent first.
 */
async function getTrainerNotes(clientId) {
  const snap = await db.ref("trainer_notes")
    .orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const result = [];
  snap.forEach(child => result.push({ id: child.key, ...child.val() }));
  result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return result;
}

// ============================================================
// SECTION 7C: TRAINER SELECTION SYSTEM (Firebase-backed)
// ============================================================

/**
 * Get trainer list for selection (Firebase only).
 */
async function getTrainersForSelection() {
  const fallbackPalette = ["#0887e2", "#e96d25", "#00a86b", "#7c4dff", "#ff5a8a", "#1f9d7a", "#d94f04"];
  const realTrainers = await getAvailableTrainers();
  return realTrainers.map((t, idx) => ({
    ...t,
    initials: (t.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
    specialty: t.specialty || "General Fitness",
    bio: t.bio || "Certified trainer ready to help you reach your goals.",
    rating: Number(t.rating || 4.7),
    reviewCount: Number(t.reviewCount || 0),
    experience: t.experience || "3+ years",
    certifications: t.certifications || ["Certified Personal Trainer"],
    availability: t.availability || ["Mon", "Wed", "Fri"],
    pricePerSession: Number(t.pricePerSession || 40),
    pricePerMonth: Number(t.pricePerMonth || 150),
    accentColor: t.accentColor || fallbackPalette[idx % fallbackPalette.length],
    clients: Number(t.clients || 0),
    specialties: Array.isArray(t.specialties) && t.specialties.length ? t.specialties : [t.specialty || "General Fitness"]
  }));
}

// ============================================================
// SECTION 8: PAGE DETECTION & INITIALIZATION
// ============================================================

const INDEX_PAGE = "index.html";

// ---- Redirect loop breaker ----
// Tracks rapid page-to-page redirects within the session.
// If more than 3 redirects happen within 5 seconds, stop redirecting.
const _LOOP_KEY   = "xgym_redirect_ts";
const _LOOP_MAX   = 3;
const _LOOP_WINDOW = 5000; // ms

function _isRedirectLoop() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(_LOOP_KEY) || "[]");
    const now = Date.now();
    // Keep only timestamps within the window
    const recent = raw.filter(function(t) { return now - t < _LOOP_WINDOW; });
    return recent.length >= _LOOP_MAX;
  } catch (e) { return false; }
}

function _recordRedirect() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(_LOOP_KEY) || "[]");
    const now = Date.now();
    const recent = raw.filter(function(t) { return now - t < _LOOP_WINDOW; });
    recent.push(now);
    sessionStorage.setItem(_LOOP_KEY, JSON.stringify(recent));
  } catch (e) { /* ignore */ }
}

function _clearRedirectLoop() {
  try { sessionStorage.removeItem(_LOOP_KEY); } catch (e) { /* ignore */ }
}

/** Safe redirect — aborts if a loop is detected. */
function _safeRedirect(url) {
  if (_isRedirectLoop()) {
    console.error("[X-Gym] Redirect loop detected — staying on current page.");
    _clearRedirectLoop();
    return false;
  }
  _recordRedirect();
  window.location.href = url;
  return true;
}

/**
 * Detect the current page based on the URL filename.
 * @returns {"index"|"client"|"trainer"|"admin"|"unknown"}
 */
function detectPage() {
  const path = window.location.pathname.toLowerCase();
  const fileName = path.split("/").pop() || INDEX_PAGE;
  if (fileName === INDEX_PAGE || path.endsWith("/")) return "index";
  if (path.includes("xgymindex"))        return "index";
  if (path.includes("dashboardclient"))  return "client";
  if (path.includes("trainerdashboard")) return "trainer";
  if (path.includes("admindashboard"))   return "admin";
  return "unknown";
}

// --------------------------------------------------------
// Panel navigation helper (client & trainer dashboards)
// --------------------------------------------------------
function initPanelNav() {
  const navItems = document.querySelectorAll(".nav-item[data-panel]");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      let panelId = item.getAttribute("data-panel");
      if (panelId === "panel-trainers") panelId = "panel-pick-trainer";
      document.querySelectorAll(".xgym-panel").forEach(p => {
        p.style.display = "none";
      });
      const grid = document.querySelector(".grid");
      if (grid) grid.style.display = "none";
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = "block";
    });
  });

  // "Dashboard" button hides all panels, shows the main card grid
  const dashBtn = document.getElementById("nav-dashboard");
  if (dashBtn) {
    dashBtn.addEventListener("click", () => {
      document.querySelectorAll(".xgym-panel").forEach(p => {
        p.style.display = "none";
      });
      const grid = document.querySelector(".grid");
      if (grid) grid.style.display = "";
    });
  }
}

// --------------------------------------------------------
// Index page initialisation
// --------------------------------------------------------
function initIndexPage() {
  // Wire up auth forms immediately so Login/Register links work
  // even before Firebase reports auth state
  _initAuthForms();

  // Use single-shot auth check to avoid race conditions with onAuthStateChanged
  waitForAuth().then(async (user) => {
    // If a login/register action is already handling the redirect, don't interfere
    if (_authActionInProgress) return;

    if (!user) {
      // Not logged in — stay on index, clear any loop counter
      _clearRedirectLoop();
      return;
    }

    // Already logged in — DEV/TEST MODE: stay on index, don't auto-redirect
    console.log("[X-Gym] Index: user logged in — skipping auto-redirect (test mode)");
    _clearRedirectLoop();
  });
}

function _initAuthForms() {
  const overlay       = document.getElementById("auth-overlay");
  const loginForm     = document.getElementById("login-form");
  const registerForm  = document.getElementById("register-form");
  const authError     = document.getElementById("auth-error");

  function setOverlayOpen(isOpen) {
    document.body.classList.toggle("overlay-open", isOpen);
    if (overlay) {
      overlay.style.display = isOpen ? "flex" : "none";
    }
  }

  const showLoginBtn    = document.getElementById("show-login-btn");
  const showRegisterBtn = document.getElementById("show-register-btn");

  const loginEmailEl    = document.getElementById("login-email");
  const loginPasswordEl = document.getElementById("login-password");
  const loginBtn        = document.getElementById("login-btn");

  const regNameEl     = document.getElementById("register-name");
  const regEmailEl    = document.getElementById("register-email");
  const regPasswordEl = document.getElementById("register-password");
  const registerBtn   = document.getElementById("register-btn");

  // Helper to show a specific form
  function showForm(which) {
    if (!overlay) return;
    setOverlayOpen(true);
    loginForm.style.display    = which === "login"    ? "block" : "none";
    registerForm.style.display = which === "register" ? "block" : "none";
    if (authError) authError.textContent = "";
  }

  // Auth-menu links open overlay
  document.querySelectorAll(".auth-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const isLogin = link.textContent.trim().toLowerCase() === "login";
      showForm(isLogin ? "login" : "register");
    });
  });

  // CTA button opens login
  const ctaBtn = document.getElementById("cta");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => showForm("login"));
  }

  if (showLoginBtn)    showLoginBtn.addEventListener("click",    () => showForm("login"));
  if (showRegisterBtn) showRegisterBtn.addEventListener("click", () => showForm("register"));

  // Close overlay when clicking outside the form box
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) setOverlayOpen(false);
    });
  }

  // Login submit
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      if (authError) authError.textContent = "";
      const emailVal    = loginEmailEl.value.trim();
      const passwordVal = loginPasswordEl.value.trim();

      if (!emailVal || !passwordVal) {
        if (authError) authError.textContent = "Please enter email and password.";
        return;
      }

      try {
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in…";
        const cred = await loginUser(emailVal, passwordVal);
        console.log("[X-Gym] Login done, fetching profile…");

        // Check hardcoded admins first — no Firebase profile needed
        const hardcodedAdmin = getHardcodedAdmin(cred.user.email || emailVal);
        if (hardcodedAdmin) {
          console.log("[X-Gym] Hardcoded admin detected:", cred.user.email);
          _forceRedirect("AdminDashboard.html");
          return;
        }

        // Non-admin: fetch profile from Firebase for role-based redirect
        let target = "DashboardClient.xxx.html";
        let profile = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            profile = await getUserProfile(cred.user.uid, cred.user.email);
            if (profile) break;
          } catch (profileErr) {
            console.warn("[X-Gym] Profile fetch attempt", attempt, profileErr);
          }
          await new Promise(r => setTimeout(r, 700));
        }
        if (profile && profile.role) {
          console.log("[X-Gym] Profile found, role:", profile.role);
          if (profile.role === "trainer") {
            target = "trainerdashboard.xx.html";
          } else {
            target = "DashboardClient.xxx.html";
          }
        } else {
          console.error("[X-Gym] Could not fetch profile after retries! uid:", cred.user.uid);
          // Profile truly missing — create a default client profile
          try {
            await db.ref("users/" + cred.user.uid).set({
              name: cred.user.email,
              email: cred.user.email,
              role: "client",
              shareCode: generateShareCode(),
              createdAt: Date.now()
            });
            console.log("[X-Gym] Emergency profile created as client");
            showToast("Your profile was missing — a default profile was created. Contact admin if you should have a different role.", "info");
          } catch (epErr) {
            console.error("[X-Gym] Emergency profile creation also failed:", epErr);
          }
        }
        console.log("[X-Gym] Redirecting after login to:", target);
        _forceRedirect(target);
      } catch (err) {
        _authActionInProgress = false;
        console.error("[X-Gym] Login error:", err);
        if (authError) authError.textContent = err.message;
        showToast(err.message, "error");
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    });
  }

  // Register submit
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      if (authError) authError.textContent = "";
      const emailVal    = regEmailEl.value.trim();
      const passwordVal = regPasswordEl.value.trim();
      const nameVal     = regNameEl.value.trim();

      if (!emailVal || !passwordVal || !nameVal) {
        if (authError) authError.textContent = "Please fill in all fields.";
        return;
      }

      // Auto-determine role: trainer if email is whitelisted, otherwise client
      const role = TRAINER_EMAILS.some(e => e.toLowerCase() === emailVal.toLowerCase())
        ? "trainer" : "client";

      try {
        registerBtn.disabled = true;
        registerBtn.textContent = "Registering…";
        await registerUser(emailVal, passwordVal, nameVal, role);
        console.log("[X-Gym] Register done, role:", role, "— redirecting…");
        const target = role === "trainer"
          ? "trainerdashboard.xx.html"
          : "DashboardClient.xxx.html";
        _forceRedirect(target);
      } catch (err) {
        _authActionInProgress = false;
        console.error("[X-Gym] Register error:", err);
        if (authError) authError.textContent = err.message;
        showToast(err.message, "error");
        registerBtn.disabled = false;
        registerBtn.textContent = "Register";
      }
    });
  }
}

// --------------------------------------------------------
// Client dashboard initialisation
// --------------------------------------------------------
async function initClientPage() {
  // Wire logout button immediately so it works even without auth
  const logoutBtnEarly = document.getElementById("logout-btn");
  if (logoutBtnEarly) logoutBtnEarly.addEventListener("click", logoutUser);

  const user = await waitForAuth();
  if (user) _syncPendingStoreActions(user.uid);
  if (!user) {
    // DEV/TEST MODE: skip redirect so pages can be opened directly
    console.warn("[X-Gym] Client page: no user logged in — skipping redirect (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",       "panel-cart");
    _bindCardToPanel("card-workouts",   "panel-workouts");
    _bindCardToPanel("card-membership", "panel-membership");
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-biography",  "panel-biography");
    _bindCardToPanel("card-store",      "panel-pick-trainer");
    _bindCardToPanel("card-booking",     "panel-booking");
    _bindCardToPanel("card-pick-trainer","panel-pick-trainer");
    _bindCardToPanel("card-settings",   "panel-settings");
    _bindCardToPanel("card-messenger",   "panel-messenger");
    return;
  }

  // Retry profile fetch in case user just registered and
  // RTDB write hasn't fully propagated yet
  let profile = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      profile = await getUserProfile(user.uid, user.email);
      if (profile) break;
    } catch (e) { console.warn("[X-Gym] Profile fetch attempt", attempt, e); }
    await new Promise(r => setTimeout(r, 800));
  }

  if (!profile) {
    console.warn("[X-Gym] Client page: no profile found — staying on page (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",       "panel-cart");
    _bindCardToPanel("card-workouts",   "panel-workouts");
    _bindCardToPanel("card-membership", "panel-membership");
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-biography",  "panel-biography");
    _bindCardToPanel("card-store",      "panel-pick-trainer");
    _bindCardToPanel("card-booking",     "panel-booking");
    _bindCardToPanel("card-pick-trainer","panel-pick-trainer");
    _bindCardToPanel("card-settings",   "panel-settings");
    _bindCardToPanel("card-messenger",   "panel-messenger");
    return;
  }
  if (profile.role !== "client") {
    console.warn("[X-Gym] Client page: wrong role '" + profile.role + "', redirecting to correct dashboard");
    if (profile.role === "trainer") {
      _safeRedirect("trainerdashboard.xx.html");
    } else if (profile.role === "admin") {
      _safeRedirect("AdminDashboard.html");
    } else {
      // Stay on page instead of redirecting for testing
      console.warn("[X-Gym] Client page: unknown role, staying on page (test mode)");
      initPanelNav();
      return;
    }
    return;
  }

  {
    // Page loaded successfully — clear any redirect loop counter
    _clearRedirectLoop();

    // Populate greeting
    const greeting = document.getElementById("client-greeting");
    if (greeting) greeting.textContent = `Hello, ${profile.name}`;

    // Panel navigation
    initPanelNav();
    _updateCartBadge();

    // Card clicks
    _bindCardToPanel("card-cart",       "panel-cart");
    _bindCardToPanel("card-workouts",   "panel-workouts");
    _bindCardToPanelWithReload("card-membership", "panel-membership", () => _loadClientMembershipPanel(user.uid));
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-biography",  "panel-biography");
    _bindCardToPanel("card-store",      "panel-pick-trainer");
    _bindCardToPanel("card-pick-trainer","panel-pick-trainer");
    _bindCardToPanel("card-settings",   "panel-settings");
    _bindCardToPanel("card-messenger",   "panel-messenger");
    // Booking: reload on every open (card OR sidebar nav)
    _bindCardToPanelWithReload("card-booking", "panel-booking",
      () => _loadClientBookingPanel(user.uid, profile.name));

    // Sidebar nav for booking must also reload
    document.querySelectorAll('.nav-item[data-panel="panel-booking"]').forEach(item => {
      item.addEventListener('click', () => _loadClientBookingPanel(user.uid, profile.name));
    });

    // Membership: reload on every open (card OR sidebar nav)
    document.querySelectorAll('.nav-item[data-panel="panel-membership"]').forEach(item => {
      item.addEventListener('click', () => _loadClientMembershipPanel(user.uid));
    });

    // Load panels content
    _loadClientWorkoutsPanel(user.uid);
    _loadClientProgressPanel(user.uid, profile.shareCode);
    _loadClientMealsPanel(user.uid);
    _loadClientMembershipPanel(user.uid);
    _loadCartPanel(user.uid);
    _loadClientBookingPanel(user.uid, profile.name);
    _loadPickTrainerPanel(user.uid);
    _loadClientBiographyPanel(user.uid);
    _loadClientMessengerPanel(user.uid, profile.name);
    _loadSettingsPanel(user.uid);
    _startClientNotifListeners(user.uid);
  }
}

function _bindCardToPanel(cardId, panelId) {
  const card  = document.getElementById(cardId);
  const panel = document.getElementById(panelId);
  if (!card || !panel) return;
  card.addEventListener("click", () => {
    // Hide all panels first
    document.querySelectorAll(".xgym-panel").forEach(p => p.style.display = "none");
    // Hide the card grid so the panel has full space
    const grid = document.querySelector(".grid");
    if (grid) grid.style.display = "none";
    // Show the target panel
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth" });
  });
}

/**
 * Like _bindCardToPanel but calls `onOpen()` every time the card is clicked,
 * so the panel reloads fresh data on every open.
 */
function _bindCardToPanelWithReload(cardId, panelId, onOpen) {
  const card  = document.getElementById(cardId);
  const panel = document.getElementById(panelId);
  if (!card || !panel) return;
  card.addEventListener("click", () => {
    document.querySelectorAll(".xgym-panel").forEach(p => p.style.display = "none");
    const grid = document.querySelector(".grid");
    if (grid) grid.style.display = "none";
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth" });
    if (onOpen) onOpen();
  });
}

async function _loadClientTrainersPanel(clientId) {
  const panel = document.getElementById("panel-trainers");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Available Trainers</h2>";

  try {
    const trainers = await getAvailableTrainers();
    if (trainers.length === 0) {
      panel.innerHTML += "<p>No trainers available yet.</p>";
      return;
    }

    // Check if already hired
    const hiredIds = await _getHiredTrainerIds(clientId);

    trainers.forEach(trainer => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "16px";
      const hired = hiredIds.includes(trainer.id);
      card.innerHTML = `
        <h3>${trainer.name}</h3>
        <p>${trainer.email}</p>
        <p>Share Code: <strong>${trainer.shareCode || "—"}</strong></p>
        <button
          class="btn-hire"
          data-tid="${trainer.id}"
          style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
                 background:${hired ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,#ff0033,#ff5500)"};
                 color:#fff;cursor:${hired ? "default" : "pointer"};font-family:Poppins,sans-serif;"
          ${hired ? "disabled" : ""}>
          ${hired ? "Hired" : "Hire Trainer"}
        </button>
      `;
      panel.appendChild(card);
    });

    // Hire button events
    panel.querySelectorAll(".btn-hire:not([disabled])").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await hireTrainer(clientId, btn.dataset.tid);
          showToast("Trainer hired successfully!", "success");
          _loadClientTrainersPanel(clientId);
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  } catch (e) {
    panel.innerHTML += `<p style="color:#0887e2">${e.message}</p>`;
  }
}

async function _loadClientWorkoutsPanel(clientId) {
  const panel = document.getElementById("panel-workouts");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  let weeklyStats = { workoutsThisWeek: 0, streak: 0, totalVolume: 0, totalSessions: 0 };
  try { weeklyStats = await getWeeklyStats(clientId); } catch(e) {}

  // Get trainer notes
  let latestNote = null;
  try {
    const notes = await getTrainerNotes(clientId);
    if (notes.length > 0) latestNote = notes[0];
  } catch(e) {}

  // Compute previous week stats for progress summary
  let prevWeekVolume = 0, prevWeekCount = 0;
  try {
    const allSessions = await getWorkoutSessions(clientId);
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    for (const s of allSessions) {
      const t = s.completedAt || 0;
      if (t >= twoWeeksAgo && t < oneWeekAgo) {
        prevWeekCount++;
        for (const ex of (s.exercises || [])) {
          prevWeekVolume += (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
        }
      }
    }
  } catch(e) {}

  const volDiff = weeklyStats.totalVolume - prevWeekVolume;
  const countDiff = weeklyStats.workoutsThisWeek - prevWeekCount;
  const volPct = prevWeekVolume > 0 ? Math.round((volDiff / prevWeekVolume) * 100) : 0;
  let progressMsg = "";
  if (volDiff > 0) progressMsg += `Volume up ${volPct}% from last week. `;
  else if (volDiff < 0) progressMsg += `Volume down ${Math.abs(volPct)}% from last week. `;
  if (countDiff > 0) progressMsg += `${countDiff} more workout${countDiff > 1 ? "s" : ""} than last week.`;
  else if (countDiff < 0) progressMsg += `${Math.abs(countDiff)} fewer workout${Math.abs(countDiff) > 1 ? "s" : ""} than last week.`;
  if (!progressMsg) progressMsg = "Keep training to build your streak!";

  panel.innerHTML = `
    <h2 style="color:#0887e2;font-family:'Orbitron',monospace;letter-spacing:0.1em">
      <span style="color:#e96d25">LIFT</span>Streak Tracker
    </h2>

    <!-- Weekly Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0">
      <div class="card" style="text-align:center;padding:18px">
        <div style="font-size:0.65rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">This Week</div>
        <div style="font-size:1.8rem;font-weight:700;color:#e96d25">${weeklyStats.workoutsThisWeek}</div>
        <div style="font-size:0.7rem;opacity:0.5">workouts done</div>
      </div>
      <div class="card" style="text-align:center;padding:18px">
        <div style="font-size:0.65rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">Streak</div>
        <div style="font-size:1.8rem;font-weight:700;color:#0887e2">${weeklyStats.streak}</div>
        <div style="font-size:0.7rem;opacity:0.5">days in a row</div>
      </div>
      <div class="card" style="text-align:center;padding:18px">
        <div style="font-size:0.65rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">Volume</div>
        <div style="font-size:1.8rem;font-weight:700;color:#ffd64a">${weeklyStats.totalVolume >= 1000 ? Math.round(weeklyStats.totalVolume / 1000) + "k" : weeklyStats.totalVolume}</div>
        <div style="font-size:0.7rem;opacity:0.5">lbs this week</div>
      </div>
      <div class="card" style="text-align:center;padding:18px">
        <div style="font-size:0.65rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em">Total</div>
        <div style="font-size:1.8rem;font-weight:700;color:#00c850">${weeklyStats.totalSessions}</div>
        <div style="font-size:0.7rem;opacity:0.5">all-time sessions</div>
      </div>
    </div>

    <!-- Progress Summary -->
    <div class="card" style="margin-bottom:16px;border-left:3px solid #0887e2;padding:12px 16px;font-size:0.85rem;color:rgba(255,255,255,0.75)">
      <span style="font-weight:600;color:#0887e2">Weekly Progress:</span> ${progressMsg}
    </div>

    ${latestNote ? `
    <!-- Trainer Note -->
    <div class="card" style="margin-bottom:20px;border-left:3px solid #e96d25;background:rgba(233,109,37,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:0.8rem;font-weight:600;color:#e96d25">Coach Note</span>
        <span style="font-size:0.7rem;opacity:0.4">${formatDate(latestNote.createdAt)}</span>
      </div>
      <p style="font-size:0.9rem;opacity:0.8;line-height:1.5">"${latestNote.message}"</p>
    </div>` : ""}

    <!-- Log Workout Session -->
    <div class="card" style="margin-bottom:24px">
      <h3 style="color:#0887e2;margin-bottom:14px">Log Workout Session</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <input id="ws-name" type="text" placeholder="Workout name (e.g. Upper Body Strength)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;grid-column:span 2">
        <input id="ws-duration" type="number" placeholder="Duration (minutes)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="ws-notes" type="text" placeholder="Notes (optional)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      </div>
      <div id="ws-exercises" style="margin-bottom:14px"></div>
      <div style="display:flex;gap:10px">
        <button id="ws-add-exercise"
          style="padding:8px 18px;border:1px solid rgba(8,165,226,0.3);border-radius:8px;
                 background:transparent;color:#0887e2;cursor:pointer;font-family:'Exo 2',sans-serif;font-size:0.85rem">
          + Add Exercise
        </button>
        <button id="ws-log-btn"
          style="padding:8px 22px;border:none;border-radius:8px;
                 background:linear-gradient(90deg,#e96d25,#ff5500);color:#fff;
                 cursor:pointer;font-family:'Exo 2',sans-serif;font-weight:600;font-size:0.85rem">
          Log Session
        </button>
      </div>
    </div>

    <!-- Assigned Workout Plans -->
    <h3 style="color:#0887e2;margin-bottom:12px">Assigned Workout Plans</h3>
    <div id="assigned-workouts-list"></div>

    <!-- Session History -->
    <h3 style="color:#0887e2;margin:24px 0 12px">Session History</h3>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <input id="sh-search" type="text" placeholder="Search by name..."
        style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
        background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif;font-size:0.82rem;flex:1;min-width:150px">
      <button class="sh-range-btn" data-range="7" style="padding:6px 14px;border:none;border-radius:20px;
        background:#0887e2;color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.78rem">7 days</button>
      <button class="sh-range-btn" data-range="30" style="padding:6px 14px;border:none;border-radius:20px;
        background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);cursor:pointer;font-family:Poppins,sans-serif;font-size:0.78rem">30 days</button>
      <button class="sh-range-btn" data-range="0" style="padding:6px 14px;border:none;border-radius:20px;
        background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);cursor:pointer;font-family:Poppins,sans-serif;font-size:0.78rem">All</button>
    </div>
    <div id="session-history-list"></div>
  `;

  // Add exercise row handler
  document.getElementById("ws-add-exercise").addEventListener("click", () => {
    const container = document.getElementById("ws-exercises");
    const row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center";
    row.innerHTML = `
      <input class="ws-ex-name" type="text" placeholder="Exercise"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;font-size:0.85rem">
      <input class="ws-ex-sets" type="number" placeholder="Sets"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;font-size:0.85rem">
      <input class="ws-ex-reps" type="number" placeholder="Reps"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;font-size:0.85rem">
      <input class="ws-ex-weight" type="number" placeholder="Weight (lb)"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;font-size:0.85rem">
      <button class="ws-ex-remove" style="padding:6px 10px;border:none;border-radius:6px;
              background:rgba(255,0,60,0.4);color:#fff;cursor:pointer;font-size:0.8rem">\u2715</button>
    `;
    row.querySelector(".ws-ex-remove").addEventListener("click", () => row.remove());
    container.appendChild(row);
  });

  // Log session handler
  document.getElementById("ws-log-btn").addEventListener("click", async () => {
    const name = document.getElementById("ws-name").value.trim();
    const duration = parseInt(document.getElementById("ws-duration").value) || 0;
    const notes = document.getElementById("ws-notes").value.trim();
    if (!name) { showToast("Enter a workout name.", "error"); return; }

    const exercises = [];
    document.querySelectorAll("#ws-exercises > div").forEach(row => {
      const eName = row.querySelector(".ws-ex-name").value.trim();
      if (eName) {
        exercises.push({
          name: eName,
          sets: parseInt(row.querySelector(".ws-ex-sets").value) || 0,
          reps: parseInt(row.querySelector(".ws-ex-reps").value) || 0,
          weight: parseFloat(row.querySelector(".ws-ex-weight").value) || 0
        });
      }
    });

    try {
      await logWorkoutSession(clientId, { name, exercises, duration, notes });
      showToast("Workout session logged!", "success");
      _loadClientWorkoutsPanel(clientId);
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  // Load assigned workouts grouped by day
  try {
    const workouts = await getClientWorkouts(clientId);
    const assignedList = document.getElementById("assigned-workouts-list");
    if (assignedList) {
      if (workouts.length === 0) {
        assignedList.innerHTML = "<p style='opacity:0.5'>No workout plans assigned yet.</p>";
      } else {
        const byDay = {};
        for (const w of workouts) {
          const d = w.day || "Unscheduled";
          if (!byDay[d]) byDay[d] = [];
          byDay[d].push(w);
        }
        let html = "";
        for (const day of [...DAYS, "Unscheduled"]) {
          if (!byDay[day]) continue;
          html += `<h4 style="color:#e96d25;margin:14px 0 8px;font-family:Orbitron,sans-serif;
            font-size:0.82rem;letter-spacing:1px">${day}</h4>`;
          for (const w of byDay[day]) {
            const catBadge = w.category ? `<span style="display:inline-block;padding:2px 10px;border-radius:12px;
              background:rgba(8,135,226,0.15);color:#0887e2;font-size:0.72rem;font-weight:600;margin-left:8px">${w.category}</span>` : "";
            const exHtml = (w.exercises || []).map(ex =>
              `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;
                    border-bottom:1px solid rgba(255,255,255,0.04)">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="width:6px;height:6px;border-radius:50%;background:#e96d25;flex-shrink:0"></span>
                  <span>${ex.name}</span>
                </div>
                <span style="opacity:0.6;font-size:0.85rem">${ex.sets}\u00D7${ex.reps}${ex.weight ? " @ " + ex.weight + "lb" : ""}${ex.notes ? " (" + ex.notes + ")" : ""}</span>
              </div>`
            ).join("");
            html += `<div class="card" style="margin-bottom:10px">
              <div style="display:flex;align-items:center">${w.day || "Workout"}${catBadge}</div>
              <div style="margin-top:8px">${exHtml || "<p style='opacity:0.5'>No exercises listed.</p>"}</div>
              <p style="font-size:0.75rem;opacity:0.4;margin-top:8px">${formatDate(w.createdAt)}</p>
            </div>`;
          }
        }
        assignedList.innerHTML = html;
      }
    }
  } catch (e) {
    console.warn("Error loading assigned workouts:", e);
  }

  // Load session history with filtering
  let allSessions = [];
  try { allSessions = await getWorkoutSessions(clientId); } catch(e) {}

  let currentRange = 7;
  let currentSearch = "";

  function renderFilteredHistory() {
    const historyList = document.getElementById("session-history-list");
    if (!historyList) return;
    let filtered = allSessions;
    if (currentRange > 0) {
      const cutoff = Date.now() - currentRange * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(s => (s.completedAt || 0) >= cutoff);
    }
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(s => (s.name || "").toLowerCase().includes(q));
    }
    if (filtered.length === 0) {
      historyList.innerHTML = "<p style='opacity:0.5'>No sessions found for this filter.</p>";
      return;
    }
    historyList.innerHTML = filtered.slice(0, 30).map(s => {
      const exTags = (s.exercises || []).map(ex =>
        `<span style="display:inline-block;padding:3px 10px;border-radius:8px;margin:2px;
          font-size:0.75rem;background:rgba(233,109,37,0.12);color:#e96d25;
          border:1px solid rgba(233,109,37,0.2)">${ex.name} ${ex.sets}\u00D7${ex.reps}${ex.weight ? " @ " + ex.weight + "lb" : ""}</span>`
      ).join("");
      return `
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="color:#0887e2">${s.name}</strong>
            <span style="opacity:0.5;font-size:0.8rem">${formatDate(s.completedAt)}</span>
          </div>
          <div style="margin-bottom:6px">${exTags}</div>
          ${s.duration ? `<div style="opacity:0.4;font-size:0.8rem">~${s.duration} min</div>` : ""}
          ${s.notes ? `<div style="opacity:0.5;font-size:0.8rem;margin-top:4px;font-style:italic">${s.notes}</div>` : ""}
        </div>`;
    }).join("");
  }

  // Search filter
  document.getElementById("sh-search").addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    renderFilteredHistory();
  });

  // Range filter buttons
  panel.querySelectorAll(".sh-range-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      panel.querySelectorAll(".sh-range-btn").forEach(b => {
        b.style.background = "rgba(255,255,255,0.08)";
        b.style.color = "rgba(255,255,255,0.6)";
      });
      btn.style.background = "#0887e2";
      btn.style.color = "#fff";
      currentRange = parseInt(btn.dataset.range) || 0;
      renderFilteredHistory();
    });
  });

  renderFilteredHistory();
}

async function _loadClientProgressPanel(clientId, shareCode) {
  const panel = document.getElementById("panel-progress");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#0887e2">Progress Tracker</h2>
    ${shareCode ? `<p style="opacity:0.6">Your share code: <strong style="color:#0887e2">${shareCode}</strong></p>` : ""}
    <div class="card" style="margin-bottom:20px">
      <h3>Log Progress</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="prog-weight" type="number" placeholder="Weight (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="prog-bench" type="number" placeholder="Bench Press (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="prog-squat" type="number" placeholder="Squat (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="prog-deadlift" type="number" placeholder="Deadlift (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
      </div>
      <button id="log-progress-btn"
        style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;
               cursor:pointer;font-family:Poppins,sans-serif">
        Log Progress
      </button>
    </div>
    <div id="progress-list"></div>
  `;

  document.getElementById("log-progress-btn").addEventListener("click", async () => {
    try {
      await logProgress(clientId, {
        weight:    parseFloat(document.getElementById("prog-weight").value)    || 0,
        benchPress:parseFloat(document.getElementById("prog-bench").value)     || 0,
        squat:     parseFloat(document.getElementById("prog-squat").value)     || 0,
        deadlift:  parseFloat(document.getElementById("prog-deadlift").value)  || 0,
        date:      new Date().toISOString()
      });
      showToast("Progress logged!", "success");
      _refreshProgressList(clientId);
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  _refreshProgressList(clientId);
}

async function _refreshProgressList(clientId) {
  const list = document.getElementById("progress-list");
  if (!list) return;
  try {
    const entries = await getProgress(clientId);
    if (entries.length === 0) {
      list.innerHTML = "<p>No progress logged yet.</p>";
      return;
    }
    list.innerHTML = entries.map(e => `
      <div class="card" style="margin-bottom:12px;font-size:0.9rem">
        <strong>${formatDate(e.createdAt)}</strong><br>
        Weight: ${e.weight}kg &nbsp;|&nbsp;
        Bench: ${e.benchPress}kg &nbsp;|&nbsp;
        Squat: ${e.squat}kg &nbsp;|&nbsp;
        Deadlift: ${e.deadlift}kg
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p style="color:#0887e2">${e.message}</p>`;
  }
}

async function _loadClientMealsPanel(clientId) {
  const panel = document.getElementById("panel-meals");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  let mealPlans = [];
  let biography = null;
  try { mealPlans = await getMealPlans(clientId); } catch(e) {}
  try { biography = await getClientBiography(clientId); } catch(e) {}

  // Group plans by day
  const plansByDay = {};
  for (const p of mealPlans) {
    const d = p.day || "Unscheduled";
    if (!plansByDay[d]) plansByDay[d] = [];
    plansByDay[d].push(p);
  }

  // Build day tabs and content
  const activeDays = DAYS.filter(d => plansByDay[d]);
  let dayTabs = "";
  let dayPanels = "";
  for (let i = 0; i < activeDays.length; i++) {
    const d = activeDays[i];
    const plans = plansByDay[d];
    const active = i === 0;
    dayTabs += `<button class="mp-day-tab" data-day="${d}"
      style="padding:8px 18px;border:none;border-radius:20px;cursor:pointer;font-family:Poppins,sans-serif;
      font-size:0.82rem;margin-right:6px;transition:all 0.2s;
      ${active ? "background:#0887e2;color:#fff" : "background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6)"}">${d}</button>`;

    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
    let mealRows = "";
    for (const plan of plans) {
      const meals = plan.meals || [];
      for (const m of meals) {
        totalCal += m.calories || 0;
        totalP += m.protein || 0;
        totalC += m.carbs || 0;
        totalF += m.fats || 0;
        mealRows += `
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:8px;padding:8px 0;
            border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;align-items:center">
            <span style="font-weight:600">${m.name || "—"}</span>
            <span style="opacity:0.6">${m.time || "—"}</span>
            <span>${m.calories || 0} cal</span>
            <span>${m.protein || 0}g P</span>
            <span>${m.carbs || 0}g C</span>
            <span>${m.fats || 0}g F</span>
          </div>`;
      }
    }
    dayPanels += `
      <div class="mp-day-content" data-day="${d}" style="display:${active ? "block" : "none"}">
        ${mealRows || '<p style="opacity:0.5;padding:10px">No meals for this day.</p>'}
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:8px;padding:10px 0;
          margin-top:8px;border-top:2px solid rgba(8,135,226,0.3);font-size:0.85rem;font-weight:700;color:#0887e2">
          <span>Daily Totals</span>
          <span></span>
          <span>${totalCal} cal</span>
          <span>${totalP}g P</span>
          <span>${totalC}g C</span>
          <span>${totalF}g F</span>
        </div>
      </div>`;
  }

  const hasPlans = activeDays.length > 0;
  const suggestionChips = [
    biography?.primaryGoal ? `Goal: ${biography.primaryGoal}` : "",
    biography?.dietType ? `Diet: ${biography.dietType}` : "",
    biography?.calorieGoal ? `Target: ${biography.calorieGoal} kcal/day` : "",
    biography?.mealsPerDay ? `${biography.mealsPerDay} meals/day` : "",
    biography?.allergies ? `Avoid: ${biography.allergies}` : "",
    biography?.trainingType ? `Training focus: ${biography.trainingType}` : ""
  ].filter(Boolean);
  const guidanceLines = [
    biography?.primaryGoal === "Fat Loss" ? "Prioritize lean protein, fiber, and a moderate calorie deficit that still supports training recovery." : "",
    biography?.primaryGoal === "Muscle Gain" ? "Aim for high-protein meals with consistent carbohydrates around workouts to support recovery and growth." : "",
    biography?.primaryGoal === "Maintenance" ? "Keep calories steady and focus on meal timing consistency, hydration, and balanced macro intake." : "",
    biography?.dietType ? `Keep all suggestions aligned with the client's ${biography.dietType} preference.` : "",
    biography?.allergies ? `Exclude foods related to: ${biography.allergies}.` : "",
    biography?.nutritionNotes ? biography.nutritionNotes : ""
  ].filter(Boolean);
  const trainerPlanSection = hasPlans ? `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:14px">Trainer-Assigned Meal Plans</h3>
      <div id="mp-day-tabs" style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:4px">
        ${dayTabs}
      </div>
      <div id="mp-day-panels">${dayPanels}</div>
    </div>` : `
    <div class="card" style="margin-bottom:20px;text-align:center;opacity:0.5;padding:20px">
      <p>No trainer meal plans assigned yet. Ask your trainer to create a plan for you.</p>
    </div>`;

  panel.innerHTML = `
    <h2 style="color:#0887e2">Meal / Food Intake Tracker</h2>
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin-bottom:12px">Personal Nutrition Guidance</h3>
      ${suggestionChips.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${suggestionChips.map(item => `<span style="padding:6px 10px;border-radius:999px;background:rgba(8,135,226,0.12);border:1px solid rgba(8,135,226,0.2);font-size:0.8rem">${item}</span>`).join("")}</div>` : `<p style="opacity:0.6">Complete your profile to unlock tailored nutrition suggestions.</p>`}
      ${guidanceLines.length ? `<div style="display:grid;gap:8px">${guidanceLines.map(line => `<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);font-size:0.84rem">${line}</div>`).join("")}</div>` : ""}
    </div>
    ${trainerPlanSection}
    <div class="card" style="margin-bottom:20px">
      <h3>Log Meal</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="meal-name" type="text" placeholder="Meal name"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif;grid-column:span 2">
        <input id="meal-calories" type="number" placeholder="Calories"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="meal-protein" type="number" placeholder="Protein (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="meal-carbs" type="number" placeholder="Carbs (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="meal-fats" type="number" placeholder="Fats (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
      </div>
      <button id="log-meal-btn"
        style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;
               cursor:pointer;font-family:Poppins,sans-serif">
        Log Meal
      </button>
    </div>
    <div id="meal-list"></div>
  `;

  // Day tab switching
  panel.querySelectorAll(".mp-day-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      panel.querySelectorAll(".mp-day-tab").forEach(t => {
        t.style.background = "rgba(255,255,255,0.08)";
        t.style.color = "rgba(255,255,255,0.6)";
      });
      tab.style.background = "#0887e2";
      tab.style.color = "#fff";
      panel.querySelectorAll(".mp-day-content").forEach(c => c.style.display = "none");
      const target = panel.querySelector(`.mp-day-content[data-day="${tab.dataset.day}"]`);
      if (target) target.style.display = "block";
    });
  });

  document.getElementById("log-meal-btn").addEventListener("click", async () => {
    try {
      await logMeal(clientId, {
        mealName: document.getElementById("meal-name").value.trim(),
        calories: parseFloat(document.getElementById("meal-calories").value) || 0,
        protein:  parseFloat(document.getElementById("meal-protein").value)  || 0,
        carbs:    parseFloat(document.getElementById("meal-carbs").value)    || 0,
        fats:     parseFloat(document.getElementById("meal-fats").value)     || 0,
        date: new Date().toISOString()
      });
      showToast("Meal logged!", "success");
      _refreshMealList(clientId);
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  _refreshMealList(clientId);
}

async function _refreshMealList(clientId) {
  const list = document.getElementById("meal-list");
  if (!list) return;
  try {
    const entries = await getMeals(clientId);
    if (entries.length === 0) {
      list.innerHTML = "<p>No meals logged yet.</p>";
      return;
    }
    list.innerHTML = entries.map(m => `
      <div class="card" style="margin-bottom:12px;font-size:0.9rem">
        <strong>${m.mealName}</strong> — ${formatDate(m.createdAt)}<br>
        Calories: ${m.calories} &nbsp;|&nbsp;
        Protein: ${m.protein}g &nbsp;|&nbsp;
        Carbs: ${m.carbs}g &nbsp;|&nbsp;
        Fats: ${m.fats}g
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p style="color:#0887e2">${e.message}</p>`;
  }
}

async function _loadClientMembershipPanel(clientId) {
  const panel = document.getElementById("panel-membership");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Membership Hub</h2><p style='opacity:0.6'>Loading…</p>";

  const ONE_DAY = 86400000;
  const CANCEL_WINDOW = 2 * ONE_DAY;
  const money = n => `£${(Number(n) || 0).toFixed(2)}`;
  const el = id => document.getElementById(id);

  // Tier rank: higher number = higher tier. Falls back to 0 for unknown plans.
  function tierRank(nameOrType) {
    const n = String(nameOrType || "").toLowerCase();
    if (n.includes("elite"))  return 3;
    if (n.includes("core"))   return 2;// Update: hardcoded values for known tiers, admin generated tiers would te treated diffrently
    if (n.includes("start"))  return 1;
    return 0;
  }

  try {
    // Always fetch fresh — no stale closure data.
    // getClientMembershipPayments uses orderByChild which works without .indexOn (just a console warning).
    // getAllMemberships + filter is used for memberships since it reliably returns all records.
    const [plans, payments, allMembsRaw] = await Promise.all([
      getMembershipPlans(),
      getClientMembershipPayments(clientId),
      getAllMemberships()
    ]);
    const allMembs = allMembsRaw.filter(m => m.clientId === clientId);
    payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const now = Date.now();

    // Build displayPayments: real payments + synthesized entries for memberships
    // whose payment record was never written (e.g. created via getMembership recovery path).
    // We only synthesize for non-cancelled memberships that have no matching payment at all.
    function buildDisplayPayments(memList, payList) {
      const dp = [...payList];
      for (const m of memList) {
        const s = String(m.status || "active").toLowerCase();
        if (s === "cancelled" || s === "canceled") continue;
        if (payList.some(p => p.membershipId === m.id)) continue; // real payment exists
        // Charge amount: for upgrades = difference; for new = full plan price
        const synthAmt = m.upgradeFromPrice
          ? Math.max(0, (Number(m.price) || 0) - (Number(m.upgradeFromPrice) || 0))
          : (Number(m.price) || 0);
        dp.push({
          _synthetic: true,
          planName: m.type,
          amount: synthAmt,
          method: m.paymentMethod || "card",
          maskedCard: "",
          paymentReason: m.upgradeFromType ? "upgrade_difference" : "new_membership",
          createdAt: m.upgradedAt || m.startedAt || now
        });
      }
      dp.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return dp;
    }
    // displayPayments is built after activeMembs is determined (needs allMembs)
    // We'll build it below once we have allMembs ready.

    // Collect genuinely active (not expired, not cancelled)
    const activeMembs = allMembs.filter(m => {
      const s = String(m.status || "active").toLowerCase();
      return s === "active" && (!m.expiresAt || m.expiresAt >= now);
    });

    // Sort: highest tier first, then most recent
    activeMembs.sort((a, b) => {
      const rd = tierRank(b.type) - tierRank(a.type);
      if (rd !== 0) return rd;
      return ((b.upgradedAt || b.startedAt || b.createdAt || 0) - (a.upgradedAt || a.startedAt || a.createdAt || 0));
    });

    // Auto-heal any duplicate actives (keep best one, cancel rest)
    if (activeMembs.length > 1) {
      for (const dup of activeMembs.slice(1)) {
        await updateMembership(dup.id, { status: "cancelled", cancelledAt: now, cancelReason: "Duplicate active healed" }).catch(() => {});
      }
    }

    const activeMem = activeMembs[0] || null;
    const activePlan = activeMem
      ? (plans.find(p => p.id === activeMem.planId)
          || plans.find(p => String(p.name || "").toLowerCase() === String(activeMem.type || "").toLowerCase())
          || { id: null, name: activeMem.type, price: activeMem.price, durationDays: 30, features: [], description: "" })
      : null;
    const activeRank  = tierRank(activeMem?.type);
    const activePlanPrice = Number(activePlan?.price) || 0;
    const canCancel   = !!(activeMem && activeMem.startedAt && (now - activeMem.startedAt) <= CANCEL_WINDOW);
    const daysLeft    = activeMem?.expiresAt ? Math.max(0, Math.ceil((activeMem.expiresAt - now) / ONE_DAY)) : 0;

    const displayPayments = buildDisplayPayments(allMembs, payments);

    const TIER_COL = { elite: "#7c4dff", core: "#0887e2", start: "#00c853" };
    const tierColKey = activeMem ? Object.keys(TIER_COL).find(k => String(activeMem.type || "").toLowerCase().includes(k)) : null;
    const tierCol = tierColKey ? TIER_COL[tierColKey] : (activeMem ? "#0887e2" : "#555");

    // ── Render shell ──────────────────────────────────────────────────────────
    panel.innerHTML = `
      <h2 style="color:#0887e2;margin-bottom:20px">Membership Hub</h2>

      ${(activeMem && daysLeft <= 7 && daysLeft > 0) ? `
        <div style="margin-bottom:16px;padding:12px 18px;border-radius:10px;background:rgba(255,80,0,0.12);border:1px solid rgba(255,80,0,0.35);display:flex;align-items:center;gap:12px">
          <span style="font-size:1.3rem">⚠️</span>
          <div><strong style="color:#e96d25">Expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong> — your ${activeMem.type} membership. Renew below.</div>
        </div>` : ""}

      <div class="card" style="margin-bottom:20px;cursor:default;border-left:4px solid ${tierCol}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div>
            <h3 style="margin-bottom:6px">
              ${activeMem ? activeMem.type || "Membership" : "No Active Membership"}
              <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;background:${tierCol}22;color:${tierCol}">
                ${activeMem ? "ACTIVE" : "INACTIVE"}
              </span>
            </h3>
            <p style="opacity:0.78;margin:3px 0">Expiry: <strong>${activeMem?.expiresAt ? formatDate(activeMem.expiresAt) : "—"}</strong></p>
            <p style="opacity:0.78;margin:3px 0">Days Left: <strong style="color:${daysLeft <= 7 && activeMem ? "#e96d25" : "inherit"}">${activeMem ? daysLeft : "—"}</strong></p>
            ${activeMem ? `<p style="opacity:0.78;margin:3px 0">Price: <strong>${money(activeMem.price || activePlanPrice)}</strong></p>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
            <div style="text-align:right">
              <div style="font-size:0.82rem;opacity:0.65">Last Payment</div>
              <div style="font-size:1.4rem;font-weight:700;color:#e96d25">${displayPayments[0] ? money(displayPayments[0].amount) : "—"}</div>
            </div>
            ${activeMem ? `
              <button id="cm-cancel-mem-btn"
                style="padding:7px 16px;border:1px solid rgba(255,0,51,0.5);border-radius:8px;background:transparent;
                color:#ff5577;font-family:inherit;font-size:0.82rem;cursor:${canCancel ? "pointer" : "not-allowed"};opacity:${canCancel ? 1 : 0.5}">
                ${canCancel ? "Cancel Membership" : "Cancellation Window Closed"}
              </button>
              <div style="font-size:0.74rem;opacity:0.55;text-align:right;max-width:220px">
                ${canCancel ? "Cancellable within 2 days of activation." : "2-day cancellation window has passed."}
              </div>` : ""}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;cursor:default">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0">Available Plans</h3>
          <input id="cm-search" type="text" placeholder="Search plans…"
            style="min-width:220px;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        </div>
      </div>

      <div id="cm-plans-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:16px"></div>
      <div id="cm-checkout-area"></div>

      <div class="card" style="margin-top:20px;cursor:default">
        <h3 style="margin-bottom:12px">Payment History</h3>
        <div id="cm-pay-history"></div>
      </div>
    `;

    // ── Cancel handler ────────────────────────────────────────────────────────
    const cancelMemBtn = el("cm-cancel-mem-btn");
    if (cancelMemBtn && activeMem) {
      cancelMemBtn.addEventListener("click", () => {
        if (!canCancel) { showToast("Cancellation window has passed (2 days from activation).", "error"); return; }
        showModal("Cancel Membership",
          `<p>Cancel your <strong>${activeMem.type || "membership"}</strong>? This will end your access immediately.</p>`,
          async () => {
            try {
              await updateMembership(activeMem.id, {
                status: "cancelled", cancelledAt: Date.now(),
                cancelReason: "Cancelled by client within 2-day window", expiresAt: Date.now()
              });
              showToast("Membership cancelled.", "info");
              _loadClientMembershipPanel(clientId);
            } catch (err) { showToast(err.message, "error"); }
          }
        );
      });
    }

    // ── Payment history ───────────────────────────────────────────────────────
    const payHistEl = el("cm-pay-history");
    if (payHistEl) {
      if (!displayPayments.length) {
        payHistEl.innerHTML = "<p style='opacity:0.65'>No payments yet.</p>";
      } else {
        payHistEl.innerHTML = displayPayments.slice(0, 10).map(p => `
          <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
            <div>
              <strong style="font-size:0.9rem">${p.planName || p.membershipType || "Membership"}</strong>
              <span style="margin-left:8px;opacity:0.6;font-size:0.8rem">${
                p.paymentReason === "upgrade_difference" ? "Upgrade" :
                p.paymentReason === "cancel_refund"     ? "Refund"  : "Purchase"}</span>
              ${p._synthetic ? "<span style='margin-left:6px;font-size:0.72rem;color:#aaa;opacity:0.7'>(no receipt)</span>" : ""}
              <div style="font-size:0.78rem;opacity:0.55">${p.method || "card"}${p.maskedCard ? " · " + p.maskedCard : ""}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:${p.paymentReason === "cancel_refund" ? "#00c853" : "#e96d25"}">${money(p.amount)}</div>
              <div style="font-size:0.78rem;opacity:0.6">${formatDate(p.createdAt)}</div>
            </div>
          </div>`).join("");
      }
    }

    // ── Plans grid ────────────────────────────────────────────────────────────
    const plansGrid   = el("cm-plans-grid");
    const checkoutDiv = el("cm-checkout-area");
    const searchInp   = el("cm-search");

    function renderPlans() {
      const q = String(searchInp?.value || "").trim().toLowerCase();
      const filtered = plans.filter(p => {
        const hay = [p.name, p.description, ...(p.features || [])].join(" ").toLowerCase();
        return !q || hay.includes(q);
      });
      if (!filtered.length) { plansGrid.innerHTML = "<p style='opacity:0.65'>No plans found.</p>"; return; }

      plansGrid.innerHTML = filtered.map(p => {
        const pr         = tierRank(p.name);
        const isCurrent  = !!(activeMem && pr === activeRank);
        const isUpgrade  = !!(activeMem && pr > activeRank);
        const isDowngr   = !!(activeMem && pr < activeRank);
        const upgradeAmt = isUpgrade ? Math.max(0, (Number(p.price) || 0) - activePlanPrice) : 0;

        let badge = "";
        let btnTxt = activeMem ? "Choose Plan" : "Subscribe";
        let btnOff = false;
        let btnCss = "background:linear-gradient(90deg,#0887e2,#006af5);cursor:pointer";

        if (isCurrent) {
          badge  = `<div style="font-size:0.78rem;color:#e96d25;margin-bottom:8px;font-weight:600">✓ Your current plan</div>`;
          btnTxt = "Current Plan"; btnOff = true;
          btnCss = "background:rgba(255,255,255,0.1);cursor:not-allowed;opacity:0.55";
        } else if (isUpgrade) {
          badge  = `<div style="font-size:0.78rem;color:#00c853;margin-bottom:8px;font-weight:600">⬆ Upgrade — pay only ${money(upgradeAmt)} extra</div>`;
          btnTxt = "Upgrade Plan";
          btnCss = "background:linear-gradient(90deg,#00c853,#009944);cursor:pointer";
        } else if (isDowngr) {
          badge  = `<div style="font-size:0.78rem;color:#ff5577;margin-bottom:8px">⬇ Not available — downgrade blocked while higher tier is active.</div>`;
          btnTxt = "Not Available"; btnOff = true;
          btnCss = "background:rgba(255,255,255,0.08);cursor:not-allowed;opacity:0.4";
        }

        return `
          <div class="card" style="cursor:default">
            <h3 style="margin-bottom:4px">${p.name}</h3>
            <p style="opacity:0.7;font-size:0.86rem;margin-bottom:8px">${p.description || ""}</p>
            <p style="margin-bottom:8px"><strong>${money(p.price)}</strong> · ${p.durationDays || 30} days</p>
            ${badge}
            <div style="opacity:0.7;font-size:0.82rem;margin-bottom:10px">${(p.features || []).slice(0, 3).join(" • ")}</div>
            <button class="cm-pick-btn" data-pid="${p.id}" ${btnOff ? "disabled" : ""}
              style="padding:8px 16px;border:none;border-radius:8px;color:#fff;font-weight:700;${btnCss}">
              ${btnTxt}
            </button>
          </div>`;
      }).join("");

      plansGrid.querySelectorAll(".cm-pick-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
          const plan = plans.find(p => p.id === btn.dataset.pid);
          if (!plan) { showToast("Plan not found. Refresh the page.", "error"); return; }
          renderCheckout(plan);
        });
      });
    }

    // ── Checkout ──────────────────────────────────────────────────────────────
    async function renderCheckout(plan) {
      if (!plan) { checkoutDiv.innerHTML = ""; return; }

      const selPrice   = Number(plan.price) || 0;
      const isUpgr     = !!(activeMem && tierRank(plan.name) > activeRank);
      const chargeAmt  = isUpgr ? Math.max(0, selPrice - activePlanPrice) : selPrice;

      checkoutDiv.innerHTML = `<div style="text-align:center;padding:14px;opacity:0.5">Loading…</div>`;
      let savedCards = [];
      try { savedCards = await getPaymentCards(clientId); } catch (_) {}
      const defCard = savedCards.find(c => c.isDefault) || savedCards[0] || null;
      const iStyle = `padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;width:100%;box-sizing:border-box`;

      checkoutDiv.innerHTML = `
        <div class="card" style="cursor:default">
          <h3 style="margin-bottom:8px">${isUpgr ? "Upgrade to" : "Subscribe to"} ${plan.name}</h3>
          <p style="opacity:0.72;margin-bottom:6px">Plan price: <strong>${money(selPrice)}</strong> · ${plan.durationDays || 30} days</p>
          ${isUpgr
            ? `<p style="margin-bottom:12px">Charge now: <strong style="color:#00c853;font-size:1.1rem">${money(chargeAmt)}</strong>
                <span style="opacity:0.6;font-size:0.85rem"> (${money(selPrice)} − ${money(activePlanPrice)} already paid)</span></p>`
            : `<p style="margin-bottom:12px">Amount due: <strong style="color:#00c853;font-size:1.1rem">${money(chargeAmt)}</strong></p>`}

          ${defCard ? `
            <div style="margin-bottom:12px;padding:10px 14px;border-radius:8px;background:rgba(8,165,226,0.08);border:1px solid rgba(8,165,226,0.3)">
              <div style="font-size:0.82rem;opacity:0.65">Using saved card</div>
              <strong>${defCard.cardHolder} — •••• ${defCard.last4} (${defCard.expiry})</strong>
              <div style="margin-top:6px"><label style="font-size:0.8rem;cursor:pointer"><input type="checkbox" id="cm-use-new"> Use a different card</label></div>
            </div>` : ""}

          <div id="cm-new-card-fields" style="${defCard ? "display:none" : ""}">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
              <input id="cm-cname" type="text" placeholder="Cardholder Name" style="${iStyle}">
              <input id="cm-cnum"  type="text" placeholder="Card Number" maxlength="19" style="${iStyle}">
              <input id="cm-cexp"  type="text" placeholder="MM/YY" maxlength="5" style="${iStyle}">
              <input id="cm-ccvc"  type="password" placeholder="CVC" maxlength="4" style="${iStyle}">
            </div>
            <label style="font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:10px">
              <input type="checkbox" id="cm-save-card"> Save card for future payments
            </label>
          </div>

          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <button id="cm-pay-btn" style="padding:10px 24px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c853,#009944);color:#fff;cursor:pointer;font-weight:700;font-size:1rem">
              ${isUpgr ? `Pay ${money(chargeAmt)} &amp; Upgrade` : `Pay ${money(chargeAmt)} &amp; Activate`}
            </button>
            <button id="cm-co-cancel" style="padding:10px 20px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:inherit;cursor:pointer">
              Cancel
            </button>
          </div>
        </div>`;

      if (defCard) {
        el("cm-use-new").addEventListener("change", e => {
          el("cm-new-card-fields").style.display = e.target.checked ? "block" : "none";
        });
      }
      const cnumEl = el("cm-cnum");
      if (cnumEl) cnumEl.addEventListener("input", () => {
        let v = cnumEl.value.replace(/\D/g, "").slice(0, 16);
        cnumEl.value = v.replace(/(.{4})/g, "$1 ").trim();
      });
      const cexpEl = el("cm-cexp");
      if (cexpEl) cexpEl.addEventListener("input", () => {
        let v = cexpEl.value.replace(/\D/g, "").slice(0, 4);
        if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
        cexpEl.value = v;
      });

      el("cm-co-cancel").addEventListener("click", () => renderCheckout(null));

      el("cm-pay-btn").addEventListener("click", async () => {
        const payBtn = el("cm-pay-btn");
        const useNew = chargeAmt > 0 && (!defCard || el("cm-use-new")?.checked);
        let cardName, cardNum, cardExp;

        if (chargeAmt > 0 && useNew) {
          cardName = (el("cm-cname")?.value || "").trim();
          cardNum  = (el("cm-cnum")?.value  || "").replace(/\s+/g, "");
          cardExp  = (el("cm-cexp")?.value  || "").trim();
          const cvc = (el("cm-ccvc")?.value || "").trim();
          if (!cardName || cardNum.length < 12 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExp) || !/^\d{3,4}$/.test(cvc)) {
            showToast("Please enter valid card details.", "error"); return;
          }
        } else if (chargeAmt > 0 && defCard) {
          cardName = defCard.cardHolder;
          cardNum  = defCard.cardNumber || String(defCard.last4 || "0000").padStart(16, "0");
          cardExp  = defCard.expiry;
        } else {
          cardNum = "0000000000000000";
        }

        if (payBtn.disabled) return;
        payBtn.disabled = true; payBtn.textContent = "Processing…";

        try {
          if (chargeAmt > 0 && useNew && el("cm-save-card")?.checked) {
            const nid = await savePaymentCard(clientId, {
              cardHolder: cardName, cardNumber: cardNum, last4: cardNum.slice(-4),
              expiry: cardExp, isDefault: savedCards.length === 0
            });
            if (savedCards.length === 0) await setDefaultCard(clientId, nid);
          }

          // Re-fetch FRESH state right before committing to DB.
          // Plain full-fetch to avoid requiring .indexOn Firebase rules.
          const freshAll = (await getAllMemberships()).filter(m => m.clientId === clientId);

          const freshActive = freshAll
            .filter(m => { const s = String(m.status || "active").toLowerCase(); return s === "active" && (!m.expiresAt || m.expiresAt >= Date.now()); })
            .sort((a, b) => {
              const rd = tierRank(b.type) - tierRank(a.type);
              return rd !== 0 ? rd : ((b.upgradedAt || b.startedAt || 0) - (a.upgradedAt || a.startedAt || 0));
            });
          const freshBest      = freshActive[0] || null;
          const freshBestRank  = tierRank(freshBest?.type);
          const planRankVal    = tierRank(plan.name);

          if (freshBest && planRankVal < freshBestRank) {
            throw new Error(`Cannot downgrade from ${freshBest.type} to ${plan.name}. Cancel your current plan first.`);
          }

          const isUpgradeCommit = !!(freshBest && planRankVal > freshBestRank);
          const freshBestPlan   = freshBest
            ? (plans.find(p2 => p2.id === freshBest.planId) ||
               plans.find(p2 => String(p2.name || "").toLowerCase() === String(freshBest.type || "").toLowerCase()) ||
               { price: freshBest.price })
            : null;
          const currentPrice  = Number(freshBestPlan?.price) || 0;
          const chargeCommit  = isUpgradeCommit ? Math.max(0, selPrice - currentPrice) : selPrice;

          // Cancel ALL non-cancelled memberships (clean slate regardless of status)
          for (const m of freshAll) {
            const s = String(m.status || "").toLowerCase();
            if (s === "cancelled" || s === "canceled") continue;
            await updateMembership(m.id, {
              status: "cancelled", cancelledAt: Date.now(),
              cancelReason: isUpgradeCommit ? `Upgraded to ${plan.name}` : "Replaced by new purchase"
            });
          }

          // Create brand-new active membership record
          const startedAt = Date.now();
          const expiresAt = startedAt + (Number(plan.durationDays) || 30) * ONE_DAY;
          const newMemId  = await createMembership({
            clientId, planId: plan.id, type: plan.name, status: "active",
            startedAt, durationDays: Number(plan.durationDays) || 30, expiresAt,
            price: selPrice, paymentMethod: chargeCommit > 0 ? "card" : "adjustment",
            ...(isUpgradeCommit ? { upgradedAt: Date.now(), upgradeFromType: freshBest?.type || "", upgradeFromPrice: currentPrice } : {})
          });

          // Record payment
          await createMembershipPayment({
            clientId, membershipId: newMemId, planId: plan.id,
            planName: plan.name, membershipType: plan.name,
            amount: chargeCommit, method: chargeCommit > 0 ? "card" : "adjustment", status: "paid",
            maskedCard: chargeCommit > 0 ? `**** **** **** ${cardNum.slice(-4)}` : "",
            planPrice: selPrice, previousPlanPrice: currentPrice,
            paymentReason: isUpgradeCommit ? "upgrade_difference" : "new_membership"
          });

          await recordTransaction({
            type: "membership", amount: chargeCommit,
            description: isUpgradeCommit ? `Upgrade to ${plan.name}` : `${plan.name} membership`,
            category: "membership"
          });

          showToast(
            isUpgradeCommit
              ? `Upgraded to ${plan.name}! Charged ${money(chargeCommit)}.`
              : `${plan.name} membership activated! Charged ${money(chargeCommit)}.`,
            "success"
          );
          _loadClientMembershipPanel(clientId);
        } catch (err) {
          showToast(err.message, "error");
          payBtn.disabled = false;
          payBtn.textContent = isUpgr ? `Pay ${money(chargeAmt)} & Upgrade` : `Pay ${money(chargeAmt)} & Activate`;
        }
      });
    }

    if (searchInp) searchInp.addEventListener("input", renderPlans);
    renderPlans();
  } catch (e) {
    panel.innerHTML = `<h2 style='color:#0887e2'>Membership Hub</h2><p style='color:#ff0033'>Error: ${e.message}</p>`;
  }
}

// Navigate to XGYM_Cart.html — writes full session context to sessionStorage
async function _openStore(uid) {
  try {
    if (uid) {
      const [profile, cards, plans, storeItems] = await Promise.all([
        getUserProfile(uid).catch(() => null),
        getPaymentCards(uid).catch(() => []),
        getMembershipPlans().catch(() => []),
        getAllStoreItems().catch(() => [])
      ]);
      const fireUser = auth.currentUser;
      sessionStorage.setItem("xgym_user", JSON.stringify({
        uid,
        name:  profile?.name  || "",
        email: fireUser?.email || profile?.email || "",
        role:  profile?.role  || "client"
      }));
      sessionStorage.setItem("xgym_cards",       JSON.stringify(cards       || []));
      sessionStorage.setItem("xgym_plans",       JSON.stringify(plans       || []));
      sessionStorage.setItem("xgym_store_items", JSON.stringify(storeItems  || []));
    }
  } catch (e) { /* proceed anyway */ }
  window.location.href = "XGYM_Cart.html";
}

// On page init: sync any card, membership purchases, or orders saved during a store visit
async function _syncPendingStoreActions(uid) {
  if (!uid) return;
  const _oneDay = 86400000;

  // ── 1. Sync saved card ──────────────────────────────────────
  try {
    const raw = sessionStorage.getItem("xgym_pending_card");
    if (raw) {
      sessionStorage.removeItem("xgym_pending_card");
      const c = JSON.parse(raw);
      if (c.cardHolder && c.cardNumber) {
        const existing = await getPaymentCards(uid).catch(() => []);
        const already = existing.some(e => e.last4 === c.cardNumber.slice(-4) && e.expiry === c.expiry);
        if (!already) {
          const newId = await savePaymentCard(uid, {
            cardHolder: c.cardHolder, cardNumber: c.cardNumber,
            last4: c.cardNumber.slice(-4), expiry: c.expiry, isDefault: existing.length === 0
          });
          if (existing.length === 0) await setDefaultCard(uid, newId);
          showToast("Card from your store checkout was saved to your wallet!", "success");
        }
      }
    }
  } catch (e) { /* ignore */ }

  // ── 2. Sync membership purchases from store ─────────────────
  try {
    const msRaw = sessionStorage.getItem("xgym_pending_memberships");
    if (msRaw) {
      sessionStorage.removeItem("xgym_pending_memberships");
      const memberships = JSON.parse(msRaw);
      for (const m of memberships) {
        const plans = await getMembershipPlans().catch(() => []);
        const activeMembership = await getMembership(uid).catch(() => null);

        function syncPlanRank(plan) {
          if (!plan) return 0;
          const nm = String(plan.name || plan.type || "").toLowerCase();
          if (nm.includes("starter")) return 1;
          if (nm.includes("core")) return 2;
          if (nm.includes("elite")) return 3;
          return Number(plan.price) || 0;
        }

        const nextPlan = plans.find(p => p.id === m.planId) || { name: m.name, price: m.price };
        const activePlan = activeMembership
          ? (plans.find(p => p.id === activeMembership.planId)
              || plans.find(p => String(p.name || "").toLowerCase() === String(activeMembership.type || "").toLowerCase())
              || { name: activeMembership.type, price: activeMembership.price })
          : null;

        if (activeMembership && syncPlanRank(nextPlan) < syncPlanRank(activePlan)) {
          continue;
        }

        // Cancel any currently active membership
        const allM = await getAllMemberships().catch(() => []);
        const active = allM.filter(x => x.clientId === uid && (x.status || "active") === "active" && (!x.expiresAt || x.expiresAt >= Date.now()));
        for (const ex of active) {
          await updateMembership(ex.id, { status: "cancelled", cancelledAt: Date.now(), cancelReason: "Replaced by store purchase" });
        }
        const startedAt = Date.now();
        const expiresAt = startedAt + (Number(m.durationDays) || 30) * _oneDay;
        const membershipId = await createMembership({
          clientId: uid, planId: m.planId, type: m.name, status: "active",
          startedAt, durationDays: Number(m.durationDays) || 30, expiresAt,
          price: Number(m.price) || 0, paymentMethod: m.paymentMethod || "card"
        });
        await createMembershipPayment({
          clientId: uid, membershipId, planId: m.planId, planName: m.name,
          membershipType: m.name, amount: Number(m.price) || 0,
          method: m.paymentMethod || "card", status: "paid",
          maskedCard: m.maskedCard || ""
        });
        await recordTransaction({
          type: "membership", amount: Number(m.price) || 0,
          description: `${m.name} membership (store purchase)`, category: "membership"
        });
      }
      if (memberships.length > 0) {
        showToast("Membership from your store purchase has been activated!", "success");
        // Reload membership panel if it's currently visible
        const mPanel = document.getElementById("panel-membership");
        const currentUser = auth.currentUser;
        if (mPanel && mPanel.style.display !== "none" && currentUser) {
          _loadClientMembershipPanel(currentUser.uid);
        }
      }
    }
  } catch (e) { /* ignore */ }

  // ── 3. Persist store orders into Firebase store_purchases ────
  try {
    const ordersRaw = sessionStorage.getItem("xgym_pending_orders");
    if (ordersRaw) {
      sessionStorage.removeItem("xgym_pending_orders");
      const orders = JSON.parse(ordersRaw);
      for (const o of orders) {
        if (o.status !== "paid") continue;
        // Write to store_purchases so the dashboard cart panel shows it
        await createStorePurchase(uid, {
          total: Number(o.amount) || 0,
          method: o.method || "card",
          summary: o.items || "",
          items: Array.isArray(o.itemsData) ? o.itemsData : []
        });
        await recordTransaction({
          type: "store_purchase", amount: Number(o.amount) || 0,
          description: "Store purchase: " + (o.items || ""), category: "store"
        });
      }
    }
  } catch (e) { /* ignore */ }
}

async function _loadCartPanel(uid) {
  const panel = document.getElementById("panel-cart");
  if (!panel) return;

  panel.innerHTML = `<div style="text-align:center;padding:30px;opacity:0.5">Loading store…</div>`;

  let storeItems = [];
  try { storeItems = await getAllStoreItems(); } catch (e) { /* ignore */ }

  const iStyle = `padding:9px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;font-size:0.86rem`;

  async function render() {
    const cart = getCart();
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const purchases = uid ? await getClientStorePurchases(uid).catch(() => []) : [];

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px">
        <h2 style="color:#0887e2;margin:0">My Cart</h2>
        <button id="cart-goto-store-btn" style="padding:8px 18px;border:1px solid rgba(8,165,226,0.5);border-radius:8px;background:rgba(8,165,226,0.08);color:#0887e2;font-size:0.85rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:Poppins,sans-serif">&#128722; Go to Store</button>
      </div>

      <div class="card" style="margin-bottom:20px;cursor:default">
        <h3 style="margin-bottom:12px">Cart Items</h3>
        ${cart.length === 0
          ? `<p style="opacity:0.55">Your cart is empty. Browse the store below to add items.</p>`
          : cart.map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
              <div style="flex:1">
                <strong>${item.name}</strong>
                <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
                  <button class="cart-dec-btn" data-id="${item.id}" style="padding:2px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:5px;background:transparent;color:inherit;cursor:pointer">−</button>
                  <span style="min-width:22px;text-align:center;font-size:0.84rem">${item.qty}</span>
                  <button class="cart-inc-btn" data-id="${item.id}" style="padding:2px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:5px;background:transparent;color:inherit;cursor:pointer">+</button>
                </div>
              </div>
              <strong style="color:#e96d25">£${(item.price * item.qty).toFixed(2)}</strong>
              <button class="cart-remove-btn" data-id="${item.id}" style="padding:4px 10px;border:1px solid rgba(255,0,51,0.4);border-radius:6px;background:transparent;color:#ff5577;cursor:pointer;font-size:0.75rem">✕</button>
            </div>`).join("")
        }
        ${cart.length > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1)">
            <span style="font-weight:700;font-size:1.05rem">Total: <span style="color:#00c853">£${total.toFixed(2)}</span></span>
            <div style="display:flex;gap:8px">
              <button id="cart-clear-btn" style="padding:8px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:inherit;cursor:pointer;font-size:0.82rem">Clear</button>
              <button id="cart-checkout-btn" style="padding:8px 18px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c853,#009944);color:#fff;cursor:pointer;font-weight:700;font-size:0.88rem">Checkout</button>
            </div>
          </div>
        ` : ""}
      </div>

      <div class="card" style="cursor:default;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <h3 style="margin:0">X-Gym Store</h3>
          <input id="cart-store-search" type="text" placeholder="Search items…" style="${iStyle};min-width:180px">
        </div>
        <div id="cart-store-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>
      </div>

      <div class="card" style="cursor:default;margin-bottom:20px">
        <h3 style="margin:0 0 12px">Purchase History</h3>
        <div id="cart-purchase-history">
          ${!uid
            ? `<p style="opacity:0.55">Sign in to view purchase history.</p>`
            : purchases.length === 0
              ? `<p style="opacity:0.55">No purchases yet.</p>`
              : purchases.slice(0, 20).map(p => `
                  <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
                    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                      <div>
                        <strong style="font-size:0.88rem">${(p.items || []).map(i => `${i.name} × ${i.qty}`).join(', ') || p.summary || 'Purchase'}</strong>
                        <div style="font-size:0.78rem;opacity:0.6;margin-top:3px">${formatDate(p.createdAt)} · ${p.method || 'card'}</div>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="color:#00c853;font-weight:700">£${(Number(p.total) || 0).toFixed(2)}</span>
                        <button class="cart-rebuy-btn" data-id="${p.id}" style="padding:5px 10px;border:1px solid rgba(8,165,226,0.45);border-radius:6px;background:transparent;color:#0887e2;cursor:pointer;font-size:0.76rem">Rebuy</button>
                      </div>
                    </div>
                  </div>
                `).join('')
          }
        </div>
      </div>

      <div id="cart-checkout-form"></div>
    `;

    // Cart actions
    panel.querySelectorAll(".cart-remove-btn").forEach(btn => {
      btn.addEventListener("click", async () => { removeFromCart(btn.dataset.id); await render(); });
    });
    panel.querySelectorAll(".cart-inc-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = cart.find(c => c.id === btn.dataset.id);
        const stockItem = storeItems.find(s => s.id === btn.dataset.id);
        const stock = stockItem && stockItem.stock != null ? Number(stockItem.stock) : null;
        if (stock != null && (item?.qty || 0) >= stock) {
          showToast("No more stock available for this item.", "error");
          return;
        }
        incrementCartItem(btn.dataset.id);
        await render();
      });
    });
    panel.querySelectorAll(".cart-dec-btn").forEach(btn => {
      btn.addEventListener("click", async () => { decrementCartItem(btn.dataset.id); await render(); });
    });

    panel.querySelectorAll(".cart-rebuy-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const purchase = purchases.find(p => p.id === btn.dataset.id);
        if (!purchase || !Array.isArray(purchase.items) || !purchase.items.length) {
          showToast("Nothing to rebuy from this order.", "error");
          return;
        }

        let addedAny = false;
        purchase.items.forEach(pi => {
          const match = storeItems.find(s => s.id === pi.id);
          if (!match) return;
          const stock = match.stock != null ? Number(match.stock) : null;
          const inCart = getCart().find(c => c.id === match.id);
          const already = inCart ? (inCart.qty || 0) : 0;
          const targetQty = Number(pi.qty) || 1;
          const allowed = stock == null ? targetQty : Math.max(0, Math.min(targetQty, stock - already));
          for (let i = 0; i < allowed; i++) {
            addToCart({ id: match.id, name: match.name, price: Number(match.price) || 0 });
            addedAny = true;
          }
        });

        showToast(addedAny ? "Items added to cart from purchase history." : "No stock available to rebuy these items.", addedAny ? "success" : "error");
        await render();
      });
    });

    const clearBtn = document.getElementById("cart-clear-btn");
    if (clearBtn) clearBtn.addEventListener("click", async () => { clearCart(); await render(); });

    const gotoStoreBtn = document.getElementById("cart-goto-store-btn");
    if (gotoStoreBtn) gotoStoreBtn.addEventListener("click", () => _openStore(uid));

    // Checkout
    const checkoutBtn = document.getElementById("cart-checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", async () => {
        const cf = document.getElementById("cart-checkout-form");
        let savedCards = [];
        if (uid) { try { savedCards = await getPaymentCards(uid); } catch (e) { /* no cards */ } }
        const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0] || null;

        cf.innerHTML = `
          <div class="card" style="cursor:default">
            <h3 style="margin-bottom:10px">Checkout — £${total.toFixed(2)}</h3>
            ${defaultCard ? `
              <div style="margin-bottom:12px;padding:10px 14px;border-radius:8px;background:rgba(8,165,226,0.08);border:1px solid rgba(8,165,226,0.3)">
                <div style="font-size:0.82rem;opacity:0.65;margin-bottom:2px">Using saved card:</div>
                <strong>${defaultCard.cardHolder} — •••• ${defaultCard.last4} (${defaultCard.expiry})</strong>
                <div style="margin-top:6px"><label style="font-size:0.8rem;cursor:pointer"><input type="checkbox" id="cart-use-new"> Use a different card</label></div>
              </div>
            ` : ""}
            <div id="cart-new-card-section" style="${defaultCard ? "display:none" : ""}">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <input id="cart-cholder" type="text" placeholder="Cardholder Name" style="${iStyle}">
                <input id="cart-cnum" type="text" placeholder="Card Number" style="${iStyle}" maxlength="19">
                <input id="cart-cexp" type="text" placeholder="MM/YY" style="${iStyle}" maxlength="5">
                <input id="cart-ccvc" type="password" placeholder="CVC" style="${iStyle}" maxlength="4">
              </div>
              ${uid ? `<label style="font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:6px;margin-bottom:10px"><input type="checkbox" id="cart-save-card"> Save card for future purchases</label>` : ""}
            </div>
            <div style="display:flex;gap:10px">
              <button id="cart-pay-btn" style="padding:9px 22px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c853,#009944);color:#fff;cursor:pointer;font-weight:700">Pay Now</button>
              <button id="cart-pay-cancel" style="padding:9px 16px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:inherit;cursor:pointer">Cancel</button>
            </div>
          </div>
        `;
        cf.scrollIntoView({ behavior: "smooth" });

        if (defaultCard) {
          document.getElementById("cart-use-new").addEventListener("change", e => {
            document.getElementById("cart-new-card-section").style.display = e.target.checked ? "block" : "none";
          });
        }
        const cn = document.getElementById("cart-cnum");
        if (cn) cn.addEventListener("input", () => { let v = cn.value.replace(/\D/g,"").slice(0,16); cn.value = v.replace(/(.{4})/g,"$1 ").trim(); });
        const ce = document.getElementById("cart-cexp");
        if (ce) ce.addEventListener("input", () => { let v = ce.value.replace(/\D/g,"").slice(0,4); if(v.length>=3) v=v.slice(0,2)+"/"+v.slice(2); ce.value=v; });

        document.getElementById("cart-pay-cancel").addEventListener("click", () => { cf.innerHTML = ""; });
        document.getElementById("cart-pay-btn").addEventListener("click", async () => {
          const payBtn = document.getElementById("cart-pay-btn");
          const useNewCard = !defaultCard || (document.getElementById("cart-use-new")?.checked);
          let cardNum, cardHolder, cardExp;

          if (useNewCard) {
            cardHolder = (document.getElementById("cart-cholder")?.value || "").trim();
            cardNum    = (document.getElementById("cart-cnum")?.value || "").replace(/\s+/g,"");
            cardExp    = (document.getElementById("cart-cexp")?.value || "").trim();
            const cardCvc = (document.getElementById("cart-ccvc")?.value || "").trim();
            if (!cardHolder || cardNum.length < 12 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExp) || !/^\d{3,4}$/.test(cardCvc)) {
              showToast("Please enter valid card details.", "error"); return;
            }
          } else {
            cardNum    = defaultCard.cardNumber;
            cardHolder = defaultCard.cardHolder;
            cardExp    = defaultCard.expiry;
          }

          if (payBtn.disabled) return;
          payBtn.disabled = true; payBtn.textContent = "Processing…";

          try {
            const latestCart = getCart();
            const totalNow = latestCart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
            const stockErrors = [];
            latestCart.forEach(ci => {
              const si = storeItems.find(s => s.id === ci.id);
              if (si && si.stock != null && (ci.qty || 0) > Number(si.stock)) {
                stockErrors.push(`${ci.name} (requested ${ci.qty}, stock ${si.stock})`);
              }
            });
            if (stockErrors.length) {
              throw new Error("Not enough stock: " + stockErrors.join(", "));
            }

            if (useNewCard && uid && document.getElementById("cart-save-card")?.checked) {
              const newId = await savePaymentCard(uid, { cardHolder, cardNumber: cardNum, last4: cardNum.slice(-4), expiry: cardExp, isDefault: savedCards.length === 0 });
              if (savedCards.length === 0) await setDefaultCard(uid, newId);
            }

            for (const ci of latestCart) {
              const si = storeItems.find(s => s.id === ci.id);
              if (si && si.stock != null) {
                const newStock = Math.max(0, Number(si.stock) - (ci.qty || 0));
                await updateStoreItem(si.id, { stock: newStock });
                si.stock = newStock;
              }
            }

            await recordTransaction({
              type: "store_purchase",
              amount: totalNow,
              description: "Cart purchase: " + latestCart.map(i => `${i.name} x${i.qty}`).join(", "),
              category: "store"
            });

            if (uid) {
              await createStorePurchase(uid, {
                total: totalNow,
                method: useNewCard ? "card" : (defaultCard ? "saved_card" : "card"),
                items: latestCart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: Number(i.price) || 0 })),
                summary: latestCart.map(i => `${i.name} × ${i.qty}`).join(", ")
              });
            }

            clearCart();
            showToast(`Payment successful! Total: £${totalNow.toFixed(2)}`, "success");
            await render();
          } catch (e) {
            showToast(e.message, "error");
            const pb = document.getElementById("cart-pay-btn");
            if (pb) { pb.disabled = false; pb.textContent = "Pay Now"; }
          }
        });
      });
    }

    // Store grid
    function renderStore(q) {
      const grid = document.getElementById("cart-store-grid");
      if (!grid) return;
      const filtered = storeItems.filter(i => {
        if (!q) return true;
        return [i.name || "", i.description || "", i.category || ""].join(" ").toLowerCase().includes(q.toLowerCase());
      });
      if (!filtered.length) {
        grid.innerHTML = `<p style="opacity:0.55;grid-column:1/-1">No items found${q ? ' for "' + q + '"' : ""}.</p>`;
        return;
      }
      grid.innerHTML = filtered.map(item => `
        <div class="card" style="cursor:default;display:flex;flex-direction:column;gap:8px;padding:16px">
          <div style="font-size:0.72rem;opacity:0.55;text-transform:uppercase;letter-spacing:1px">${item.category || "General"}</div>
          <strong style="font-size:0.95rem">${item.name}</strong>
          <p style="font-size:0.82rem;opacity:0.7;margin:0;flex:1">${item.description || ""}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
            <span style="font-weight:700;color:#00c853;font-size:1.05rem">£${(item.price || 0).toFixed(2)}</span>
            <span style="font-size:0.78rem;opacity:0.55">${item.stock != null ? "Stock: " + item.stock : ""}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="cart-qty-dec" data-id="${item.id}" style="padding:3px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:transparent;color:inherit;cursor:pointer">−</button>
            <span id="cart-qty-${item.id}" style="min-width:22px;text-align:center;font-size:0.84rem">1</span>
            <button class="cart-qty-inc" data-id="${item.id}" style="padding:3px 8px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:transparent;color:inherit;cursor:pointer">+</button>
          </div>
          <button class="cart-add-item-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price || 0}" ${item.stock != null && Number(item.stock) <= 0 ? "disabled" : ""}
            style="padding:7px;border:none;border-radius:8px;background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;font-size:0.83rem;font-weight:600">
            ${item.stock != null && Number(item.stock) <= 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      `).join("");

      const qtyMap = {};
      filtered.forEach(i => { qtyMap[i.id] = 1; });

      grid.querySelectorAll(".cart-qty-inc").forEach(btn => {
        btn.addEventListener("click", () => {
          const item = filtered.find(i => i.id === btn.dataset.id);
          if (!item) return;
          const current = qtyMap[item.id] || 1;
          const stock = item.stock != null ? Number(item.stock) : null;
          const maxAllowed = stock == null ? current + 1 : Math.max(1, stock);
          qtyMap[item.id] = Math.min(current + 1, maxAllowed);
          const qtyEl = document.getElementById("cart-qty-" + item.id);
          if (qtyEl) qtyEl.textContent = String(qtyMap[item.id]);
        });
      });
      grid.querySelectorAll(".cart-qty-dec").forEach(btn => {
        btn.addEventListener("click", () => {
          const item = filtered.find(i => i.id === btn.dataset.id);
          if (!item) return;
          const current = qtyMap[item.id] || 1;
          qtyMap[item.id] = Math.max(1, current - 1);
          const qtyEl = document.getElementById("cart-qty-" + item.id);
          if (qtyEl) qtyEl.textContent = String(qtyMap[item.id]);
        });
      });

      grid.querySelectorAll(".cart-add-item-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const stockItem = filtered.find(i => i.id === btn.dataset.id);
          const stock = stockItem && stockItem.stock != null ? Number(stockItem.stock) : null;
          const desired = qtyMap[btn.dataset.id] || 1;
          const inCart = getCart().find(c => c.id === btn.dataset.id);
          const already = inCart ? (inCart.qty || 0) : 0;
          const allowed = stock == null ? desired : Math.max(0, Math.min(desired, stock - already));
          if (allowed <= 0) {
            showToast("No stock left for this item.", "error");
            return;
          }
          for (let i = 0; i < allowed; i++) {
            addToCart({ id: btn.dataset.id, name: btn.dataset.name, price: parseFloat(btn.dataset.price) || 0 });
          }
          showToast(btn.dataset.name + " added to cart!", "success");
          await render();
        });
      });
    }

    const searchEl = document.getElementById("cart-store-search");
    if (searchEl) searchEl.addEventListener("input", e => renderStore(e.target.value));
    renderStore("");
  }

  render();
}

// --------------------------------------------------------
// Card Wallet UI — reusable card management panel
// --------------------------------------------------------
async function _loadCardWalletPanel(uid, container) {
  if (!container) return;

  const iStyle = `width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;font-size:0.88rem`;

  function cardBrand(num) {
    if (!num) return "Card";
    if (/^4/.test(num)) return "Visa";
    if (/^5[1-5]/.test(num)) return "Mastercard";
    if (/^3[47]/.test(num)) return "Amex";
    return "Card";
  }

  async function render() {
    let cards = [];
    try { cards = await getPaymentCards(uid); } catch (e) { /* no cards */ }

    container.innerHTML = `
      <div class="card" style="cursor:default">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="margin:0">&#128179; Payment Cards</h3>
          <button id="cwp-add-toggle" style="padding:7px 16px;border:none;border-radius:8px;background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;font-size:0.85rem;font-weight:600">+ Add Card</button>
        </div>

        <div id="cwp-add-form" style="display:none;margin-bottom:16px;padding:14px;border:1px solid rgba(8,165,226,0.25);border-radius:10px;background:rgba(8,165,226,0.04)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <input id="cwp-holder" type="text" placeholder="Cardholder Name" style="${iStyle}">
            <input id="cwp-num" type="text" placeholder="Card Number" maxlength="19" style="${iStyle}">
            <input id="cwp-exp" type="text" placeholder="MM/YY" maxlength="5" style="${iStyle}">
            <input id="cwp-cvc" type="password" placeholder="CVC" maxlength="4" style="${iStyle}">
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;opacity:0.8;cursor:pointer;margin-bottom:10px">
            <input id="cwp-set-default" type="checkbox"> Set as default card
          </label>
          <div style="display:flex;gap:8px">
            <button id="cwp-save-btn" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c853,#009944);color:#fff;cursor:pointer;font-weight:600;font-size:0.88rem">Save Card</button>
            <button id="cwp-cancel-add" style="padding:8px 16px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:transparent;color:inherit;cursor:pointer;font-size:0.88rem">Cancel</button>
          </div>
        </div>

        ${cards.length === 0
          ? `<p style="opacity:0.55;font-size:0.9rem">No payment cards saved yet.</p>`
          : `<div style="display:grid;gap:10px">${cards.map(c => `
              <div class="cwp-card-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid ${c.isDefault ? "rgba(8,165,226,0.5)" : "rgba(255,255,255,0.08)"}">
                <div>
                  <div style="font-weight:700;font-size:0.95rem">${cardBrand(c.cardNumber)} •••• ${c.last4 || (c.cardNumber || "").slice(-4)}</div>
                  <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">${c.cardHolder} · Expires ${c.expiry}${c.isDefault ? ' <span style="color:#0887e2;font-weight:700">· DEFAULT</span>' : ""}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  ${!c.isDefault ? `<button class="cwp-default-btn" data-id="${c.id}" style="padding:5px 12px;border:1px solid rgba(8,165,226,0.4);border-radius:6px;background:transparent;color:#0887e2;cursor:pointer;font-size:0.75rem">Set Default</button>` : ""}
                  <button class="cwp-remove-btn" data-id="${c.id}" style="padding:5px 12px;border:1px solid rgba(255,0,51,0.4);border-radius:6px;background:transparent;color:#ff5577;cursor:pointer;font-size:0.75rem">Remove</button>
                </div>
              </div>`).join("")}
            </div>`
        }
      </div>
    `;

    document.getElementById("cwp-add-toggle").addEventListener("click", () => {
      const form = document.getElementById("cwp-add-form");
      form.style.display = form.style.display === "none" ? "block" : "none";
    });
    document.getElementById("cwp-cancel-add").addEventListener("click", () => {
      document.getElementById("cwp-add-form").style.display = "none";
    });

    const numEl = document.getElementById("cwp-num");
    numEl.addEventListener("input", () => {
      let v = numEl.value.replace(/\D/g, "").slice(0, 16);
      numEl.value = v.replace(/(.{4})/g, "$1 ").trim();
    });
    const expEl = document.getElementById("cwp-exp");
    expEl.addEventListener("input", () => {
      let v = expEl.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
      expEl.value = v;
    });

    document.getElementById("cwp-save-btn").addEventListener("click", async () => {
      const holder = document.getElementById("cwp-holder").value.trim();
      const raw    = document.getElementById("cwp-num").value.replace(/\s+/g, "");
      const exp    = document.getElementById("cwp-exp").value.trim();
      const cvc    = document.getElementById("cwp-cvc").value.trim();
      if (!holder || raw.length < 12 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp) || !/^\d{3,4}$/.test(cvc)) {
        showToast("Please fill in valid card details.", "error"); return;
      }
      const saveBtn = document.getElementById("cwp-save-btn");
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      try {
        const makeDefault = document.getElementById("cwp-set-default").checked || cards.length === 0;
        const newId = await savePaymentCard(uid, { cardHolder: holder, cardNumber: raw, last4: raw.slice(-4), expiry: exp, isDefault: makeDefault });
        if (makeDefault) await setDefaultCard(uid, newId);
        showToast("Card saved!", "success");
        render();
      } catch (e) {
        showToast(e.message, "error");
        saveBtn.disabled = false; saveBtn.textContent = "Save Card";
      }
    });

    container.querySelectorAll(".cwp-remove-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await removePaymentCard(uid, btn.dataset.id);
          showToast("Card removed.", "info");
          render();
        } catch (e) { showToast(e.message, "error"); btn.disabled = false; }
      });
    });
    container.querySelectorAll(".cwp-default-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await setDefaultCard(uid, btn.dataset.id);
          showToast("Default card updated.", "success");
          render();
        } catch (e) { showToast(e.message, "error"); btn.disabled = false; }
      });
    });
  }

  render();
}

function _loadSettingsPanel(uid) {
  const panel = document.getElementById("panel-settings");
  if (!panel) return;
  panel.innerHTML = `
    <h2 style="color:#0887e2">Settings</h2>
    <p style="opacity:0.65;margin-bottom:20px">Manage your payment methods and account preferences.</p>
    <div id="settings-cards-container"></div>
    <div id="settings-payment-history" style="margin-top:24px"></div>
  `;
  _loadCardWalletPanel(uid, document.getElementById("settings-cards-container"));
  _loadClientPaymentHistoryPanel(uid, document.getElementById("settings-payment-history"));
}

async function _loadClientPaymentHistoryPanel(uid, container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card" style="cursor:default">
      <h3 style="margin-bottom:4px">&#128196; Payment History</h3>
      <p style="opacity:0.55;font-size:0.84rem;margin-bottom:16px">All membership and store purchases.</p>
      <div style="text-align:center;padding:20px;opacity:0.45">Loading…</div>
    </div>`;

  const money = n => `£${(Number(n) || 0).toFixed(2)}`;

  try {
    const [membershipPaymentsRaw, storePurchases] = await Promise.all([
      getClientMembershipPayments(uid).catch(() => []),
      getClientStorePurchases(uid).catch(() => [])
    ]);

    // Already scoped to this client by getClientMembershipPayments
    const membershipPayments = membershipPaymentsRaw
      .map(p => ({
        _source:  "membership",
        _date:    p.createdAt || 0,
        amount:   Number(p.amount) || 0,
        label:    p.planName || p.membershipType || "Membership",
        sublabel: p.paymentReason === "upgrade_difference" ? "Upgrade"
                : p.paymentReason === "cancel_refund"      ? "Refund"
                : "New membership",
        method:   p.method || "card",
        maskedCard: p.maskedCard || "",
        raw: p
      }));

    // Normalise store purchases
    const storeEntries = storePurchases.map(p => ({
      _source:  "store",
      _date:    p.createdAt || 0,
      amount:   Number(p.total) || 0,
      label:    p.summary || (p.items || []).map(i => `${i.name} ×${i.qty}`).join(", ") || "Store purchase",
      sublabel: "Cart purchase",
      method:   p.method || "card",
      maskedCard: "",
      raw: p
    }));

    const all = [...membershipPayments, ...storeEntries]
      .sort((a, b) => b._date - a._date);

    const SOURCE_ICON  = { membership: "🏋️", store: "🛒" };
    const SOURCE_COLOR = { membership: "#0887e2", store: "#e96d25" };

    container.innerHTML = `
      <div class="card" style="cursor:default">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          <div>
            <h3 style="margin:0">&#128196; Payment History</h3>
            <p style="opacity:0.55;font-size:0.82rem;margin:4px 0 0">All membership and store purchases — ${all.length} record${all.length !== 1 ? "s" : ""}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="sph-filter-btns">
            <button class="sph-filter" data-filter="all"        style="padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);background:rgba(8,165,226,0.2);color:inherit;cursor:pointer;font-size:0.8rem">All</button>
            <button class="sph-filter" data-filter="membership" style="padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:inherit;cursor:pointer;font-size:0.8rem">🏋️ Membership</button>
            <button class="sph-filter" data-filter="store"      style="padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:inherit;cursor:pointer;font-size:0.8rem">🛒 Store</button>
          </div>
        </div>
        <div id="sph-list"></div>
      </div>`;

    function renderList(filter) {
      const list = document.getElementById("sph-list");
      if (!list) return;
      const filtered = filter === "all" ? all : all.filter(e => e._source === filter);
      if (!filtered.length) {
        list.innerHTML = `<p style="opacity:0.55;font-size:0.9rem">No ${filter === "all" ? "" : filter + " "}payments found.</p>`;
        return;
      }
      list.innerHTML = filtered.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
          <div style="display:flex;gap:12px;align-items:flex-start;min-width:0">
            <div style="font-size:1.3rem;line-height:1;margin-top:2px">${SOURCE_ICON[e._source]}</div>
            <div style="min-width:0">
              <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px">${e.label}</div>
              <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">
                <span style="color:${SOURCE_COLOR[e._source]}">${e.sublabel}</span>
                &nbsp;·&nbsp;${e.method}${e.maskedCard ? " · " + e.maskedCard : ""}
              </div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:1rem;color:${e._source === "membership" && e.raw.paymentReason === "cancel_refund" ? "#00c853" : "#e96d25"}">${money(e.amount)}</div>
            <div style="font-size:0.76rem;opacity:0.5;margin-top:2px">${e._date ? formatDate(e._date) : "—"}</div>
          </div>
        </div>`).join("");
    }

    let activeFilter = "all";
    renderList(activeFilter);

    container.querySelectorAll(".sph-filter").forEach(btn => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        container.querySelectorAll(".sph-filter").forEach(b => {
          b.style.background = b.dataset.filter === activeFilter ? "rgba(8,165,226,0.2)" : "transparent";
        });
        renderList(activeFilter);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="card" style="cursor:default"><h3>Payment History</h3><p style="color:#ff0033">${err.message}</p></div>`;
  }
}

// --------------------------------------------------------
// Client Booking Panel — card grid with day filters & capacity bars
// --------------------------------------------------------
async function _loadClientBookingPanel(clientId, clientName, opts = {}) {
  const panel = document.getElementById("panel-booking");
  if (!panel) return;

  // In silent mode (called after booking/cancel) we do NOT blank the panel —
  // we let the existing content sit while we fetch, then swap in fresh content.
  if (!opts.silent) {
    panel.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5">Loading schedule…</div>`;
  }

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const CLASS_TYPES = ["All Types","General","Strength","Cardio","HIIT","Yoga","Pilates","Boxing","Cycling","Stretching","CrossFit"];
  const TYPE_COLORS = {
    "Strength":"#e96d25","Cardio":"#ff0033","HIIT":"#ff6b00","Yoga":"#7c4dff",
    "Pilates":"#e91e63","Boxing":"#f44336","Cycling":"#0887e2","Stretching":"#00bcd4",
    "CrossFit":"#ff5722","General":"#00c853"
  };

  let classes, linkedTrainerIds;
  try {
    [classes, linkedTrainerIds] = await Promise.all([
      getClasses(), getClientLinkedTrainerIds(clientId)
    ]);
  } catch(e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Book Classes</h2><p style="color:#ff0033">${e.message}</p>`;
    return;
  }

  if (!Array.isArray(classes)) classes = [];
  if (!Array.isArray(linkedTrainerIds)) linkedTrainerIds = [];

  const linkedSet = new Set(linkedTrainerIds);

  // Build bookings by reading each class's participant entry for this client.
  const bookings = (await Promise.all(
    classes.map(async c => {
      const snap = await db.ref("classes/" + c.id + "/participants/" + clientId).once("value").catch(() => null);
      if (!snap || !snap.exists()) return null;
      const data = snap.val() || {};
      return { id: data.bookingId || ("_" + c.id), classId: c.id, className: c.name, day: c.day, time: c.time, trainerName: c.trainerName };
    })
  )).filter(Boolean);
  const bookedClassIds = new Set(bookings.map(b => b.classId));

  // Resolve hired trainer names so we can still show a useful section
  // even when those trainers have not created classes yet.
  const linkedTrainerProfiles = await Promise.all(
    linkedTrainerIds.map(async tid => {
      const snap = await db.ref("users/" + tid).once("value").catch(() => null);
      return snap && snap.exists() ? { id: tid, ...(snap.val() || {}) } : { id: tid, name: "Trainer" };
    })
  );
  const normalizeTrainerName = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const linkedNames = linkedTrainerProfiles
    .map(t => normalizeTrainerName(t && t.name))
    .filter(Boolean);
  const linkedNameSet = new Set(linkedNames);
  function nameMatchesLinked(nameValue) {
    const n = normalizeTrainerName(nameValue);
    if (!n) return false;
    if (linkedNameSet.has(n)) return true;
    return linkedNames.some(ln => ln && (ln.includes(n) || n.includes(ln)));
  }

  // Build a trainerId -> normalized trainer name map from users,
  // so classes still match even if class.trainerName is empty/stale.
  const classTrainerIds = [...new Set(classes.map(c => c && c.trainerId).filter(Boolean))];
  const classTrainerNameMap = {};
  await Promise.all(classTrainerIds.map(async tid => {
    const snap = await db.ref("users/" + tid).once("value").catch(() => null);
    const name = snap && snap.exists() ? (snap.val() || {}).name : "";
    classTrainerNameMap[tid] = normalizeTrainerName(name);
  }));

  function isLinkedTrainerClass(c) {
    const byId = linkedSet.has(c.trainerId);
    const byClassName = nameMatchesLinked(c.trainerName);
    const byResolvedUserName = nameMatchesLinked(classTrainerNameMap[c.trainerId] || "");
    return byId || byClassName || byResolvedUserName;
  }

  // Fetch all booking counts in parallel
  const countEntries = await Promise.all(
    classes.map(c => getClassBookingCount(c.id).then(n => [c.id, n]))
  );
  const counts = Object.fromEntries(countEntries);

  // Pre-load waitlist position for all classes
  const waitlistPositions = {}; // classId -> position (1-based) or 0 if not on waitlist
  await Promise.all(classes.map(async c => {
    try {
      const wl = await getWaitlist(c.id);
      const idx = wl.findIndex(w => w.clientId === clientId);
      waitlistPositions[c.id] = idx >= 0 ? idx + 1 : 0;
    } catch(_) { waitlistPositions[c.id] = 0; }
  }));

  // Fetch trainer classes DIRECTLY from Firebase by trainerId — most reliable approach.
  // This bypasses all ID-matching logic and guarantees we get the trainer's actual classes.
  let trainerClasses = [];
  if (linkedTrainerIds.length) {
    const perTrainer = await Promise.all(
      linkedTrainerIds.map(tid => getTrainerClasses(tid).catch(() => []))
    );
    const seenIds = new Set();
    for (const arr of perTrainer) {
      for (const c of arr) {
        if (c && c.id && !seenIds.has(c.id)) {
          seenIds.add(c.id);
          trainerClasses.push(c);
        }
      }
    }
    trainerClasses.sort((a, b) => {
      const di = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return di !== 0 ? di : (a.time || "").localeCompare(b.time || "");
    });

    // Trainer classes are NOT returned by getClasses() so their participant entries
    // were never checked in the bookings array above. Fix that now.
    const tcBookings = (await Promise.all(
      trainerClasses.filter(c => !classes.some(gc => gc.id === c.id)).map(async c => {
        try {
          const snap = await db.ref("classes/" + c.id + "/participants/" + clientId).once("value");
          if (!snap || !snap.exists()) return null;
          const data = snap.val() || {};
          return { id: data.bookingId || ("_" + c.id), classId: c.id, className: c.name, day: c.day, time: c.time, trainerName: c.trainerName };
        } catch(_) { return null; }
      })
    )).filter(Boolean);
    for (const b of tcBookings) {
      bookings.push(b);
      bookedClassIds.add(b.classId);
    }
    // Also count trainer classes
    await Promise.all(
      trainerClasses.filter(c => !counts[c.id]).map(async c => {
        counts[c.id] = await getClassBookingCount(c.id).catch(() => 0);
      })
    );
  }
  // Build a set of trainer class IDs so isVisible can use it without ID-matching guesswork
  const trainerClassIds = new Set(trainerClasses.map(c => c.id));

  const visibleClasses = classes.filter(c => {
    if (trainerClassIds.has(c.id)) return true;       // linked trainer's class — always show
    if (isLinkedTrainerClass(c)) return true;          // backup: ID/name match
    if (!c.source || c.source === "admin") return true; // global/admin class
    return false;                                       // trainer-private, not linked
  });
  const activeDays = DAYS.filter(d => visibleClasses.some(c => c.day === d));

  function classCard(c, isTrainerClass) {
    const booked = counts[c.id] || 0;
    const cap = c.capacity || 20;
    const pct = Math.min((booked / cap) * 100, 100);
    const full = pct >= 100;
    const isBooked = bookedClassIds.has(c.id);
    const barColor = pct >= 90 ? "#ff0033" : pct >= 60 ? "#e96d25" : "#00c853";
    const typeColor = TYPE_COLORS[c.type] || "#00c853";
    const bookingId = isBooked ? ((bookings.find(b => b.classId === c.id) || {}).id || "") : "";
    const badge = isBooked
      ? `<span style="background:rgba(8,135,226,0.15);color:#0887e2;padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700">✓ BOOKED</span>`
      : full
        ? `<span style="background:rgba(255,0,51,0.12);color:#ff0033;padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700">FULL</span>`
        : `<span style="background:rgba(0,200,80,0.1);color:#00c853;padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700">${cap - booked} open</span>`;
    const btnGrad = isTrainerClass ? "135deg,#7c4dff,#4c00d9" : "90deg,#0887e2,#006af5";
    const waitlistPos = waitlistPositions[c.id] || 0;
    const action = isBooked
      ? `<button class="cb-cancel-class-btn" data-id="${bookingId}"
          style="padding:7px;border:1px solid rgba(255,0,51,0.35);border-radius:6px;background:transparent;
          color:#ff0033;cursor:pointer;font-size:0.8rem;font-weight:600;width:100%;transition:0.2s">Cancel Booking</button>`
      : full && waitlistPos > 0
        ? `<button disabled style="padding:7px;border:none;border-radius:6px;background:rgba(233,109,37,0.12);
            color:#e96d25;font-size:0.8rem;width:100%;cursor:not-allowed">⏳ Waitlist Position #${waitlistPos}</button>`
      : full
        ? `<button class="cb-join-waitlist-btn" data-id="${c.id}" data-name="${c.name}"
            style="padding:7px;border:1px solid rgba(233,109,37,0.4);border-radius:6px;background:transparent;
            color:#e96d25;cursor:pointer;font-size:0.8rem;font-weight:600;width:100%;transition:0.2s">⏳ Join Waitlist</button>`
        : `<button class="cb-book-btn" data-id="${c.id}"
            style="padding:7px;border:none;border-radius:6px;background:linear-gradient(${btnGrad});
            color:#fff;cursor:pointer;font-size:0.8rem;font-weight:600;width:100%;transition:0.2s">Book Now</button>`;
    const trainerBorder = isTrainerClass ? "border:1px solid rgba(124,77,255,0.25);" : "";
    const trainerBadge = isTrainerClass
      ? `<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(124,77,255,0.12);
          border:1px solid rgba(124,77,255,0.3);border-radius:6px;padding:3px 9px;font-size:0.75rem;
          color:#b39ddb;font-weight:600;margin-bottom:6px">
          ★ ${c.trainerName || "Trainer"}
        </div>`
      : `<div style="font-size:0.78rem;opacity:0.7;margin-bottom:4px">
          👤 <span style="color:#0887e2;font-weight:600">${c.trainerName || "TBA"}</span>
        </div>`;
    return `
      <div class="card" style="display:flex;flex-direction:column;gap:10px;padding:16px;cursor:default;
        border-top:3px solid ${typeColor};${trainerBorder}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            ${trainerBadge}
            <strong style="font-size:0.95rem;display:block;margin-bottom:4px">${c.name}</strong>
            <span style="background:${typeColor}22;color:${typeColor};padding:1px 7px;border-radius:5px;font-size:0.68rem;font-weight:600">${c.type || "General"}</span>
          </div>
          ${badge}
        </div>
        <div style="font-size:0.82rem;opacity:0.65;display:flex;flex-direction:column;gap:3px">
          <span>🕐 ${c.time}${c.duration ? " · " + c.duration + " min" : ""}
            ${c.day ? ` &nbsp;·&nbsp; 📅 ${c.day}` : ""}</span>
          ${c.location ? "<span>📍 " + c.location + "</span>" : ""}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;opacity:0.5;margin-bottom:4px">
            <span>Capacity</span><span>${booked}/${cap}</span>
          </div>
          <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:5px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.5s"></div>
          </div>
        </div>
        ${action}
      </div>`;
  }

  function buildCards(filterDay, filterText, filterType) {
    const days = filterDay === "All" ? activeDays : (activeDays.includes(filterDay) ? [filterDay] : []);
    let html = "";
    for (const day of days) {
      let dayClasses = visibleClasses.filter(c => c.day === day);
      if (filterText) {
        const q = filterText.toLowerCase();
        dayClasses = dayClasses.filter(c =>
          c.name.toLowerCase().includes(q) || (c.trainerName || "").toLowerCase().includes(q) ||
          (c.type || "").toLowerCase().includes(q));
      }
      if (filterType && filterType !== "All Types") dayClasses = dayClasses.filter(c => c.type === filterType);
      if (!dayClasses.length) continue;
      html += `<div style="margin-bottom:24px">
        <h3 style="font-family:Orbitron,sans-serif;font-size:0.78rem;letter-spacing:2px;color:#0887e2;
          margin:0 0 12px;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid rgba(8,165,226,0.15)">${day}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
          ${dayClasses.map(c => classCard(c, isLinkedTrainerClass(c))).join("")}
        </div></div>`;
    }
    if (!html) html = `<div class="card" style="text-align:center;padding:40px;opacity:0.5">No classes found.</div>`;
    return html;
  }

  const trainerNames = linkedTrainerProfiles
    .map(t => (t && t.name ? t.name : "Trainer"))
    .filter(Boolean);

  const trainerSectionHtml = linkedTrainerIds.length ? `
    <div style="margin-bottom:28px" id="cb-trainer-section">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:4px;height:24px;background:linear-gradient(180deg,#7c4dff,#0887e2);border-radius:2px"></div>
        <h3 style="margin:0;font-size:0.95rem;color:#b39ddb">
          ★ Your Trainer's Classes
          <span style="font-size:0.78rem;font-weight:400;opacity:0.6;margin-left:8px">— Recommended for you</span>
        </h3>
      </div>
      <div id="cb-trainer-cards" style="${trainerClasses.length ? "display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px" : ""}">
        ${trainerClasses.length ? trainerClasses.map(c => classCard(c, true)).join("") : `
        <div class="card" style="padding:18px;border:1px dashed rgba(124,77,255,0.4)">
          <strong style="display:block;margin-bottom:6px;color:#d1c4e9">No classes from your hired trainers yet</strong>
          <p style="opacity:0.72;margin:0;font-size:0.84rem">
            Hired trainers: ${trainerNames.length ? trainerNames.join(", ") : "Trainer"}. Ask them to publish classes and they will appear here.
          </p>
        </div>`}
      </div>
    </div>` : "";

  const dayPills = ["All", ...activeDays].map(d =>
    `<button class="cb-day-pill" data-day="${d}"
      style="padding:5px 14px;border-radius:16px;border:1px solid rgba(8,165,226,${d === "All" ? "0.5" : "0.2"});
      background:${d === "All" ? "rgba(8,135,226,0.15)" : "transparent"};color:inherit;cursor:pointer;
      font-family:inherit;font-size:0.78rem;transition:0.2s;white-space:nowrap">${d}</button>`
  ).join("");

  const typePills = CLASS_TYPES.map(t =>
    `<button class="cb-type-pill" data-type="${t}"
      style="padding:5px 14px;border-radius:16px;border:1px solid rgba(255,255,255,${t === "All Types" ? "0.25" : "0.1"});
      background:${t === "All Types" ? "rgba(255,255,255,0.08)" : "transparent"};color:inherit;cursor:pointer;
      font-family:inherit;font-size:0.78rem;transition:0.2s;white-space:nowrap">${t}</button>`
  ).join("");

  function renderMyBookings() {
    return bookings.length
      ? bookings.map(b => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;
            border-radius:10px;border:1px solid rgba(8,165,226,0.12);background:rgba(8,165,226,0.04);margin-bottom:10px;gap:12px">
            <div>
              <strong style="font-size:0.92rem">${b.className || "Class"}</strong>
              <div style="font-size:0.8rem;opacity:0.6;margin-top:3px">
                📅 ${b.day || "—"} &nbsp;·&nbsp; 🕐 ${b.time || "—"} &nbsp;·&nbsp;
                👤 <span style="color:#0887e2">${b.trainerName || "—"}</span>
              </div>
            </div>
            <button class="cb-cancel-btn" data-id="${b.id}"
              style="flex-shrink:0;padding:6px 14px;border:1px solid rgba(255,0,51,0.35);border-radius:6px;
              background:transparent;color:#ff0033;cursor:pointer;font-size:0.78rem;font-weight:600;transition:0.2s">Cancel</button>
          </div>`).join("")
      : `<p style="opacity:0.5;text-align:center;padding:20px">You haven't booked any classes yet.</p>`;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <h2 style="color:#0887e2;margin:0">Book Classes</h2>
      <input id="cb-search" type="text" placeholder="🔍 Search classes, trainers…"
        style="padding:9px 16px;border-radius:20px;border:1px solid rgba(8,165,226,0.25);
        background:rgba(8,165,226,0.06);color:inherit;font-family:inherit;font-size:0.88rem;width:220px">
    </div>

    ${trainerSectionHtml}

    <div style="margin-bottom:14px">
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${dayPills}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${typePills}</div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:24px">
      <div id="cb-schedule">${buildCards("All", "", "All Types")}</div>
    </div>

    <div class="card" style="padding:20px">
      <h3 style="margin:0 0 16px">My Bookings
        <span id="cb-bookings-count" style="font-size:0.8rem;font-weight:400;opacity:0.55;font-family:'Exo 2',sans-serif">(${bookings.length})</span>
      </h3>
      <div id="cb-my-bookings">${renderMyBookings()}</div>
    </div>`;

  let activeDay = "All", activeSearch = "", activeType = "All Types";

  function refresh() {
    document.getElementById("cb-schedule").innerHTML = buildCards(activeDay, activeSearch, activeType);
    // Also re-render the trainer cards section so booked state updates there too
    const trainerCardsEl = document.getElementById("cb-trainer-cards");
    if (trainerCardsEl && trainerClasses.length) {
      trainerCardsEl.innerHTML = trainerClasses.map(c => classCard(c, true)).join("");
    }
    bindButtons();
  }

  function bindButtons() {
    // Define cancelHandler first — referenced by both cancel button types and syncMyBookingsUI
    function cancelHandler(btn) {
      btn.addEventListener("click", () => {
        showModal("Cancel Booking", "<p>Cancel this booking?</p>", async () => {
          try {
            await cancelBooking(btn.dataset.id);
            showToast("Booking cancelled.", "success");
            await _loadClientBookingPanel(clientId, clientName, { silent: true });
          } catch(e) { showToast(e.message, "error"); }
        });
      });
    }

    panel.querySelectorAll(".cb-book-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const classId = btn.dataset.id;
        btn.disabled = true; btn.textContent = "Booking…";
        try {
          await bookClass(classId, clientId, clientName);
          showToast("Class booked! 🎉", "success");
          await _loadClientBookingPanel(clientId, clientName, { silent: true });
        } catch(e) { showToast(e.message, "error"); btn.disabled = false; btn.textContent = "Book Now"; }
      });
    });

    panel.querySelectorAll(".cb-join-waitlist-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const classId = btn.dataset.id, className = btn.dataset.name;
        btn.disabled = true; btn.textContent = "Joining…";
        try {
          await addToWaitlist(classId, clientId, clientName);
          showToast(`Added to waitlist for ${className}.`, "success");
          await _loadClientBookingPanel(clientId, clientName, { silent: true });
        } catch(e) {
          showToast(e.message, "error");
          btn.disabled = false; btn.textContent = "⏳ Join Waitlist";
        }
      });
    });

    panel.querySelectorAll(".cb-cancel-btn").forEach(cancelHandler);
    panel.querySelectorAll(".cb-cancel-class-btn").forEach(cancelHandler);
  }

  panel.querySelectorAll(".cb-day-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      activeDay = pill.dataset.day;
      panel.querySelectorAll(".cb-day-pill").forEach(p => {
        const on = p.dataset.day === activeDay;
        p.style.background = on ? "rgba(8,135,226,0.15)" : "transparent";
        p.style.borderColor = on ? "rgba(8,165,226,0.5)" : "rgba(8,165,226,0.2)";
      });
      refresh();
    });
  });

  panel.querySelectorAll(".cb-type-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      activeType = pill.dataset.type;
      panel.querySelectorAll(".cb-type-pill").forEach(p => {
        const on = p.dataset.type === activeType;
        p.style.background = on ? "rgba(255,255,255,0.08)" : "transparent";
        p.style.borderColor = on ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)";
      });
      refresh();
    });
  });

  document.getElementById("cb-search").addEventListener("input", e => {
    activeSearch = e.target.value.trim().toLowerCase();
    refresh();
  });

  bindButtons();
}


function _loadClientPickTrainerPlaceholder() {
  // Replaced by full _loadPickTrainerPanel() — see below
}

/**
 * Full "Pick a Trainer" panel with Firebase trainer data.
 * Shows trainer cards with profiles, specialties, ratings, and booking.
 */
async function _loadPickTrainerPanel(clientId) {
  const panel = document.getElementById("panel-pick-trainer");
  if (!panel) return;

  const isLightMode = document.body.classList.contains("light");
  const ui = {
    heading: isLightMode ? "#165d9b" : "#0887e2",
    muted: isLightMode ? "rgba(20,40,60,0.72)" : "rgba(255,255,255,0.62)",
    selectBg: isLightMode ? "rgba(255,255,255,0.95)" : "rgba(0,18,32,0.9)",
    selectText: isLightMode ? "#15324d" : "#ffffff",
    selectBorder: isLightMode ? "rgba(8,135,226,0.35)" : "rgba(8,165,226,0.3)",
    modalBg: isLightMode ? "rgba(247,252,255,0.98)" : "rgba(0,18,32,0.97)",
    modalBorder: isLightMode ? "rgba(8,135,226,0.32)" : "rgba(8,165,226,0.3)",
    modalShadow: isLightMode ? "0 0 45px rgba(8,135,226,0.18)" : "0 0 60px rgba(8,165,226,0.3)",
    cardBg: isLightMode ? "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(240,248,255,0.95))" : "rgba(0,18,32,0.9)",
    cardBorder: isLightMode ? "1px solid rgba(8,135,226,0.26)" : "1px solid rgba(8,165,226,0.15)",
    cardShadow: isLightMode ? "0 10px 24px rgba(8,135,226,0.10)" : "0 0 25px rgba(8,165,226,0.12)",
    cardTitle: isLightMode ? "#0f2940" : "#ffffff",
    cardText: isLightMode ? "rgba(20,40,60,0.86)" : "rgba(255,255,255,0.7)",
    cardSubtle: isLightMode ? "rgba(20,40,60,0.62)" : "rgba(255,255,255,0.6)",
    cardDivider: isLightMode ? "rgba(8,135,226,0.18)" : "rgba(255,255,255,0.06)",
    viewBtnText: isLightMode ? "#0f5f9e" : "#0887e2",
    viewBtnBorder: isLightMode ? "1px solid rgba(15,95,158,0.35)" : "1px solid rgba(8,165,226,0.3)",
    hiredBtnBg: isLightMode ? "rgba(15,41,64,0.12)" : "rgba(255,255,255,0.1)",
    hiredBtnText: isLightMode ? "#35536f" : "#ffffff",
    statsBg: isLightMode ? "rgba(15,95,158,0.08)" : "rgba(255,255,255,0.04)",
    statsBorder: isLightMode ? "1px solid rgba(15,95,158,0.18)" : "1px solid rgba(255,255,255,0.06)",
    overlayBg: isLightMode ? "rgba(17, 44, 68, 0.36)" : "rgba(0,0,0,0.75)",
    closeColor: isLightMode ? "#15324d" : "#ffffff"
  };

  const normalizeHex = (color) => {
    const c = String(color || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return "#0887e2";
  };
  const oppositeHex = (hex) => {
    const n = normalizeHex(hex);
    const r = 255 - parseInt(n.slice(1, 3), 16);
    const g = 255 - parseInt(n.slice(3, 5), 16);
    const b = 255 - parseInt(n.slice(5, 7), 16);
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  };

  panel.innerHTML = `
    <h2 style="color:${ui.heading}">Gym Offerings · Pick a Trainer</h2>
    <p style="color:${ui.muted};margin-bottom:16px">Browse gym trainers by specialty, rating, and availability. Select the perfect coach for your fitness journey.</p>

    <!-- Filter Bar -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      <select id="pt-filter-specialty"
         style="padding:10px 16px;border-radius:8px;border:${ui.selectBorder};
           background:${ui.selectBg};color:${ui.selectText};font-family:'Exo 2',sans-serif;cursor:pointer">
        <option value="all">All Specialties</option>
        <option value="Strength">Strength</option>
        <option value="HIIT">HIIT</option>
        <option value="Bodybuilding">Bodybuilding</option>
        <option value="Yoga">Yoga & Mobility</option>
        <option value="Sports">Sports Performance</option>
        <option value="General">General Fitness</option>
      </select>
      <select id="pt-sort"
         style="padding:10px 16px;border-radius:8px;border:${ui.selectBorder};
           background:${ui.selectBg};color:${ui.selectText};font-family:'Exo 2',sans-serif;cursor:pointer">
        <option value="rating">Highest Rated</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="experience">Most Experienced</option>
        <option value="clients">Most Clients</option>
      </select>
    </div>

    <div id="pt-trainer-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px"></div>

    <!-- Trainer Detail Modal (hidden) -->
    <div id="pt-modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;
          background:${ui.overlayBg};backdrop-filter:blur(6px);z-index:9000;
          align-items:center;justify-content:center">
       <div id="pt-modal" style="background:${ui.modalBg};border:1px solid ${ui.modalBorder};
           border-radius:16px;padding:36px;max-width:560px;width:90%;max-height:85vh;overflow-y:auto;
         box-shadow:${ui.modalShadow}">
      </div>
    </div>
  `;

  const hiredIds = await _getHiredTrainerIds(clientId);
  const sentInvites = await getClientSentInvites(clientId).catch(() => ({}));
  let trainers = [];
  try {
    trainers = await getTrainersForSelection();
  } catch (e) {
    panel.innerHTML += `<p style="color:#ff0033;margin-top:10px">${e.message}</p>`;
    return;
  }

  // Load capacity per trainer
  const capacityMap = {};
  await Promise.all(trainers.map(async t => {
    const maxSnap = await db.ref("users/" + t.id + "/maxClients").once("value").catch(() => null);
    const max = maxSnap?.val() || 10;
    const count = await getTrainerClientCount(t.id).catch(() => 0);
    capacityMap[t.id] = { max, count, full: count >= max };
  }));

  // Show payment notifications if any
  const payNotifs = await getPaymentNotifications(clientId).catch(() => []);
  if (payNotifs.length > 0) {
    const notifHtml = payNotifs.map(n => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;
           padding:12px 16px;border-radius:10px;background:rgba(255,200,0,0.1);
           border:1px solid rgba(255,200,0,0.3);margin-bottom:10px">
        <div>
          <strong style="color:#ffd64a">&#x1F4B3; Payment Due — ${n.trainerName}</strong>
          <div style="font-size:0.82rem;opacity:0.8;margin-top:4px">
            £${n.pricePerMonth}/month or £${n.pricePerSession}/session — Your trainer has accepted your invite!
          </div>
        </div>
        <button class="pay-now-btn" data-nid="${n.id}"
          style="padding:8px 18px;border:none;border-radius:8px;white-space:nowrap;
                 background:linear-gradient(90deg,#ffd64a,#ffa000);color:#000;
                 cursor:pointer;font-family:inherit;font-weight:700;font-size:0.85rem">
          Mark as Paid
        </button>
      </div>`).join("");
    const notifWrap = document.createElement("div");
    notifWrap.style.cssText = "margin-bottom:20px";
    notifWrap.innerHTML = `<h3 style="color:#ffd64a;margin-bottom:10px">&#x1F514; Payment Notifications</h3>${notifHtml}`;
    const grid = document.getElementById("pt-trainer-grid");
    grid?.parentNode?.insertBefore(notifWrap, grid);
    notifWrap.querySelectorAll(".pay-now-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await markPaymentPaid(clientId, btn.dataset.nid).catch(() => {});
        showToast("Payment marked as paid!", "success");
        btn.closest("div[style]").remove();
      });
    });
  }

  const clientProfile = await getUserProfile(clientId, auth.currentUser?.email);
  trainers = trainers.map(t => {
    const base = normalizeHex(t.accentColor);
    return {
      ...t,
      accentColor: isLightMode ? oppositeHex(base) : base
    };
  });

  if (!trainers.length) {
    document.getElementById("pt-trainer-grid").innerHTML = `<p style="opacity:0.7">No trainers available from Firebase yet.</p>`;
    return;
  }

  function getTypeBadgeColor(specialty) {
    const s = (specialty || "").toUpperCase();
    if (s.includes("YOGA"))                              return "#4CAF50";
    if (s.includes("HIIT"))                              return "#FF5722";
    if (s.includes("PILATES"))                           return "#AB47BC";
    if (s.includes("STRENGTH") || s.includes("POWERLIFTING")) return "#2196F3";
    if (s.includes("BODYBUILDING") || s.includes("BODY BUILDING")) return "#FFC107";
    if (s.includes("CROSSFIT") || s.includes("CROSS FIT")) return "#E91E63";
    if (s.includes("CARDIO"))                           return "#00BCD4";
    if (s.includes("SPORT") || s.includes("PERFORMANCE") || s.includes("ATHLETIC")) return "#F44336";
    if (s.includes("BOX") || s.includes("MMA") || s.includes("MARTIAL")) return "#FF9800";
    if (s.includes("NUTRITION") || s.includes("DIET"))  return "#8BC34A";
    if (s.includes("STRETCH") || s.includes("MOBILITY") || s.includes("FLEX")) return "#26C6DA";
    if (s.includes("CYCLING") || s.includes("SPIN"))   return "#29B6F6";
    return null;
  }

  function showAlternativeTrainers(fullTrainer) {
    const specialty = String(fullTrainer.trainerType || fullTrainer.specialty || "").toLowerCase();
    const alternatives = trainers.filter(other => {
      if (other.id === fullTrainer.id) return false;
      const otherCap = capacityMap[other.id] || { full: false };
      if (otherCap.full) return false;
      const otherSpecialty = String(other.trainerType || other.specialty || "").toLowerCase();
      return !specialty || !otherSpecialty || specialty === otherSpecialty;
    }).slice(0, 4);

    if (!alternatives.length) {
      showModal("Trainer At Capacity", `<p>${fullTrainer.name} is currently at maximum capacity and no close alternatives are available right now.</p>`);
      return;
    }

    showModal(
      "Suggested Trainers",
      `<p style="margin-bottom:14px">${fullTrainer.name} is currently full. These trainers are still available:</p>
      ${alternatives.map(other => {
        const cap = capacityMap[other.id] || { count: 0, max: 10 };
        return `<div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
            <strong>${other.name}</strong>
            <span style="color:#0887e2;font-size:0.8rem">${other.specialty || other.trainerType || "Trainer"}</span>
          </div>
          <div style="opacity:0.75;margin-top:4px;font-size:0.84rem">${other.experience || "Experienced trainer"} · £${other.pricePerSession || 0}/session · ${cap.count}/${cap.max} clients</div>
        </div>`;
      }).join("")}`
    );
  }

  function renderTrainerCards(trainerList) {
    const grid = document.getElementById("pt-trainer-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (trainerList.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;color:${ui.muted}">No trainers match your filters.</p>`;
      return;
    }

    trainerList.forEach(t => {
      const hired = hiredIds.includes(t.id);
      const cap = capacityMap[t.id] || { max: 10, count: 0, full: false };
      const invStatus = sentInvites[t.id]?.status;
      const inviteSent = invStatus === "pending";
      const inviteAccepted = invStatus === "accepted";
      const accent = t.accentColor;
      const stars = "\u2605".repeat(Math.floor(Number(t.rating))) +
                    (Number(t.rating) % 1 >= 0.5 ? "\u00BD" : "");
      const card = document.createElement("div");
      card.style.cssText = `
        background:${ui.cardBg};border:${ui.cardBorder};
        border-radius:14px;padding:24px;cursor:pointer;transition:0.4s;
        box-shadow:${ui.cardShadow};position:relative;overflow:hidden;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-6px) scale(1.01)";
        card.style.borderColor = accent;
        card.style.boxShadow = "0 0 35px " + accent + "40";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.border = ui.cardBorder;
        card.style.boxShadow = ui.cardShadow;
      });

      card.innerHTML = `
        <div style="position:absolute;top:0;right:0;width:80px;height:80px;
             background:radial-gradient(circle at 100% 0%,${accent}15,transparent 70%)"></div>

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${t.accentColor},${t.accentColor}80);
               display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;
               font-weight:700;font-size:1rem;color:#fff;flex-shrink:0">
            ${t.initials}
          </div>
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:0.95rem;color:${ui.cardTitle};letter-spacing:0.04em">${t.name}</div>
            ${(() => { const bc = getTypeBadgeColor(t.specialty); const bg = bc || accent; return `<span style="display:inline-block;margin-top:5px;padding:2px 10px;border-radius:20px;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:${bg};color:#fff;box-shadow:0 2px 8px ${bg}55">${t.specialty}</span>`; })()}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;font-size:0.85rem">
          <span style="color:#ffd64a">${stars}</span>
          <span style="color:${ui.cardText}">${t.rating} (${t.reviewCount} reviews)</span>
        </div>

        <p style="font-size:0.85rem;color:${ui.cardSubtle};margin-bottom:14px;line-height:1.5;
           display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
          ${t.bio}
        </p>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${t.specialties.map(s => `<span style="font-size:0.7rem;padding:3px 10px;border-radius:12px;
            background:${accent}20;color:${accent};border:1px solid ${accent}30">${s}</span>`).join("")}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;
             border-top:1px solid ${ui.cardDivider}">
          <div>
            <span style="font-size:1.1rem;font-weight:700;color:${ui.cardTitle}">\u00A3${t.pricePerSession}</span>
            <span style="font-size:0.75rem;color:${ui.cardSubtle}">/session</span>
          </div>
          ${cap.full ? `<span style="font-size:0.72rem;padding:3px 10px;border-radius:10px;background:rgba(255,0,51,0.15);color:#ff5577;font-weight:600">AT CAPACITY</span>` : ""}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
            <button class="pt-view-btn" data-tid="${t.id}"
              style="padding:8px 16px;border:${ui.viewBtnBorder};border-radius:8px;
                     background:transparent;color:${ui.viewBtnText};cursor:pointer;font-family:'Exo 2',sans-serif;
                     font-size:0.8rem;transition:0.3s">
              View Profile
            </button>
            ${cap.full && !inviteAccepted && !hired ? `
              <button disabled style="padding:8px 14px;border:none;border-radius:8px;
                background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);
                font-family:'Exo 2',sans-serif;font-size:0.78rem">At Capacity</button>
              <button class="pt-suggest-btn" data-tid="${t.id}" style="padding:8px 14px;border:none;border-radius:8px;
                background:rgba(8,135,226,0.16);color:#0887e2;cursor:pointer;
                font-family:'Exo 2',sans-serif;font-size:0.78rem">See Alternatives</button>
            ` : `
            <button class="pt-select-btn" data-tid="${t.id}" data-tname="${t.name}"
              ${(hired || inviteSent || inviteAccepted) ? "disabled" : ""}
              style="padding:8px 16px;border:none;border-radius:8px;
                background:${inviteAccepted || hired ? ui.hiredBtnBg : inviteSent ? "rgba(255,200,0,0.2)" : "linear-gradient(90deg," + accent + "," + accent + "cc)"};
                color:${inviteAccepted || hired ? ui.hiredBtnText : inviteSent ? "#ffd64a" : "#fff"};
                cursor:${(hired || inviteSent || inviteAccepted) ? "default" : "pointer"};font-family:'Exo 2',sans-serif;
                font-size:0.8rem;font-weight:600;transition:0.3s">
              ${inviteAccepted || hired ? "\u2714 Accepted" : inviteSent ? "\u23F3 Invite Sent" : "Send Invite"}
            </button>`}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // View profile buttons
    grid.querySelectorAll(".pt-view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const trainer = trainers.find(t => t.id === btn.dataset.tid);
        if (trainer) _showTrainerProfileModal(trainer, hiredIds.includes(trainer.id), clientId);
      });
    });

    grid.querySelectorAll(".pt-suggest-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const trainer = trainers.find(t => t.id === btn.dataset.tid);
        if (trainer) showAlternativeTrainers(trainer);
      });
    });

    // Send Invite buttons
    grid.querySelectorAll(".pt-select-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const tid = btn.dataset.tid;
        const tname = btn.dataset.tname;
        try {
          await sendTrainerInvite(clientId, tid);
          showToast(`Invite sent to ${tname}! They will review your profile and respond.`, "success");
          sentInvites[tid] = { status: "pending" };
          btn.textContent = "\u23F3 Invite Sent";
          btn.disabled = true;
          btn.style.background = "rgba(255,200,0,0.2)";
          btn.style.color = "#ffd64a";
          btn.style.cursor = "default";
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  }

  async function _showTrainerProfileModal(t, isHired, cid) {
    const overlay = document.getElementById("pt-modal-overlay");
    const modal = document.getElementById("pt-modal");
    if (!overlay || !modal) return;
    const accent = t.accentColor;
    let reviews = [];
    try {
      reviews = await getTrainerReviews(t.id);
    } catch (e) {
      console.warn("[X-Gym] Failed loading trainer reviews:", e);
    }

    const availDays = (t.availability || []).map(d =>
      `<span style="display:inline-block;padding:4px 12px;border-radius:8px;margin:3px;
        font-size:0.75rem;background:rgba(0,200,80,0.15);color:#00c850;border:1px solid rgba(0,200,80,0.2)">${d}</span>`
    ).join("");

    const certBadges = (t.certifications || []).map(c =>
      `<span style="display:inline-block;padding:4px 12px;border-radius:8px;margin:3px;
        font-size:0.75rem;background:rgba(8,135,226,0.15);color:#0887e2;border:1px solid rgba(8,135,226,0.2)">${c}</span>`
    ).join("");

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:18px">
          <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,${t.accentColor},${t.accentColor}80);
               display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;
               font-weight:700;font-size:1.3rem;color:#fff">
            ${t.initials}
          </div>
          <div>
            <h2 style="font-family:'Orbitron',monospace;font-size:1.2rem;color:${ui.cardTitle};margin:0">${t.name}</h2>
            ${(() => { const bc = getTypeBadgeColor(t.specialty); const bg = bc || accent; return `<span style="display:inline-block;margin-top:6px;padding:3px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:${bg};color:#fff;box-shadow:0 2px 10px ${bg}60">${t.specialty}</span>`; })()}
            <div style="color:#ffd64a;font-size:0.85rem;margin-top:4px">
              ${"\u2605".repeat(Math.floor(Number(t.rating)))} ${t.rating} (${t.reviewCount} reviews)
            </div>
          </div>
        </div>
        <button id="pt-modal-close" style="background:none;border:none;color:${ui.closeColor};font-size:1.4rem;cursor:pointer;opacity:0.6">\u2715</button>
      </div>

      <p style="font-size:0.9rem;color:${ui.cardText};line-height:1.7;margin-bottom:20px">${t.bio}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px">
        <div style="text-align:center;padding:14px;border-radius:10px;background:${ui.statsBg};border:${ui.statsBorder}">
          <div style="font-size:1.4rem;font-weight:700;color:${accent}">${t.experience}</div>
          <div style="font-size:0.75rem;color:${ui.cardSubtle};margin-top:4px">Experience</div>
        </div>
        <div style="text-align:center;padding:14px;border-radius:10px;background:${ui.statsBg};border:${ui.statsBorder}">
          <div style="font-size:1.4rem;font-weight:700;color:${accent}">${t.clients}</div>
          <div style="font-size:0.75rem;color:${ui.cardSubtle};margin-top:4px">Active Clients</div>
        </div>
        <div style="text-align:center;padding:14px;border-radius:10px;background:${ui.statsBg};border:${ui.statsBorder}">
          <div style="font-size:1.4rem;font-weight:700;color:${accent}">\u00A3${t.pricePerMonth}</div>
          <div style="font-size:0.75rem;color:${ui.cardSubtle};margin-top:4px">Per Month</div>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <h4 style="font-size:0.85rem;color:${ui.cardSubtle};margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">Certifications</h4>
        ${certBadges}
      </div>

      <div style="margin-bottom:20px">
        <h4 style="font-size:0.85rem;color:${ui.cardSubtle};margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">Availability</h4>
        ${availDays}
      </div>

      <div style="margin-bottom:20px">
        <h4 style="font-size:0.85rem;color:${ui.cardSubtle};margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">Client Reviews</h4>
        <div style="max-height:180px;overflow:auto;padding-right:4px">
          ${reviews.length ? reviews.slice(0, 8).map(r => `
            <div style="padding:10px;border-radius:9px;border:${ui.statsBorder};background:${ui.statsBg};margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
                <strong style="color:${ui.cardTitle};font-size:0.82rem">${r.clientName || "Client"}</strong>
                <span style="color:#ffd64a;font-size:0.8rem">${"★".repeat(Math.max(1, Math.min(5, Number(r.rating || 0))))}</span>
              </div>
              <div style="font-size:0.82rem;color:${ui.cardText};margin-top:4px">${r.text || ""}</div>
            </div>
          `).join("") : `<p style="color:${ui.cardSubtle};font-size:0.82rem">No reviews yet.</p>`}
        </div>
      </div>

      <div style="margin-bottom:18px;border:${ui.statsBorder};background:${ui.statsBg};border-radius:10px;padding:12px">
        <div style="font-size:0.78rem;color:${ui.cardSubtle};margin-bottom:8px;letter-spacing:0.06em;text-transform:uppercase">Leave a review</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <label style="font-size:0.82rem;color:${ui.cardText}">Rating</label>
          <select id="pt-review-rating" style="padding:6px 8px;border-radius:6px;border:${ui.viewBtnBorder};background:${ui.selectBg};color:${ui.selectText}">
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </div>
        <textarea id="pt-review-text" placeholder="Share your feedback" style="width:100%;min-height:64px;padding:8px;border-radius:8px;border:${ui.viewBtnBorder};background:${ui.selectBg};color:${ui.selectText};font-family:'Exo 2',sans-serif"></textarea>
        <button id="pt-review-submit" style="margin-top:8px;padding:8px 14px;border:none;border-radius:8px;background:linear-gradient(90deg,${accent},${accent}cc);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif;font-size:0.82rem">Submit Review</button>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid ${ui.cardDivider}">
        <button id="pt-modal-msg" style="padding:10px 22px;border:${ui.viewBtnBorder};border-radius:8px;
                background:transparent;color:${ui.viewBtnText};cursor:pointer;font-family:'Exo 2',sans-serif;font-size:0.85rem">
          Message Trainer
        </button>
        <button id="pt-modal-select" ${isHired ? "disabled" : ""}
          style="padding:10px 22px;border:none;border-radius:8px;
                 background:${isHired ? ui.hiredBtnBg : "linear-gradient(90deg," + accent + "," + accent + "cc)"};
                 color:${isHired ? ui.hiredBtnText : "#fff"};cursor:${isHired ? "default" : "pointer"};font-family:'Exo 2',sans-serif;font-size:0.85rem;font-weight:600">
          ${isHired ? "Already Selected" : "Select This Trainer"}
        </button>
      </div>
    `;

    overlay.style.display = "flex";

    document.getElementById("pt-modal-close").addEventListener("click", () => {
      overlay.style.display = "none";
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.style.display = "none";
    });

    document.getElementById("pt-modal-msg").addEventListener("click", async () => {
      sessionStorage.setItem("xgym_msg_trainer_id", t.id);
      overlay.style.display = "none";
      document.querySelectorAll(".xgym-panel").forEach(p => p.style.display = "none");
      const grid = document.querySelector(".grid");
      if (grid) grid.style.display = "none";
      const msgPanel = document.getElementById("panel-messenger");
      if (msgPanel) msgPanel.style.display = "block";
      await _loadClientMessengerPanel(cid, clientProfile?.name || "Client");
      showToast(`Opened messenger with ${t.name}.`, "info");
    });

    document.getElementById("pt-review-submit").addEventListener("click", async () => {
      const rating = Number(document.getElementById("pt-review-rating").value || 0);
      const text = document.getElementById("pt-review-text").value.trim();
      try {
        await addTrainerReview(t.id, cid, clientProfile?.name || "Client", rating, text);
        showToast("Review submitted.", "success");
        const fresh = await getTrainersForSelection();
        trainers = fresh.map(x => {
          const base = normalizeHex(x.accentColor);
          return { ...x, accentColor: isLightMode ? oppositeHex(base) : base };
        });
        const updated = trainers.find(x => x.id === t.id) || t;
        _showTrainerProfileModal(updated, hiredIds.includes(updated.id), cid);
        renderTrainerCards(applyFilters());
      } catch (e) {
        showToast(e.message, "error");
      }
    });

    const selectBtn = document.getElementById("pt-modal-select");
    if (selectBtn && !selectBtn.disabled) {
      selectBtn.addEventListener("click", async () => {
        try {
          await hireTrainer(cid, t.id);
          showToast(`${t.name} hired as your trainer!`, "success");
          hiredIds.push(t.id);
          selectBtn.textContent = "Already Selected";
          selectBtn.disabled = true;
          selectBtn.style.background = ui.hiredBtnBg;
          selectBtn.style.color = ui.hiredBtnText;
          selectBtn.style.cursor = "default";
          // Refresh main grid
          renderTrainerCards(applyFilters());
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    }
  }

  function applyFilters() {
    const specFilter = document.getElementById("pt-filter-specialty").value;
    const sortBy = document.getElementById("pt-sort").value;

    let filtered = [...trainers];

    // Filter by specialty
    if (specFilter !== "all") {
      filtered = filtered.filter(t =>
        (t.specialties || []).some(s => String(s || "").toLowerCase().includes(specFilter.toLowerCase())) ||
        String(t.specialty || "").toLowerCase().includes(specFilter.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => Number(b.rating) - Number(a.rating));
        break;
      case "price-low":
        filtered.sort((a, b) => a.pricePerSession - b.pricePerSession);
        break;
      case "price-high":
        filtered.sort((a, b) => b.pricePerSession - a.pricePerSession);
        break;
      case "experience":
        filtered.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
        break;
      case "clients":
        filtered.sort((a, b) => b.clients - a.clients);
        break;
    }
    return filtered;
  }

  // Event listeners for filters
  document.getElementById("pt-filter-specialty").addEventListener("change", () => renderTrainerCards(applyFilters()));
  document.getElementById("pt-sort").addEventListener("change", () => renderTrainerCards(applyFilters()));

  // Initial render
  renderTrainerCards(applyFilters());
}

async function _loadTrainerClassesPanel(trainerUid, trainerName) {
  const panel = document.getElementById("panel-classes");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const CLASS_TYPES = ["General","Strength","Cardio","HIIT","Yoga","Pilates","Boxing","Cycling","Stretching","CrossFit"];
  const TYPE_COLORS = {
    "Strength":"#e96d25","Cardio":"#ff0033","HIIT":"#ff6b00","Yoga":"#7c4dff",
    "Pilates":"#e91e63","Boxing":"#f44336","Cycling":"#0887e2","Stretching":"#00bcd4",
    "CrossFit":"#ff5722","General":"#00c853"
  };

  panel.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5">Loading classes…</div>`;
  const classes = await getTrainerClasses(trainerUid);
  const counts = {};
  for (const c of classes) counts[c.id] = await getClassBookingCount(c.id);

  const totalBooked = Object.values(counts).reduce((s, n) => s + n, 0);
  const totalCap    = classes.reduce((s, c) => s + (c.capacity || 20), 0);
  const fillRate    = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

  const typeOpts = CLASS_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
  const dayOpts  = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");

  function buildClassCards() {
    let html = "";
    for (const day of DAYS) {
      const dayClasses = classes.filter(c => c.day === day);
      if (!dayClasses.length) continue;
      html += `<div style="margin-bottom:28px">
        <h3 style="font-family:Orbitron,sans-serif;font-size:0.78rem;letter-spacing:2px;color:#0887e2;
          margin:0 0 12px;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid rgba(8,165,226,0.2)">${day}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">`;
      for (const c of dayClasses) {
        const booked = counts[c.id] || 0;
        const cap = c.capacity || 20;
        const pct = Math.min((booked / cap) * 100, 100);
        const barColor = pct >= 90 ? "#ff0033" : pct >= 60 ? "#e96d25" : "#00c853";
        const typeColor = TYPE_COLORS[c.type] || "#00c853";
        const fillBadge = pct >= 100
          ? `<span style="background:rgba(255,0,51,0.12);color:#ff0033;padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700">FULL</span>`
          : `<span style="background:rgba(0,200,80,0.1);color:#00c853;padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700">${cap - booked} open</span>`;
        html += `
          <div class="card" style="display:flex;flex-direction:column;gap:10px;padding:18px;cursor:default;border-top:3px solid ${typeColor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div>
                <strong style="font-size:1rem;display:block;margin-bottom:4px">${c.name}</strong>
                <span style="background:${typeColor}22;color:${typeColor};padding:2px 8px;border-radius:6px;font-size:0.7rem;font-weight:600">${c.type || "General"}</span>
              </div>
              ${fillBadge}
            </div>
            <div style="font-size:0.82rem;opacity:0.65;display:flex;flex-direction:column;gap:4px">
              <span>🕐 ${c.time}${c.duration ? " · " + c.duration + " min" : ""}</span>
              ${c.location ? "<span>📍 " + c.location + "</span>" : ""}
              ${c.description ? `<span style="opacity:0.75;font-size:0.77rem;line-height:1.4;margin-top:2px">${c.description}</span>` : ""}
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;opacity:0.55;margin-bottom:5px">
                <span>Enrolled</span><span>${booked} / ${cap}</span>
              </div>
              <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.6s"></div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="tc-roster-btn" data-id="${c.id}" data-name="${c.name}"
                style="flex:1;min-width:80px;padding:7px;border:none;border-radius:6px;background:rgba(8,135,226,0.15);
                color:#0887e2;cursor:pointer;font-size:0.78rem;font-weight:600;transition:0.2s">👥 (${booked})</button>
              <button class="tc-edit-btn" data-id="${c.id}"
                data-name="${c.name}" data-type="${c.type||''}" data-day="${c.day||''}"
                data-time="${c.time||''}" data-duration="${c.duration||60}" data-capacity="${c.capacity||20}"
                data-location="${(c.location||'').replace(/"/g,'&quot;')}" data-desc="${(c.description||'').replace(/"/g,'&quot;')}"
                data-public="${c.isPublic ? '1' : '0'}"
                style="flex:1;min-width:60px;padding:7px;border:1px solid rgba(8,135,226,0.3);border-radius:6px;
                background:transparent;color:#0887e2;cursor:pointer;font-size:0.78rem;font-weight:600">✏️ Edit</button>
              <button class="tc-attendance-btn" data-id="${c.id}" data-name="${c.name}"
                style="flex:1;min-width:70px;padding:7px;border:1px solid rgba(0,200,80,0.3);border-radius:6px;
                background:transparent;color:#00c853;cursor:pointer;font-size:0.78rem;font-weight:600">✓ Attendance</button>
              <button class="tc-waitlist-btn" data-id="${c.id}" data-name="${c.name}"
                style="flex:1;min-width:70px;padding:7px;border:1px solid rgba(233,109,37,0.3);border-radius:6px;
                background:transparent;color:#e96d25;cursor:pointer;font-size:0.78rem;font-weight:600">⏳ Waitlist</button>
              <button class="tc-del-btn" data-id="${c.id}" data-name="${c.name}"
                style="flex-shrink:0;padding:7px 14px;border:1px solid rgba(255,0,51,0.35);border-radius:6px;
                background:transparent;color:#ff0033;cursor:pointer;font-size:0.78rem;font-weight:600;transition:0.2s">Delete</button>
            </div>
          </div>`;
      }
      html += `</div></div>`;
    }
    if (!html) html = `<div class="card" style="text-align:center;opacity:0.5;padding:40px">
      You haven't created any classes yet.<br>
      <span style="font-size:0.85rem;margin-top:8px;display:block">Use the form above to schedule your first class.</span></div>`;
    return html;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:22px">
      <h2 style="color:#0887e2;margin:0">My Classes</h2>
      <button id="tc-toggle-form" style="padding:8px 18px;border:1px solid rgba(8,165,226,0.4);border-radius:20px;
        background:rgba(8,135,226,0.1);color:#0887e2;cursor:pointer;font-size:0.83rem;font-weight:600;
        font-family:inherit;transition:0.2s">+ New Class</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#0887e2">${classes.length}</div>
        <div style="font-size:0.72rem;opacity:0.6;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Classes</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#e96d25">${totalBooked}</div>
        <div style="font-size:0.72rem;opacity:0.6;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Enrolled</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#00c853">${totalCap - totalBooked}</div>
        <div style="font-size:0.72rem;opacity:0.6;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Open Spots</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#7c4dff">${fillRate}%</div>
        <div style="font-size:0.72rem;opacity:0.6;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Fill Rate</div>
      </div>
    </div>

    <div id="tc-create-form" style="display:none">
      <div class="card" style="padding:22px;margin-bottom:24px">
        <h3 style="margin:0 0 18px;font-size:1rem">Create New Class</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <input id="tc-name" type="text" placeholder="Class Name"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <select id="tc-type"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">${typeOpts}</select>
          <select id="tc-day"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">${dayOpts}</select>
          <input id="tc-time" type="time"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="tc-duration" type="number" min="15" step="15" placeholder="Duration (min)" value="60"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="tc-capacity" type="number" min="1" placeholder="Max Capacity" value="20"
            style="padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        </div>
        <input id="tc-location" type="text" placeholder="Location / Room (optional)"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;
          border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);
          color:inherit;font-family:inherit;margin-bottom:12px">
        <textarea id="tc-desc" rows="2" placeholder="Description (optional)"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;
          border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);
          color:inherit;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem;margin-bottom:14px">
          <input type="checkbox" id="tc-public" checked style="width:16px;height:16px;accent-color:#0887e2">
          Open to all gym members (uncheck = your linked clients only)
        </label>
        <button id="tc-create-btn" style="padding:10px 28px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;
          font-family:inherit;font-weight:600;font-size:0.9rem">+ Create Class</button>
      </div>
    </div>

    <div id="tc-class-list">${buildClassCards()}</div>`;

  document.getElementById("tc-toggle-form").addEventListener("click", () => {
    const form = document.getElementById("tc-create-form");
    const btn  = document.getElementById("tc-toggle-form");
    const open = form.style.display === "none";
    form.style.display = open ? "block" : "none";
    btn.textContent = open ? "✕ Close" : "+ New Class";
  });

  document.getElementById("tc-create-btn").addEventListener("click", async () => {
    const name     = document.getElementById("tc-name").value.trim();
    const type     = document.getElementById("tc-type").value;
    const day      = document.getElementById("tc-day").value;
    const time     = document.getElementById("tc-time").value;
    const duration = parseInt(document.getElementById("tc-duration").value) || 60;
    const capacity = parseInt(document.getElementById("tc-capacity").value) || 20;
    const location = document.getElementById("tc-location").value.trim();
    const desc     = document.getElementById("tc-desc").value.trim();
    const isPublic = document.getElementById("tc-public").checked;
    if (!name) { showToast("Enter a class name.", "error"); return; }
    if (!time) { showToast("Select a time.", "error"); return; }
    const btn = document.getElementById("tc-create-btn");
    btn.disabled = true; btn.textContent = "Creating…";
    try {
      await createClass(trainerUid, trainerName, { name, type, day, time, duration, capacity, location, description: desc, isPublic });
      showToast(
        isPublic
          ? "Class created! Visible to all clients."
          : "Class created! Visible to clients who hired you.",
        "success"
      );
      _loadTrainerClassesPanel(trainerUid, trainerName);
    } catch(e) { showToast(e.message, "error"); btn.disabled = false; btn.textContent = "+ Create Class"; }
  });

  panel.querySelectorAll(".tc-roster-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const classId = btn.dataset.id, className = btn.dataset.name;
      btn.disabled = true; btn.textContent = "Loading…";
      try {
        const roster = await getClassRoster(classId);
        if (!roster.length) {
          showModal("Roster — " + className,
            `<p style="text-align:center;opacity:0.6;padding:20px">No one enrolled yet.</p>`);
        } else {
          const rows = roster.map((r, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;
              border-radius:8px;background:rgba(8,165,226,0.06);border:1px solid rgba(8,165,226,0.12);margin-bottom:8px">
              <div>
                <strong style="font-size:0.9rem">${r.clientName || "Member"}</strong>
                <div style="font-size:0.75rem;opacity:0.5;margin-top:2px">
                  Joined ${r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <span style="background:rgba(0,200,80,0.1);color:#00c853;padding:2px 8px;border-radius:8px;font-size:0.72rem">#${i + 1}</span>
            </div>`).join("");
          showModal(`Roster — ${className} (${roster.length})`,
            `<div style="max-height:55vh;overflow-y:auto;padding-right:4px">${rows}</div>`);
        }
      } catch(e) { showToast(e.message, "error"); }
      btn.disabled = false; btn.textContent = "👥 Roster (" + (counts[classId] || 0) + ")";
    });
  });

  panel.querySelectorAll(".tc-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showModal("Delete Class", `<p>Delete <strong>${btn.dataset.name}</strong>? All bookings will be removed.</p>`, async () => {
        await deleteClass(btn.dataset.id);
        showToast("Class deleted.", "success");
        _loadTrainerClassesPanel(trainerUid, trainerName);
      });
    });
  });

  // Edit class
  const EDIT_CLASS_TYPES = ["Cardio","HIIT","Yoga","Pilates","Strength","Cycling","Boxing","Dance","Bootcamp","Swimming","General"];
  panel.querySelectorAll(".tc-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = btn.dataset;
      const dayOpts2 = DAYS.map(dy => `<option value="${dy}" ${dy === d.day ? "selected" : ""}>${dy}</option>`).join("");
      const typeOpts2 = EDIT_CLASS_TYPES.map(t => `<option value="${t}" ${t === d.type ? "selected" : ""}>${t}</option>`).join("");
      showModal("Edit Class — " + d.name, `
        <div style="display:grid;gap:10px">
          <input id="edit-name" value="${d.name}" placeholder="Class Name"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <select id="edit-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#1a1a2e;color:#fff;font-family:Poppins,sans-serif">${typeOpts2}</select>
            <select id="edit-day" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#1a1a2e;color:#fff;font-family:Poppins,sans-serif">${dayOpts2}</select>
            <input id="edit-time" type="time" value="${d.time||''}"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <input id="edit-duration" type="number" min="15" step="15" value="${d.duration||60}"
              placeholder="Duration (min)"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <input id="edit-capacity" type="number" min="1" value="${d.capacity||20}"
              placeholder="Max Capacity"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <input id="edit-location" value="${d.location||''}" placeholder="Location / Room"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          </div>
          <textarea id="edit-desc" rows="2" placeholder="Description"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif;resize:vertical">${d.desc||''}</textarea>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem;color:#fff">
            <input type="checkbox" id="edit-public" ${d.public === '1' ? 'checked' : ''} style="accent-color:#0887e2">
            Open to all gym members
          </label>
        </div>
      `, async () => {
        try {
          await updateClass(d.id, {
            name: document.getElementById("edit-name").value.trim() || d.name,
            type: document.getElementById("edit-type").value,
            day: document.getElementById("edit-day").value,
            time: document.getElementById("edit-time").value,
            duration: parseInt(document.getElementById("edit-duration").value) || 60,
            capacity: parseInt(document.getElementById("edit-capacity").value) || 20,
            location: document.getElementById("edit-location").value.trim(),
            description: document.getElementById("edit-desc").value.trim(),
            isPublic: document.getElementById("edit-public").checked,
            updatedAt: Date.now()
          });
          showToast("Class updated.", "success");
          _loadTrainerClassesPanel(trainerUid, trainerName);
        } catch (e) { showToast(e.message, "error"); }
      });
    });
  });

  // Attendance
  panel.querySelectorAll(".tc-attendance-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const classId = btn.dataset.id, className = btn.dataset.name;
      btn.disabled = true; btn.textContent = "Loading…";
      try {
        const [roster, attendance] = await Promise.all([getClassRoster(classId), getClassAttendance(classId)]);
        if (!roster.length) {
          showModal("Attendance — " + className, `<p style="opacity:0.6;text-align:center;padding:20px">No one enrolled yet.</p>`);
        } else {
          const rows = roster.map(r => {
            const checked = attendance[r.clientId] && attendance[r.clientId].attended;
            return `<div style="display:flex;justify-content:space-between;align-items:center;
              padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.04);
              border:1px solid rgba(255,255,255,0.1);margin-bottom:8px">
              <strong style="font-size:0.9rem">${r.clientName || r.clientId}</strong>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85rem">
                <input type="checkbox" class="att-check" data-client="${r.clientId}"
                  ${checked ? "checked" : ""} style="accent-color:#00c853;width:16px;height:16px">
                Attended
              </label>
            </div>`;
          }).join("");
          showModal(`Attendance — ${className}`, `
            <div style="max-height:55vh;overflow-y:auto;padding-right:4px">${rows}</div>
            <p style="opacity:0.55;font-size:0.78rem;margin-top:8px">Changes save automatically when you click Save.</p>
          `, async () => {
            try {
              const checks = document.querySelectorAll(".att-check");
              const saves = [...checks].map(c => markAttendance(classId, c.dataset.client, c.checked));
              await Promise.all(saves);
              showToast("Attendance saved.", "success");
            } catch (e) { showToast(e.message, "error"); }
          });
        }
      } catch(e) { showToast(e.message, "error"); }
      btn.disabled = false; btn.textContent = "✓ Attendance";
    });
  });

  // Waitlist management
  panel.querySelectorAll(".tc-waitlist-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const classId = btn.dataset.id, className = btn.dataset.name;
      btn.disabled = true; btn.textContent = "Loading…";
      try {
        const waitlist = await getWaitlist(classId);
        if (!waitlist.length) {
          showModal("Waitlist — " + className, `<p style="opacity:0.6;text-align:center;padding:20px">Waitlist is empty.</p>`);
        } else {
          const rows = waitlist.map((w, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:10px 14px;border-radius:8px;background:rgba(233,109,37,0.06);
              border:1px solid rgba(233,109,37,0.18);margin-bottom:8px">
              <div>
                <span style="font-size:0.78rem;color:#e96d25;margin-right:6px">#${i+1}</span>
                <strong style="font-size:0.88rem">${w.clientName || w.clientId}</strong>
                <div style="font-size:0.72rem;opacity:0.5">Joined ${new Date(w.joinedAt || 0).toLocaleDateString()}</div>
              </div>
              <button class="wl-promote-btn" data-classid="${classId}" data-clientid="${w.clientId}"
                style="padding:5px 12px;border:none;border-radius:6px;background:rgba(0,200,80,0.2);
                color:#00c853;cursor:pointer;font-size:0.75rem;font-weight:600">Promote</button>
            </div>`).join("");
          showModal(`Waitlist — ${className} (${waitlist.length})`,
            `<div style="max-height:55vh;overflow-y:auto;padding-right:4px">${rows}</div>`);
          // Bind promote buttons after modal renders
          setTimeout(() => {
            document.querySelectorAll(".wl-promote-btn").forEach(pb => {
              pb.addEventListener("click", async () => {
                pb.disabled = true; pb.textContent = "…";
                const promoted = await promoteFromWaitlist(pb.dataset.classid);
                if (promoted) { showToast(`${promoted.clientName} promoted from waitlist!`, "success"); }
                else { showToast("Could not promote — class may still be full.", "error"); }
                document.getElementById("xgym-modal").style.display = "none";
                _loadTrainerClassesPanel(trainerUid, trainerName);
              });
            });
          }, 80);
        }
      } catch(e) { showToast(e.message, "error"); }
      btn.disabled = false; btn.textContent = "⏳ Waitlist";
    });
  });
}

// --------------------------------------------------------
// Trainer dashboard initialisation
// --------------------------------------------------------
async function initTrainerPage() {
  // Wire logout button immediately so it works even without auth
  const logoutBtnEarly = document.getElementById("logout-btn");
  if (logoutBtnEarly) logoutBtnEarly.addEventListener("click", logoutUser);

  const user = await waitForAuth();
  if (user) _syncPendingStoreActions(user.uid);
  if (!user) {
    // DEV/TEST MODE: skip redirect so pages can be opened directly
    console.warn("[X-Gym] Trainer page: no user logged in — skipping redirect (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",           "panel-cart");
    _bindCardToPanel("card-workout-builder","panel-workout-builder");
    _bindCardToPanel("card-membership",     "panel-membership");
    _bindCardToPanel("card-client-progress","panel-clients");
    _bindCardToPanel("card-store",          "panel-share-code");
    _bindCardToPanel("card-classes",         "panel-classes");
    _bindCardToPanel("card-messenger",        "panel-messenger");
    _bindCardToPanel("card-settings",       "panel-settings");
    return;
  }

  // Retry profile fetch in case user just registered and
  // RTDB write hasn't fully propagated yet
  let profile = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      profile = await getUserProfile(user.uid, user.email);
      if (profile) break;
    } catch (e) { console.warn("[X-Gym] Profile fetch attempt", attempt, e); }
    await new Promise(r => setTimeout(r, 800));
  }

  if (!profile) {
    console.warn("[X-Gym] Trainer page: no profile found — staying on page (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",           "panel-cart");
    _bindCardToPanel("card-workout-builder","panel-workout-builder");
    _bindCardToPanel("card-membership",     "panel-membership");
    _bindCardToPanel("card-client-progress","panel-clients");
    _bindCardToPanel("card-store",          "panel-share-code");
    _bindCardToPanel("card-classes",         "panel-classes");
    _bindCardToPanel("card-messenger",        "panel-messenger");
    _bindCardToPanel("card-settings",       "panel-settings");
    return;
  }
  if (profile.role !== "trainer") {
    console.warn("[X-Gym] Trainer page: wrong role '" + profile.role + "', redirecting to correct dashboard");
    if (profile.role === "client") {
      _safeRedirect("DashboardClient.xxx.html");
    } else if (profile.role === "admin") {
      _safeRedirect("AdminDashboard.html");
    } else {
      console.warn("[X-Gym] Trainer page: unknown role, staying on page (test mode)");
      initPanelNav();
      return;
    }
    return;
  }

  {
    // Page loaded successfully — clear any redirect loop counter
    _clearRedirectLoop();

    // Populate greeting
    const greeting = document.getElementById("trainer-greeting");
    if (greeting) greeting.textContent = `Hello, ${profile.name}`;

    // Panel navigation
    initPanelNav();
    _updateCartBadge();

    // Card clicks
    _bindCardToPanel("card-cart",           "panel-cart");
    _bindCardToPanel("card-workout-builder","panel-workout-builder");
    _bindCardToPanel("card-membership",     "panel-membership");
    _bindCardToPanel("card-client-progress","panel-clients");
    _bindCardToPanel("card-store",          "panel-share-code");
    // Reload My Classes panel on every card/nav open so fresh class data is always shown
    _bindCardToPanelWithReload("card-classes", "panel-classes",
      () => _loadTrainerClassesPanel(user.uid, profile.name));
    document.querySelectorAll('.nav-item[data-panel="panel-classes"]').forEach(item => {
      item.addEventListener('click', () => _loadTrainerClassesPanel(user.uid, profile.name));
    });
    _bindCardToPanel("card-messenger",        "panel-messenger");
    _bindCardToPanel("card-settings",       "panel-settings");

    // Load panels
    _loadTrainerShareCodePanel(user.uid, profile.shareCode);
    _loadTrainerClientsPanel(user.uid);
    _loadTrainerWorkoutBuilderPanel(user.uid);
    _loadTrainerMealPlannerPanel(user.uid);
    _loadCartPanel(user.uid);
    _loadTrainerMembershipPanel(user.uid);
    _loadTrainerClassesPanel(user.uid, profile.name);
    _loadTrainerMessengerPanel(user.uid, profile.name);
    _loadSettingsPanel(user.uid);
    _startTrainerNotifListeners(user.uid);
  }
}

async function _loadTrainerShareCodePanel(trainerUid, shareCode) {
  const panel = document.getElementById("panel-share-code");
  if (!panel) return;

  const me = await getUserProfile(trainerUid);
  const reviews = await getTrainerReviews(trainerUid);

  panel.innerHTML = `
    <h2 style="color:#0887e2">Trainer Profile</h2>
    <div class="card" style="margin-bottom:16px">
      <p>Give this code to clients so they can find you:</p>
      <div style="font-size:2rem;font-weight:900;letter-spacing:6px;color:#0887e2;margin:14px 0">
        ${shareCode || "N/A"}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">Public Trainer Details</h3>
      <p style="opacity:0.65;margin-bottom:14px">This section is trainer-only. Clients see these details in your profile modal.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <input id="tp-specialty" type="text" placeholder="Main Specialty"
          value="${(me?.specialty || "").replace(/"/g, "&quot;")}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <input id="tp-experience" type="text" placeholder="Experience (e.g. 6 years)"
          value="${(me?.experience || "").replace(/"/g, "&quot;")}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <input id="tp-session" type="number" min="1" placeholder="Price per session"
          value="${Number(me?.pricePerSession || 40)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <input id="tp-month" type="number" min="1" placeholder="Price per month"
          value="${Number(me?.pricePerMonth || 150)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <input id="tp-color" type="color" value="${me?.accentColor || "#0887e2"}" style="width:100%;height:42px;border:none;border-radius:8px;background:transparent;cursor:pointer">
        <input id="tp-availability" type="text" placeholder="Availability comma-separated"
          value="${Array.isArray(me?.availability) ? me.availability.join(", ") : "Mon, Wed, Fri"}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
      </div>
      <textarea id="tp-bio" placeholder="Write your trainer bio"
        style="margin-top:12px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;min-height:88px;resize:vertical">${me?.bio || ""}</textarea>
      <input id="tp-specialties" type="text" placeholder="Specialties comma-separated"
        value="${Array.isArray(me?.specialties) ? me.specialties.join(", ") : (me?.specialty || "")}" style="margin-top:12px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
      <input id="tp-certs" type="text" placeholder="Certifications comma-separated"
        value="${Array.isArray(me?.certifications) ? me.certifications.join(", ") : ""}" style="margin-top:12px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div>
          <label style="font-size:0.8rem;opacity:0.7">Trainer Type</label>
          <select id="tp-type" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;margin-top:4px">
            <option value="">— Select Type —</option>
            ${["HIIT","Yoga","Pilates","Strength","Bodybuilding","Cardio","CrossFit","Boxing / MMA","Cycling / Spin","Nutrition","Mobility / Stretch","Sports Performance","General Fitness"].map(tp => `<option value="${tp}" ${(me?.trainerType||me?.specialty||"") === tp ? "selected":""}>${tp}</option>`).join("")}
          </select>
        </div>
        <div>
          <label style="font-size:0.8rem;opacity:0.7">Max Clients (capacity)</label>
          <input id="tp-maxclients" type="number" min="1" max="100" value="${Number(me?.maxClients || 10)}"
            style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;margin-top:4px">
        </div>
      </div>
      <button id="tp-save" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;font-family:inherit;font-weight:600">Save Public Profile</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:10px">Client Reviews</h3>
      <div style="opacity:0.65;margin-bottom:10px">Average: <strong>${Number(me?.rating || 0).toFixed(1)}</strong> (${Number(me?.reviewCount || 0)} reviews)</div>
      <div id="tp-reviews-list">
        ${reviews.length ? reviews.slice(0, 12).map(r => `
          <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <strong>${r.clientName || "Client"}</strong>
              <span style="color:#ffd64a">${"★".repeat(Math.max(1, Math.min(5, Number(r.rating || 0))))}</span>
            </div>
            <div style="opacity:0.85;margin-top:4px">${r.text || ""}</div>
            <div style="opacity:0.5;font-size:0.78rem;margin-top:4px">${formatDate(r.createdAt)}</div>
          </div>
        `).join("") : `<p style="opacity:0.6">No reviews yet.</p>`}
      </div>
    </div>
  `;

  const splitCSV = (value) => String(value || "").split(",").map(x => x.trim()).filter(Boolean);

  document.getElementById("tp-save").addEventListener("click", async () => {
    try {
      await updateTrainerPublicProfile(trainerUid, {
        specialty: document.getElementById("tp-specialty").value,
        bio: document.getElementById("tp-bio").value,
        experience: document.getElementById("tp-experience").value,
        certifications: splitCSV(document.getElementById("tp-certs").value),
        availability: splitCSV(document.getElementById("tp-availability").value),
        specialties: splitCSV(document.getElementById("tp-specialties").value),
        pricePerSession: Number(document.getElementById("tp-session").value || 0),
        pricePerMonth: Number(document.getElementById("tp-month").value || 0),
        accentColor: document.getElementById("tp-color").value,
        trainerType: document.getElementById("tp-type").value,
        maxClients: Number(document.getElementById("tp-maxclients").value || 10)
      });
      showToast("Trainer profile updated.", "success");
      _loadTrainerShareCodePanel(trainerUid, shareCode);
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

// ============================================================
// CLIENT BIOGRAPHY PANEL
// ============================================================
async function _loadClientBiographyPanel(clientId) {
  const panel = document.getElementById("panel-biography");
  if (!panel) return;
  const bio = await getClientBiography(clientId).catch(() => null) || {};
  const iS = `width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
    background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;box-sizing:border-box;margin-top:4px`;
  const mkSel = (id, label, opts, cur) => `
    <div><label style="font-size:0.8rem;opacity:0.7">${label}</label>
    <select id="${id}" style="${iS}">
      <option value="">— Select —</option>
      ${opts.map(o => `<option value="${o}" ${cur === o ? "selected" : ""}>${o}</option>`).join("")}
    </select></div>`;
  const mkNum = (id, label, val, ph, step) => `
    <div><label style="font-size:0.8rem;opacity:0.7">${label}</label>
    <input id="${id}" type="number" ${step ? `step="${step}"` : ""} value="${val || ""}" placeholder="${ph}" style="${iS}"></div>`;
  const mkText = (id, label, val, ph) => `
    <div><label style="font-size:0.8rem;opacity:0.7">${label}</label>
    <input id="${id}" type="text" value="${(val||"").replace(/"/g,"&quot;")}" placeholder="${ph}" style="${iS}"></div>`;
  const mkTA = (id, label, val, ph) => `
    <div><label style="font-size:0.8rem;opacity:0.7">${label}</label>
    <textarea id="${id}" placeholder="${ph}" style="${iS};min-height:70px;resize:vertical">${val||""}</textarea></div>`;

  panel.innerHTML = `
    <h2 style="color:#0887e2">&#x1F464; My Profile &amp; Goals</h2>
    <p style="opacity:0.6;margin-bottom:20px">Fill this in so your trainer can personalise your workouts and nutrition. This is visible to any trainer you invite.</p>

    <div class="card" style="margin-bottom:18px">
      <h3 style="margin-bottom:14px">&#x2696; Body Measurements</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${mkNum("bio-weight","Weight (kg)",bio.weight,"e.g. 75","0.1")}
        ${mkNum("bio-height","Height (cm)",bio.height,"e.g. 175","0.1")}
        ${mkNum("bio-age","Age",bio.age,"e.g. 25","")}
        ${mkSel("bio-bodytype","Body Type",["Ectomorph (Lean/Slim)","Mesomorph (Muscular)","Endomorph (Stockier)","Mixed"],bio.bodyType)}
        ${mkSel("bio-gender","Gender",["Male","Female","Non-binary","Prefer not to say"],bio.gender)}
        ${mkSel("bio-activity","Activity Level",["Sedentary","Lightly Active","Moderately Active","Very Active","Athlete"],bio.activityLevel)}
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <h3 style="margin-bottom:14px">&#x26A0; Health &amp; Limitations</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${mkTA("bio-injuries","Injuries / Physical Limitations",bio.injuries,"e.g. bad knees, lower back pain...")}
        ${mkTA("bio-medical","Medical Conditions",bio.medical,"e.g. asthma, diabetes, high blood pressure...")}
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <h3 style="margin-bottom:14px">&#x1F3AF; Goals</h3>
      ${mkSel("bio-goal","Primary Goal",["Lose Weight","Build Muscle","Improve Endurance","Increase Strength","Improve Flexibility","Athletic Performance","General Fitness","Body Recomposition"],bio.primaryGoal)}
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${mkNum("bio-targetweight","Target Weight (kg)",bio.targetWeight,"e.g. 70","0.1")}
        ${mkNum("bio-targetmonths","Timeframe (months)",bio.targetMonths,"e.g. 3","")}
      </div>
      ${mkTA("bio-goaldesc","Describe your goals in detail",bio.goalDescription,"Tell your trainer what you want to achieve, how you want to feel...")}
    </div>

    <div class="card" style="margin-bottom:18px">
      <h3 style="margin-bottom:14px">&#x1F96C; Nutrition Preferences</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${mkSel("bio-diet","Diet Type",["No Restriction","Vegetarian","Vegan","Keto","Paleo","Gluten-Free","Dairy-Free","Halal","Kosher","Intermittent Fasting"],bio.dietType)}
        ${mkNum("bio-calories","Daily Calorie Goal",bio.calorieGoal,"e.g. 2000","")}
        ${mkText("bio-allergies","Food Allergies",bio.allergies,"e.g. nuts, shellfish, dairy")}
        ${mkNum("bio-mealsperday","Meals Per Day",bio.mealsPerDay,"3","")}
      </div>
      ${mkTA("bio-nutnotes","Nutrition Notes",bio.nutritionNotes,"Supplements you take, foods you love/hate, eating habits...")}
    </div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">&#x1F3CB; Training Preferences</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${mkSel("bio-traintype","Preferred Training Type",["Weightlifting","HIIT","Cardio","Yoga","Pilates","CrossFit","Calisthenics","Mixed","Sports-Specific"],bio.trainingType)}
        ${mkSel("bio-fitlvl","Fitness Level",["Beginner","Intermediate","Advanced","Elite"],bio.fitnessLevel)}
        ${mkNum("bio-traindays","Training Days/Week",bio.trainingDays,"3-5","")}
        ${mkNum("bio-sessionlen","Session Length (min)",bio.sessionLength,"60","")}
      </div>
    </div>

    <button id="bio-save" style="padding:12px 36px;border:none;border-radius:10px;
      background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;font-size:1rem;
      cursor:pointer;font-family:inherit;font-weight:700">Save Profile</button>
    <span id="bio-saved-msg" style="margin-left:16px;opacity:0;color:#00c850;font-weight:600;transition:opacity 0.4s">&#x2714; Saved!</span>
  `;

  document.getElementById("bio-save").addEventListener("click", async () => {
    try {
      await saveClientBiography(clientId, {
        weight:          parseFloat(document.getElementById("bio-weight").value) || null,
        height:          parseFloat(document.getElementById("bio-height").value) || null,
        age:             parseInt(document.getElementById("bio-age").value) || null,
        bodyType:        document.getElementById("bio-bodytype").value,
        gender:          document.getElementById("bio-gender").value,
        activityLevel:   document.getElementById("bio-activity").value,
        injuries:        document.getElementById("bio-injuries").value,
        medical:         document.getElementById("bio-medical").value,
        primaryGoal:     document.getElementById("bio-goal").value,
        targetWeight:    parseFloat(document.getElementById("bio-targetweight").value) || null,
        targetMonths:    parseInt(document.getElementById("bio-targetmonths").value) || null,
        goalDescription: document.getElementById("bio-goaldesc").value,
        dietType:        document.getElementById("bio-diet").value,
        calorieGoal:     parseInt(document.getElementById("bio-calories").value) || null,
        allergies:       document.getElementById("bio-allergies").value,
        mealsPerDay:     parseInt(document.getElementById("bio-mealsperday").value) || null,
        nutritionNotes:  document.getElementById("bio-nutnotes").value,
        trainingType:    document.getElementById("bio-traintype").value,
        fitnessLevel:    document.getElementById("bio-fitlvl").value,
        trainingDays:    parseInt(document.getElementById("bio-traindays").value) || null,
        sessionLength:   parseInt(document.getElementById("bio-sessionlen").value) || null
      });
      const msg = document.getElementById("bio-saved-msg");
      msg.style.opacity = "1";
      setTimeout(() => { msg.style.opacity = "0"; }, 2800);
    } catch (e) { showToast(e.message, "error"); }
  });
}

async function _loadTrainerClientsPanel(trainerUid) {
  const panel = document.getElementById("panel-clients");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#0887e2">&#x1F465; Clients</h2>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button id="tc-tab-invites" style="padding:9px 22px;border:none;border-radius:8px;
        background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-weight:600">
        Invites <span id="tc-invite-count" style="margin-left:6px;background:rgba(255,255,255,0.25);border-radius:20px;padding:1px 8px;font-size:0.78rem"></span>
      </button>
      <button id="tc-tab-hired" style="padding:9px 22px;border:none;border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
        Hired Clients
      </button>
      <button id="tc-tab-hours" style="padding:9px 22px;border:none;border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
        Hours &amp; Sessions
      </button>
    </div>
    <div id="tc-invites-panel"></div>
    <div id="tc-hired-panel" style="display:none"></div>
    <div id="tc-hours-panel" style="display:none"></div>
  `;

  const setTab = (active) => {
    ["invites","hired","hours"].forEach(t => {
      const btn = document.getElementById("tc-tab-" + t);
      const pnl = document.getElementById("tc-" + t + "-panel");
      if (btn) btn.style.background = t === active ? "linear-gradient(90deg,#0887e2,#006af5)" : "rgba(255,255,255,0.1)";
      if (pnl) pnl.style.display = t === active ? "" : "none";
    });
  };

  document.getElementById("tc-tab-invites").addEventListener("click", () => setTab("invites"));
  document.getElementById("tc-tab-hired").addEventListener("click", () => { setTab("hired"); _refreshTrainerHiredList(trainerUid); });
  document.getElementById("tc-tab-hours").addEventListener("click", () => { setTab("hours"); _loadTrainerHoursPanel(trainerUid); });

  _refreshTrainerInvitesList(trainerUid);
  _refreshTrainerHiredList(trainerUid);
}

async function _refreshTrainerInvitesList(trainerUid) {
  const container = document.getElementById("tc-invites-panel");
  if (!container) return;
  container.innerHTML = `<p style="opacity:0.5">Loading invites...</p>`;
  try {
    const invites = await getTrainerInvites(trainerUid);
    const pending = invites.filter(inv => inv.status === "pending");
    const countEl = document.getElementById("tc-invite-count");
    if (countEl) countEl.textContent = pending.length || "";
    if (pending.length === 0) {
      container.innerHTML = `<div class="card"><p style="opacity:0.6">No pending invites.</p></div>`;
      return;
    }
    container.innerHTML = "";
    for (const inv of pending) {
      const clientProfile = await getUserProfile(inv.clientId).catch(() => null);
      const clientBio = await getClientBiography(inv.clientId).catch(() => null);
      const name = clientProfile?.name || inv.clientId;
      const card = document.createElement("div");
      card.className = "card";
      card.style.cssText = "margin-bottom:16px;border-left:3px solid #0887e2;position:relative";
      const bioHtml = clientBio ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0;font-size:0.82rem">
          ${clientBio.weight ? `<span style="opacity:0.7">&#x2696; ${clientBio.weight}kg</span>` : ""}
          ${clientBio.height ? `<span style="opacity:0.7">&#x1F4CF; ${clientBio.height}cm</span>` : ""}
          ${clientBio.age ? `<span style="opacity:0.7">&#x1F464; Age ${clientBio.age}</span>` : ""}
          ${clientBio.bodyType ? `<span style="opacity:0.7">&#x1F3CB; ${clientBio.bodyType}</span>` : ""}
          ${clientBio.fitnessLevel ? `<span style="opacity:0.7">&#x26A1; ${clientBio.fitnessLevel}</span>` : ""}
          ${clientBio.activityLevel ? `<span style="opacity:0.7">&#x1F6B6; ${clientBio.activityLevel}</span>` : ""}
        </div>
        ${clientBio.primaryGoal ? `<div style="padding:6px 12px;border-radius:8px;background:rgba(8,135,226,0.12);color:#0887e2;font-size:0.82rem;margin-bottom:8px;display:inline-block">&#x1F3AF; Goal: ${clientBio.primaryGoal}</div>` : ""}
        ${clientBio.goalDescription ? `<p style="font-size:0.82rem;opacity:0.75;margin-bottom:8px">${clientBio.goalDescription}</p>` : ""}
        ${clientBio.dietType ? `<span style="font-size:0.75rem;padding:2px 8px;border-radius:10px;background:rgba(0,200,80,0.15);color:#00c850;margin-right:6px">&#x1F96C; ${clientBio.dietType}</span>` : ""}
        ${clientBio.injuries ? `<span style="font-size:0.75rem;padding:2px 8px;border-radius:10px;background:rgba(255,0,51,0.12);color:#ff5577;margin-right:6px">&#x26A0; ${clientBio.injuries}</span>` : ""}
      ` : `<p style="opacity:0.5;font-size:0.82rem;margin:8px 0">Client hasn't filled their profile yet.</p>`;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <strong style="font-size:1rem;color:#0887e2">${name}</strong>
            <div style="font-size:0.78rem;opacity:0.55;margin-top:2px">Invited ${new Date(inv.sentAt).toLocaleDateString()}</div>
          </div>
          <span style="padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;
            background:rgba(255,200,0,0.2);color:#ffd64a;border:1px solid rgba(255,200,0,0.3)">PENDING</span>
        </div>
        <h4 style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Client Profile</h4>
        ${bioHtml}
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="tc-accept-btn" data-cid="${inv.clientId}" data-cname="${name}"
            style="flex:1;padding:9px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c850,#009e40);
                   color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-weight:600">
            ✓ Accept & Request Payment
          </button>
          <button class="tc-dismiss-btn" data-cid="${inv.clientId}"
            style="padding:9px 18px;border:1px solid rgba(255,0,51,0.4);border-radius:8px;background:transparent;
                   color:#ff5577;cursor:pointer;font-family:Poppins,sans-serif">
            Dismiss
          </button>
        </div>
      `;
      container.appendChild(card);
    }
    container.querySelectorAll(".tc-accept-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Processing...";
        try {
          await acceptTrainerInvite(trainerUid, btn.dataset.cid);
          showToast(`${btn.dataset.cname} accepted! Payment request sent to client.`, "success");
          _refreshTrainerInvitesList(trainerUid);
          _refreshTrainerHiredList(trainerUid);
        } catch (e) { showToast(e.message, "error"); btn.disabled = false; btn.textContent = "✓ Accept & Request Payment"; }
      });
    });
    container.querySelectorAll(".tc-dismiss-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await dismissTrainerInvite(trainerUid, btn.dataset.cid);
          showToast("Invite dismissed.", "success");
          _refreshTrainerInvitesList(trainerUid);
        } catch (e) { showToast(e.message, "error"); }
      });
    });
  } catch (e) {
    container.innerHTML = `<p style="color:#ff5577">${e.message}</p>`;
  }
}

async function _refreshTrainerHiredList(trainerUid) {
  const container = document.getElementById("tc-hired-panel");
  if (!container) return;
  container.innerHTML = `<p style="opacity:0.5">Loading hired clients...</p>`;
  try {
    const clients = await getTrainerHiredClients(trainerUid);
    const trainerSnap = await db.ref("users/" + trainerUid + "/maxClients").once("value");
    const maxClients = trainerSnap.val() || 10;
    const capacityBg = clients.length >= maxClients ? "rgba(255,0,51,0.12)" : "rgba(0,200,80,0.12)";
    const capacityColor = clients.length >= maxClients ? "#ff5577" : "#00c850";
    container.innerHTML = `
      <div style="padding:10px 16px;border-radius:10px;background:${capacityBg};color:${capacityColor};
           font-size:0.85rem;font-weight:600;margin-bottom:16px;display:inline-block">
        ${clients.length} / ${maxClients} clients ${clients.length >= maxClients ? "— AT CAPACITY" : "— Available"}
      </div>
    `;
    if (clients.length === 0) {
      container.innerHTML += `<div class="card"><p style="opacity:0.6">No hired clients yet.</p></div>`;
      return;
    }
    clients.forEach(client => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cssText = "margin-bottom:14px;display:flex;justify-content:space-between;align-items:center";
      card.innerHTML = `
        <div>
          <strong style="color:#0887e2">${client.name}</strong>
          <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">${client.email || ""}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="tc-viewbio-btn" data-cid="${client.id}" data-cname="${client.name}"
            style="padding:7px 14px;border:1px solid rgba(8,135,226,0.4);border-radius:8px;
                   background:transparent;color:#0887e2;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.82rem">
            View Bio
          </button>
          <button class="tc-logsession-btn" data-cid="${client.id}" data-cname="${client.name}"
            style="padding:7px 14px;border:none;border-radius:8px;
                   background:rgba(0,200,80,0.15);color:#00c853;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.82rem">
            Log Session
          </button>
          <button class="tc-viewdetail-btn" data-cid="${client.id}" data-cname="${client.name}"
            style="padding:7px 14px;border:none;border-radius:8px;
                   background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.82rem">
            Details
          </button>
        </div>
      `;
      container.appendChild(card);
    });
    container.querySelectorAll(".tc-viewbio-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const bio = await getClientBiography(btn.dataset.cid).catch(() => null);
        const name = btn.dataset.cname;
        if (!bio) { showToast(`${name} has no profile filled yet.`, "error"); return; }
        const msg = `
          <div style="max-height:400px;overflow-y:auto;font-size:0.88rem;line-height:1.7">
            ${bio.weight ? `<b>Weight:</b> ${bio.weight}kg &nbsp; ` : ""}
            ${bio.height ? `<b>Height:</b> ${bio.height}cm &nbsp; ` : ""}
            ${bio.age ? `<b>Age:</b> ${bio.age} &nbsp; ` : ""}<br>
            ${bio.bodyType ? `<b>Body Type:</b> ${bio.bodyType}<br>` : ""}
            ${bio.fitnessLevel ? `<b>Fitness Level:</b> ${bio.fitnessLevel}<br>` : ""}
            ${bio.activityLevel ? `<b>Activity:</b> ${bio.activityLevel}<br>` : ""}
            ${bio.primaryGoal ? `<b>Goal:</b> ${bio.primaryGoal}<br>` : ""}
            ${bio.goalDescription ? `<b>Goal Detail:</b> ${bio.goalDescription}<br>` : ""}
            ${bio.dietType ? `<b>Diet:</b> ${bio.dietType}<br>` : ""}
            ${bio.calorieGoal ? `<b>Calorie Goal:</b> ${bio.calorieGoal} kcal/day<br>` : ""}
            ${bio.allergies ? `<b>Allergies:</b> ${bio.allergies}<br>` : ""}
            ${bio.trainingType ? `<b>Prefers:</b> ${bio.trainingType}<br>` : ""}
            ${bio.trainingDays ? `<b>Training Days/Week:</b> ${bio.trainingDays}<br>` : ""}
            ${bio.injuries ? `<b>Injuries:</b> ${bio.injuries}<br>` : ""}
            ${bio.medical ? `<b>Medical:</b> ${bio.medical}<br>` : ""}
            ${bio.nutritionNotes ? `<b>Nutrition Notes:</b> ${bio.nutritionNotes}` : ""}
          </div>`;
        showModal(`${name}'s Profile`, msg, null);
      });
    });

    // Log Training Session
    container.querySelectorAll(".tc-logsession-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const clientId2 = btn.dataset.cid, clientName2 = btn.dataset.cname;
        const today = new Date().toISOString().split("T")[0];
        showModal(`Log Session — ${clientName2}`, `
          <div style="display:grid;gap:10px">
            <input id="ls-date" type="date" value="${today}"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:0.8rem;opacity:0.65;display:block;margin-bottom:4px">Start Time</label>
                <input id="ls-start" type="time" value="09:00"
                  style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              </div>
              <div>
                <label style="font-size:0.8rem;opacity:0.65;display:block;margin-bottom:4px">End Time</label>
                <input id="ls-end" type="time" value="10:00"
                  style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              </div>
            </div>
            <div id="ls-duration-display" style="font-size:0.82rem;color:#0887e2;opacity:0.8">Duration: 60 min</div>
            <select id="ls-type"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#1a1a2e;color:#fff;font-family:Poppins,sans-serif">
              <option>Personal Training</option>
              <option>Online</option>
              <option>Assessment</option>
              <option>Group</option>
              <option>Rehabilitation</option>
            </select>
            <textarea id="ls-notes" rows="2" placeholder="Notes (optional)"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif;resize:vertical"></textarea>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.88rem;color:#fff">
              <input type="checkbox" id="ls-paid" style="accent-color:#00c853;width:16px;height:16px"> Mark as Paid
            </label>
          </div>
        `, async () => {
          const startTime = document.getElementById("ls-start").value;
          const endTime   = document.getElementById("ls-end").value;
          const dur = _calcSessionDuration(startTime, endTime);
          try {
            await logTrainingSession(trainerUid, clientId2, {
              date:            document.getElementById("ls-date").value,
              startTime,
              endTime,
              durationMinutes: dur,
              type:            document.getElementById("ls-type").value,
              notes:           (document.getElementById("ls-notes").value || "").trim(),
              paid:            document.getElementById("ls-paid").checked
            });
            showToast(`Session logged for ${clientName2}.`, "success");
          } catch(e) { showToast(e.message, "error"); }
        });
        // Live duration update
        setTimeout(() => {
          const updateDur = () => {
            const s = document.getElementById("ls-start");
            const e2 = document.getElementById("ls-end");
            const d = document.getElementById("ls-duration-display");
            if (s && e2 && d) d.textContent = "Duration: " + _calcSessionDuration(s.value, e2.value) + " min";
          };
          ["ls-start","ls-end"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("change", updateDur);
          });
        }, 60);
      });
    });
    container.querySelectorAll(".tc-viewdetail-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        _loadClientDetailPanel(btn.dataset.cid, btn.dataset.cname);
        document.querySelectorAll(".xgym-panel").forEach(p => p.style.display = "none");
        const detail = document.getElementById("panel-client-detail");
        if (detail) { detail.style.display = "block"; detail.scrollIntoView({ behavior: "smooth" }); }
      });
    });
  } catch (e) {
    container.innerHTML = `<p style="color:#ff5577">${e.message}</p>`;
  }
}

async function _loadTrainerHoursPanel(trainerUid) {
  const container = document.getElementById("tc-hours-panel");
  if (!container) return;
  container.innerHTML = `<p style="opacity:0.5">Loading sessions…</p>`;
  try {
    const [summary, sessions, hireds] = await Promise.all([
      getTrainerHoursSummary(trainerUid),
      getTrainerSessions(trainerUid),
      getTrainerHiredClients(trainerUid)
    ]);
    const clientMap = {};
    hireds.forEach(c => { clientMap[c.id] = c.name || c.id; });

    const fh = (h) => Number(h || 0).toFixed(1);
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px">
        <div class="card" style="text-align:center;cursor:default">
          <h3 style="margin:0;color:#0887e2">${fh(summary.totalHours)}</h3>
          <p style="margin-top:6px;font-size:0.8rem;opacity:0.7">Total Hours</p>
        </div>
        <div class="card" style="text-align:center;cursor:default">
          <h3 style="margin:0;color:#00c853">${fh(summary.monthHours)}</h3>
          <p style="margin-top:6px;font-size:0.8rem;opacity:0.7">This Month</p>
        </div>
        <div class="card" style="text-align:center;cursor:default">
          <h3 style="margin:0;color:#e96d25">${summary.totalSessions}</h3>
          <p style="margin-top:6px;font-size:0.8rem;opacity:0.7">Total Sessions</p>
        </div>
        <div class="card" style="text-align:center;cursor:default">
          <h3 style="margin:0;color:#7c4dff">${summary.monthSessions}</h3>
          <p style="margin-top:6px;font-size:0.8rem;opacity:0.7">Sessions (Month)</p>
        </div>
      </div>
      <div id="trainer-sessions-list"></div>
    `;
    const listEl = document.getElementById("trainer-sessions-list");
    if (!sessions.length) {
      listEl.innerHTML = `<div class="card" style="text-align:center;opacity:0.55;padding:30px">No training sessions logged yet.<br>
        <span style="font-size:0.82rem;display:block;margin-top:6px">Use "Log Session" on any hired client to get started.</span></div>`;
      return;
    }
    listEl.innerHTML = sessions.map(s => {
      const cName = clientMap[s.clientId] || s.clientId;
      const dur = s.durationMinutes >= 60
        ? Math.floor(s.durationMinutes / 60) + "h " + (s.durationMinutes % 60 ? (s.durationMinutes % 60) + "m" : "")
        : s.durationMinutes + " min";
      const paidBadge = s.paid
        ? `<span style="background:rgba(0,200,80,0.12);color:#00c853;padding:2px 8px;border-radius:8px;font-size:0.72rem;font-weight:700">PAID</span>`
        : `<span style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.45);padding:2px 8px;border-radius:8px;font-size:0.72rem">UNPAID</span>`;
      return `
        <div class="card" style="margin-bottom:10px;cursor:default;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <strong style="color:#0887e2">${cName}</strong>
              <span style="background:rgba(8,135,226,0.1);color:#0887e2;padding:2px 8px;border-radius:8px;font-size:0.72rem">${s.type || "Personal Training"}</span>
              ${paidBadge}
            </div>
            <div style="font-size:0.82rem;opacity:0.7">
              📅 ${s.date || "—"}
              ${s.startTime ? ` &nbsp;·&nbsp; 🕐 ${s.startTime}–${s.endTime}` : ""}
              &nbsp;·&nbsp; ⏱ ${dur}
            </div>
            ${s.notes ? `<div style="font-size:0.78rem;opacity:0.55;margin-top:4px;font-style:italic">${s.notes}</div>` : ""}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
            <button class="ts-edit-btn" data-id="${s.id}"
              data-date="${s.date||''}" data-start="${s.startTime||''}" data-end="${s.endTime||''}"
              data-type="${s.type||''}" data-notes="${(s.notes||'').replace(/"/g,'&quot;')}"
              data-paid="${s.paid ? '1' : '0'}"
              style="padding:6px 12px;border:1px solid rgba(8,135,226,0.35);border-radius:7px;
              background:transparent;color:#0887e2;cursor:pointer;font-size:0.78rem">Edit</button>
            <button class="ts-del-btn" data-id="${s.id}"
              style="padding:6px 12px;border:1px solid rgba(255,0,51,0.35);border-radius:7px;
              background:transparent;color:#ff0033;cursor:pointer;font-size:0.78rem">Delete</button>
          </div>
        </div>`;
    }).join("");

    // Edit session
    listEl.querySelectorAll(".ts-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const d = btn.dataset;
        showModal("Edit Training Session", `
          <div style="display:grid;gap:10px">
            <input id="tse-date" type="date" value="${d.date}"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <input id="tse-start" type="time" value="${d.start}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="tse-end" type="time" value="${d.end}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            </div>
            <select id="tse-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#1a1a2e;color:#fff;font-family:Poppins,sans-serif">
              ${["Personal Training","Online","Assessment","Group","Rehabilitation"].map(t => `<option ${t === d.type ? "selected" : ""}>${t}</option>`).join("")}
            </select>
            <textarea id="tse-notes" rows="2" placeholder="Notes"
              style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif;resize:vertical">${d.notes}</textarea>
            <label style="display:flex;align-items:center;gap:8px;color:#fff;font-size:0.88rem;cursor:pointer">
              <input type="checkbox" id="tse-paid" ${d.paid === '1' ? 'checked' : ''} style="accent-color:#00c853;width:16px;height:16px"> Paid
            </label>
          </div>
        `, async () => {
          const s2 = document.getElementById("tse-start").value;
          const e2 = document.getElementById("tse-end").value;
          try {
            await updateTrainingSession(d.id, {
              date:            document.getElementById("tse-date").value,
              startTime:       s2,
              endTime:         e2,
              durationMinutes: _calcSessionDuration(s2, e2),
              type:            document.getElementById("tse-type").value,
              notes:           (document.getElementById("tse-notes").value || "").trim(),
              paid:            document.getElementById("tse-paid").checked,
              updatedAt:       Date.now()
            });
            showToast("Session updated.", "success");
            _loadTrainerHoursPanel(trainerUid);
          } catch(e) { showToast(e.message, "error"); }
        });
      });
    });

    // Delete session
    listEl.querySelectorAll(".ts-del-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        showModal("Delete Session", "<p>Delete this training session?</p>", async () => {
          try {
            await deleteTrainingSession(btn.dataset.id);
            showToast("Session deleted.", "success");
            _loadTrainerHoursPanel(trainerUid);
          } catch(e) { showToast(e.message, "error"); }
        });
      });
    });
  } catch(e) {
    container.innerHTML = `<p style="color:#ff5577">${e.message}</p>`;
  }
}

async function _loadClientDetailPanel(clientId, clientName) {
  const panel = document.getElementById("panel-client-detail");
  if (!panel) return;

  panel.innerHTML = `<h2 style="color:#0887e2">${clientName}'s Details</h2>
    <p style="opacity:0.6">Loading\u2026</p>`;

  try {
    const [progressEntries, meals, workoutSessions, trainerNotes, clientTrainingSessions] = await Promise.all([
      getClientProgress(clientId),
      getClientMeals(clientId),
      getWorkoutSessions(clientId),
      getTrainerNotes(clientId),
      getClientSessions(clientId).catch(() => [])
    ]);
    let weeklyStats = { workoutsThisWeek: 0, streak: 0, totalVolume: 0, totalSessions: 0 };
    try { weeklyStats = await getWeeklyStats(clientId); } catch(e) {}

    const progressHtml = progressEntries.length === 0
      ? "<p>No progress logged.</p>"
      : progressEntries.map(e => `
          <div class="card" style="margin-bottom:10px;font-size:0.9rem">
            <strong>${formatDate(e.createdAt)}</strong><br>
            Weight: ${e.weight}kg | Bench: ${e.benchPress}kg |
            Squat: ${e.squat}kg | Deadlift: ${e.deadlift}kg
          </div>`).join("");

    const mealsHtml = meals.length === 0
      ? "<p>No meals logged.</p>"
      : meals.map(m => `
          <div class="card" style="margin-bottom:10px;font-size:0.9rem">
            <strong>${m.mealName}</strong> \u2014 ${formatDate(m.createdAt)}<br>
            Cal: ${m.calories} | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fats: ${m.fats}g
          </div>`).join("");

    const sessionsHtml = workoutSessions.length === 0
      ? "<p>No workout sessions logged yet.</p>"
      : workoutSessions.slice(0, 10).map(s => {
          const exList = (s.exercises || []).map(ex =>
            `<span style="display:inline-block;padding:3px 10px;border-radius:8px;margin:2px;
              font-size:0.75rem;background:rgba(8,135,226,0.15);color:#0887e2">${ex.name} ${ex.sets}\u00D7${ex.reps} @ ${ex.weight}lb</span>`
          ).join("");
          return `
            <div class="card" style="margin-bottom:10px;font-size:0.9rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong style="color:#0887e2">${s.name || "Workout"}</strong>
                <span style="opacity:0.5;font-size:0.8rem">${formatDate(s.completedAt)}</span>
              </div>
              <div>${exList}</div>
              ${s.duration ? `<div style="margin-top:6px;opacity:0.5;font-size:0.8rem">Duration: ~${s.duration} min</div>` : ""}
            </div>`;
        }).join("");

    const notesHtml = trainerNotes.length === 0
      ? "<p style='opacity:0.5'>No notes sent yet.</p>"
      : trainerNotes.slice(0, 5).map(n => `
          <div style="padding:10px 14px;border-radius:8px;margin-bottom:8px;
               background:rgba(233,109,37,0.08);border-left:3px solid #e96d25;font-size:0.85rem">
            <div style="opacity:0.5;font-size:0.75rem;margin-bottom:4px">${formatDate(n.createdAt)}</div>
            ${n.message}
          </div>`).join("");

    const trainSessionsHtml = !clientTrainingSessions.length
      ? "<p style='opacity:0.5'>No trainer sessions recorded yet.</p>"
      : clientTrainingSessions.slice(0, 10).map(s => {
          const dur = s.durationMinutes >= 60
            ? Math.floor(s.durationMinutes / 60) + "h " + (s.durationMinutes % 60 ? s.durationMinutes % 60 + "m" : "")
            : s.durationMinutes + " min";
          return `<div class="card" style="margin-bottom:10px;font-size:0.85rem;cursor:default">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <div>
                <span style="background:rgba(8,135,226,0.1);color:#0887e2;padding:2px 8px;border-radius:6px;font-size:0.75rem">${s.type || "Personal Training"}</span>
                <span style="margin-left:8px;opacity:0.7">${s.date || "—"}</span>
                ${s.startTime ? `<span style="opacity:0.55;margin-left:6px;font-size:0.78rem">${s.startTime}–${s.endTime}</span>` : ""}
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="opacity:0.65">⏱ ${dur}</span>
                ${s.paid ? `<span style="background:rgba(0,200,80,0.12);color:#00c853;padding:2px 8px;border-radius:8px;font-size:0.72rem">PAID</span>` : ""}
              </div>
            </div>
            ${s.notes ? `<div style="margin-top:6px;opacity:0.55;font-size:0.78rem;font-style:italic">${s.notes}</div>` : ""}
          </div>`;
        }).join("");

    panel.innerHTML = `
      <h2 style="color:#0887e2">${clientName}'s LiftStreak Dashboard</h2>

      <!-- Weekly Stats Overview -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0">
        <div class="card" style="text-align:center;padding:18px">
          <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">This Week</div>
          <div style="font-size:1.8rem;font-weight:700;color:#e96d25">${weeklyStats.workoutsThisWeek}</div>
          <div style="font-size:0.75rem;opacity:0.5">workouts done</div>
        </div>
        <div class="card" style="text-align:center;padding:18px">
          <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Streak</div>
          <div style="font-size:1.8rem;font-weight:700;color:#0887e2">${weeklyStats.streak}</div>
          <div style="font-size:0.75rem;opacity:0.5">days in a row</div>
        </div>
        <div class="card" style="text-align:center;padding:18px">
          <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Volume</div>
          <div style="font-size:1.8rem;font-weight:700;color:#ffd64a">${weeklyStats.totalVolume >= 1000 ? Math.round(weeklyStats.totalVolume / 1000) + "k" : weeklyStats.totalVolume}</div>
          <div style="font-size:0.75rem;opacity:0.5">lbs this week</div>
        </div>
        <div class="card" style="text-align:center;padding:18px">
          <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Total</div>
          <div style="font-size:1.8rem;font-weight:700;color:#00c850">${weeklyStats.totalSessions}</div>
          <div style="font-size:0.75rem;opacity:0.5">all-time sessions</div>
        </div>
      </div>

      <!-- Send Coaching Note -->
      <div class="card" style="margin-bottom:20px;border-left:3px solid #e96d25">
        <h3 style="color:#e96d25;margin-bottom:10px">Send Coaching Note</h3>
        <div style="display:flex;gap:10px">
          <textarea id="trainer-note-input" placeholder="Write feedback, tips, or encouragement for ${clientName}..."
            style="flex:1;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                   background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;
                   font-size:0.9rem;resize:vertical;min-height:60px"></textarea>
          <button id="send-note-btn"
            style="padding:10px 20px;border:none;border-radius:8px;align-self:flex-end;
                   background:linear-gradient(90deg,#e96d25,#ff5500);color:#fff;
                   cursor:pointer;font-family:'Exo 2',sans-serif;font-weight:600">
            Send
          </button>
        </div>
        <div style="margin-top:12px">${notesHtml}</div>
      </div>

      <!-- Workout Sessions (LiftStreak) -->
      <h3 style="margin-top:20px;color:#0887e2">Workout Sessions</h3>
      ${sessionsHtml}

      <!-- Trainer Sessions -->
      <h3 style="margin-top:20px;color:#00c853">Trainer Sessions</h3>
      ${trainSessionsHtml}

      <!-- Progress -->
      <h3 style="margin-top:20px">Lift Progress</h3>${progressHtml}

      <!-- Meals -->
      <h3 style="margin-top:20px">Meal Log</h3>${mealsHtml}
    `;

    // Send note handler
    document.getElementById("send-note-btn").addEventListener("click", async () => {
      const input = document.getElementById("trainer-note-input");
      const message = input.value.trim();
      if (!message) { showToast("Enter a message.", "error"); return; }
      try {
        const currentUser = auth.currentUser;
        await sendTrainerNote(currentUser.uid, clientId, message);
        showToast("Note sent!", "success");
        input.value = "";
        // Reload the panel
        _loadClientDetailPanel(clientId, clientName);
      } catch (e) {
        showToast(e.message, "error");
      }
    });

  } catch (e) {
    panel.innerHTML += `<p style="color:#0887e2">${e.message}</p>`;
  }
}

async function _loadTrainerWorkoutBuilderPanel(trainerUid) {
  const panel = document.getElementById("panel-workout-builder");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const dayOpts = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");
  const categories = ["Push","Pull","Legs","Cardio","Full Body","Other"];
  const catOpts = categories.map(c => `<option value="${c}">${c}</option>`).join("");
  const inputStyle = `padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
    background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif`;

  panel.innerHTML = `
    <h2 style="color:#0887e2">Workout Builder</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>Create Workout for Client</h3>
      <div style="display:flex;gap:12px;margin-top:12px;align-items:center">
        <select id="wb-client-sel" style="flex:1;${inputStyle}">
          <option value="">— Select hired client —</option>
        </select>
        <button id="wb-view-plans" style="padding:8px 18px;border:none;border-radius:8px;
          background:rgba(8,135,226,0.2);color:#0887e2;cursor:pointer;font-family:Poppins,sans-serif;
          font-size:0.85rem;white-space:nowrap">View Existing Plans</button>
      </div>
      <div id="wb-client-bio-ctx" style="margin-top:12px;display:none;padding:12px;border-radius:10px;
        background:rgba(8,135,226,0.06);border:1px solid rgba(8,135,226,0.18);font-size:0.83rem"></div>
      <div id="wb-existing-plans" style="margin-top:14px;display:none"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
        <select id="wb-day" style="${inputStyle}">${dayOpts}</select>
        <select id="wb-category" style="${inputStyle}">
          <option value="">— Category —</option>
          ${catOpts}
        </select>
      </div>
      <div id="wb-exercises" style="margin-top:16px"></div>
      <button id="wb-add-exercise"
        style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
               background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
        + Add Exercise
      </button>
      <br><br>
      <button id="wb-save"
        style="padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;
               cursor:pointer;font-family:Poppins,sans-serif;font-weight:600">
        Save Workout
      </button>
    </div>
  `;

  document.getElementById("wb-add-exercise").addEventListener("click", () => {
    const row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr 1fr 2fr auto;gap:8px;margin-bottom:10px;align-items:center";
    row.innerHTML = `
      <input class="wb-ex-name" type="text" placeholder="Exercise name" style="${inputStyle}">
      <input class="wb-ex-sets" type="number" placeholder="Sets" style="${inputStyle}">
      <input class="wb-ex-reps" type="number" placeholder="Reps" style="${inputStyle}">
      <input class="wb-ex-weight" type="number" placeholder="Weight (lb)" style="${inputStyle}">
      <input class="wb-ex-notes" type="text" placeholder="Notes (optional)" style="${inputStyle}">
      <button class="wb-remove-ex" style="padding:4px 10px;border:none;border-radius:6px;
        background:rgba(255,0,51,0.3);color:#ff0033;cursor:pointer;font-size:0.9rem">×</button>`;
    document.getElementById("wb-exercises").appendChild(row);
    row.querySelector(".wb-remove-ex").addEventListener("click", () => row.remove());
  });

  // View existing plans
  document.getElementById("wb-view-plans").addEventListener("click", async () => {
    const selEl = document.getElementById("wb-client-sel");
    const clientId = selEl?.value;
    const clientName = selEl?.options[selEl.selectedIndex]?.text;
    if (!clientId) { showToast("Select a client first.", "error"); return; }
    const container = document.getElementById("wb-existing-plans");
    container.style.display = "block";
    container.innerHTML = '<p style="opacity:0.5">Loading...</p>';
    try {
      const plans = await getTrainerWorkouts(trainerUid, clientId);
      if (plans.length === 0) {
        container.innerHTML = '<p style="opacity:0.5">No workouts found for this client.</p>';
        return;
      }
      container.innerHTML = plans.map(p => {
        const catBadge = p.category ? `<span style="display:inline-block;padding:2px 10px;border-radius:12px;
          background:rgba(8,135,226,0.15);color:#0887e2;font-size:0.72rem;font-weight:600;margin-left:8px">${p.category}</span>` : "";
        const exList = (p.exercises || []).map(ex =>
          `<span style="display:inline-block;margin:2px 4px;padding:3px 10px;border-radius:12px;
           background:rgba(255,255,255,0.06);font-size:0.78rem">${ex.name} ${ex.sets}x${ex.reps}${ex.weight ? " @ " + ex.weight + "lb" : ""}</span>`).join("");
        return `<div class="card" style="margin-bottom:10px;font-size:0.85rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span><strong>${p.day}</strong>${catBadge} — ${formatDate(p.createdAt)}</span>
            <button class="wb-del-plan" data-id="${p.id}" style="padding:4px 12px;border:none;border-radius:6px;
              background:rgba(255,0,51,0.3);color:#ff0033;cursor:pointer;font-size:0.78rem">Delete</button>
          </div>
          <div style="margin-top:6px">${exList}</div>
        </div>`;
      }).join("");
      container.querySelectorAll(".wb-del-plan").forEach(btn => {
        btn.addEventListener("click", async () => {
          await deleteWorkout(btn.dataset.id);
          showToast("Workout deleted.", "success");
          document.getElementById("wb-view-plans").click();
        });
      });
    } catch (e) {
      container.innerHTML = `<p style="color:#ff0033">${e.message}</p>`;
    }
  });

  document.getElementById("wb-save").addEventListener("click", async () => {
    const selEl    = document.getElementById("wb-client-sel");
    const clientId = selEl?.value;
    if (!clientId) { showToast("Select a client.", "error"); return; }
    const day      = document.getElementById("wb-day").value;
    const category = document.getElementById("wb-category").value;

    const exercises = [];
    document.querySelectorAll("#wb-exercises > div").forEach(row => {
      const name = row.querySelector(".wb-ex-name").value.trim();
      if (!name) return;
      exercises.push({
        name,
        sets:   parseInt(row.querySelector(".wb-ex-sets").value) || 0,
        reps:   parseInt(row.querySelector(".wb-ex-reps").value) || 0,
        weight: parseFloat(row.querySelector(".wb-ex-weight").value) || 0,
        notes:  row.querySelector(".wb-ex-notes").value.trim()
      });
    });

    if (exercises.length === 0) { showToast("Add at least one exercise.", "error"); return; }

    try {
      await createWorkout(trainerUid, clientId, { day, category, exercises });
      showToast("Workout saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  // Populate hired clients dropdown
  (async () => {
    try {
      const hiredClients = await getTrainerHiredClients(trainerUid);
      const sel = document.getElementById("wb-client-sel");
      if (!sel) return;
      const ctx = document.getElementById("wb-client-bio-ctx");
      const renderClientContext = async () => {
        if (!ctx || !sel.value) { if (ctx) ctx.style.display = "none"; return; }
        const bio = await getClientBiography(sel.value).catch(() => null);
        if (!bio) { ctx.style.display = "none"; return; }
        const suggestions = [
          bio.primaryGoal === "Fat Loss" ? "Use moderate rest times, steady weekly progression, and enough cardio to support fat loss without killing recovery." : "",
          bio.primaryGoal === "Muscle Gain" ? "Bias hypertrophy volume, progressive overload, and compound lifts with clear recovery days." : "",
          bio.fitnessLevel ? `Keep overall difficulty aligned to ${bio.fitnessLevel.toLowerCase()} level.` : "",
          bio.injuries ? `Avoid aggravating movements linked to: ${bio.injuries}.` : "",
          bio.trainingType ? `Prefer programming style around ${bio.trainingType}.` : ""
        ].filter(Boolean);
        ctx.style.display = "block";
        ctx.innerHTML = `<strong style="color:#0887e2">Client Profile</strong>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:10px">
            ${bio.primaryGoal ? `<span>&#x1F3AF; <b>Goal:</b> ${bio.primaryGoal}</span>` : ""}
            ${bio.fitnessLevel ? `<span>&#x26A1; <b>Level:</b> ${bio.fitnessLevel}</span>` : ""}
            ${bio.weight ? `<span>&#x2696; <b>Weight:</b> ${bio.weight}kg</span>` : ""}
            ${bio.dietType ? `<span>&#x1F96C; <b>Diet:</b> ${bio.dietType}</span>` : ""}
            ${bio.allergies ? `<span>&#x26A0; <b>Allergies:</b> ${bio.allergies}</span>` : ""}
            ${bio.injuries ? `<span>&#x1F915; <b>Injuries:</b> ${bio.injuries}</span>` : ""}
            ${bio.trainingType ? `<span>&#x1F3CB; <b>Prefers:</b> ${bio.trainingType}</span>` : ""}
            ${bio.calorieGoal ? `<span>&#x1F525; <b>Calorie Goal:</b> ${bio.calorieGoal} kcal</span>` : ""}
          </div>
          ${suggestions.length ? `<div style="margin-top:10px;display:grid;gap:6px">${suggestions.map(item => `<div style="padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">${item}</div>`).join("")}</div>` : ""}`;
      };
      hiredClients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name || c.id;
        sel.appendChild(opt);
      });
      if (hiredClients.length > 0) sel.value = hiredClients[0].id;
      sel.addEventListener("change", renderClientContext);
      renderClientContext();
    } catch (e) { console.warn("[X-Gym] wb clients load:", e); }
  })();
}

async function _loadTrainerMealPlannerPanel(trainerUid) {
  const panel = document.getElementById("panel-meal-planner");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const dayOpts = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");
  const inputStyle = `padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
    background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif`;

  panel.innerHTML = `
    <h2 style="color:#0887e2">Meal Planner</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>Create Meal Plan for Client</h3>
      <div style="display:flex;gap:12px;margin-top:12px;align-items:center">
        <select id="mp-client-sel" style="flex:1;${inputStyle}">
          <option value="">— Select hired client —</option>
        </select>
        <button id="mp-view-plans" style="padding:8px 18px;border:none;border-radius:8px;
          background:rgba(8,135,226,0.2);color:#0887e2;cursor:pointer;font-family:Poppins,sans-serif;
          font-size:0.85rem;white-space:nowrap">View Existing Plans</button>
      </div>
      <div id="mp-existing-plans" style="margin-top:14px;display:none"></div>
      <div id="mp-client-bio-ctx" style="margin-top:10px;display:none;padding:12px;border-radius:10px;
        background:rgba(8,135,226,0.06);border:1px solid rgba(8,135,226,0.18);font-size:0.83rem"></div>

      <div id="mp-day-sections" style="margin-top:18px">
        <div class="mp-day-section" style="margin-bottom:16px;padding:14px;border-radius:10px;
          border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
            <label style="font-size:0.85rem;font-weight:600;color:#0887e2">Day:</label>
            <select class="mp-day-select" style="${inputStyle}">${dayOpts}</select>
          </div>
          <div class="mp-meals-container"></div>
          <button class="mp-add-meal-btn"
            style="margin-top:8px;padding:6px 14px;border:none;border-radius:6px;
            background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.82rem">
            + Add Meal</button>
          <div class="mp-day-summary" style="margin-top:10px;font-size:0.82rem;color:#0887e2;font-weight:600"></div>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-top:14px">
        <button id="mp-add-day" style="padding:8px 18px;border:none;border-radius:8px;
          background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.85rem">
          + Add Another Day</button>
        <button id="mp-save" style="padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
          font-family:Poppins,sans-serif;font-weight:600">Save Meal Plan</button>
      </div>
    </div>
  `;

  function addMealRow(container) {
    const row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:8px;align-items:center";
    row.innerHTML = `
      <input class="mp-m-name" type="text" placeholder="Meal name" style="${inputStyle}">
      <input class="mp-m-cal" type="number" placeholder="Cal" style="${inputStyle}">
      <input class="mp-m-protein" type="number" placeholder="Protein" style="${inputStyle}">
      <input class="mp-m-carbs" type="number" placeholder="Carbs" style="${inputStyle}">
      <input class="mp-m-fats" type="number" placeholder="Fats" style="${inputStyle}">
      <input class="mp-m-time" type="text" placeholder="Time" style="${inputStyle}">
      <button class="mp-remove-meal" style="padding:4px 10px;border:none;border-radius:6px;
        background:rgba(255,0,51,0.3);color:#ff0033;cursor:pointer;font-size:0.9rem">×</button>`;
    container.appendChild(row);
    row.querySelector(".mp-remove-meal").addEventListener("click", () => { row.remove(); updateDaySummaries(); });
    row.querySelectorAll("input[type=number]").forEach(inp => inp.addEventListener("input", updateDaySummaries));
  }

  function updateDaySummaries() {
    panel.querySelectorAll(".mp-day-section").forEach(section => {
      let cal = 0, prot = 0, carb = 0, fat = 0;
      section.querySelectorAll(".mp-meals-container > div").forEach(row => {
        cal  += parseFloat(row.querySelector(".mp-m-cal")?.value) || 0;
        prot += parseFloat(row.querySelector(".mp-m-protein")?.value) || 0;
        carb += parseFloat(row.querySelector(".mp-m-carbs")?.value) || 0;
        fat  += parseFloat(row.querySelector(".mp-m-fats")?.value) || 0;
      });
      const summary = section.querySelector(".mp-day-summary");
      if (summary) summary.textContent = cal || prot || carb || fat
        ? `Totals: ${cal} cal | ${prot}g P | ${carb}g C | ${fat}g F` : "";
    });
  }

  function addDaySection() {
    const section = document.createElement("div");
    section.className = "mp-day-section";
    section.style.cssText = "margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)";
    section.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
        <label style="font-size:0.85rem;font-weight:600;color:#0887e2">Day:</label>
        <select class="mp-day-select" style="${inputStyle}">${dayOpts}</select>
        <button class="mp-remove-day" style="margin-left:auto;padding:4px 10px;border:none;border-radius:6px;
          background:rgba(255,0,51,0.3);color:#ff0033;cursor:pointer;font-size:0.82rem">Remove Day</button>
      </div>
      <div class="mp-meals-container"></div>
      <button class="mp-add-meal-btn"
        style="margin-top:8px;padding:6px 14px;border:none;border-radius:6px;
        background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;font-family:Poppins,sans-serif;font-size:0.82rem">
        + Add Meal</button>
      <div class="mp-day-summary" style="margin-top:10px;font-size:0.82rem;color:#0887e2;font-weight:600"></div>`;
    document.getElementById("mp-day-sections").appendChild(section);
    section.querySelector(".mp-remove-day").addEventListener("click", () => section.remove());
    section.querySelector(".mp-add-meal-btn").addEventListener("click", () => addMealRow(section.querySelector(".mp-meals-container")));
  }

  // Wire initial day section's add meal button
  panel.querySelector(".mp-add-meal-btn").addEventListener("click", () => {
    addMealRow(panel.querySelector(".mp-meals-container"));
  });

  document.getElementById("mp-add-day").addEventListener("click", addDaySection);

  // View existing plans
  document.getElementById("mp-view-plans").addEventListener("click", async () => {
    const clientId = document.getElementById("mp-client-sel").value;
    if (!clientId) { showToast("Select a hired client first.", "error"); return; }
    const container = document.getElementById("mp-existing-plans");
    container.style.display = "block";
    container.innerHTML = '<p style="opacity:0.5">Loading...</p>';
    try {
      const plans = await getTrainerMealPlans(trainerUid, clientId);
      if (plans.length === 0) {
        container.innerHTML = '<p style="opacity:0.5">No meal plans found for this client.</p>';
        return;
      }
      container.innerHTML = plans.map(p => {
        const meals = (p.meals || []).map(m =>
          `<span style="display:inline-block;margin:2px 4px;padding:3px 10px;border-radius:12px;
           background:rgba(8,135,226,0.12);font-size:0.78rem">${m.name} (${m.calories}cal)</span>`).join("");
        return `<div class="card" style="margin-bottom:10px;font-size:0.85rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span><strong>${p.day}</strong> — ${formatDate(p.createdAt)}</span>
            <button class="mp-del-plan" data-id="${p.id}" style="padding:4px 12px;border:none;border-radius:6px;
              background:rgba(255,0,51,0.3);color:#ff0033;cursor:pointer;font-size:0.78rem">Delete</button>
          </div>
          <div style="margin-top:6px">${meals}</div>
        </div>`;
      }).join("");
      container.querySelectorAll(".mp-del-plan").forEach(btn => {
        btn.addEventListener("click", async () => {
          await deleteMealPlan(btn.dataset.id);
          showToast("Plan deleted.", "success");
          document.getElementById("mp-view-plans").click();
        });
      });
    } catch (e) {
      container.innerHTML = `<p style="color:#ff0033">${e.message}</p>`;
    }
  });

  // Save
  document.getElementById("mp-save").addEventListener("click", async () => {
    const clientId = document.getElementById("mp-client-sel").value;
    if (!clientId) { showToast("Select a hired client.", "error"); return; }

    const daySections = panel.querySelectorAll(".mp-day-section");
    if (daySections.length === 0) { showToast("Add at least one day.", "error"); return; }

    try {
      for (const section of daySections) {
        const day = section.querySelector(".mp-day-select").value;
        const meals = [];
        section.querySelectorAll(".mp-meals-container > div").forEach(row => {
          const name = row.querySelector(".mp-m-name").value.trim();
          if (!name) return;
          meals.push({
            name,
            calories: parseFloat(row.querySelector(".mp-m-cal").value) || 0,
            protein:  parseFloat(row.querySelector(".mp-m-protein").value) || 0,
            carbs:    parseFloat(row.querySelector(".mp-m-carbs").value) || 0,
            fats:     parseFloat(row.querySelector(".mp-m-fats").value) || 0,
            time:     row.querySelector(".mp-m-time").value.trim()
          });
        });
        if (meals.length > 0) {
          await createMealPlan(trainerUid, clientId, { day, meals });
        }
      }
      showToast("Meal plan(s) saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  (async () => {
    try {
      const clients = await getTrainerHiredClients(trainerUid);
      const sel = document.getElementById("mp-client-sel");
      const ctx = document.getElementById("mp-client-bio-ctx");
      if (!sel) return;
      const renderMealContext = async () => {
        if (!ctx || !sel.value) { if (ctx) ctx.style.display = "none"; return; }
        const bio = await getClientBiography(sel.value).catch(() => null);
        if (!bio) { ctx.style.display = "none"; return; }
        const suggestions = [
          bio.primaryGoal === "Fat Loss" ? "Favor higher-satiety meals, lean proteins, and tighter calorie control." : "",
          bio.primaryGoal === "Muscle Gain" ? "Use calorie-dense meals with strong protein and carb coverage around training." : "",
          bio.dietType ? `Keep the plan compatible with ${bio.dietType.toLowerCase()} eating.` : "",
          bio.allergies ? `Avoid ingredients related to: ${bio.allergies}.` : "",
          bio.mealsPerDay ? `Target roughly ${bio.mealsPerDay} meals across the day.` : ""
        ].filter(Boolean);
        ctx.style.display = "block";
        ctx.innerHTML = `<strong style="color:#0887e2">Nutrition Context</strong>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:10px">
            ${bio.primaryGoal ? `<span>&#x1F3AF; <b>Goal:</b> ${bio.primaryGoal}</span>` : ""}
            ${bio.dietType ? `<span>&#x1F96C; <b>Diet:</b> ${bio.dietType}</span>` : ""}
            ${bio.calorieGoal ? `<span>&#x1F525; <b>Calories:</b> ${bio.calorieGoal} kcal</span>` : ""}
            ${bio.mealsPerDay ? `<span>&#x1F374; <b>Meals/Day:</b> ${bio.mealsPerDay}</span>` : ""}
            ${bio.allergies ? `<span>&#x26A0; <b>Avoid:</b> ${bio.allergies}</span>` : ""}
            ${bio.nutritionNotes ? `<span>&#x1F4DD; <b>Notes:</b> ${bio.nutritionNotes}</span>` : ""}
          </div>
          ${suggestions.length ? `<div style="margin-top:10px;display:grid;gap:6px">${suggestions.map(item => `<div style="padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">${item}</div>`).join("")}</div>` : ""}`;
      };
      clients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name || c.id;
        sel.appendChild(opt);
      });
      if (clients.length > 0) sel.value = clients[0].id;
      sel.addEventListener("change", renderMealContext);
      renderMealContext();
    } catch (e) {
      console.warn("[X-Gym] mp clients load:", e);
    }
  })();
}

async function _loadTrainerMembershipPanel(trainerUid) {
  const panel = document.getElementById("panel-membership");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Membership Status</h2>";

  try {
    const membership = await getMembership(trainerUid);
    if (!membership) {
      panel.innerHTML += "<p>No active membership found. Please contact the front desk.</p>";
      return;
    }
    panel.innerHTML += `
      <div class="card">
        <h3>${membership.type || "Standard"}</h3>
        <p>Status: <strong style="color:${membership.status === "active" ? "#00c850" : "#0887e2"}">${membership.status || "Unknown"}</strong></p>
        <p>Expiry: ${formatDate(membership.expiresAt)}</p>
      </div>
    `;
  } catch (e) {
    panel.innerHTML += `<p style="color:#0887e2">${e.message}</p>`;
  }
}

// ============================================================
// SECTION 10: ADMIN DASHBOARD INITIALIZATION
// ============================================================

async function initAdminPage() {
  console.log("[X-Gym] initAdminPage: starting...");

  // Wire logout button immediately so it works even without auth
  const logoutBtnEarly = document.getElementById("logout-btn");
  if (logoutBtnEarly) logoutBtnEarly.addEventListener("click", logoutUser);

  const user = await waitForAuth();
  console.log("[X-Gym] initAdminPage: waitForAuth resolved, user:", user ? user.uid : null);

  if (!user) {
    // DEV/TEST MODE: skip redirect so pages can be opened directly
    console.warn("[X-Gym] Admin page: no user logged in — skipping redirect (test mode)");
    initPanelNav();
    _bindCardToPanel("card-overview",     "panel-overview");
    _bindCardToPanel("card-members",      "panel-members");
    _bindCardToPanel("card-store-mgmt",   "panel-store");
    _bindCardToPanel("card-memberships",  "panel-memberships");
    _bindCardToPanel("card-finances",     "panel-finances");
    _bindCardToPanel("card-trainer-links","panel-trainer-links");
    _bindCardToPanel("card-classes",      "panel-classes");
    _bindCardToPanel("card-messenger",    "panel-messenger");
    _bindCardToPanel("card-admins",       "panel-admins");
    return;
  }

  let profile = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      profile = await getUserProfile(user.uid, user.email);
      console.log("[X-Gym] initAdminPage: profile fetch attempt", attempt, "result:", profile);
      if (profile) break;
    } catch (e) {
      console.warn("[X-Gym] initAdminPage: profile fetch attempt", attempt, "error:", e);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  if (!profile) {
    console.warn("[X-Gym] Admin page: no profile found — staying on page (test mode)");
    initPanelNav();
    _bindCardToPanel("card-overview",     "panel-overview");
    _bindCardToPanel("card-members",      "panel-members");
    _bindCardToPanel("card-store-mgmt",   "panel-store");
    _bindCardToPanel("card-memberships",  "panel-memberships");
    _bindCardToPanel("card-finances",     "panel-finances");
    _bindCardToPanel("card-trainer-links","panel-trainer-links");
    _bindCardToPanel("card-classes",      "panel-classes");
    _bindCardToPanel("card-messenger",    "panel-messenger");
    _bindCardToPanel("card-admins",       "panel-admins");
    return;
  }
  if (profile.role !== "admin") {
    console.warn("[X-Gym] Admin page: user role is '" + profile.role + "' (not admin) — staying on page (test mode)");
  }

  console.log("[X-Gym] initAdminPage: admin verified, setting up UI...");

  // Populate greeting
  const greeting = document.getElementById("admin-greeting");
  if (greeting) greeting.textContent = "Admin Panel \u2014 " + profile.name;

  // Panel navigation
  initPanelNav();

  // Card clicks
  _bindCardToPanel("card-overview",     "panel-overview");
  _bindCardToPanel("card-members",      "panel-members");
  _bindCardToPanel("card-store-mgmt",   "panel-store");
  _bindCardToPanel("card-memberships",  "panel-memberships");
  _bindCardToPanel("card-finances",     "panel-finances");
  _bindCardToPanel("card-trainer-links","panel-trainer-links");
  _bindCardToPanel("card-classes",      "panel-classes");
  _bindCardToPanel("card-messenger",    "panel-messenger");
  _bindCardToPanel("card-admins",       "panel-admins");

  // Load all admin panels with error handling
  try {
    console.log("[X-Gym] initAdminPage: loading panels...");
    await Promise.all([
      _loadAdminOverviewPanel().catch(e => console.error("[X-Gym] Overview panel error:", e)),
      _loadAdminMembersPanel().catch(e => console.error("[X-Gym] Members panel error:", e)),
      _loadAdminStorePanel().catch(e => console.error("[X-Gym] Store panel error:", e)),
      _loadAdminMembershipsPanel().catch(e => console.error("[X-Gym] Memberships panel error:", e)),
      _loadAdminFinancesPanel().catch(e => console.error("[X-Gym] Finances panel error:", e)),
      _loadAdminTrainerLinksPanel().catch(e => console.error("[X-Gym] TrainerLinks panel error:", e)),
      _loadAdminClassesPanel().catch(e => console.error("[X-Gym] Classes panel error:", e)),
      _loadAdminMessengerPanel().catch(e => console.error("[X-Gym] Messenger panel error:", e)),
      _loadAdminAdminsPanel().catch(e => console.error("[X-Gym] Admins panel error:", e))
    ]);
    console.log("[X-Gym] initAdminPage: all panels loaded.");
    showToast("Admin dashboard ready.", "success");
    _startAdminNotifListeners();
  } catch (e) {
    console.error("[X-Gym] initAdminPage: panel loading error:", e);
    showToast("Some panels failed to load: " + e.message, "error");
  }
}

// ---------- Admins Panel ----------
async function _loadAdminAdminsPanel() {
  const panel = document.getElementById("panel-admins");
  if (!panel) return;

  panel.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5">Loading admins…</div>`;

  let admins = [];
  try {
    const snap = await db.ref("users").orderByChild("role").equalTo("admin").once("value");
    snap.forEach(child => admins.push({ id: child.key, ...child.val() }));
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Admins</h2><p style="color:#ff0033">${e.message}</p>`;
    return;
  }

  const rows = admins.map(a => `
    <tr style="border-top:1px solid rgba(255,255,255,0.07)">
      <td style="padding:10px 12px">${a.name || "—"}</td>
      <td style="padding:10px 12px;opacity:0.6">${a.email || "—"}</td>
      <td style="padding:10px 12px">
        <span style="background:rgba(8,135,226,0.15);color:#0887e2;padding:2px 10px;border-radius:8px;font-size:0.75rem;font-weight:600">Admin</span>
      </td>
    </tr>`).join("");

  panel.innerHTML = `
    <h2 style="color:#0887e2;margin-bottom:20px">Admins</h2>
    <div class="card" style="padding:0;overflow:hidden">
      ${admins.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:0.88rem">
          <thead><tr style="background:rgba(8,135,226,0.08)">
            <th style="text-align:left;padding:10px 12px;opacity:0.55;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">Name</th>
            <th style="text-align:left;padding:10px 12px;opacity:0.55;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">Email</th>
            <th style="text-align:left;padding:10px 12px;opacity:0.55;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px">Role</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>` : `<p style="text-align:center;padding:40px;opacity:0.5">No admin accounts found.</p>`}
    </div>`;
}

// ---------- Overview / Statistics Panel ----------
async function _loadAdminOverviewPanel() {
  const panel = document.getElementById("panel-overview");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Loading statistics…</h2>";

  try {
    const stats = await getAdminStats();

    panel.innerHTML = `
      <h2 style="color:#0887e2">Gym Overview</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:30px">
        <div class="card"><h3 style="color:#0887e2;font-size:2rem">${stats.totalMembers}</h3><p>Total Members</p></div>
        <div class="card"><h3 style="color:#00c850;font-size:2rem">${stats.totalClients}</h3><p>Clients</p></div>
        <div class="card"><h3 style="color:#e96d25;font-size:2rem">${stats.totalTrainers}</h3><p>Trainers</p></div>
        <div class="card"><h3 style="color:#00c850;font-size:2rem">${stats.activeMemberships}</h3><p>Active Memberships</p></div>
        <div class="card"><h3 style="color:#0887e2;font-size:2rem">${stats.expiredMemberships}</h3><p>Expired Memberships</p></div>
        <div class="card"><h3 style="color:#4da6ff;font-size:2rem">${stats.totalStoreItems}</h3><p>Store Items</p></div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:30px">
        <div class="card">
          <h3 style="color:#00c850;font-size:2rem">£${stats.totalRevenue.toFixed(2)}</h3><p>Total Revenue</p>
        </div>
        <div class="card">
          <h3 style="color:#0887e2;font-size:2rem">£${stats.totalExpenses.toFixed(2)}</h3><p>Total Expenses</p>
        </div>
        <div class="card">
          <h3 style="color:${stats.netProfit >= 0 ? '#00c850' : '#0887e2'};font-size:2rem">£${stats.netProfit.toFixed(2)}</h3><p>Net Profit</p>
        </div>
      </div>

      <div class="card" style="padding:30px;margin-bottom:20px">
        <h3 style="margin-bottom:16px">Monthly Revenue vs Expenses</h3>
        <canvas id="chart-revenue" height="250"></canvas>
      </div>

      <div class="card" style="padding:30px;margin-bottom:20px">
        <h3 style="margin-bottom:16px">Membership Distribution</h3>
        <canvas id="chart-membership" height="200"></canvas>
      </div>

      <div class="card" style="padding:30px">
        <h3 style="margin-bottom:16px">Member Roles</h3>
        <canvas id="chart-roles" height="200"></canvas>
      </div>
    `;

    // Draw charts using Canvas 2D (no external library needed)
    _drawRevenueChart(stats.monthlyRevenue, stats.monthlyExpenses);
    _drawMembershipPieChart(stats.activeMemberships, stats.expiredMemberships);
    _drawRolesBarChart(stats.totalClients, stats.totalTrainers, stats.totalMembers - stats.totalClients - stats.totalTrainers);
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Canvas-based Charts (no external libs) ----------

function _drawRevenueChart(monthlyRevenue, monthlyExpenses) {
  const canvas = document.getElementById("chart-revenue");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.parentElement.clientWidth - 60;
  canvas.height = 250;

  const allKeys = [...new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpenses)])].sort();
  if (allKeys.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px Poppins, sans-serif";
    ctx.fillText("No transaction data yet. Record transactions to see charts.", 20, 130);
    return;
  }

  const revValues = allKeys.map(k => monthlyRevenue[k] || 0);
  const expValues = allKeys.map(k => monthlyExpenses[k] || 0);
  const maxVal = Math.max(...revValues, ...expValues, 1);

  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const w = canvas.width - padding.left - padding.right;
  const h = canvas.height - padding.top - padding.bottom;
  const barGroupWidth = w / allKeys.length;
  const barWidth = barGroupWidth * 0.35;

  // Y-axis grid
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px Poppins, sans-serif";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + h - (h * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
    ctx.fillText("£" + Math.round(maxVal * i / 5), 5, y + 4);
  }

  allKeys.forEach((key, i) => {
    const x = padding.left + i * barGroupWidth;
    const revH = (revValues[i] / maxVal) * h;
    const expH = (expValues[i] / maxVal) * h;

    // Revenue bar
    ctx.fillStyle = "rgba(0,200,80,0.8)";
    ctx.fillRect(x + 4, padding.top + h - revH, barWidth, revH);

    // Expense bar
    ctx.fillStyle = "rgba(233,109,37,0.8)";
    ctx.fillRect(x + barWidth + 8, padding.top + h - expH, barWidth, expH);

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px Poppins, sans-serif";
    ctx.save();
    ctx.translate(x + barGroupWidth / 2, canvas.height - 5);
    ctx.rotate(-0.5);
    ctx.fillText(key, -15, 0);
    ctx.restore();
  });

  // Legend
  ctx.fillStyle = "rgba(0,200,80,0.8)";
  ctx.fillRect(canvas.width - 180, 10, 12, 12);
  ctx.fillStyle = "#fff";
  ctx.font = "11px Poppins, sans-serif";
  ctx.fillText("Revenue", canvas.width - 164, 20);
  ctx.fillStyle = "rgba(233,109,37,0.8)";
  ctx.fillRect(canvas.width - 100, 10, 12, 12);
  ctx.fillStyle = "#fff";
  ctx.fillText("Expenses", canvas.width - 84, 20);
}

function _drawMembershipPieChart(active, expired) {
  const canvas = document.getElementById("chart-membership");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 200;

  const total = active + expired;
  if (total === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px Poppins, sans-serif";
    ctx.fillText("No memberships yet.", 120, 100);
    return;
  }

  const cx = 100, cy = 100, r = 80;
  const slices = [
    { val: active, color: "rgba(0,200,80,0.85)", label: "Active" },
    { val: expired, color: "rgba(233,109,37,0.85)", label: "Expired" }
  ];

  let startAngle = -Math.PI / 2;
  slices.forEach(slice => {
    const sliceAngle = (slice.val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.fillStyle = slice.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Legend
  let ly = 40;
  slices.forEach(slice => {
    ctx.fillStyle = slice.color;
    ctx.fillRect(220, ly, 14, 14);
    ctx.fillStyle = "#fff";
    ctx.font = "13px Poppins, sans-serif";
    ctx.fillText(`${slice.label}: ${slice.val} (${Math.round(slice.val/total*100)}%)`, 240, ly + 12);
    ly += 30;
  });
}

function _drawRolesBarChart(clients, trainers, admins) {
  const canvas = document.getElementById("chart-roles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 200;

  const data = [
    { label: "Clients", val: clients, color: "rgba(0,200,80,0.8)" },
    { label: "Trainers", val: trainers, color: "rgba(233,109,37,0.8)" },
    { label: "Admins", val: admins, color: "rgba(77,166,255,0.8)" }
  ];

  const maxVal = Math.max(...data.map(d => d.val), 1);
  const barW = 60, gap = 50;
  const startX = 60;

  data.forEach((d, i) => {
    const x = startX + i * (barW + gap);
    const barH = (d.val / maxVal) * 140;
    ctx.fillStyle = d.color;
    ctx.fillRect(x, 160 - barH, barW, barH);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Poppins, sans-serif";
    ctx.fillText(d.val, x + barW / 2 - 6, 155 - barH);
    ctx.font = "12px Poppins, sans-serif";
    ctx.fillText(d.label, x + 2, 180);
  });
}

// ---------- Members Management Panel ----------
async function _loadAdminMembersPanel() {
  const panel = document.getElementById("panel-members");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Members Management</h2><p>Loading…</p>";

  try {
    const members = await getAllMembers();

    let html = `
      <h2 style="color:#0887e2">Members Management</h2>
      <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
        <input id="admin-member-search" type="text" placeholder="Search by name or email…"
          style="flex:1;padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <select id="admin-member-role-filter"
          style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <option value="all">All Roles</option>
          <option value="client">Clients</option>
          <option value="trainer">Trainers</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <p style="opacity:0.6">${members.length} registered members</p>
      <div id="admin-members-list"></div>
    `;
    panel.innerHTML = html;

    function renderMembers(filter = "", roleFilter = "all") {
      const list = document.getElementById("admin-members-list");
      const filtered = members.filter(m => {
        const matchSearch = !filter || (m.name || "").toLowerCase().includes(filter) || (m.email || "").toLowerCase().includes(filter);
        const matchRole = roleFilter === "all" || m.role === roleFilter;
        return matchSearch && matchRole;
      });

      if (filtered.length === 0) {
        list.innerHTML = "<p>No members found.</p>";
        return;
      }

      list.innerHTML = filtered.map(m => `
        <div class="card" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div style="flex:1;min-width:200px">
            <h3 style="margin:0">${m.name || "Unknown"}</h3>
            <p style="margin:4px 0;opacity:0.7;font-size:0.9rem">${m.email || ""}</p>
            <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.75rem;
              background:${m.role === 'admin' ? 'rgba(77,166,255,0.3)' : m.role === 'trainer' ? 'rgba(233,109,37,0.3)' : 'rgba(0,200,80,0.3)'};
              color:${m.role === 'admin' ? '#4da6ff' : m.role === 'trainer' ? '#e96d25' : '#00c850'}">
              ${(m.role || "client").toUpperCase()}
            </span>
            <span style="margin-left:8px;opacity:0.5;font-size:0.8rem">Code: ${m.shareCode || "—"}</span>
            <span style="margin-left:8px;opacity:0.5;font-size:0.8rem">Joined: ${formatDate(m.createdAt)}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="admin-edit-member" data-uid="${m.id}" data-name="${m.name}" data-email="${m.email}" data-role="${m.role}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              Edit
            </button>
            <button class="admin-delete-member" data-uid="${m.id}" data-name="${m.name}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              Delete
            </button>
            <button class="admin-view-cards" data-uid="${m.id}" data-name="${m.name}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(8,135,226,0.35);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              &#128179; Cards
            </button>
          </div>
        </div>
      `).join("");

      // Edit buttons
      list.querySelectorAll(".admin-edit-member").forEach(btn => {
        btn.addEventListener("click", () => {
          const uid = btn.dataset.uid;
          showModal("Edit Member", `
            <div style="display:grid;gap:12px">
              <input id="edit-m-name" type="text" value="${btn.dataset.name}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="edit-m-email" type="email" value="${btn.dataset.email}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <select id="edit-m-role"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
                <option value="client" ${btn.dataset.role === "client" ? "selected" : ""}>Client</option>
                <option value="trainer" ${btn.dataset.role === "trainer" ? "selected" : ""}>Trainer</option>
                <option value="admin" ${btn.dataset.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </div>
          `, async () => {
            try {
              await updateMember(uid, {
                name: document.getElementById("edit-m-name").value.trim(),
                email: document.getElementById("edit-m-email").value.trim(),
                role: document.getElementById("edit-m-role").value
              });
              showToast("Member updated!", "success");
              _loadAdminMembersPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });

      // Delete buttons
      list.querySelectorAll(".admin-delete-member").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Delete Member", `<p>Are you sure you want to delete <strong>${btn.dataset.name}</strong>?<br>This action cannot be undone.</p>`, async () => {
            try {
              await deleteMember(btn.dataset.uid);
              showToast("Member deleted.", "success");
              _loadAdminMembersPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });

      // View Cards buttons (admin sees full card numbers)
      list.querySelectorAll(".admin-view-cards").forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            const cards = await getPaymentCards(btn.dataset.uid);
            if (!cards.length) {
              showModal(`${btn.dataset.name} — Payment Cards`, `<p style="opacity:0.7">No payment cards saved for this member.</p>`);
              return;
            }
            const cardRows = cards.map(c => `
              <div style="padding:10px 14px;border-radius:8px;border:1px solid ${c.isDefault ? "rgba(8,165,226,0.5)" : "rgba(255,255,255,0.1)"};background:rgba(255,255,255,0.04);margin-bottom:8px">
                <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px">${c.cardHolder}${c.isDefault ? ' <span style="color:#0887e2;font-size:0.75rem">(DEFAULT)</span>' : ""}</div>
                <div style="font-family:monospace;font-size:1rem;letter-spacing:2px;margin-bottom:2px">${(c.cardNumber || "").replace(/(.{4})/g,"$1 ").trim()}</div>
                <div style="font-size:0.78rem;opacity:0.65">Expires: ${c.expiry}</div>
              </div>`).join("");
            showModal(`${btn.dataset.name} — Payment Cards`, `<div>${cardRows}</div>`);
          } catch (e) { showToast(e.message, "error"); }
        });
      });
    }

    renderMembers();

    document.getElementById("admin-member-search").addEventListener("input", (e) => {
      renderMembers(e.target.value.toLowerCase(), document.getElementById("admin-member-role-filter").value);
    });
    document.getElementById("admin-member-role-filter").addEventListener("change", (e) => {
      renderMembers(document.getElementById("admin-member-search").value.toLowerCase(), e.target.value);
    });
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Store Management Panel ----------
async function _loadAdminStorePanel() {
  const panel = document.getElementById("panel-store");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Store Management</h2><p>Loading…</p>";

  try {
    const items = await getAllStoreItems();

    let html = `
      <h2 style="color:#0887e2">Store Management</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Add New Item</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <input id="store-add-name" type="text" placeholder="Item Name"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="store-add-price" type="number" step="0.01" placeholder="Price (£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="store-add-category" type="text" placeholder="Category (e.g. Supplements)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="store-add-stock" type="number" placeholder="Stock Qty"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="store-add-desc" type="text" placeholder="Description" style="grid-column:span 2;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        </div>
        <button id="store-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
          Add Item
        </button>
      </div>
      <p style="opacity:0.6">${items.length} item(s) in store</p>
      <div id="admin-store-list"></div>
    `;
    panel.innerHTML = html;

    document.getElementById("store-add-btn").addEventListener("click", async () => {
      const name     = document.getElementById("store-add-name").value.trim();
      const price    = parseFloat(document.getElementById("store-add-price").value) || 0;
      const category = document.getElementById("store-add-category").value.trim();
      const stock    = parseInt(document.getElementById("store-add-stock").value) || 0;
      const desc     = document.getElementById("store-add-desc").value.trim();
      if (!name) { showToast("Item name is required.", "error"); return; }
      try {
        await addStoreItem({ name, price, category, stock, description: desc });
        showToast("Item added!", "success");
        _loadAdminStorePanel();
      } catch (e) { showToast(e.message, "error"); }
    });

    const list = document.getElementById("admin-store-list");
    if (items.length === 0) {
      list.innerHTML = "<p>No store items yet.</p>";
    } else {
      list.innerHTML = items.map(item => `
        <div class="card" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div style="flex:1;min-width:200px">
            <h3 style="margin:0">${item.name}</h3>
            <p style="margin:4px 0;opacity:0.7;font-size:0.9rem">${item.description || ""}</p>
            <span style="color:#00c850;font-weight:bold">£${(item.price || 0).toFixed(2)}</span>
            <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Category: ${item.category || "—"}</span>
            <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Stock: ${item.stock != null ? item.stock : "—"}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="admin-edit-item" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-category="${item.category || ""}" data-stock="${item.stock || 0}" data-desc="${item.description || ""}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              Edit
            </button>
            <button class="admin-delete-item" data-id="${item.id}" data-name="${item.name}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              Delete
            </button>
          </div>
        </div>
      `).join("");

      list.querySelectorAll(".admin-edit-item").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Edit Store Item", `
            <div style="display:grid;gap:12px">
              <input id="edit-si-name" type="text" value="${btn.dataset.name}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif" placeholder="Name">
              <input id="edit-si-price" type="number" step="0.01" value="${btn.dataset.price}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif" placeholder="Price">
              <input id="edit-si-category" type="text" value="${btn.dataset.category}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif" placeholder="Category">
              <input id="edit-si-stock" type="number" value="${btn.dataset.stock}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif" placeholder="Stock">
              <input id="edit-si-desc" type="text" value="${btn.dataset.desc}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif" placeholder="Description">
            </div>
          `, async () => {
            try {
              await updateStoreItem(btn.dataset.id, {
                name: document.getElementById("edit-si-name").value.trim(),
                price: parseFloat(document.getElementById("edit-si-price").value) || 0,
                category: document.getElementById("edit-si-category").value.trim(),
                stock: parseInt(document.getElementById("edit-si-stock").value) || 0,
                description: document.getElementById("edit-si-desc").value.trim()
              });
              showToast("Item updated!", "success");
              _loadAdminStorePanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });

      list.querySelectorAll(".admin-delete-item").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Delete Item", `<p>Delete <strong>${btn.dataset.name}</strong> from the store?</p>`, async () => {
            try {
              await deleteStoreItem(btn.dataset.id);
              showToast("Item deleted.", "success");
              _loadAdminStorePanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Memberships Management Panel ----------
async function _loadAdminMembershipsPanel() {
  const panel = document.getElementById("panel-memberships");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Memberships</h2><p>Loading…</p>";

  try {
    const [memberships, members, plans, payments] = await Promise.all([
      getAllMemberships(),
      getAllMembers(),
      getMembershipPlans(),
      getAllMembershipPayments()
    ]);

    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const money = (n) => `£${(Number(n) || 0).toFixed(2)}`;
    const toDateInput = (ts) => {
      if (!ts) return "";
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    };
    const computeStatus = (m) => {
      if ((m.status || "").toLowerCase() === "cancelled") return "cancelled";
      if (m.expiresAt && m.expiresAt < now) return "expired";
      if ((m.status || "").toLowerCase() === "inactive") return "inactive";
      return "active";
    };

    const withMeta = memberships
      .map(m => {
        const status = computeStatus(m);
        const durationDays = Number(m.durationDays) || (m.startedAt && m.expiresAt ? Math.max(1, Math.round((m.expiresAt - m.startedAt) / oneDay)) : 30);
        const left = m.expiresAt ? Math.ceil((m.expiresAt - now) / oneDay) : null;
        return { ...m, _status: status, _durationDays: durationDays, _daysLeft: left };
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const activeCount = withMeta.filter(m => m._status === "active").length;
    const expCount = withMeta.filter(m => m._status === "expired").length;
    const cancelCount = withMeta.filter(m => m._status === "cancelled").length;

    panel.innerHTML = `
      <h2 style="color:#0887e2;margin-bottom:18px">Memberships Management</h2>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="card" style="text-align:center;cursor:default"><h3 style="margin:0;color:#00c853">${activeCount}</h3><p style="margin-top:6px">Active</p></div>
        <div class="card" style="text-align:center;cursor:default"><h3 style="margin:0;color:#0887e2">${expCount}</h3><p style="margin-top:6px">Expired</p></div>
        <div class="card" style="text-align:center;cursor:default"><h3 style="margin:0;color:#ff0033">${cancelCount}</h3><p style="margin-top:6px">Cancelled</p></div>
        <div class="card" style="text-align:center;cursor:default"><h3 style="margin:0;color:#e96d25">${money(totalRevenue)}</h3><p style="margin-top:6px">Membership Revenue</p></div>
      </div>

      <div class="card" style="margin-bottom:16px;cursor:default">
        <h3 style="margin-bottom:10px">Assign / Create Membership</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <select id="mem-add-client" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
            <option value="">Select Member</option>
            ${members.filter(m => m.role !== "admin").map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join("")}
          </select>
          <select id="mem-add-plan" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
            ${plans.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
          </select>
          <input id="mem-add-type" type="text" placeholder="Type"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">

          <input id="mem-add-price" type="number" step="0.01" placeholder="Price (£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="mem-add-duration" type="number" min="1" placeholder="Duration (days)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="mem-add-start" type="date"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">

          <select id="mem-add-status" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="cancelled">cancelled</option>
          </select>
          <select id="mem-add-method" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="manual">Manual Adjustment</option>
          </select>
          <input id="mem-add-note" type="text" placeholder="Notes (optional)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        </div>
        <button id="mem-add-btn" style="margin-top:12px;padding:10px 24px;border:none;border-radius:8px;background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;font-weight:700">Create Membership</button>
      </div>

      <div class="card" style="margin-bottom:16px;cursor:default">
        <h3 style="margin-bottom:10px">Dynamic Plan Catalog</h3>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px">
          <input id="plan-add-name" type="text" placeholder="Plan Name"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="plan-add-price" type="number" step="0.01" placeholder="Price (£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
          <input id="plan-add-duration" type="number" min="1" placeholder="Days"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        </div>
        <input id="plan-add-desc" type="text" placeholder="Description"
          style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <input id="plan-add-features" type="text" placeholder="Features (comma separated)"
          style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        <button id="plan-add-btn" style="margin-top:12px;padding:10px 24px;border:none;border-radius:8px;background:linear-gradient(90deg,#00c853,#009944);color:#fff;cursor:pointer;font-weight:700">Add Plan</button>
        <div id="plan-list" style="margin-top:14px"></div>
      </div>

      <div class="card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
          <h3 style="margin:0">All Member Memberships</h3>
          <input id="mem-search" type="text" placeholder="Search member, plan, status"
            style="min-width:260px;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:inherit;font-family:inherit">
        </div>
        <div id="admin-memberships-list"></div>
      </div>

      <div class="card" style="margin-top:16px;cursor:default">
        <h3 style="margin-bottom:10px">Recent Membership Payments</h3>
        <div id="admin-membership-payments"></div>
      </div>
    `;

    const planLookup = {};
    plans.forEach(p => { planLookup[p.id] = p; });

    const setAddDefaultsFromPlan = () => {
      const plan = planLookup[document.getElementById("mem-add-plan").value] || plans[0];
      if (!plan) return;
      document.getElementById("mem-add-type").value = plan.name || "Membership";
      document.getElementById("mem-add-price").value = Number(plan.price || 0).toFixed(2);
      document.getElementById("mem-add-duration").value = Number(plan.durationDays || 30);
      if (!document.getElementById("mem-add-start").value) {
        document.getElementById("mem-add-start").value = toDateInput(now);
      }
    };

    document.getElementById("mem-add-plan").addEventListener("change", setAddDefaultsFromPlan);
    setAddDefaultsFromPlan();

    document.getElementById("mem-add-btn").addEventListener("click", async () => {
      const clientId = document.getElementById("mem-add-client").value;
      const planId = document.getElementById("mem-add-plan").value;
      const type = (document.getElementById("mem-add-type").value || "").trim() || "Membership";
      const price = Number(document.getElementById("mem-add-price").value) || 0;
      const durationDays = Math.max(1, parseInt(document.getElementById("mem-add-duration").value, 10) || 30);
      const startDate = document.getElementById("mem-add-start").value;
      const status = document.getElementById("mem-add-status").value;
      const method = document.getElementById("mem-add-method").value;
      const note = (document.getElementById("mem-add-note").value || "").trim();

      if (!clientId) { showToast("Select a member.", "error"); return; }

      const startedAt = startDate ? new Date(startDate).getTime() : Date.now();
      const expiresAt = startedAt + durationDays * oneDay;

      try {
        const membershipId = await createMembership({
          clientId,
          planId,
          type,
          price,
          status,
          startedAt,
          durationDays,
          expiresAt,
          createdBy: "admin",
          notes: note
        });

        if (price > 0) {
          await createMembershipPayment({
            membershipId,
            clientId,
            planId,
            planName: type,
            membershipType: type,
            amount: price,
            method,
            status: "paid",
            source: "admin"
          });
          await recordTransaction({
            type: "membership",
            amount: price,
            description: `${type} membership — ${(memberMap[clientId] || {}).name || clientId}`,
            category: "membership"
          });
        }

        showToast("Membership created!", "success");
        _loadAdminMembershipsPanel();
        _loadAdminOverviewPanel();
      } catch (e) {
        showToast(e.message, "error");
      }
    });

    function renderPlanList() {
      const list = document.getElementById("plan-list");
      list.innerHTML = plans.map(p => {
        const canModify = !String(p.id).startsWith("default-");
        return `
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
            <div>
              <strong>${p.name}</strong>
              <span style="opacity:0.65"> · ${money(p.price)} · ${p.durationDays || 30} days</span>
              <div style="opacity:0.58;font-size:0.83rem">${p.description || ""}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="plan-edit-btn" data-id="${p.id}" ${canModify ? "" : "disabled"}
                style="padding:6px 12px;border:none;border-radius:7px;background:rgba(255,255,255,0.12);color:#fff;cursor:${canModify ? "pointer" : "not-allowed"}">Edit</button>
              <button class="plan-del-btn" data-id="${p.id}" ${canModify ? "" : "disabled"}
                style="padding:6px 12px;border:none;border-radius:7px;background:rgba(255,0,60,0.45);color:#fff;cursor:${canModify ? "pointer" : "not-allowed"}">Delete</button>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll(".plan-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const p = plans.find(x => x.id === btn.dataset.id);
          if (!p) return;
          showModal("Edit Plan", `
            <div style="display:grid;gap:10px">
              <input id="plan-edit-name" value="${p.name || ""}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="plan-edit-price" type="number" step="0.01" value="${Number(p.price || 0).toFixed(2)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="plan-edit-days" type="number" min="1" value="${p.durationDays || 30}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="plan-edit-desc" value="${p.description || ""}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            </div>
          `, async () => {
            try {
              await updateMembershipPlan(p.id, {
                name: (document.getElementById("plan-edit-name").value || "").trim() || p.name,
                price: Number(document.getElementById("plan-edit-price").value) || 0,
                durationDays: Math.max(1, parseInt(document.getElementById("plan-edit-days").value, 10) || 30),
                description: (document.getElementById("plan-edit-desc").value || "").trim()
              });
              showToast("Plan updated.", "success");
              _loadAdminMembershipsPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });

      list.querySelectorAll(".plan-del-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Delete Plan", "<p>Delete this membership plan?</p>", async () => {
            try {
              await deleteMembershipPlan(btn.dataset.id);
              showToast("Plan deleted.", "success");
              _loadAdminMembershipsPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });
    }

    document.getElementById("plan-add-btn").addEventListener("click", async () => {
      const name = (document.getElementById("plan-add-name").value || "").trim();
      const price = Number(document.getElementById("plan-add-price").value) || 0;
      const durationDays = Math.max(1, parseInt(document.getElementById("plan-add-duration").value, 10) || 30);
      const description = (document.getElementById("plan-add-desc").value || "").trim();
      const features = (document.getElementById("plan-add-features").value || "").split(",").map(s => s.trim()).filter(Boolean);

      if (!name) { showToast("Plan name is required.", "error"); return; }
      try {
        await createMembershipPlan({ name, price, durationDays, description, features });
        showToast("Membership plan added.", "success");
        _loadAdminMembershipsPanel();
      } catch (e) { showToast(e.message, "error"); }
    });

    function bindMembershipActions(container) {
      container.querySelectorAll(".admin-edit-mem").forEach(btn => {
        btn.addEventListener("click", () => {
          const m = withMeta.find(x => x.id === btn.dataset.id);
          if (!m) return;
          showModal("Edit Membership", `
            <div style="display:grid;gap:10px">
              <input id="mem-edit-type" value="${m.type || ""}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <select id="mem-edit-status" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
                ${["active","inactive","cancelled"].map(s => `<option value="${s}" ${s === (m.status || "active") ? "selected" : ""}>${s}</option>`).join("")}
              </select>
              <input id="mem-edit-price" type="number" step="0.01" value="${Number(m.price || 0).toFixed(2)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="mem-edit-start" type="date" value="${toDateInput(m.startedAt)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="mem-edit-expiry" type="date" value="${toDateInput(m.expiresAt)}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
              <input id="mem-edit-duration" type="number" min="1" value="${m._durationDays}" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            </div>
          `, async () => {
            try {
              const startedAt = document.getElementById("mem-edit-start").value ? new Date(document.getElementById("mem-edit-start").value).getTime() : m.startedAt;
              const expiresAt = document.getElementById("mem-edit-expiry").value ? new Date(document.getElementById("mem-edit-expiry").value).getTime() : m.expiresAt;
              await updateMembership(m.id, {
                type: (document.getElementById("mem-edit-type").value || "").trim() || m.type,
                status: document.getElementById("mem-edit-status").value,
                price: Number(document.getElementById("mem-edit-price").value) || 0,
                startedAt,
                expiresAt,
                durationDays: Math.max(1, parseInt(document.getElementById("mem-edit-duration").value, 10) || m._durationDays),
                updatedAt: Date.now()
              });
              showToast("Membership updated.", "success");
              _loadAdminMembershipsPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });

      container.querySelectorAll(".admin-cancel-mem").forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            await updateMembership(btn.dataset.id, {
              status: "cancelled",
              cancelledAt: Date.now(),
              cancelReason: "Cancelled by admin"
            });
            showToast("Membership cancelled.", "success");
            _loadAdminMembershipsPanel();
          } catch (e) { showToast(e.message, "error"); }
        });
      });

      container.querySelectorAll(".admin-activate-mem").forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            const m = withMeta.find(x => x.id === btn.dataset.id);
            if (!m) return;
            const startedAt = m.startedAt || Date.now();
            const expiresAt = m.expiresAt && m.expiresAt > Date.now()
              ? m.expiresAt
              : Date.now() + (m._durationDays || 30) * oneDay;
            await updateMembership(m.id, { status: "active", startedAt, expiresAt, reactivatedAt: Date.now() });
            showToast("Membership activated.", "success");
            _loadAdminMembershipsPanel();
          } catch (e) { showToast(e.message, "error"); }
        });
      });

      container.querySelectorAll(".admin-delete-mem").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Delete Membership", "<p>Are you sure you want to permanently delete this membership?</p>", async () => {
            try {
              await deleteMembership(btn.dataset.id);
              showToast("Membership deleted.", "success");
              _loadAdminMembershipsPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });
    }

    function renderMembershipList() {
      const query = (document.getElementById("mem-search").value || "").trim().toLowerCase();
      const host = document.getElementById("admin-memberships-list");

      const filtered = withMeta.filter(m => {
        const owner = memberMap[m.clientId];
        const hay = [owner?.name || "", owner?.email || "", m.type || "", m._status || ""].join(" ").toLowerCase();
        return !query || hay.includes(query);
      });

      if (!filtered.length) {
        host.innerHTML = "<p style='opacity:0.65'>No memberships match your search.</p>";
        return;
      }

      host.innerHTML = filtered.map(m => {
        const owner = memberMap[m.clientId] || { name: m.clientId, email: "" };
        const statusColor = m._status === "active" ? "#00c853" : (m._status === "cancelled" ? "#ff0033" : "#0887e2");
        return `
          <div class="card" style="margin-bottom:12px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;cursor:default">
            <div style="min-width:260px;flex:1">
              <h3 style="margin:0 0 6px 0">${owner.name}</h3>
              <div style="opacity:0.62;font-size:0.84rem;margin-bottom:6px">${owner.email || ""}</div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.86rem;opacity:0.82">
                <span><strong>Plan:</strong> ${m.type || "Membership"}</span>
                <span><strong>Price:</strong> ${money(m.price)}</span>
                <span><strong>Duration:</strong> ${m._durationDays} days</span>
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.82rem;opacity:0.72;margin-top:4px">
                <span><strong>Start:</strong> ${formatDate(m.startedAt)}</span>
                <span><strong>Expiry:</strong> ${formatDate(m.expiresAt)}</span>
                <span><strong>Remaining:</strong> ${m._daysLeft == null ? "—" : `${m._daysLeft} day(s)`}</span>
              </div>
              <div style="margin-top:6px;font-size:0.8rem;font-weight:700;color:${statusColor};text-transform:uppercase">${m._status}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
              <button class="admin-edit-mem" data-id="${m.id}" style="padding:7px 12px;border:none;border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;cursor:pointer">Edit</button>
              ${m._status === "active"
                ? `<button class="admin-cancel-mem" data-id="${m.id}" style="padding:7px 12px;border:none;border-radius:8px;background:rgba(255,80,0,0.65);color:#fff;cursor:pointer">Cancel</button>`
                : `<button class="admin-activate-mem" data-id="${m.id}" style="padding:7px 12px;border:none;border-radius:8px;background:rgba(0,200,80,0.65);color:#fff;cursor:pointer">Activate</button>`
              }
              <button class="admin-delete-mem" data-id="${m.id}" style="padding:7px 12px;border:none;border-radius:8px;background:rgba(255,0,60,0.55);color:#fff;cursor:pointer">Delete</button>
            </div>
          </div>
        `;
      }).join("");

      bindMembershipActions(host);
    }

    document.getElementById("mem-search").addEventListener("input", renderMembershipList);
    renderMembershipList();
    renderPlanList();

    const payHost = document.getElementById("admin-membership-payments");
    if (!payments.length) {
      payHost.innerHTML = "<p style='opacity:0.65'>No membership payments recorded yet.</p>";
    } else {
      payHost.innerHTML = payments.slice(0, 12).map(p => {
        const owner = memberMap[p.clientId];
        return `
          <div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
            <span style="opacity:0.8">${owner ? owner.name : (p.clientId || "Unknown")} · ${p.planName || p.membershipType || "Membership"} · ${p.method || "card"}</span>
            <span><strong>${money(p.amount)}</strong> · <span style="opacity:0.6">${formatDate(p.createdAt)}</span></span>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Finances Panel ----------
async function _loadAdminFinancesPanel() {
  const panel = document.getElementById("panel-finances");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Finances</h2><p>Loading…</p>";

  try {
    const transactions = await getAllTransactions();

    let html = `
      <h2 style="color:#0887e2">Financial Records</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Record Transaction</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <select id="txn-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="membership">Membership Payment</option>
            <option value="store_sale">Store Sale</option>
          </select>
          <input id="txn-amount" type="number" step="0.01" placeholder="Amount (£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="txn-category" type="text" placeholder="Category (e.g. Equipment, Salaries)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="txn-desc" type="text" placeholder="Description"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        </div>
        <button id="txn-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
          Record
        </button>
      </div>

      <div class="card" style="padding:30px;margin-bottom:24px">
        <h3 style="margin-bottom:16px">Revenue vs Expenses Over Time</h3>
        <canvas id="chart-finance-detail" height="250"></canvas>
      </div>

      <p style="opacity:0.6">${transactions.length} transaction(s)</p>
      <div id="admin-txn-list"></div>
    `;
    panel.innerHTML = html;

    // Draw finance chart
    const monthlyRev = {}, monthlyExp = {};
    transactions.forEach(txn => {
      const d = new Date(txn.createdAt);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (txn.type === "income" || txn.type === "membership" || txn.type === "store_sale") {
        monthlyRev[key] = (monthlyRev[key] || 0) + (txn.amount || 0);
      } else if (txn.type === "expense") {
        monthlyExp[key] = (monthlyExp[key] || 0) + (txn.amount || 0);
      }
    });
    _drawFinanceDetailChart(monthlyRev, monthlyExp);

    document.getElementById("txn-add-btn").addEventListener("click", async () => {
      const type     = document.getElementById("txn-type").value;
      const amount   = parseFloat(document.getElementById("txn-amount").value) || 0;
      const category = document.getElementById("txn-category").value.trim();
      const desc     = document.getElementById("txn-desc").value.trim();
      if (!amount) { showToast("Enter an amount.", "error"); return; }
      try {
        await recordTransaction({ type, amount, category, description: desc });
        showToast("Transaction recorded!", "success");
        _loadAdminFinancesPanel();
        _loadAdminOverviewPanel();
      } catch (e) { showToast(e.message, "error"); }
    });

    const list = document.getElementById("admin-txn-list");
    if (transactions.length === 0) {
      list.innerHTML = "<p>No transactions recorded yet.</p>";
    } else {
      list.innerHTML = [...transactions].reverse().map(t => {
        const isIncome = t.type !== "expense";
        return `
          <div class="card" style="margin-bottom:10px;font-size:0.9rem;display:flex;align-items:center;justify-content:space-between">
            <div>
              <strong style="color:${isIncome ? '#00c850' : '#0887e2'}">${isIncome ? '+' : '-'}£${(t.amount || 0).toFixed(2)}</strong>
              <span style="margin-left:10px;opacity:0.7">${t.description || ""}</span>
              <span style="margin-left:10px;opacity:0.5;font-size:0.8rem">${t.category || ""}</span>
            </div>
            <span style="opacity:0.5;font-size:0.8rem">${formatDate(t.createdAt)} — ${(t.type || "").toUpperCase()}</span>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

function _drawFinanceDetailChart(monthlyRev, monthlyExp) {
  const canvas = document.getElementById("chart-finance-detail");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.parentElement.clientWidth - 60;
  canvas.height = 250;

  const allKeys = [...new Set([...Object.keys(monthlyRev), ...Object.keys(monthlyExp)])].sort();
  if (allKeys.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px Poppins, sans-serif";
    ctx.fillText("No transaction data yet.", 20, 130);
    return;
  }

  const revValues = allKeys.map(k => monthlyRev[k] || 0);
  const expValues = allKeys.map(k => monthlyExp[k] || 0);
  const maxVal = Math.max(...revValues, ...expValues, 1);

  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const w = canvas.width - padding.left - padding.right;
  const h = canvas.height - padding.top - padding.bottom;

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px Poppins, sans-serif";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + h - (h * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
    ctx.fillText("£" + Math.round(maxVal * i / 5), 5, y + 4);
  }

  // Line chart — Revenue
  function drawLine(values, color) {
    if (values.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    values.forEach((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * w;
      const y = padding.top + h - (v / maxVal) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    ctx.fillStyle = color;
    values.forEach((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * w;
      const y = padding.top + h - (v / maxVal) * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawLine(revValues, "rgba(0,200,80,1)");
  drawLine(expValues, "rgba(233,109,37,1)");

  // X-axis labels
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "10px Poppins, sans-serif";
  allKeys.forEach((key, i) => {
    const x = padding.left + (i / Math.max(allKeys.length - 1, 1)) * w;
    ctx.save();
    ctx.translate(x, canvas.height - 5);
    ctx.rotate(-0.5);
    ctx.fillText(key, -15, 0);
    ctx.restore();
  });

  // Legend
  ctx.fillStyle = "rgba(0,200,80,1)";
  ctx.fillRect(canvas.width - 180, 10, 12, 12);
  ctx.fillStyle = "#fff";
  ctx.font = "11px Poppins, sans-serif";
  ctx.fillText("Revenue", canvas.width - 164, 20);
  ctx.fillStyle = "rgba(233,109,37,1)";
  ctx.fillRect(canvas.width - 100, 10, 12, 12);
  ctx.fillStyle = "#fff";
  ctx.fillText("Expenses", canvas.width - 84, 20);
}

// ---------- Trainer-Client Links Panel ----------
async function _loadAdminTrainerLinksPanel() {
  const panel = document.getElementById("panel-trainer-links");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#0887e2'>Trainer-Client Relationships</h2><p>Loading…</p>";

  try {
    const [links, members] = await Promise.all([getAllTrainerClientLinks(), getAllMembers()]);
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    let html = `
      <h2 style="color:#0887e2">Trainer-Client Relationships</h2>
      <p style="opacity:0.6">${links.length} active link(s)</p>
      <div id="admin-links-list"></div>
    `;
    panel.innerHTML = html;

    const list = document.getElementById("admin-links-list");
    if (links.length === 0) {
      list.innerHTML = "<p>No trainer-client links yet.</p>";
    } else {
      list.innerHTML = links.map(link => {
        const trainer = memberMap[link.trainerId];
        const client  = memberMap[link.clientId];
        return `
          <div class="card" style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div>
              <strong style="color:#e96d25">${trainer ? trainer.name : link.trainerId}</strong>
              <span style="opacity:0.5;margin:0 8px">→</span>
              <strong style="color:#00c850">${client ? client.name : link.clientId}</strong>
              <span style="margin-left:12px;opacity:0.5;font-size:0.8rem">Since ${formatDate(link.createdAt)}</span>
            </div>
            <button class="admin-delete-link" data-id="${link.id}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
              Remove
            </button>
          </div>
        `;
      }).join("");

      list.querySelectorAll(".admin-delete-link").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Remove Link", "<p>Remove this trainer-client relationship?</p>", async () => {
            try {
              await deleteTrainerClientLink(btn.dataset.id);
              showToast("Link removed.", "success");
              _loadAdminTrainerLinksPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Error</h2><p>${e.message}</p>`;
  }
}

// ============================================================
// SECTION 11: BOOTSTRAP — Run correct init based on current page
// ============================================================

// ─── Notification helpers ────────────────────────────────────
function _notif(type) {
  if (window.XGymNotifications) window.XGymNotifications.addNotification(type, 1);
}

function _isPanelOpen(panelId) {
  const el = document.getElementById(panelId);
  return el ? el.style.display === "block" : false;
}

/**
 * Watch a Firebase ref for NEW children only (skip items that already exist).
 * Returns an unsubscribe function.
 */
function _watchNewChildren(ref, callback) {
  let existingKeys = null;
  ref.once("value").then(snap => {
    existingKeys = new Set();
    snap.forEach(c => existingKeys.add(c.key));
    ref.on("child_added", child => {
      if (existingKeys.has(child.key)) return;
      existingKeys.add(child.key);
      callback(child);
    });
  });
  return () => ref.off("child_added");
}

/**
 * Start Firebase listeners that feed real notification badges for CLIENT.
 * Only fires a badge when the relevant panel is NOT already open.
 */
async function _startClientNotifListeners(uid) {
  const linkedTrainerIds = new Set();

  try {
    // Messages: watch each accepted trainer's conversation
    const invSnap = await db.ref("client_invites/" + uid).once("value");
    invSnap.forEach(child => {
      const data = child.val();
      const trainerId = data?.trainerId || child.key;
      if (data && data.status === "accepted" && trainerId) {
        linkedTrainerIds.add(trainerId);
        const convoId = [uid, trainerId].sort().join("_");

        // Message notifications
        _watchNewChildren(db.ref("messages/" + convoId), snap => {
          const msg = snap.val();
          if (msg && msg.from !== uid && !_isPanelOpen("panel-messenger")) {
            _notif("messenger");
          }
        });
      }
    });
  } catch(e) { console.error("[X-Gym] Client notif - messages:", e); }

  // New classes: notify booking tab for relevant classes
  _watchNewChildren(db.ref("classes"), snap => {
    const c = snap.val();
    if (!c) return;
    const isAdminClass    = !c.source || c.source === "admin";
    const isLinkedTrainer = c.source === "trainer" && linkedTrainerIds.has(c.trainerId);
    if ((isAdminClass || isLinkedTrainer) && !_isPanelOpen("panel-booking")) {
      _notif("booking");
    }
  });

  // Workouts: new plan assigned to this client
  _watchNewChildren(
    db.ref("workouts"),
    snap => {
      const d = snap.val();
      if (d && d.clientId === uid && !_isPanelOpen("panel-workouts")) _notif("workouts");
    }
  );

  // Meals: new meal plan assigned to this client
  _watchNewChildren(
    db.ref("meals"),
    snap => {
      const d = snap.val();
      if (d && d.clientId === uid && !_isPanelOpen("panel-meals")) _notif("meals");
    }
  );
}

/**
 * Start Firebase listeners that feed real notification badges for TRAINER.
 */
async function _startTrainerNotifListeners(uid) {
  try {
    // Messages: watch each linked client's conversation
    const invSnap = await db.ref("trainer_invites/" + uid).once("value");
    invSnap.forEach(child => {
      if (child.val() && child.val().status === "accepted") {
        const clientId = child.key;
        const convoId  = [uid, clientId].sort().join("_");
        _watchNewChildren(db.ref("messages/" + convoId), snap => {
          const msg = snap.val();
          if (msg && msg.from !== uid && !_isPanelOpen("panel-messenger")) {
            _notif("messenger");
          }
        });
      }
    });
  } catch(e) { console.error("[X-Gym] Trainer notif - messages:", e); }

  // New client invite received
  _watchNewChildren(
    db.ref("trainer_invites/" + uid),
    () => { if (!_isPanelOpen("panel-clients")) _notif("clients"); }
  );

  // Class enrollments: watch each of trainer's classes for new participants
  try {
    const classSnap = await db.ref("classes").orderByChild("trainerId").equalTo(uid).once("value");
    classSnap.forEach(child => {
      _watchNewChildren(
        db.ref("classes/" + child.key + "/participants"),
        () => { if (!_isPanelOpen("panel-classes")) _notif("classes"); }
      );
    });
  } catch(e) { console.error("[X-Gym] Trainer notif - classes:", e); }
}

/**
 * Start Firebase listeners that feed real notification badges for ADMIN.
 */
function _startAdminNotifListeners() {
  // New user registered
  _watchNewChildren(
    db.ref("users"),
    () => { if (!_isPanelOpen("panel-members")) _notif("members"); }
  );

  // New trainer-client link accepted
  _watchNewChildren(
    db.ref("trainer_clients"),
    () => { if (!_isPanelOpen("panel-trainer-links")) _notif("trainer-links"); }
  );
}

(function bootstrap() {
  const page = detectPage();
  if (page === "index")   initIndexPage();
  if (page === "client")  initClientPage();
  if (page === "trainer") initTrainerPage();
  if (page === "admin")   initAdminPage();
})();

// ============================================================
// SECTION 12: FUTURE IMPLEMENTATION GUIDE
// ============================================================
//
// CLASS BOOKING SYSTEM — RTDB Data Model
// -----------------------------------------------
// classes/{classId}: {
//   name: String,           // e.g. "Cardio Blast"
//   day: String,            // e.g. "Monday"
//   time: String,           // e.g. "7:00 AM"
//   trainerId: String,      // trainer's uid
//   trainerName: String,    // trainer's display name
//   capacity: Number,       // max bookings allowed
//   createdAt: Number       // Date.now()
// }
//
// bookings/{bookingId}: {
//   classId: String,        // references classes/{classId}
//   clientId: String,       // client's uid
//   clientName: String,     // client's display name
//   createdAt: Number       // Date.now()
// }
//
// FUNCTIONS TO IMPLEMENT
// -----------------------------------------------
// createClass(trainerId, trainerName, { name, day, time, capacity })
//   — Trainer creates a new class. Write to db.ref("classes").push()
//
// getClasses()
//   — Fetch all classes. Used by client booking panel.
//
// getTrainerClasses(trainerId)
//   — Fetch classes where trainerId matches. Used by trainer "My Classes" panel.
//
// bookClass(classId, clientId, clientName)
//   — Client books a class. Check current booking count vs capacity before writing.
//     Write to db.ref("bookings").push()
//
// getClientBookings(clientId)
//   — Fetch bookings where clientId matches. Used by client "My Bookings" section.
//
// cancelBooking(bookingId)
//   — Client cancels. db.ref("bookings/" + bookingId).remove()
//
// TRAINER PICKING ENHANCEMENT
// -----------------------------------------------
// The existing _loadClientTrainersPanel() shows trainers with a "Hire" button.
// Future enhancement: for each trainer card, also fetch their classes via
// getTrainerClasses(trainerId) and display them. Add a "Book" button per class
// that calls bookClass() and also auto-hires the trainer if not already hired.
// This creates two pathways: trainer-first (pick trainer → see classes → book)
// and class-first (browse all classes in panel-booking → discover trainer)

// ============================================================
// SECTION 10: MESSAGING SYSTEM
// ============================================================

/**
 * Send a direct message between two users.
 * Messages stored at db.ref("messages/{conversationId}/{pushId}")
 */
async function sendMessage(fromId, toId, fromName, text) {
  const convoId = [fromId, toId].sort().join("_");
  await db.ref("messages/" + convoId).push().set({
    from: fromId,
    to: toId,
    fromName: fromName,
    text: text,
    timestamp: Date.now(),
    read: false
  });
}

/**
 * Listen to messages in a conversation (real-time).
 */
function listenMessages(fromId, toId, callback) {
  const convoId = [fromId, toId].sort().join("_");
  const query = db.ref("messages/" + convoId).orderByChild("timestamp");
  const handler = snap => {
    const msgs = [];
    snap.forEach(child => {
      msgs.push({ id: child.key, ...child.val() });
    });
    callback(msgs);
  };

  query.on("value", handler);

  // Return an unsubscribe handler so panel switches do not stack listeners.
  return () => query.off("value", handler);
}

/**
 * Send a hiring invite from client to trainer.
 */
async function sendHiringInvite(clientId, clientName, trainerId) {
  await db.ref("hiring_invites").push().set({
    clientId,
    clientName,
    trainerId,
    status: "pending",
    createdAt: Date.now()
  });
}

// getTrainerInvites is defined earlier in the file — reads from trainer_invites/{trainerId}

/**
 * Accept or decline a hiring invite.
 */
async function respondToInvite(inviteId, accept, trainerId, clientId) {
  await db.ref("hiring_invites/" + inviteId).update({
    status: accept ? "accepted" : "declined"
  });
  if (accept) {
    // Link client to trainer
    await db.ref("users/" + clientId + "/trainerId").set(trainerId);
    await db.ref("users/" + trainerId + "/clients/" + clientId).set(true);
  }
}

/**
 * Get all messages metadata for admin (who messaged whom, timestamps — no message text).
 */
async function getMessagingActivity() {
  const snap = await db.ref("messages").once("value");
  const activity = [];
  snap.forEach(convo => {
    const convoId = convo.key;
    const parts = convoId.split("_");
    let lastTimestamp = 0;
    let messageCount = 0;
    convo.forEach(msg => {
      messageCount++;
      if (msg.val().timestamp > lastTimestamp) lastTimestamp = msg.val().timestamp;
    });
    activity.push({
      convoId,
      participants: parts,
      messageCount,
      lastTimestamp
    });
  });
  return activity.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

function _msgEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function _msgInitials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

function _ensureMessengerStyles() {
  if (document.getElementById("xmsg-styles")) return;
  const style = document.createElement("style");
  style.id = "xmsg-styles";
  style.textContent = `
    .xmsg-wrap{background:rgba(0,18,32,0.82);border:1px solid rgba(8,165,226,0.18);border-radius:16px;overflow:hidden}
    .xmsg-head{padding:16px 18px;border-bottom:1px solid rgba(8,165,226,0.14);display:flex;align-items:center;justify-content:space-between;gap:10px}
    .xmsg-head h2{margin:0;color:#9bd9ff;font-family:'Orbitron',monospace;font-size:0.95rem;letter-spacing:0.08em}
    .xmsg-head p{margin:5px 0 0;opacity:0.68;font-size:0.86rem}
    .xmsg-grid{display:grid;grid-template-columns:minmax(260px,320px) 1fr;min-height:520px}
    .xmsg-left{border-right:1px solid rgba(8,165,226,0.14);background:rgba(0,13,24,0.5);display:flex;flex-direction:column}
    .xmsg-left-list{overflow-y:auto;flex:1}
    .xmsg-row{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid rgba(8,165,226,0.08);cursor:pointer;transition:0.2s;background:transparent}
    .xmsg-row:hover{background:rgba(8,135,226,0.12)}
    .xmsg-row.active{background:rgba(8,135,226,0.2);border-left:3px solid #0887e2;padding-left:11px}
    .xmsg-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0887e2,#5ec9ff);color:#001220;font-weight:700;font-family:'Orbitron',monospace;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.75rem}
    .xmsg-row-main{min-width:0;flex:1}
    .xmsg-row-top{display:flex;justify-content:space-between;gap:8px;align-items:center}
    .xmsg-name{font-weight:700;color:#e9f8ff;font-size:0.88rem}
    .xmsg-role{opacity:0.55;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em}
    .xmsg-snippet{opacity:0.58;font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
    .xmsg-chip{padding:3px 8px;border-radius:999px;font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em}
    .xmsg-chip.pending{background:rgba(233,109,37,0.22);color:#ffb98d}
    .xmsg-chip.ok{background:rgba(0,200,80,0.2);color:#82ffb3}
    .xmsg-right{display:flex;flex-direction:column;min-width:0}
    .xmsg-thread-head{padding:14px 16px;border-bottom:1px solid rgba(8,165,226,0.14);display:flex;align-items:center;justify-content:space-between;gap:10px}
    .xmsg-thread-title{font-weight:700;color:#dff4ff;font-size:0.95rem}
    .xmsg-thread-sub{opacity:0.58;font-size:0.78rem;margin-top:2px}
    .xmsg-thread{padding:14px 16px;overflow-y:auto;flex:1;background:linear-gradient(180deg,rgba(0,13,20,0.45),rgba(0,13,20,0.2))}
    .xmsg-empty{opacity:0.48;text-align:center;padding:28px 14px}
    .xmsg-mail{padding:10px 12px;border:1px solid rgba(8,165,226,0.12);border-radius:10px;background:rgba(0,18,32,0.65);margin-bottom:10px}
    .xmsg-mail.mine{border-color:rgba(8,165,226,0.38);background:rgba(8,135,226,0.18)}
    .xmsg-mail-top{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:0.74rem;opacity:0.72;margin-bottom:6px}
    .xmsg-mail-body{font-size:0.9rem;line-height:1.5;color:#f1f9fe;white-space:pre-wrap;word-break:break-word}
    .xmsg-compose{padding:12px 14px;border-top:1px solid rgba(8,165,226,0.14);display:flex;gap:10px;background:rgba(0,18,32,0.78)}
    .xmsg-compose input{flex:1;padding:11px 12px;border-radius:8px;border:1px solid rgba(8,165,226,0.26);background:rgba(0,13,24,0.92);color:#fff;font-family:'Exo 2',sans-serif;outline:none}
    .xmsg-btn{padding:10px 14px;border:none;border-radius:8px;cursor:pointer;color:#fff;font-family:'Orbitron',monospace;font-size:0.72rem;letter-spacing:0.06em}
    .xmsg-btn.primary{background:linear-gradient(135deg,#0887e2,#006af5)}
    .xmsg-btn.warn{background:linear-gradient(135deg,#e96d25,#ff9a44)}
    .xmsg-btn.soft{background:rgba(8,135,226,0.22);border:1px solid rgba(8,135,226,0.36)}
    .xmsg-invite{margin:10px;border:1px solid rgba(233,109,37,0.26);background:rgba(233,109,37,0.1);border-radius:10px;padding:10px}
    .xmsg-invite h4{margin:0 0 8px 0;font-size:0.76rem;font-family:'Orbitron',monospace;color:#ffb98d;letter-spacing:0.05em}
    .xmsg-invite-item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(233,109,37,0.18)}
    .xmsg-invite-item:first-of-type{border-top:none}
    @media (max-width: 980px){
      .xmsg-grid{grid-template-columns:1fr}
      .xmsg-left{border-right:none;border-bottom:1px solid rgba(8,165,226,0.14);max-height:270px}
    }
  `;
  document.head.appendChild(style);
}

// ============================================================
// CLIENT MESSENGER PANEL
// ============================================================
async function _loadClientMessengerPanel(clientId, clientName) {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

  _ensureMessengerStyles();
  const preferredTrainerId = sessionStorage.getItem("xgym_msg_trainer_id") || "";

  // Fetch available trainers for dropdown
  let trainers = [];
  try {
    const snap = await db.ref("users").orderByChild("role").equalTo("trainer").once("value");
    snap.forEach(child => {
      trainers.push({ id: child.key, ...child.val() });
    });
  } catch (e) {
    console.error("[X-Gym] Failed to load trainers for messenger:", e);
  }

  let selectedTrainerId = "";
  let stopListening = null;

  panel.innerHTML = `
    <div class="xmsg-wrap">
      <div class="xmsg-head">
        <div>
          <h2>Messenger</h2>
        </div>
      </div>

      <div class="xmsg-grid">
        <aside class="xmsg-left">
          <div class="xmsg-left-list" id="msg-user-list"></div>
        </aside>

        <section class="xmsg-right">
          <div class="xmsg-thread-head">
            <div>
              <div class="xmsg-thread-title" id="msg-thread-title">Select a trainer</div>
              <div class="xmsg-thread-sub" id="msg-thread-sub">Choose a trainer from the left inbox to open conversation.</div>
            </div>
            <button class="xmsg-btn warn" id="msg-send-invite-btn" disabled>Send Invite</button>
          </div>

          <div class="xmsg-thread" id="msg-messages">
            <div class="xmsg-empty">No conversation selected.</div>
          </div>

          <div class="xmsg-compose">
            <input id="msg-input" type="text" placeholder="Write a message" disabled>
            <button class="xmsg-btn primary" id="msg-send-btn" disabled>Send</button>
          </div>
        </section>
      </div>
    </div>
  `;

  const list = document.getElementById("msg-user-list");
  const threadTitle = document.getElementById("msg-thread-title");
  const threadSub = document.getElementById("msg-thread-sub");
  const messagesDiv = document.getElementById("msg-messages");
  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("msg-send-btn");
  const inviteBtn = document.getElementById("msg-send-invite-btn");

  const renderRows = () => {
    if (trainers.length === 0) {
      list.innerHTML = `<div class="xmsg-empty" style="text-align:left">No trainers available.</div>`;
      return;
    }
    list.innerHTML = trainers.map(t => {
      const name = _msgEscape(t.name || t.email || "Trainer");
      return `
        <div class="xmsg-row ${selectedTrainerId === t.id ? "active" : ""}" data-id="${t.id}">
          <div class="xmsg-avatar">${_msgEscape(_msgInitials(name))}</div>
          <div class="xmsg-row-main">
            <div class="xmsg-row-top">
              <span class="xmsg-name">${name}</span>
              <span class="xmsg-role">trainer</span>
            </div>
            <div class="xmsg-snippet">${_msgEscape(t.email || "Click to open conversation")}</div>
          </div>
        </div>`;
    }).join("");

    list.querySelectorAll(".xmsg-row").forEach(row => {
      row.addEventListener("click", () => {
        selectedTrainerId = row.dataset.id;
        renderRows();
        openThread();
      });
    });
  };

  if (preferredTrainerId && trainers.some(t => t.id === preferredTrainerId)) {
    selectedTrainerId = preferredTrainerId;
    sessionStorage.removeItem("xgym_msg_trainer_id");
  }

  const renderMessages = (msgs) => {
    if (!msgs.length) {
      messagesDiv.innerHTML = `<div class="xmsg-empty">No messages yet. Start the thread.</div>`;
      return;
    }
    messagesDiv.innerHTML = msgs.map(m => `
      <article class="xmsg-mail ${m.from === clientId ? "mine" : ""}">
        <div class="xmsg-mail-top">
          <strong>${_msgEscape(m.fromName || "Unknown")}</strong>
          <span>${_msgEscape(formatDate(m.timestamp))}</span>
        </div>
        <div class="xmsg-mail-body">${_msgEscape(m.text)}</div>
      </article>
    `).join("");
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const openThread = () => {
    if (stopListening) stopListening();

    const trainer = trainers.find(t => t.id === selectedTrainerId);
    if (!trainer) {
      threadTitle.textContent = "Select a trainer";
      threadSub.textContent = "Choose a trainer from the left inbox to open conversation.";
      messagesDiv.innerHTML = `<div class="xmsg-empty">No conversation selected.</div>`;
      input.disabled = true;
      sendBtn.disabled = true;
      inviteBtn.disabled = true;
      return;
    }

    threadTitle.textContent = trainer.name || trainer.email || "Trainer";
    threadSub.textContent = "Trainer conversation";
    input.disabled = false;
    sendBtn.disabled = false;
    inviteBtn.disabled = false;
    messagesDiv.innerHTML = `<div class="xmsg-empty">Loading messages...</div>`;

    stopListening = listenMessages(clientId, selectedTrainerId, renderMessages);
  };

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text || !selectedTrainerId) return;
    sendMessage(clientId, selectedTrainerId, clientName, text);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  inviteBtn.addEventListener("click", async () => {
    if (!selectedTrainerId) {
      showToast("Select a trainer first.", "error");
      return;
    }
    try {
      await sendTrainerInvite(clientId, selectedTrainerId);
      showToast("Invite sent! The trainer will review your profile.", "success");
    } catch (e) {
      showToast("Failed to send invite: " + e.message, "error");
    }
  });

  renderRows();
  openThread();
}

// ============================================================
// TRAINER MESSENGER PANEL
// ============================================================
async function _loadTrainerMessengerPanel(trainerId, trainerName) {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

  _ensureMessengerStyles();

  // Fetch trainer's linked clients via trainer_invites/{trainerId} where status === "accepted"
  // This uses the same path already indexed by trainerId — no extra Firebase index needed.
  let clients = [];
  try {
    const invitesSnap = await db.ref("trainer_invites/" + trainerId).once("value");
    const acceptedClientIds = [];
    invitesSnap.forEach(child => {
      const val = child.val();
      if (val && val.status === "accepted") acceptedClientIds.push(child.key);
    });
    for (const cid of acceptedClientIds) {
      const userSnap = await db.ref("users/" + cid).once("value");
      if (userSnap.exists()) clients.push({ id: cid, ...userSnap.val() });
    }
  } catch (e) {
    console.error("[X-Gym] Failed to load clients for messenger:", e);
  }

  // Fetch pending invites
  let invites = [];
  try {
    const allInvites = await getTrainerInvites(trainerId);
    invites = allInvites.filter(inv => inv.status === "pending");
  } catch (e) {
    console.error("[X-Gym] Failed to load invites:", e);
  }

  let selectedClientId = "";
  let stopListening = null;

  panel.innerHTML = `
    <div class="xmsg-wrap">
      <div class="xmsg-head">
        <div>
          <h2>Messenger</h2>
        </div>
      </div>

      <div class="xmsg-grid">
        <aside class="xmsg-left">
          ${invites.length > 0 ? `
            <div class="xmsg-invite" id="msg-invites-list">
              <h4>Pending Invites (${invites.length})</h4>
              ${invites.map(inv => `
                <div class="xmsg-invite-item">
                  <div>
                    <div style="font-size:0.84rem;font-weight:700">${_msgEscape(inv.clientName || "Unknown Client")}</div>
                    <div style="font-size:0.7rem;opacity:0.65">Wants to hire you</div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="xmsg-btn soft" data-invite="${inv.clientId || inv.clientKey}" data-action="accept">Accept</button>
                    <button class="xmsg-btn soft" data-invite="${inv.clientId || inv.clientKey}" data-action="decline">Decline</button>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          <div class="xmsg-left-list" id="msg-user-list"></div>
        </aside>

        <section class="xmsg-right">
          <div class="xmsg-thread-head">
            <div>
              <div class="xmsg-thread-title" id="msg-thread-title">Select a client</div>
              <div class="xmsg-thread-sub" id="msg-thread-sub">Choose a client on the left to open conversation.</div>
            </div>
          </div>

          <div class="xmsg-thread" id="msg-messages">
            <div class="xmsg-empty">No conversation selected.</div>
          </div>

          <div class="xmsg-compose">
            <input id="msg-input" type="text" placeholder="Write a message" disabled>
            <button class="xmsg-btn primary" id="msg-send-btn" disabled>Send</button>
          </div>
        </section>
      </div>
    </div>
  `;

  const list = document.getElementById("msg-user-list");
  const threadTitle = document.getElementById("msg-thread-title");
  const threadSub = document.getElementById("msg-thread-sub");
  const messagesDiv = document.getElementById("msg-messages");
  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("msg-send-btn");

  const renderRows = () => {
    if (clients.length === 0) {
      list.innerHTML = `<div class="xmsg-empty" style="text-align:left">No linked clients yet.</div>`;
      return;
    }

    list.innerHTML = clients.map(c => {
      const name = _msgEscape(c.name || c.email || "Client");
      return `
        <div class="xmsg-row ${selectedClientId === c.id ? "active" : ""}" data-id="${c.id}">
          <div class="xmsg-avatar">${_msgEscape(_msgInitials(name))}</div>
          <div class="xmsg-row-main">
            <div class="xmsg-row-top">
              <span class="xmsg-name">${name}</span>
              <span class="xmsg-role">client</span>
            </div>
            <div class="xmsg-snippet">${_msgEscape(c.email || "Open to view messages")}</div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".xmsg-row").forEach(row => {
      row.addEventListener("click", () => {
        selectedClientId = row.dataset.id;
        renderRows();
        openThread();
      });
    });
  };

  const renderMessages = (msgs) => {
    if (!msgs.length) {
      messagesDiv.innerHTML = `<div class="xmsg-empty">No messages yet.</div>`;
      return;
    }
    messagesDiv.innerHTML = msgs.map(m => `
      <article class="xmsg-mail ${m.from === trainerId ? "mine" : ""}">
        <div class="xmsg-mail-top">
          <strong>${_msgEscape(m.fromName || "Unknown")}</strong>
          <span>${_msgEscape(formatDate(m.timestamp))}</span>
        </div>
        <div class="xmsg-mail-body">${_msgEscape(m.text)}</div>
      </article>
    `).join("");
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const openThread = () => {
    if (stopListening) stopListening();

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      threadTitle.textContent = "Select a client";
      threadSub.textContent = "Choose a client on the left to open conversation.";
      messagesDiv.innerHTML = `<div class="xmsg-empty">No conversation selected.</div>`;
      input.disabled = true;
      sendBtn.disabled = true;
      return;
    }

    threadTitle.textContent = client.name || client.email || "Client";
    threadSub.textContent = "Client conversation";
    input.disabled = false;
    sendBtn.disabled = false;
    messagesDiv.innerHTML = `<div class="xmsg-empty">Loading messages...</div>`;

    stopListening = listenMessages(trainerId, selectedClientId, renderMessages);
  };

  // Invite accept/decline handlers
  panel.querySelectorAll("[data-invite]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const clientId = btn.dataset.invite;
      const accept = btn.dataset.action === "accept";
      try {
        if (accept) {
          await acceptTrainerInvite(trainerId, clientId);
          showToast("Invite accepted! Payment request sent to client.", "success");
        } else {
          await dismissTrainerInvite(trainerId, clientId);
          showToast("Invite declined.", "info");
        }
        _loadTrainerMessengerPanel(trainerId, trainerName);
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    });
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text || !selectedClientId) return;
    sendMessage(trainerId, selectedClientId, trainerName, text);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  renderRows();
  openThread();
}

// ============================================================
// ADMIN MANAGE CLASSES PANEL
// ============================================================
async function _loadAdminClassesPanel() {
  const panel = document.getElementById("panel-classes");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const CLASS_TYPES = ["General","Strength","Cardio","HIIT","Yoga","Pilates","Boxing","Cycling","Stretching","CrossFit"];
  const TYPE_COLORS = {
    "Strength":"#e96d25","Cardio":"#ff0033","HIIT":"#ff6b00","Yoga":"#7c4dff",
    "Pilates":"#e91e63","Boxing":"#f44336","Cycling":"#0887e2","Stretching":"#00bcd4",
    "CrossFit":"#ff5722","General":"#00c853"
  };

  panel.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5">Loading class data…</div>`;

  let classes, trainers;
  try {
    [classes, trainers] = await Promise.all([getClasses(), getAvailableTrainers()]);
  } catch(e) {
    panel.innerHTML = `<h2 style="color:#0887e2">Manage Classes</h2><p style="color:#ff0033">${e.message}</p>`;
    return;
  }

  const counts = {};
  for (const c of classes) counts[c.id] = await getClassBookingCount(c.id);

  const totalBooked = Object.values(counts).reduce((s, n) => s + n, 0);
  const totalCap = classes.reduce((s, c) => s + (c.capacity || 20), 0);
  const fillRate = totalCap ? Math.round((totalBooked / totalCap) * 100) : 0;
  const activeDays = DAYS.filter(d => classes.some(c => c.day === d));

  const trainerOpts = trainers.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join("");
  const dayOpts = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");
  const typeOpts = CLASS_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");

  const inputStyle = `padding:9px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
    background:rgba(255,255,255,0.05);color:inherit;font-family:inherit;font-size:0.88rem`;

  function buildCards(filterDay, filterTrainer, filterType) {
    const days = filterDay === "All" ? activeDays : (activeDays.includes(filterDay) ? [filterDay] : []);
    let html = "";
    for (const day of days) {
      let dayClasses = classes.filter(c => c.day === day);
      if (filterTrainer) dayClasses = dayClasses.filter(c => c.trainerId === filterTrainer);
      if (filterType && filterType !== "All Types") dayClasses = dayClasses.filter(c => c.type === filterType);
      if (!dayClasses.length) continue;
      html += `<div style="margin-bottom:24px">
        <h3 style="font-family:Orbitron,sans-serif;font-size:0.78rem;letter-spacing:2px;color:#0887e2;
          margin:0 0 12px;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid rgba(8,165,226,0.15)">${day}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px">
          ${dayClasses.map(c => {
            const booked = counts[c.id] || 0;
            const cap = c.capacity || 20;
            const pct = Math.min((booked / cap) * 100, 100);
            const barColor = pct >= 90 ? "#ff0033" : pct >= 60 ? "#e96d25" : "#00c853";
            const typeColor = TYPE_COLORS[c.type] || "#00c853";
            return `<div class="card" style="display:flex;flex-direction:column;gap:10px;padding:16px;
              cursor:default;border-top:3px solid ${typeColor}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div>
                  <strong style="font-size:0.95rem;display:block;margin-bottom:4px">${c.name}</strong>
                  <span style="background:${typeColor}22;color:${typeColor};padding:1px 7px;border-radius:5px;font-size:0.68rem;font-weight:600">${c.type || "General"}</span>
                </div>
                <span style="background:${pct >= 100 ? "rgba(255,0,51,0.12)" : "rgba(0,200,80,0.1)"};
                  color:${pct >= 100 ? "#ff0033" : "#00c853"};padding:2px 9px;border-radius:10px;font-size:0.7rem;font-weight:700;white-space:nowrap">
                  ${pct >= 100 ? "FULL" : (cap - booked) + " open"}</span>
              </div>
              <div style="font-size:0.82rem;opacity:0.65;display:flex;flex-direction:column;gap:3px">
                <span>🕐 ${c.time}${c.duration ? " · " + c.duration + " min" : ""} &nbsp;·&nbsp; 👤 ${c.trainerName || "Unassigned"}</span>
                ${c.location ? "<span>📍 " + c.location + "</span>" : ""}
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;opacity:0.5;margin-bottom:4px">
                  <span>Capacity</span><span>${booked}/${cap}</span>
                </div>
                <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:5px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="ac-roster-btn" data-id="${c.id}" data-name="${c.name}"
                  style="flex:1;min-width:80px;padding:7px 4px;border:1px solid rgba(8,165,226,0.3);border-radius:6px;
                  background:transparent;color:#0887e2;cursor:pointer;font-size:0.75rem;font-weight:600">
                  👥 Roster (${booked})</button>
                <button class="ac-edit-btn"
                  data-id="${c.id}" data-name="${c.name}" data-day="${c.day}" data-time="${c.time}"
                  data-trainer="${c.trainerId}" data-cap="${c.capacity || 20}" data-type="${c.type || "General"}"
                  data-duration="${c.duration || ""}" data-location="${(c.location || "").replace(/"/g,"&quot;")}"
                  data-ispublic="${c.isPublic !== false}"
                  style="flex:1;min-width:60px;padding:7px 4px;border:none;border-radius:6px;
                  background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;
                  font-size:0.75rem;font-weight:600">Edit</button>
                <button class="ac-del-btn" data-id="${c.id}" data-name="${c.name}"
                  style="flex:1;min-width:60px;padding:7px 4px;border:1px solid rgba(255,0,51,0.35);border-radius:6px;
                  background:transparent;color:#ff0033;cursor:pointer;font-size:0.75rem;font-weight:600">Delete</button>
              </div>
            </div>`;
          }).join("")}
        </div></div>`;
    }
    if (!html) html = `<div class="card" style="text-align:center;padding:40px;opacity:0.5">No classes match the current filters.</div>`;
    return html;
  }

  const dayPills = ["All", ...activeDays].map(d =>
    `<button class="ac-day-pill" data-day="${d}"
      style="padding:5px 14px;border-radius:16px;border:1px solid rgba(8,165,226,${d === "All" ? "0.5" : "0.2"});
      background:${d === "All" ? "rgba(8,135,226,0.15)" : "transparent"};color:inherit;cursor:pointer;
      font-family:inherit;font-size:0.78rem;transition:0.2s;white-space:nowrap">${d}</button>`
  ).join("");

  const trainerFilter = `<select id="ac-filter-trainer" style="${inputStyle};min-width:150px">
    <option value="">All Trainers</option>
    ${trainers.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}
  </select>`;

  const typeFilter = `<select id="ac-filter-type" style="${inputStyle};min-width:130px">
    <option value="">All Types</option>
    ${CLASS_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
  </select>`;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <h2 style="color:#0887e2;margin:0">Manage Classes</h2>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#0887e2">${classes.length}</div>
        <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">Total Classes</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#e96d25">${trainers.length}</div>
        <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">Active Trainers</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#ff0033">${totalBooked}</div>
        <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">Total Enrolled</div>
      </div>
      <div class="card" style="text-align:center;padding:16px;cursor:default">
        <div style="font-size:1.8rem;font-weight:700;color:#00c853">${fillRate}%</div>
        <div style="font-size:0.78rem;opacity:0.6;margin-top:2px">Fill Rate</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;overflow:hidden">
      <div id="ac-form-toggle" style="padding:14px 20px;cursor:pointer;display:flex;align-items:center;
        justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06)">
        <strong style="font-size:0.92rem">+ New Class</strong>
        <span id="ac-form-arrow" style="opacity:0.5;transition:transform 0.2s">▼</span>
      </div>
      <div id="ac-form-body" style="display:none;padding:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <input id="ac-name" type="text" placeholder="Class Name" style="${inputStyle}">
          <select id="ac-type" style="${inputStyle}"><option value="">— Type —</option>${typeOpts}</select>
          <select id="ac-trainer" style="${inputStyle}"><option value="">— Trainer —</option>${trainerOpts}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <select id="ac-day" style="${inputStyle}">${dayOpts}</select>
          <input id="ac-time" type="time" style="${inputStyle}">
          <input id="ac-duration" type="number" min="15" max="180" placeholder="Duration (min)" value="60" style="${inputStyle}">
          <input id="ac-capacity" type="number" min="1" placeholder="Capacity" value="20" style="${inputStyle}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <input id="ac-location" type="text" placeholder="Location (e.g. Studio A)" style="${inputStyle}">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:0.88rem;opacity:0.8">
            <input id="ac-ispublic" type="checkbox" checked style="width:16px;height:16px;cursor:pointer">
            Public class (visible to all clients)
          </label>
        </div>
        <textarea id="ac-description" rows="2" placeholder="Short description (optional)"
          style="${inputStyle};width:100%;resize:vertical;box-sizing:border-box;margin-bottom:12px"></textarea>
        <button id="ac-create-btn" style="padding:10px 28px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#0887e2,#006af5);color:#fff;cursor:pointer;
          font-family:inherit;font-weight:600;font-size:0.9rem">+ Create Class</button>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <h3 style="margin:0">Weekly Schedule</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          ${trainerFilter}
          ${typeFilter}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${dayPills}</div>
      <div id="ac-schedule">${buildCards("All", "", "All Types")}</div>
    </div>`;

  // Toggle form
  let formOpen = false;
  document.getElementById("ac-form-toggle").addEventListener("click", () => {
    formOpen = !formOpen;
    document.getElementById("ac-form-body").style.display = formOpen ? "block" : "none";
    document.getElementById("ac-form-arrow").style.transform = formOpen ? "rotate(180deg)" : "";
  });

  let activeDay = "All", activeTrainer = "", activeType = "All Types";

  function refresh() {
    document.getElementById("ac-schedule").innerHTML = buildCards(activeDay, activeTrainer, activeType);
    bindAdminClassBtns();
  }

  panel.querySelectorAll(".ac-day-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      activeDay = pill.dataset.day;
      panel.querySelectorAll(".ac-day-pill").forEach(p => {
        const on = p.dataset.day === activeDay;
        p.style.background = on ? "rgba(8,135,226,0.15)" : "transparent";
        p.style.borderColor = on ? "rgba(8,165,226,0.5)" : "rgba(8,165,226,0.2)";
      });
      refresh();
    });
  });

  document.getElementById("ac-filter-trainer").addEventListener("change", e => { activeTrainer = e.target.value; refresh(); });
  document.getElementById("ac-filter-type").addEventListener("change", e => { activeType = e.target.value || "All Types"; refresh(); });

  function bindAdminClassBtns() {
    // Roster buttons
    panel.querySelectorAll(".ac-roster-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const roster = await getClassRoster(btn.dataset.id);
        const classId = btn.dataset.id;
        let listHtml = "";
        if (!roster.length) {
          listHtml = `<p style="text-align:center;opacity:0.5;padding:20px">No clients enrolled yet.</p>`;
        } else {
          listHtml = `<table style="width:100%;border-collapse:collapse;font-size:0.88rem">
            <thead><tr style="opacity:0.5;font-size:0.75rem">
              <th style="text-align:left;padding:6px 8px">Client</th>
              <th style="text-align:left;padding:6px 8px">Joined</th>
              <th style="padding:6px 8px"></th>
            </tr></thead>
            <tbody>
            ${roster.map(r => `<tr style="border-top:1px solid rgba(255,255,255,0.07)">
              <td style="padding:8px">${r.clientName || "Unknown"}</td>
              <td style="padding:8px;opacity:0.55;font-size:0.8rem">${r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : "—"}</td>
              <td style="padding:8px;text-align:right">
                <button class="ac-roster-remove" data-cid="${r.clientId}" data-bid="${r.bookingId || ""}"
                  style="padding:4px 10px;border:1px solid rgba(255,0,51,0.4);border-radius:5px;background:transparent;
                  color:#ff0033;cursor:pointer;font-size:0.75rem">Remove</button>
              </td>
            </tr>`).join("")}
            </tbody></table>`;
        }
        showModal(`Roster — ${btn.dataset.name}`, listHtml);
        setTimeout(() => {
          document.querySelectorAll(".ac-roster-remove").forEach(rb => {
            rb.addEventListener("click", async () => {
              rb.disabled = true; rb.textContent = "…";
              try {
                await db.ref(`classes/${classId}/participants/${rb.dataset.cid}`).remove();
                if (rb.dataset.bid) await db.ref(`bookings/${rb.dataset.bid}`).remove();
                showToast("Client removed from class.", "success");
                const overlay = document.getElementById("xgym-modal");
                if (overlay) overlay.remove();
                _loadAdminClassesPanel();
              } catch(e) { showToast(e.message, "error"); rb.disabled = false; rb.textContent = "Remove"; }
            });
          });
        }, 50);
      });
    });

    // Edit buttons
    panel.querySelectorAll(".ac-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const editHTML = `<div style="display:grid;gap:10px;margin-top:10px">
          <input id="ac-edit-name" value="${btn.dataset.name}" placeholder="Class Name" style="${inputStyle}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <select id="ac-edit-type" style="${inputStyle}">
              ${CLASS_TYPES.map(t => `<option value="${t}" ${t === btn.dataset.type ? "selected" : ""}>${t}</option>`).join("")}
            </select>
            <select id="ac-edit-trainer" style="${inputStyle}">
              ${trainers.map(t => `<option value="${t.id}" data-name="${t.name}" ${t.id === btn.dataset.trainer ? "selected" : ""}>${t.name}</option>`).join("")}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
            <select id="ac-edit-day" style="${inputStyle}">
              ${DAYS.map(d => `<option value="${d}" ${d === btn.dataset.day ? "selected" : ""}>${d}</option>`).join("")}
            </select>
            <input id="ac-edit-time" type="time" value="${btn.dataset.time}" style="${inputStyle}">
            <input id="ac-edit-duration" type="number" min="15" max="180" value="${btn.dataset.duration || 60}" placeholder="Duration (min)" style="${inputStyle}">
            <input id="ac-edit-cap" type="number" min="1" value="${btn.dataset.cap}" style="${inputStyle}">
          </div>
          <input id="ac-edit-location" value="${btn.dataset.location || ""}" placeholder="Location" style="${inputStyle}">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:0.88rem;opacity:0.8">
            <input id="ac-edit-ispublic" type="checkbox" ${btn.dataset.ispublic === "true" ? "checked" : ""} style="width:16px;height:16px">
            Public class
          </label>
        </div>`;
        showModal("Edit Class", editHTML, async () => {
          const trSel = document.getElementById("ac-edit-trainer");
          const newCap = parseInt(document.getElementById("ac-edit-cap").value) || 20;
          const currentBooked = counts[id] || 0;
          if (newCap < currentBooked) {
            showToast(`Cannot set capacity below current enrollment (${currentBooked} booked).`, "error");
            return;
          }
          const editIsPublic = document.getElementById("ac-edit-ispublic").checked;
          await updateClass(id, {
            name: document.getElementById("ac-edit-name").value.trim(),
            type: document.getElementById("ac-edit-type").value,
            day: document.getElementById("ac-edit-day").value,
            time: document.getElementById("ac-edit-time").value,
            duration: parseInt(document.getElementById("ac-edit-duration").value) || 60,
            trainerId: trSel.value,
            trainerName: trSel.selectedOptions[0]?.dataset.name || trSel.selectedOptions[0]?.textContent || "",
            capacity: newCap,
            location: document.getElementById("ac-edit-location").value.trim(),
            isPublic: editIsPublic,
            source: editIsPublic ? "admin" : "trainer"
          });
          showToast("Class updated!", "success");
          _loadAdminClassesPanel();
        });
      });
    });

    // Delete buttons
    panel.querySelectorAll(".ac-del-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        showModal("Delete Class",
          `<p>Delete <strong>${btn.dataset.name}</strong>? All bookings and enrollment data will be removed.</p>`,
          async () => {
            await deleteClass(btn.dataset.id);
            showToast("Class deleted.", "success");
            _loadAdminClassesPanel();
          }
        );
      });
    });
  }

  bindAdminClassBtns();

  document.getElementById("ac-create-btn").addEventListener("click", async () => {
    const name = document.getElementById("ac-name").value.trim();
    const type = document.getElementById("ac-type").value || "General";
    const day  = document.getElementById("ac-day").value;
    const time = document.getElementById("ac-time").value;
    const duration = parseInt(document.getElementById("ac-duration").value) || 60;
    const location = document.getElementById("ac-location").value.trim();
    const isPublic = document.getElementById("ac-ispublic").checked;
    const description = document.getElementById("ac-description").value.trim();
    const trainerSel = document.getElementById("ac-trainer");
    const trainerId = trainerSel.value;
    const trainerName = trainerSel.selectedOptions[0]?.dataset.name || "";
    const capacity = parseInt(document.getElementById("ac-capacity").value) || 20;
    if (!name) { showToast("Enter a class name.", "error"); return; }
    if (!time) { showToast("Select a time.", "error"); return; }
    if (!trainerId) { showToast("Select a trainer.", "error"); return; }
    try {
      await createClass(trainerId, trainerName, { name, type, day, time, duration, capacity, location, description, isPublic });
      showToast("Class created! 🎉", "success");
      _loadAdminClassesPanel();
    } catch(e) { showToast(e.message, "error"); }
  });
}

// ============================================================
// ADMIN MESSENGER PANEL
// ============================================================
async function _loadAdminMessengerPanel() {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

  _ensureMessengerStyles();

  panel.innerHTML = `
    <div class="xmsg-wrap">
      <div class="xmsg-head">
        <div>
          <h2>Messenger Admin</h2>
        </div>
      </div>
      <div id="admin-msg-loading" class="xmsg-empty" style="padding:28px">Loading data...</div>
      <div id="admin-msg-content" style="display:none"></div>
    </div>
  `;

  try {
    // Fetch all users
    const usersSnap = await db.ref("users").once("value");
    const allUsers = {};
    const trainers = [];
    const clientsList = [];
    usersSnap.forEach(child => {
      const u = { id: child.key, ...child.val() };
      allUsers[child.key] = u;
      if (u.role === "trainer") trainers.push(u);
      if (u.role === "client") clientsList.push(u);
    });

    // Fetch messaging activity
    const activity = await getMessagingActivity();

    const content = document.getElementById("admin-msg-content");
    const loading = document.getElementById("admin-msg-loading");
    loading.style.display = "none";
    content.style.display = "block";

    const summaryCards = `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px 14px;border-bottom:1px solid rgba(8,165,226,0.14)">
        <div class="xmsg-mail" style="margin:0"><div class="xmsg-role">Trainers</div><div style="font-size:1.3rem;font-weight:800;color:#9bd9ff">${trainers.length}</div></div>
        <div class="xmsg-mail" style="margin:0"><div class="xmsg-role">Clients</div><div style="font-size:1.3rem;font-weight:800;color:#9bd9ff">${clientsList.length}</div></div>
        <div class="xmsg-mail" style="margin:0"><div class="xmsg-role">Conversations</div><div style="font-size:1.3rem;font-weight:800;color:#9bd9ff">${activity.length}</div></div>
      </div>
    `;

    content.innerHTML = `
      ${summaryCards}
      <div class="xmsg-grid" style="min-height:460px">
        <aside class="xmsg-left">
          <div class="xmsg-left-list" id="admin-msg-list"></div>
        </aside>
        <section class="xmsg-right">
          <div class="xmsg-thread-head">
            <div>
              <div class="xmsg-thread-title" id="admin-thread-title">Select a conversation</div>
              <div class="xmsg-thread-sub" id="admin-thread-sub">Choose activity from the left list.</div>
            </div>
          </div>
          <div class="xmsg-thread" id="admin-thread-detail">
            <div class="xmsg-empty">No conversation selected.</div>
          </div>
        </section>
      </div>
    `;

    const list = document.getElementById("admin-msg-list");
    const detail = document.getElementById("admin-thread-detail");
    const title = document.getElementById("admin-thread-title");
    const sub = document.getElementById("admin-thread-sub");
    let selectedConvo = "";

    const renderDetail = () => {
      const item = activity.find(a => a.convoId === selectedConvo);
      if (!item) {
        title.textContent = "Select a conversation";
        sub.textContent = "Choose activity from the left list.";
        detail.innerHTML = `<div class="xmsg-empty">No conversation selected.</div>`;
        return;
      }

      const user1 = allUsers[item.participants[0]];
      const user2 = allUsers[item.participants[1]];
      const name1 = user1 ? (user1.name || user1.email) : item.participants[0];
      const name2 = user2 ? (user2.name || user2.email) : item.participants[1];
      const role1 = user1 ? user1.role : "unknown";
      const role2 = user2 ? user2.role : "unknown";

      title.textContent = `${name1} <-> ${name2}`;
      sub.textContent = `Last activity ${formatDate(item.lastTimestamp)}`;
      detail.innerHTML = `
        <article class="xmsg-mail">
          <div class="xmsg-mail-top"><strong>Conversation Metadata</strong><span>${_msgEscape(item.convoId)}</span></div>
          <div class="xmsg-mail-body">
            <div style="margin-bottom:8px"><strong>Participant A:</strong> ${_msgEscape(name1)} (${_msgEscape(role1)})</div>
            <div style="margin-bottom:8px"><strong>Participant B:</strong> ${_msgEscape(name2)} (${_msgEscape(role2)})</div>
            <div style="margin-bottom:8px"><strong>Total messages:</strong> ${item.messageCount}</div>
            <div><strong>Last activity:</strong> ${_msgEscape(formatDate(item.lastTimestamp))}</div>
          </div>
        </article>
      `;
    };

    if (!activity.length) {
      list.innerHTML = `<div class="xmsg-empty" style="text-align:left">No messaging activity recorded yet.</div>`;
      renderDetail();
      return;
    }

    const renderList = () => {
      list.innerHTML = activity.map(a => {
        const user1 = allUsers[a.participants[0]];
        const user2 = allUsers[a.participants[1]];
        const name1 = user1 ? (user1.name || user1.email) : a.participants[0];
        const name2 = user2 ? (user2.name || user2.email) : a.participants[1];
        return `
          <div class="xmsg-row ${selectedConvo === a.convoId ? "active" : ""}" data-id="${_msgEscape(a.convoId)}">
            <div class="xmsg-avatar">${_msgEscape(_msgInitials(name1))}</div>
            <div class="xmsg-row-main">
              <div class="xmsg-row-top">
                <span class="xmsg-name">${_msgEscape(name1)} <span style="opacity:0.55">&</span> ${_msgEscape(name2)}</span>
                <span class="xmsg-role">${a.messageCount} msgs</span>
              </div>
              <div class="xmsg-snippet">Last active ${_msgEscape(formatDate(a.lastTimestamp))}</div>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll(".xmsg-row").forEach(row => {
        row.addEventListener("click", () => {
          selectedConvo = row.dataset.id;
          renderList();
          renderDetail();
        });
      });
    };

    selectedConvo = activity[0].convoId;
    renderList();
    renderDetail();
  } catch (e) {
    console.error("[X-Gym] Admin messenger error:", e);
    panel.innerHTML += `<p style="color:#ff4444">Failed to load messenger data: ${e.message}</p>`;
  }
}
