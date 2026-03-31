// ============================================================
// BackendMain.js â€” All-in-one backend for X-Gym
// Handles: Firebase Auth, Realtime Database, Role Routing, Cart,
//          Client Features, Trainer Features, UI Utilities
// ============================================================

// ============================================================
// SECTION 1: FIREBASE CONFIGURATION
// ============================================================
/// Create a Firebase Type Webapp and paste your configuration , warning dont use message ID
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

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
    error:   "rgba(8,165,226,0.9)",
    info:    "rgba(0,106,245,0.85)"
  };

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    background: ${colors[type] || colors.info};
    color: #fff;
    padding: 14px 22px;
    border-radius: 10px;
    font-family: 'Exo 2', sans-serif;
    font-size: 0.95rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  `;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Auto-remove after 3 seconds
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
  // Remove any existing modal
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
    font-family: 'Exo 2', sans-serif;
    box-shadow: 0 0 40px rgba(255,0,60,0.3);
  `;

  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  titleEl.style.cssText = "margin: 0 0 18px; font-size: 1.5rem; color: #08a5e2;";

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
    font-family: 'Exo 2', sans-serif;
  `;
  closeBtn.addEventListener("click", () => overlay.remove());

  btnRow.appendChild(closeBtn);

  if (onConfirm) {
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.style.cssText = `
      padding: 10px 22px; border: none; border-radius: 8px;
      background: linear-gradient(90deg, #006af5, #08a5e2);
      color: #fff; cursor: pointer; font-family: 'Exo 2', sans-serif;
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

  // AWAIT the profile write â€” do NOT fire-and-forget.
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
 * Fetch a user's profile from RTDB.
 * @param {string} uid
 * @returns {Object|null}
 */
async function getUserProfile(uid) {
  const snap = await db.ref("users/" + uid).once("value");
  if (!snap.exists()) return null;
  return { id: uid, ...snap.val() };
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
 * Hire a trainer by creating a client_trainer link.
 * @param {string} clientId
 * @param {string} trainerId
 */
async function hireTrainer(clientId, trainerId) {
  const newRef = db.ref("client_trainer").push();
  await newRef.set({
    clientId: clientId,
    trainerId: trainerId,
    status: "active",
    createdAt: Date.now()
  });
}

/**
 * Get hired trainer IDs for a client.
 * @param {string} clientId
 * @returns {string[]}
 */
async function _getHiredTrainerIds(clientId) {
  const snap = await db.ref("client_trainer").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const ids = [];
  snap.forEach(child => {
    const data = child.val();
    if (data.status === "active") ids.push(data.trainerId);
  });
  return ids;
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
  const snap = await db.ref("memberships").orderByChild("clientId").equalTo(userId).limitToFirst(1).once("value");
  if (!snap.exists()) return null;
  let result = null;
  snap.forEach(child => {
    result = { id: child.key, ...child.val() };
  });
  return result;
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

/** Alias â€” fetch progress for a specific client (trainer view). */
async function getClientProgress(clientId) {
  return getProgress(clientId);
}

/** Alias â€” fetch meals for a specific client (trainer view). */
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
// SECTION 7: ADMIN PANEL â€” DATA FUNCTIONS
// ============================================================

// ---------- Admin Auth Check ----------
/**
 * Check if a user has admin role.
 * @param {string} uid
 * @returns {boolean}
 */
async function isAdmin(uid) {
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
// SECTION 8: PAGE DETECTION & INITIALIZATION
// ============================================================

/**
 * Detect the current page based on the URL filename.
 * @returns {"index"|"client"|"trainer"|"admin"|"unknown"}
 */
function detectPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("xgymindex") || path.endsWith("index.html") || path === "/" || path === "") return "index";
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
      const panelId = item.getAttribute("data-panel");
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

    if (user) {
      // Already logged in (e.g. returning user) â€” redirect to dashboard
      let profile = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          profile = await getUserProfile(user.uid);
          if (profile) break;
        } catch (e) { console.warn("[X-Gym] Index: profile fetch attempt", attempt, e); }
        await new Promise(r => setTimeout(r, 700));
      }
      console.log("[X-Gym] Index: auto-redirect, profile:", profile);
      if (profile && profile.role === "trainer") {
        window.location.href = "trainerdashboard.xx.html";
      } else if (profile && profile.role === "admin") {
        window.location.href = "AdminDashboard.html";
      } else if (profile) {
        window.location.href = "DashboardClient.xxx.html";
      }
      return;
    }
  });
}

function _initAuthForms() {
  const overlay       = document.getElementById("auth-overlay");
  const loginForm     = document.getElementById("login-form");
  const registerForm  = document.getElementById("register-form");
  const authError     = document.getElementById("auth-error");

  const showLoginBtn    = document.getElementById("show-login-btn");
  const showRegisterBtn = document.getElementById("show-register-btn");

  const loginEmailEl    = document.getElementById("login-email");
  const loginPasswordEl = document.getElementById("login-password");
  const loginBtn        = document.getElementById("login-btn");

  const regNameEl     = document.getElementById("register-name");
  const regEmailEl    = document.getElementById("register-email");
  const regPasswordEl = document.getElementById("register-password");
  const regRoleEl     = document.getElementById("register-role");
  const registerBtn   = document.getElementById("register-btn");

  // Helper to show a specific form
  function showForm(which) {
    if (!overlay) return;
    overlay.style.display = "flex";
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
      if (e.target === overlay) overlay.style.display = "none";
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
        loginBtn.textContent = "Logging inâ€¦";
        const cred = await loginUser(emailVal, passwordVal);
        console.log("[X-Gym] Login done, fetching profileâ€¦");
        // Try to get profile for role-based redirect (with retries)
        let target = "DashboardClient.xxx.html";
        let profile = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            profile = await getUserProfile(cred.user.uid);
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
          } else if (profile.role === "admin") {
            target = "AdminDashboard.html";
          } else {
            target = "DashboardClient.xxx.html";
          }
        } else {
          console.error("[X-Gym] Could not fetch profile after retries! uid:", cred.user.uid);
          // Profile doesn't exist â€” likely the RTDB write failed during registration.
          // Try to create a basic profile NOW so the user isn't stuck.
          try {
            await db.ref("users/" + cred.user.uid).set({
              name: cred.user.email,
              email: cred.user.email,
              role: "client",
              shareCode: generateShareCode(),
              createdAt: Date.now()
            });
            console.log("[X-Gym] Emergency profile created as client");
            showToast("Your profile was missing â€” a default profile was created. Contact admin if you should have a different role.", "info");
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
      const selectedRole = regRoleEl.value;

      if (!emailVal || !passwordVal || !nameVal) {
        if (authError) authError.textContent = "Please fill in all fields.";
        return;
      }

      try {
        registerBtn.disabled = true;
        registerBtn.textContent = "Registeringâ€¦";
        await registerUser(emailVal, passwordVal, nameVal, selectedRole);
        console.log("[X-Gym] Register done, redirectingâ€¦");
        // Redirect IMMEDIATELY based on the role they selected
        // >>> ADMIN REDIRECT: Comment out the admin line below once admin accounts are created <<<
        let target = "DashboardClient.xxx.html";
        if (selectedRole === "trainer") target = "trainerdashboard.xx.html";
        else if (selectedRole === "admin") target = "AdminDashboard.html"; // Comment out this line to disable admin registration
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
  const user = await waitForAuth();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Retry profile fetch in case user just registered and
  // RTDB write hasn't fully propagated yet
  let profile = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      profile = await getUserProfile(user.uid);
      if (profile) break;
    } catch (e) { console.warn("[X-Gym] Profile fetch attempt", attempt, e); }
    await new Promise(r => setTimeout(r, 800));
  }

  if (!profile || profile.role !== "client") {
    console.warn("[X-Gym] Client page: invalid profile or role", profile);
    window.location.href = "index.html";
    return;
  }

  {

    // Populate greeting
    const greeting = document.getElementById("client-greeting");
    if (greeting) greeting.textContent = `Hello, ${profile.name}`;

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

    // Panel navigation
    initPanelNav();
    _updateCartBadge();

    // Card clicks
    _bindCardToPanel("card-cart",       "panel-cart");
    _bindCardToPanel("card-workouts",   "panel-workouts");
    _bindCardToPanel("card-membership", "panel-membership");
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-store",      "panel-trainers");
    _bindCardToPanel("card-settings",   "panel-settings");

    // Load panels content
    _loadClientTrainersPanel(user.uid);
    _loadClientWorkoutsPanel(user.uid);
    _loadClientProgressPanel(user.uid, profile.shareCode);
    _loadClientMealsPanel(user.uid);
    _loadClientMembershipPanel(user.uid);
    _loadCartPanel();
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

async function _loadClientTrainersPanel(clientId) {
  const panel = document.getElementById("panel-trainers");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Available Trainers</h2>";

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
        <p>Share Code: <strong>${trainer.shareCode || "â€”"}</strong></p>
        <button
          class="btn-hire"
          data-tid="${trainer.id}"
          style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
                 background:${hired ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,#006af5,#08a5e2)"};
                 color:#fff;cursor:${hired ? "default" : "pointer"};font-family:'Exo 2',sans-serif;"
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
    panel.innerHTML += `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadClientWorkoutsPanel(clientId) {
  const panel = document.getElementById("panel-workouts");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>My Workout Plans</h2>";

  try {
    const workouts = await getClientWorkouts(clientId);
    if (workouts.length === 0) {
      panel.innerHTML += "<p>No workout plans assigned yet.</p>";
      return;
    }
    workouts.forEach(w => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "16px";
      const exHtml = (w.exercises || []).map(ex =>
        `<li>${ex.name} â€” ${ex.sets}Ã—${ex.reps}${ex.notes ? " ("+ex.notes+")" : ""}</li>`
      ).join("");
      card.innerHTML = `
        <h3>${w.day || "Workout"}</h3>
        <ul style="padding-left:18px;opacity:0.85">${exHtml || "<li>No exercises listed.</li>"}</ul>
        <p style="font-size:0.8rem;opacity:0.5">${formatDate(w.createdAt)}</p>
      `;
      panel.appendChild(card);
    });
  } catch (e) {
    panel.innerHTML += `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadClientProgressPanel(clientId, shareCode) {
  const panel = document.getElementById("panel-progress");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#08a5e2">Progress Tracker</h2>
    ${shareCode ? `<p style="opacity:0.6">Your share code: <strong style="color:#08a5e2">${shareCode}</strong></p>` : ""}
    <div class="card" style="margin-bottom:20px">
      <h3>Log Progress</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="prog-weight" type="number" placeholder="Weight (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="prog-bench" type="number" placeholder="Bench Press (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="prog-squat" type="number" placeholder="Squat (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="prog-deadlift" type="number" placeholder="Deadlift (kg)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      </div>
      <button id="log-progress-btn"
        style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
               cursor:pointer;font-family:'Exo 2',sans-serif">
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
    list.innerHTML = `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadClientMealsPanel(clientId) {
  const panel = document.getElementById("panel-meals");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#08a5e2">Meal / Food Intake Tracker</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>Log Meal</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="meal-name" type="text" placeholder="Meal name"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif;grid-column:span 2">
        <input id="meal-calories" type="number" placeholder="Calories"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="meal-protein" type="number" placeholder="Protein (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="meal-carbs" type="number" placeholder="Carbs (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="meal-fats" type="number" placeholder="Fats (g)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      </div>
      <button id="log-meal-btn"
        style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
               cursor:pointer;font-family:'Exo 2',sans-serif">
        Log Meal
      </button>
    </div>
    <div id="meal-list"></div>
  `;

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
        <strong>${m.mealName}</strong> â€” ${formatDate(m.createdAt)}<br>
        Calories: ${m.calories} &nbsp;|&nbsp;
        Protein: ${m.protein}g &nbsp;|&nbsp;
        Carbs: ${m.carbs}g &nbsp;|&nbsp;
        Fats: ${m.fats}g
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadClientMembershipPanel(clientId) {
  const panel = document.getElementById("panel-membership");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Membership Status</h2>";

  try {
    const membership = await getMembership(clientId);
    if (!membership) {
      panel.innerHTML += "<p>No active membership found. Please visit the front desk or store.</p>";
      return;
    }
    panel.innerHTML += `
      <div class="card">
        <h3>${membership.type || "Standard"}</h3>
        <p>Status: <strong style="color:${membership.status === "active" ? "#00c850" : "#08a5e2"}">${membership.status || "Unknown"}</strong></p>
        <p>Expiry: ${formatDate(membership.expiresAt)}</p>
      </div>
    `;
  } catch (e) {
    panel.innerHTML += `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

function _loadCartPanel() {
  const panel = document.getElementById("panel-cart");
  if (!panel) return;

  function render() {
    const cart = getCart();
    panel.innerHTML = `
      <h2 style="color:#08a5e2">My Cart</h2>
      ${cart.length === 0
        ? "<p>Your cart is empty.</p>"
        : cart.map(item => `
            <div class="card" style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
              <span>${item.name} Ã— ${item.qty}</span>
              <span>Â£${(item.price * item.qty).toFixed(2)}</span>
              <button data-id="${item.id}" class="remove-cart-btn"
                style="padding:6px 14px;border:none;border-radius:6px;
                       background:rgba(255,0,60,0.6);color:#fff;cursor:pointer">
                Remove
              </button>
            </div>
          `).join("")
      }
      ${cart.length > 0 ? `
        <p style="text-align:right;font-size:1.1rem">
          Total: Â£${cart.reduce((s,i) => s + i.price*i.qty, 0).toFixed(2)}
        </p>
        <button id="clear-cart-btn"
          style="padding:10px 24px;border:none;border-radius:8px;
                 background:rgba(255,255,255,0.1);color:#fff;cursor:pointer">
          Clear Cart
        </button>
      ` : ""}
    `;
    panel.querySelectorAll(".remove-cart-btn").forEach(btn => {
      btn.addEventListener("click", () => { removeFromCart(btn.dataset.id); render(); });
    });
    const clearBtn = document.getElementById("clear-cart-btn");
    if (clearBtn) clearBtn.addEventListener("click", () => { clearCart(); render(); });
  }

  render();
}

// --------------------------------------------------------
// Trainer dashboard initialisation
// --------------------------------------------------------
async function initTrainerPage() {
  const user = await waitForAuth();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Retry profile fetch in case user just registered and
  // RTDB write hasn't fully propagated yet
  let profile = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      profile = await getUserProfile(user.uid);
      if (profile) break;
    } catch (e) { console.warn("[X-Gym] Profile fetch attempt", attempt, e); }
    await new Promise(r => setTimeout(r, 800));
  }

  if (!profile || profile.role !== "trainer") {
    console.warn("[X-Gym] Trainer page: invalid profile or role", profile);
    window.location.href = "index.html";
    return;
  }

  {

    // Populate greeting
    const greeting = document.getElementById("trainer-greeting");
    if (greeting) greeting.textContent = `Hello, ${profile.name}`;

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

    // Panel navigation
    initPanelNav();
    _updateCartBadge();

    // Card clicks
    _bindCardToPanel("card-cart",           "panel-cart");
    _bindCardToPanel("card-workout-builder","panel-workout-builder");
    _bindCardToPanel("card-membership",     "panel-membership");
    _bindCardToPanel("card-client-progress","panel-clients");
    _bindCardToPanel("card-store",          "panel-share-code");
    _bindCardToPanel("card-settings",       "panel-settings");

    // Load panels
    _loadTrainerShareCodePanel(profile.shareCode);
    _loadTrainerClientsPanel(user.uid);
    _loadTrainerWorkoutBuilderPanel(user.uid);
    _loadTrainerMealPlannerPanel(user.uid);
    _loadCartPanel();
    _loadTrainerMembershipPanel(user.uid);
  }
}

function _loadTrainerShareCodePanel(shareCode) {
  const panel = document.getElementById("panel-share-code");
  if (!panel) return;
  panel.innerHTML = `
    <h2 style="color:#08a5e2">Your Share Code</h2>
    <div class="card">
      <p>Give this code to clients so they can find you:</p>
      <div style="font-size:2rem;font-weight:900;letter-spacing:6px;color:#08a5e2;margin:14px 0">
        ${shareCode || "N/A"}
      </div>
    </div>
  `;
}

async function _loadTrainerClientsPanel(trainerUid) {
  const panel = document.getElementById("panel-clients");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#08a5e2">My Clients</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>Add Client by Share Code</h3>
      <div style="display:flex;gap:12px;margin-top:12px">
        <input id="client-share-code-input" type="text" placeholder="Client share code"
          style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <button id="add-client-btn"
          style="padding:10px 22px;border:none;border-radius:8px;
                 background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
                 cursor:pointer;font-family:'Exo 2',sans-serif">
          Add
        </button>
      </div>
    </div>
    <div id="client-list"></div>
  `;

  document.getElementById("add-client-btn").addEventListener("click", async () => {
    const code = document.getElementById("client-share-code-input").value.trim();
    if (!code) { showToast("Enter a share code.", "error"); return; }
    try {
      const client = await addClientByShareCode(trainerUid, code);
      showToast(`${client.name} added!`, "success");
      document.getElementById("client-share-code-input").value = "";
      _refreshClientList(trainerUid);
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  _refreshClientList(trainerUid);
}

async function _refreshClientList(trainerUid) {
  const list = document.getElementById("client-list");
  if (!list) return;
  try {
    const clients = await getTrainerClients(trainerUid);
    if (clients.length === 0) {
      list.innerHTML = "<p>No clients yet. Add one using their share code.</p>";
      return;
    }
    list.innerHTML = "";
    clients.forEach(client => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "14px";
      card.innerHTML = `
        <h3>${client.name}</h3>
        <p>${client.email}</p>
        <p style="font-size:0.85rem;opacity:0.6">Share Code: ${client.shareCode || "â€”"}</p>
        <button class="view-client-btn" data-cid="${client.id}" data-cname="${client.name}"
          style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
                 background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
                 cursor:pointer;font-family:'Exo 2',sans-serif">
          View Details
        </button>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll(".view-client-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        _loadClientDetailPanel(btn.dataset.cid, btn.dataset.cname);
        document.querySelectorAll(".xgym-panel").forEach(p => p.style.display = "none");
        const detail = document.getElementById("panel-client-detail");
        if (detail) { detail.style.display = "block"; detail.scrollIntoView({ behavior: "smooth" }); }
      });
    });
  } catch (e) {
    list.innerHTML = `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadClientDetailPanel(clientId, clientName) {
  const panel = document.getElementById("panel-client-detail");
  if (!panel) return;

  panel.innerHTML = `<h2 style="color:#08a5e2">${clientName}'s Details</h2>
    <p style="opacity:0.6">Loadingâ€¦</p>`;

  try {
    const [progressEntries, meals] = await Promise.all([
      getClientProgress(clientId),
      getClientMeals(clientId)
    ]);

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
            <strong>${m.mealName}</strong> â€” ${formatDate(m.createdAt)}<br>
            Cal: ${m.calories} | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fats: ${m.fats}g
          </div>`).join("");

    panel.innerHTML = `
      <h2 style="color:#08a5e2">${clientName}'s Details</h2>
      <h3 style="margin-top:20px">Progress</h3>${progressHtml}
      <h3 style="margin-top:20px">Meal Log</h3>${mealsHtml}
    `;
  } catch (e) {
    panel.innerHTML += `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

async function _loadTrainerWorkoutBuilderPanel(trainerUid) {
  const panel = document.getElementById("panel-workout-builder");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#08a5e2">Workout Builder</h2>
    <div class="card">
      <h3>Create Workout for Client</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="wb-client-code" type="text" placeholder="Client share code"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="wb-day" type="text" placeholder="Day (e.g. Monday)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      </div>
      <div id="wb-exercises" style="margin-top:16px"></div>
      <button id="wb-add-exercise"
        style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
               background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
        + Add Exercise
      </button>
      <br><br>
      <button id="wb-save"
        style="padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
               cursor:pointer;font-family:'Exo 2',sans-serif">
        Save Workout
      </button>
    </div>
  `;

  let exerciseCount = 0;

  document.getElementById("wb-add-exercise").addEventListener("click", () => {
    exerciseCount++;
    const row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr 2fr;gap:10px;margin-bottom:10px";
    row.innerHTML = `
      <input class="wb-ex-name" type="text" placeholder="Exercise name"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="wb-ex-sets" type="number" placeholder="Sets"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="wb-ex-reps" type="number" placeholder="Reps"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="wb-ex-notes" type="text" placeholder="Notes (optional)"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
    `;
    document.getElementById("wb-exercises").appendChild(row);
  });

  document.getElementById("wb-save").addEventListener("click", async () => {
    const clientCode = document.getElementById("wb-client-code").value.trim();
    const day        = document.getElementById("wb-day").value.trim();
    if (!clientCode || !day) { showToast("Enter client share code and day.", "error"); return; }

    const exercises = [];
    document.querySelectorAll("#wb-exercises > div").forEach(row => {
      exercises.push({
        name:  row.querySelector(".wb-ex-name").value.trim(),
        sets:  parseInt(row.querySelector(".wb-ex-sets").value) || 0,
        reps:  parseInt(row.querySelector(".wb-ex-reps").value) || 0,
        notes: row.querySelector(".wb-ex-notes").value.trim()
      });
    });

    if (exercises.length === 0) { showToast("Add at least one exercise.", "error"); return; }

    try {
      // Resolve client by share code
      const client = await _findUserByShareCode(clientCode, "client");
      if (!client) { showToast("Client not found.", "error"); return; }
      const clientId = client.id;

      await createWorkout(trainerUid, clientId, { day, exercises });
      showToast("Workout saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

async function _loadTrainerMealPlannerPanel(trainerUid) {
  const panel = document.getElementById("panel-meal-planner");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#08a5e2">Meal Planner</h2>
    <div class="card">
      <h3>Create Meal Plan for Client</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <input id="mp-client-code" type="text" placeholder="Client share code"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <input id="mp-day" type="text" placeholder="Day (e.g. Monday)"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      </div>
      <div id="mp-meals" style="margin-top:16px"></div>
      <button id="mp-add-meal"
        style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
               background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
        + Add Meal
      </button>
      <br><br>
      <button id="mp-save"
        style="padding:10px 24px;border:none;border-radius:8px;
               background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;
               cursor:pointer;font-family:'Exo 2',sans-serif">
        Save Meal Plan
      </button>
    </div>
  `;

  document.getElementById("mp-add-meal").addEventListener("click", () => {
    const row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px";
    row.innerHTML = `
      <input class="mp-m-name" type="text" placeholder="Meal name"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="mp-m-cal" type="number" placeholder="Cal"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="mp-m-protein" type="number" placeholder="Protein"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="mp-m-carbs" type="number" placeholder="Carbs"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="mp-m-fats" type="number" placeholder="Fats"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
      <input class="mp-m-time" type="text" placeholder="Time (e.g. 8am)"
        style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
               background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
    `;
    document.getElementById("mp-meals").appendChild(row);
  });

  document.getElementById("mp-save").addEventListener("click", async () => {
    const clientCode = document.getElementById("mp-client-code").value.trim();
    const day        = document.getElementById("mp-day").value.trim();
    if (!clientCode || !day) { showToast("Enter client share code and day.", "error"); return; }

    const meals = [];
    document.querySelectorAll("#mp-meals > div").forEach(row => {
      meals.push({
        name:    row.querySelector(".mp-m-name").value.trim(),
        calories:parseFloat(row.querySelector(".mp-m-cal").value)     || 0,
        protein: parseFloat(row.querySelector(".mp-m-protein").value) || 0,
        carbs:   parseFloat(row.querySelector(".mp-m-carbs").value)   || 0,
        fats:    parseFloat(row.querySelector(".mp-m-fats").value)    || 0,
        time:    row.querySelector(".mp-m-time").value.trim()
      });
    });

    if (meals.length === 0) { showToast("Add at least one meal.", "error"); return; }

    try {
      const client = await _findUserByShareCode(clientCode, "client");
      if (!client) { showToast("Client not found.", "error"); return; }
      const clientId = client.id;

      await createMealPlan(trainerUid, clientId, { day, meals });
      showToast("Meal plan saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
}

async function _loadTrainerMembershipPanel(trainerUid) {
  const panel = document.getElementById("panel-membership");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Membership Status</h2>";

  try {
    const membership = await getMembership(trainerUid);
    if (!membership) {
      panel.innerHTML += "<p>No active membership found. Please contact the front desk.</p>";
      return;
    }
    panel.innerHTML += `
      <div class="card">
        <h3>${membership.type || "Standard"}</h3>
        <p>Status: <strong style="color:${membership.status === "active" ? "#00c850" : "#08a5e2"}">${membership.status || "Unknown"}</strong></p>
        <p>Expiry: ${formatDate(membership.expiresAt)}</p>
      </div>
    `;
  } catch (e) {
    panel.innerHTML += `<p style="color:#08a5e2">${e.message}</p>`;
  }
}

// ============================================================
// SECTION 10: ADMIN DASHBOARD INITIALIZATION
// ============================================================

async function initAdminPage() {
  console.log("[X-Gym] initAdminPage: starting...");

  const user = await waitForAuth();
  console.log("[X-Gym] initAdminPage: waitForAuth resolved, user:", user ? user.uid : null);

  if (!user) {
    console.warn("[X-Gym] initAdminPage: no user, redirecting to index");
    window.location.href = "index.html";
    return;
  }

  let profile = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      profile = await getUserProfile(user.uid);
      console.log("[X-Gym] initAdminPage: profile fetch attempt", attempt, "result:", profile);
      if (profile) break;
    } catch (e) {
      console.warn("[X-Gym] initAdminPage: profile fetch attempt", attempt, "error:", e);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  if (!profile || profile.role !== "admin") {
    console.warn("[X-Gym] Admin page: invalid profile or role", profile);
    showToast("Access denied. Admin only. Profile role: " + (profile ? profile.role : "null"), "error");
    setTimeout(function() { window.location.href = "index.html"; }, 2000);
    return;
  }

  console.log("[X-Gym] initAdminPage: admin verified, setting up UI...");

  // Populate greeting
  const greeting = document.getElementById("admin-greeting");
  if (greeting) greeting.textContent = "Admin Panel \u2014 " + profile.name;

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // Panel navigation
  initPanelNav();

  // Card clicks
  _bindCardToPanel("card-overview",     "panel-overview");
  _bindCardToPanel("card-members",      "panel-members");
  _bindCardToPanel("card-store-mgmt",   "panel-store");
  _bindCardToPanel("card-memberships",  "panel-memberships");
  _bindCardToPanel("card-finances",     "panel-finances");
  _bindCardToPanel("card-trainer-links","panel-trainer-links");

  // Load all admin panels with error handling
  try {
    console.log("[X-Gym] initAdminPage: loading panels...");
    await Promise.all([
      _loadAdminOverviewPanel().catch(e => console.error("[X-Gym] Overview panel error:", e)),
      _loadAdminMembersPanel().catch(e => console.error("[X-Gym] Members panel error:", e)),
      _loadAdminStorePanel().catch(e => console.error("[X-Gym] Store panel error:", e)),
      _loadAdminMembershipsPanel().catch(e => console.error("[X-Gym] Memberships panel error:", e)),
      _loadAdminFinancesPanel().catch(e => console.error("[X-Gym] Finances panel error:", e)),
      _loadAdminTrainerLinksPanel().catch(e => console.error("[X-Gym] TrainerLinks panel error:", e))
    ]);
    console.log("[X-Gym] initAdminPage: all panels loaded.");
    showToast("Admin dashboard ready.", "success");
  } catch (e) {
    console.error("[X-Gym] initAdminPage: panel loading error:", e);
    showToast("Some panels failed to load: " + e.message, "error");
  }
}

// ---------- Overview / Statistics Panel ----------
async function _loadAdminOverviewPanel() {
  const panel = document.getElementById("panel-overview");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Loading statisticsâ€¦</h2>";

  try {
    const stats = await getAdminStats();

    panel.innerHTML = `
      <h2 style="color:#08a5e2">Gym Overview</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:30px">
        <div class="card"><h3 style="color:#08a5e2;font-size:2rem">${stats.totalMembers}</h3><p>Total Members</p></div>
        <div class="card"><h3 style="color:#00c850;font-size:2rem">${stats.totalClients}</h3><p>Clients</p></div>
        <div class="card"><h3 style="color:#ffa500;font-size:2rem">${stats.totalTrainers}</h3><p>Trainers</p></div>
        <div class="card"><h3 style="color:#00c850;font-size:2rem">${stats.activeMemberships}</h3><p>Active Memberships</p></div>
        <div class="card"><h3 style="color:#08a5e2;font-size:2rem">${stats.expiredMemberships}</h3><p>Expired Memberships</p></div>
        <div class="card"><h3 style="color:#4da6ff;font-size:2rem">${stats.totalStoreItems}</h3><p>Store Items</p></div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:30px">
        <div class="card">
          <h3 style="color:#00c850;font-size:2rem">Â£${stats.totalRevenue.toFixed(2)}</h3><p>Total Revenue</p>
        </div>
        <div class="card">
          <h3 style="color:#08a5e2;font-size:2rem">Â£${stats.totalExpenses.toFixed(2)}</h3><p>Total Expenses</p>
        </div>
        <div class="card">
          <h3 style="color:${stats.netProfit >= 0 ? '#00c850' : '#08a5e2'};font-size:2rem">Â£${stats.netProfit.toFixed(2)}</h3><p>Net Profit</p>
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
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
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
    ctx.font = "14px Exo 2, sans-serif";
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
  ctx.font = "11px Exo 2, sans-serif";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + h - (h * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
    ctx.fillText("Â£" + Math.round(maxVal * i / 5), 5, y + 4);
  }

  allKeys.forEach((key, i) => {
    const x = padding.left + i * barGroupWidth;
    const revH = (revValues[i] / maxVal) * h;
    const expH = (expValues[i] / maxVal) * h;

    // Revenue bar
    ctx.fillStyle = "rgba(0,200,80,0.8)";
    ctx.fillRect(x + 4, padding.top + h - revH, barWidth, revH);

    // Expense bar
    ctx.fillStyle = "rgba(255,77,77,0.8)";
    ctx.fillRect(x + barWidth + 8, padding.top + h - expH, barWidth, expH);

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px Exo 2, sans-serif";
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
  ctx.font = "11px Exo 2, sans-serif";
  ctx.fillText("Revenue", canvas.width - 164, 20);
  ctx.fillStyle = "rgba(255,77,77,0.8)";
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
    ctx.font = "14px Exo 2, sans-serif";
    ctx.fillText("No memberships yet.", 120, 100);
    return;
  }

  const cx = 100, cy = 100, r = 80;
  const slices = [
    { val: active, color: "rgba(0,200,80,0.85)", label: "Active" },
    { val: expired, color: "rgba(255,77,77,0.85)", label: "Expired" }
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
    ctx.font = "13px Exo 2, sans-serif";
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
    { label: "Trainers", val: trainers, color: "rgba(255,165,0,0.8)" },
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
    ctx.font = "bold 14px Exo 2, sans-serif";
    ctx.fillText(d.val, x + barW / 2 - 6, 155 - barH);
    ctx.font = "12px Exo 2, sans-serif";
    ctx.fillText(d.label, x + 2, 180);
  });
}

// ---------- Members Management Panel ----------
async function _loadAdminMembersPanel() {
  const panel = document.getElementById("panel-members");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Members Management</h2><p>Loadingâ€¦</p>";

  try {
    const members = await getAllMembers();

    let html = `
      <h2 style="color:#08a5e2">Members Management</h2>
      <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
        <input id="admin-member-search" type="text" placeholder="Search by name or emailâ€¦"
          style="flex:1;padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        <select id="admin-member-role-filter"
          style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
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
              background:${m.role === 'admin' ? 'rgba(77,166,255,0.3)' : m.role === 'trainer' ? 'rgba(255,165,0,0.3)' : 'rgba(0,200,80,0.3)'};
              color:${m.role === 'admin' ? '#4da6ff' : m.role === 'trainer' ? '#ffa500' : '#00c850'}">
              ${(m.role || "client").toUpperCase()}
            </span>
            <span style="margin-left:8px;opacity:0.5;font-size:0.8rem">Code: ${m.shareCode || "â€”"}</span>
            <span style="margin-left:8px;opacity:0.5;font-size:0.8rem">Joined: ${formatDate(m.createdAt)}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="admin-edit-member" data-uid="${m.id}" data-name="${m.name}" data-email="${m.email}" data-role="${m.role}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
              Edit
            </button>
            <button class="admin-delete-member" data-uid="${m.id}" data-name="${m.name}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
              Delete
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
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
              <input id="edit-m-email" type="email" value="${btn.dataset.email}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
              <select id="edit-m-role"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
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
    }

    renderMembers();

    document.getElementById("admin-member-search").addEventListener("input", (e) => {
      renderMembers(e.target.value.toLowerCase(), document.getElementById("admin-member-role-filter").value);
    });
    document.getElementById("admin-member-role-filter").addEventListener("change", (e) => {
      renderMembers(document.getElementById("admin-member-search").value.toLowerCase(), e.target.value);
    });
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Store Management Panel ----------
async function _loadAdminStorePanel() {
  const panel = document.getElementById("panel-store");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Store Management</h2><p>Loadingâ€¦</p>";

  try {
    const items = await getAllStoreItems();

    let html = `
      <h2 style="color:#08a5e2">Store Management</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Add New Item</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <input id="store-add-name" type="text" placeholder="Item Name"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="store-add-price" type="number" step="0.01" placeholder="Price (Â£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="store-add-category" type="text" placeholder="Category (e.g. Supplements)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="store-add-stock" type="number" placeholder="Stock Qty"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="store-add-desc" type="text" placeholder="Description" style="grid-column:span 2;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        </div>
        <button id="store-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
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
            <span style="color:#00c850;font-weight:bold">Â£${(item.price || 0).toFixed(2)}</span>
            <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Category: ${item.category || "â€”"}</span>
            <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Stock: ${item.stock != null ? item.stock : "â€”"}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="admin-edit-item" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-category="${item.category || ""}" data-stock="${item.stock || 0}" data-desc="${item.description || ""}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
              Edit
            </button>
            <button class="admin-delete-item" data-id="${item.id}" data-name="${item.name}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
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
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif" placeholder="Name">
              <input id="edit-si-price" type="number" step="0.01" value="${btn.dataset.price}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif" placeholder="Price">
              <input id="edit-si-category" type="text" value="${btn.dataset.category}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif" placeholder="Category">
              <input id="edit-si-stock" type="number" value="${btn.dataset.stock}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif" placeholder="Stock">
              <input id="edit-si-desc" type="text" value="${btn.dataset.desc}"
                style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif" placeholder="Description">
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
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Memberships Management Panel ----------
async function _loadAdminMembershipsPanel() {
  const panel = document.getElementById("panel-memberships");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Memberships</h2><p>Loadingâ€¦</p>";

  try {
    const [memberships, members] = await Promise.all([getAllMemberships(), getAllMembers()]);
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    let html = `
      <h2 style="color:#08a5e2">Memberships Management</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Create Membership</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <select id="mem-add-client" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
            <option value="">Select Member</option>
            ${members.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join("")}
          </select>
          <select id="mem-add-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
          <input id="mem-add-price" type="number" step="0.01" placeholder="Price (Â£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="mem-add-expiry" type="date"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        </div>
        <button id="mem-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
          Create Membership
        </button>
      </div>
      <p style="opacity:0.6">${memberships.length} membership(s)</p>
      <div id="admin-memberships-list"></div>
    `;
    panel.innerHTML = html;

    document.getElementById("mem-add-btn").addEventListener("click", async () => {
      const clientId = document.getElementById("mem-add-client").value;
      const type     = document.getElementById("mem-add-type").value;
      const price    = parseFloat(document.getElementById("mem-add-price").value) || 0;
      const expiry   = document.getElementById("mem-add-expiry").value;
      if (!clientId) { showToast("Select a member.", "error"); return; }
      try {
        await createMembership({
          clientId,
          type,
          price,
          status: "active",
          expiresAt: expiry ? new Date(expiry).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000
        });
        // Also record as income transaction
        await recordTransaction({
          type: "membership",
          amount: price,
          description: `${type} membership â€” ${(memberMap[clientId] || {}).name || clientId}`,
          category: "membership"
        });
        showToast("Membership created!", "success");
        _loadAdminMembershipsPanel();
        _loadAdminOverviewPanel();
      } catch (e) { showToast(e.message, "error"); }
    });

    const list = document.getElementById("admin-memberships-list");
    if (memberships.length === 0) {
      list.innerHTML = "<p>No memberships yet.</p>";
    } else {
      list.innerHTML = memberships.map(m => {
        const owner = memberMap[m.clientId];
        const isExpired = m.expiresAt && m.expiresAt < Date.now();
        const displayStatus = isExpired ? "expired" : (m.status || "active");
        return `
          <div class="card" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="flex:1;min-width:200px">
              <h3 style="margin:0">${owner ? owner.name : m.clientId}</h3>
              <p style="margin:4px 0;opacity:0.7;font-size:0.9rem">${m.type || "Standard"} â€” Â£${(m.price || 0).toFixed(2)}</p>
              <span style="color:${displayStatus === 'active' ? '#00c850' : '#08a5e2'};font-weight:bold;text-transform:uppercase;font-size:0.8rem">${displayStatus}</span>
              <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Expires: ${formatDate(m.expiresAt)}</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="admin-toggle-mem" data-id="${m.id}" data-status="${m.status}"
                style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
                ${m.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button class="admin-delete-mem" data-id="${m.id}"
                style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
                Delete
              </button>
            </div>
          </div>
        `;
      }).join("");

      list.querySelectorAll(".admin-toggle-mem").forEach(btn => {
        btn.addEventListener("click", async () => {
          const newStatus = btn.dataset.status === "active" ? "inactive" : "active";
          try {
            await updateMembership(btn.dataset.id, { status: newStatus });
            showToast(`Membership ${newStatus}.`, "success");
            _loadAdminMembershipsPanel();
          } catch (e) { showToast(e.message, "error"); }
        });
      });

      list.querySelectorAll(".admin-delete-mem").forEach(btn => {
        btn.addEventListener("click", () => {
          showModal("Delete Membership", "<p>Are you sure you want to delete this membership?</p>", async () => {
            try {
              await deleteMembership(btn.dataset.id);
              showToast("Membership deleted.", "success");
              _loadAdminMembershipsPanel();
            } catch (e) { showToast(e.message, "error"); }
          });
        });
      });
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
  }
}

// ---------- Finances Panel ----------
async function _loadAdminFinancesPanel() {
  const panel = document.getElementById("panel-finances");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Finances</h2><p>Loadingâ€¦</p>";

  try {
    const transactions = await getAllTransactions();

    let html = `
      <h2 style="color:#08a5e2">Financial Records</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Record Transaction</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <select id="txn-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="membership">Membership Payment</option>
            <option value="store_sale">Store Sale</option>
          </select>
          <input id="txn-amount" type="number" step="0.01" placeholder="Amount (Â£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="txn-category" type="text" placeholder="Category (e.g. Equipment, Salaries)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
          <input id="txn-desc" type="text" placeholder="Description"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:'Exo 2',sans-serif">
        </div>
        <button id="txn-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#006af5,#08a5e2);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
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
              <strong style="color:${isIncome ? '#00c850' : '#08a5e2'}">${isIncome ? '+' : '-'}Â£${(t.amount || 0).toFixed(2)}</strong>
              <span style="margin-left:10px;opacity:0.7">${t.description || ""}</span>
              <span style="margin-left:10px;opacity:0.5;font-size:0.8rem">${t.category || ""}</span>
            </div>
            <span style="opacity:0.5;font-size:0.8rem">${formatDate(t.createdAt)} â€” ${(t.type || "").toUpperCase()}</span>
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
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
    ctx.font = "14px Exo 2, sans-serif";
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
  ctx.font = "11px Exo 2, sans-serif";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + h - (h * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvas.width - padding.right, y);
    ctx.stroke();
    ctx.fillText("Â£" + Math.round(maxVal * i / 5), 5, y + 4);
  }

  // Line chart â€” Revenue
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
  drawLine(expValues, "rgba(255,77,77,1)");

  // X-axis labels
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "10px Exo 2, sans-serif";
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
  ctx.font = "11px Exo 2, sans-serif";
  ctx.fillText("Revenue", canvas.width - 164, 20);
  ctx.fillStyle = "rgba(255,77,77,1)";
  ctx.fillRect(canvas.width - 100, 10, 12, 12);
  ctx.fillStyle = "#fff";
  ctx.fillText("Expenses", canvas.width - 84, 20);
}

// ---------- Trainer-Client Links Panel ----------
async function _loadAdminTrainerLinksPanel() {
  const panel = document.getElementById("panel-trainer-links");
  if (!panel) return;

  panel.innerHTML = "<h2 style='color:#08a5e2'>Trainer-Client Relationships</h2><p>Loadingâ€¦</p>";

  try {
    const [links, members] = await Promise.all([getAllTrainerClientLinks(), getAllMembers()]);
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    let html = `
      <h2 style="color:#08a5e2">Trainer-Client Relationships</h2>
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
              <strong style="color:#ffa500">${trainer ? trainer.name : link.trainerId}</strong>
              <span style="opacity:0.5;margin:0 8px">â†’</span>
              <strong style="color:#00c850">${client ? client.name : link.clientId}</strong>
              <span style="margin-left:12px;opacity:0.5;font-size:0.8rem">Since ${formatDate(link.createdAt)}</span>
            </div>
            <button class="admin-delete-link" data-id="${link.id}"
              style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:'Exo 2',sans-serif">
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
    panel.innerHTML = `<h2 style="color:#08a5e2">Error</h2><p>${e.message}</p>`;
  }
}

// ============================================================
// SECTION 11: BOOTSTRAP â€” Run correct init based on current page
// ============================================================
(function bootstrap() {
  const page = detectPage();
  if (page === "index")   initIndexPage();
  if (page === "client")  initClientPage();
  if (page === "trainer") initTrainerPage();
  if (page === "admin")   initAdminPage();
})();