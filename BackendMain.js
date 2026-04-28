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

// Trainer email whitelist — emails here are assigned "trainer" role on registration.
// All other emails default to "client".
const TRAINER_EMAILS = ["trainer1@xgym.com", "trainer2@xgym.com"];

// Hardcoded admin accounts — these are NOT stored/fetched from Firebase.
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
  await db.ref("classes").push().set({
    trainerId,
    trainerName,
    name: data.name,
    day: data.day,
    time: data.time,
    capacity: Number(data.capacity) || 20,
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
  const snap = await db.ref("bookings").orderByChild("classId").equalTo(classId).once("value");
  if (!snap.exists()) return 0;
  let count = 0;
  snap.forEach(() => count++);
  return count;
}

/**
 * Client books a class. Checks capacity and duplicates.
 */
async function bookClass(classId, clientId, clientName) {
  const classSnap = await db.ref("classes/" + classId).once("value");
  if (!classSnap.exists()) throw new Error("Class not found.");
  const cls = classSnap.val();
  const bSnap = await db.ref("bookings").orderByChild("classId").equalTo(classId).once("value");
  let count = 0;
  let alreadyBooked = false;
  if (bSnap.exists()) {
    bSnap.forEach(child => {
      count++;
      if (child.val().clientId === clientId) alreadyBooked = true;
    });
  }
  if (alreadyBooked) throw new Error("You have already booked this class.");
  if (count >= (cls.capacity || 20)) throw new Error("Class is full.");
  await db.ref("bookings").push().set({ classId, clientId, clientName, createdAt: Date.now() });
}

/**
 * Fetch bookings for a client, enriched with class data.
 */
async function getClientBookings(clientId) {
  const snap = await db.ref("bookings").orderByChild("clientId").equalTo(clientId).once("value");
  if (!snap.exists()) return [];
  const bookings = [];
  snap.forEach(child => bookings.push({ id: child.key, ...child.val() }));
  const enriched = await Promise.all(bookings.map(async b => {
    const cSnap = await db.ref("classes/" + b.classId).once("value");
    if (cSnap.exists()) {
      const c = cSnap.val();
      b.className = c.name;
      b.day = c.day;
      b.time = c.time;
      b.trainerName = c.trainerName;
    }
    return b;
  }));
  return enriched;
}

/**
 * Cancel a booking.
 */
async function cancelBooking(bookingId) {
  await db.ref("bookings/" + bookingId).remove();
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
// SECTION 7C: TRAINER SELECTION SYSTEM (Mock Data + Real Integration)
// ============================================================

/**
 * Mock trainer profiles with specialties, ratings, and availability.
 * Used to populate the Pick Trainer panel before real data populates.
 */
const MOCK_TRAINERS = [
  {
    id: "mock_trainer_1",
    name: "Coach Mike Thompson",
    initials: "MT",
    specialty: "Strength & Powerlifting",
    bio: "12+ years of competitive powerlifting experience. NSCA-CSCS certified. Specializes in progressive overload programs for intermediate to advanced lifters.",
    rating: 4.9,
    reviewCount: 127,
    experience: "12 years",
    certifications: ["NSCA-CSCS", "USAW Level 2"],
    availability: ["Mon", "Tue", "Thu", "Fri"],
    pricePerSession: 45,
    pricePerMonth: 160,
    accentColor: "#e96d25",
    clients: 24,
    specialties: ["Powerlifting", "Strength", "Competition Prep"]
  },
  {
    id: "mock_trainer_2",
    name: "Sarah Chen",
    initials: "SC",
    specialty: "HIIT & Functional Training",
    bio: "Former D1 athlete turned fitness coach. Passionate about functional movement patterns and high-intensity training that translates to real-world performance.",
    rating: 4.8,
    reviewCount: 93,
    experience: "8 years",
    certifications: ["ACE-CPT", "CrossFit L2"],
    availability: ["Mon", "Wed", "Thu", "Sat"],
    pricePerSession: 40,
    pricePerMonth: 140,
    accentColor: "#0887e2",
    clients: 18,
    specialties: ["HIIT", "Functional", "Athletic Performance"]
  },
  {
    id: "mock_trainer_3",
    name: "James Rodriguez",
    initials: "JR",
    specialty: "Bodybuilding & Physique",
    bio: "NPC competitor with a passion for sculpting physiques. Expert in hypertrophy training, contest prep, and nutrition periodization for body composition.",
    rating: 4.7,
    reviewCount: 85,
    experience: "10 years",
    certifications: ["ISSA-CPT", "Precision Nutrition L1"],
    availability: ["Tue", "Wed", "Fri", "Sat"],
    pricePerSession: 50,
    pricePerMonth: 180,
    accentColor: "#ffd64a",
    clients: 15,
    specialties: ["Bodybuilding", "Hypertrophy", "Contest Prep"]
  },
  {
    id: "mock_trainer_4",
    name: "Aisha Patel",
    initials: "AP",
    specialty: "Yoga & Mobility",
    bio: "RYT-500 certified yoga instructor with a focus on mobility for athletes. Helps lifters reduce injury risk and improve range of motion for bigger lifts.",
    rating: 4.9,
    reviewCount: 112,
    experience: "9 years",
    certifications: ["RYT-500", "FMS Level 2"],
    availability: ["Mon", "Wed", "Fri", "Sun"],
    pricePerSession: 35,
    pricePerMonth: 120,
    accentColor: "#00c850",
    clients: 31,
    specialties: ["Yoga", "Mobility", "Injury Prevention"]
  },
  {
    id: "mock_trainer_5",
    name: "Marcus Williams",
    initials: "MW",
    specialty: "Sports Performance",
    bio: "Former pro rugby player. Combines strength, speed, and agility training for athletes of all levels. Expert in periodization and peaking for competition.",
    rating: 4.6,
    reviewCount: 67,
    experience: "7 years",
    certifications: ["NSCA-CSCS", "ASCA Level 1"],
    availability: ["Mon", "Tue", "Thu", "Sat"],
    pricePerSession: 55,
    pricePerMonth: 200,
    accentColor: "#ff4444",
    clients: 12,
    specialties: ["Sports Performance", "Speed & Agility", "Strength"]
  }
];

/**
 * Get combined trainers list (real from Firebase + mock fallback).
 */
async function getTrainersForSelection() {
  let realTrainers = [];
  try {
    realTrainers = await getAvailableTrainers();
  } catch (e) {
    console.warn("[LiftStreak] Could not fetch real trainers:", e);
  }
  // Merge: real trainers first, then mock ones
  const combined = realTrainers.map(t => ({
    ...t,
    initials: (t.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
    specialty: t.specialty || "General Fitness",
    bio: t.bio || "Certified trainer ready to help you reach your goals.",
    rating: t.rating || (4.5 + Math.random() * 0.5).toFixed(1),
    reviewCount: t.reviewCount || Math.floor(20 + Math.random() * 80),
    experience: t.experience || "3+ years",
    certifications: t.certifications || ["Certified Personal Trainer"],
    availability: t.availability || ["Mon", "Wed", "Fri"],
    pricePerSession: t.pricePerSession || 40,
    pricePerMonth: t.pricePerMonth || 150,
    accentColor: t.accentColor || "#0887e2",
    clients: t.clients || Math.floor(5 + Math.random() * 25),
    specialties: t.specialties || ["General Fitness"],
    isMock: false
  }));

  MOCK_TRAINERS.forEach(mt => {
    combined.push({ ...mt, isMock: true });
  });

  return combined;
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

    if (!user) {
      // Not logged in — stay on index, clear any loop counter
      _clearRedirectLoop();
      return;
    }

    // Already logged in — DEV/TEST MODE: stay on index, don't auto-redirect
    console.log("[X-Gym] Index: user logged in, profile:", profile, "— skipping auto-redirect (test mode)");
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
  if (!user) {
    // DEV/TEST MODE: skip redirect so pages can be opened directly
    console.warn("[X-Gym] Client page: no user logged in — skipping redirect (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",       "panel-cart");
    _bindCardToPanel("card-workouts",   "panel-workouts");
    _bindCardToPanel("card-membership", "panel-membership");
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-store",      "panel-trainers");
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
    _bindCardToPanel("card-store",      "panel-trainers");
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
    _bindCardToPanel("card-membership", "panel-membership");
    _bindCardToPanel("card-progress",   "panel-progress");
    _bindCardToPanel("card-store",      "panel-trainers");
    _bindCardToPanel("card-booking",     "panel-booking");
    _bindCardToPanel("card-pick-trainer","panel-pick-trainer");
    _bindCardToPanel("card-settings",   "panel-settings");
    _bindCardToPanel("card-messenger",   "panel-messenger");

    // Load panels content
    _loadClientTrainersPanel(user.uid);
    _loadClientWorkoutsPanel(user.uid);
    _loadClientProgressPanel(user.uid, profile.shareCode);
    _loadClientMealsPanel(user.uid);
    _loadClientMembershipPanel(user.uid);
    _loadCartPanel();
    _loadClientBookingPanel(user.uid, profile.name);
    _loadPickTrainerPanel(user.uid);
    _loadClientMessengerPanel(user.uid, profile.name);
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
  try { mealPlans = await getMealPlans(clientId); } catch(e) {}

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

  panel.innerHTML = "<h2 style='color:#0887e2'>Membership Status</h2>";

  try {
    const membership = await getMembership(clientId);
    if (!membership) {
      panel.innerHTML += "<p>No active membership found. Please visit the front desk or store.</p>";
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

function _loadCartPanel() {
  const panel = document.getElementById("panel-cart");
  if (!panel) return;

  function render() {
    const cart = getCart();
    panel.innerHTML = `
      <h2 style="color:#0887e2">My Cart</h2>
      ${cart.length === 0
        ? "<p>Your cart is empty.</p>"
        : cart.map(item => `
            <div class="card" style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
              <span>${item.name} × ${item.qty}</span>
              <span>£${(item.price * item.qty).toFixed(2)}</span>
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
          Total: £${cart.reduce((s,i) => s + i.price*i.qty, 0).toFixed(2)}
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
// Client Booking Panel (full implementation)
// --------------------------------------------------------
async function _loadClientBookingPanel(clientId, clientName) {
  const panel = document.getElementById("panel-booking");
  if (!panel) return;

  panel.innerHTML = `<h2 style="color:#0887e2">Book Classes</h2>
    <div style="text-align:center;padding:30px;opacity:0.5">Loading classes...</div>`;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  let classes, bookings;
  try {
    [classes, bookings] = await Promise.all([getClasses(), getClientBookings(clientId)]);
  } catch (e) {
    panel.innerHTML += `<p style="color:#ff0033">${e.message}</p>`;
    return;
  }

  const bookedClassIds = new Set(bookings.map(b => b.classId));
  const counts = {};
  for (const c of classes) {
    counts[c.id] = await getClassBookingCount(c.id);
  }

  // Weekly schedule rows
  let scheduleRows = "";
  for (const day of DAYS) {
    const dayClasses = classes.filter(c => c.day === day);
    if (dayClasses.length === 0) continue;
    scheduleRows += `<tr><td colspan="5" style="background:rgba(8,135,226,0.1);color:#0887e2;font-weight:700;
      padding:10px 14px;font-family:Orbitron,sans-serif;font-size:0.85rem;letter-spacing:1px">${day}</td></tr>`;
    for (const c of dayClasses) {
      const booked = counts[c.id] || 0;
      const full = booked >= (c.capacity || 20);
      const isBooked = bookedClassIds.has(c.id);
      let actionBtn;
      if (isBooked) {
        actionBtn = `<span style="display:inline-block;padding:5px 14px;border-radius:20px;
          background:rgba(8,135,226,0.2);color:#0887e2;font-size:0.8rem;font-weight:600">Booked</span>`;
      } else if (full) {
        actionBtn = `<span style="display:inline-block;padding:5px 14px;border-radius:20px;
          background:rgba(255,0,51,0.15);color:#ff0033;font-size:0.8rem;font-weight:600">Full</span>`;
      } else {
        actionBtn = `<button class="cb-book-btn" data-id="${c.id}"
          style="padding:6px 18px;border:none;border-radius:6px;
          background:linear-gradient(90deg,#0887e2,#06c);color:#fff;cursor:pointer;
          font-family:Poppins,sans-serif;font-size:0.8rem;font-weight:600">Book</button>`;
      }
      scheduleRows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
          <td style="padding:10px 14px">${c.name}</td>
          <td style="padding:10px 14px">${c.time}</td>
          <td style="padding:10px 14px">${c.trainerName || "—"}</td>
          <td style="padding:10px 14px"><span style="color:${full ? "#ff0033" : "#0f0"}">${booked}/${c.capacity || 20}</span></td>
          <td style="padding:10px 14px">${actionBtn}</td>
        </tr>`;
    }
  }
  if (!scheduleRows) {
    scheduleRows = `<tr><td colspan="5" style="text-align:center;padding:30px;opacity:0.5">No classes available yet. Check back soon!</td></tr>`;
  }

  // My bookings list
  let bookingCards = "";
  if (bookings.length > 0) {
    for (const b of bookings) {
      bookingCards += `
        <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${b.className || "Class"}</strong>
            <span style="opacity:0.5;margin:0 10px">|</span>
            <span>${b.day || "—"}</span>
            <span style="opacity:0.5;margin:0 6px">@</span>
            <span>${b.time || "—"}</span>
            <span style="opacity:0.5;margin:0 6px">with</span>
            <span style="color:#0887e2">${b.trainerName || "—"}</span>
          </div>
          <button class="cb-cancel-btn" data-id="${b.id}"
            style="padding:6px 14px;border:none;border-radius:6px;
            background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
            font-family:Poppins,sans-serif;font-size:0.78rem">Cancel</button>
        </div>`;
    }
  } else {
    bookingCards = `<p style="opacity:0.5;text-align:center;padding:20px">You haven't booked any classes yet.</p>`;
  }

  panel.innerHTML = `
    <h2 style="color:#0887e2">Book Classes</h2>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">Weekly Schedule</h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
          <thead>
            <tr style="border-bottom:2px solid rgba(8,135,226,0.3)">
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Class</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Time</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Trainer</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Spots</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Action</th>
            </tr>
          </thead>
          <tbody>${scheduleRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:14px">My Bookings</h3>
      ${bookingCards}
    </div>
  `;

  // Book buttons
  panel.querySelectorAll(".cb-book-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await bookClass(btn.dataset.id, clientId, clientName);
        showToast("Class booked!", "success");
        _loadClientBookingPanel(clientId, clientName);
      } catch (e) {
        showToast(e.message, "error");
      }
    });
  });

  // Cancel buttons
  panel.querySelectorAll(".cb-cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showModal("Cancel Booking", "<p>Are you sure you want to cancel this booking?</p>", async () => {
        try {
          await cancelBooking(btn.dataset.id);
          showToast("Booking cancelled.", "success");
          _loadClientBookingPanel(clientId, clientName);
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  });
}

function _loadClientPickTrainerPlaceholder() {
  // Replaced by full _loadPickTrainerPanel() — see below
}

/**
 * Full "Pick a Trainer" panel with mock trainer selection system.
 * Shows trainer cards with profiles, specialties, ratings, and booking.
 */
async function _loadPickTrainerPanel(clientId) {
  const panel = document.getElementById("panel-pick-trainer");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#0887e2">Pick a Trainer</h2>
    <p style="opacity:0.6;margin-bottom:16px">Browse trainers by specialty, rating, and availability. Select the perfect coach for your fitness journey.</p>

    <!-- Filter Bar -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
      <select id="pt-filter-specialty"
        style="padding:10px 16px;border-radius:8px;border:1px solid rgba(8,165,226,0.3);
               background:rgba(0,18,32,0.9);color:#fff;font-family:'Exo 2',sans-serif;cursor:pointer">
        <option value="all">All Specialties</option>
        <option value="Strength">Strength</option>
        <option value="HIIT">HIIT</option>
        <option value="Bodybuilding">Bodybuilding</option>
        <option value="Yoga">Yoga & Mobility</option>
        <option value="Sports">Sports Performance</option>
        <option value="General">General Fitness</option>
      </select>
      <select id="pt-sort"
        style="padding:10px 16px;border-radius:8px;border:1px solid rgba(8,165,226,0.3);
               background:rgba(0,18,32,0.9);color:#fff;font-family:'Exo 2',sans-serif;cursor:pointer">
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
         background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:9000;
         display:none;align-items:center;justify-content:center">
      <div id="pt-modal" style="background:rgba(0,18,32,0.97);border:1px solid rgba(8,165,226,0.3);
           border-radius:16px;padding:36px;max-width:560px;width:90%;max-height:85vh;overflow-y:auto;
           box-shadow:0 0 60px rgba(8,165,226,0.3)">
      </div>
    </div>
  `;

  const hiredIds = await _getHiredTrainerIds(clientId);
  const trainers = await getTrainersForSelection();

  function renderTrainerCards(trainerList) {
    const grid = document.getElementById("pt-trainer-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (trainerList.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;opacity:0.6">No trainers match your filters.</p>`;
      return;
    }

    trainerList.forEach(t => {
      const hired = hiredIds.includes(t.id);
      const stars = "\u2605".repeat(Math.floor(Number(t.rating))) +
                    (Number(t.rating) % 1 >= 0.5 ? "\u00BD" : "");
      const card = document.createElement("div");
      card.style.cssText = `
        background:rgba(0,18,32,0.9);border:1px solid rgba(8,165,226,0.15);
        border-radius:14px;padding:24px;cursor:pointer;transition:0.4s;
        box-shadow:0 0 25px rgba(8,165,226,0.12);position:relative;overflow:hidden;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-6px) scale(1.01)";
        card.style.borderColor = t.accentColor;
        card.style.boxShadow = "0 0 35px " + t.accentColor + "40";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.borderColor = "rgba(8,165,226,0.15)";
        card.style.boxShadow = "0 0 25px rgba(8,165,226,0.12)";
      });

      card.innerHTML = `
        <div style="position:absolute;top:0;right:0;width:80px;height:80px;
             background:radial-gradient(circle at 100% 0%,${t.accentColor}15,transparent 70%)"></div>
        ${t.isMock ? '<span style="position:absolute;top:12px;right:12px;font-size:0.65rem;padding:3px 8px;border-radius:10px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4)">Demo</span>' : ''}

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${t.accentColor},${t.accentColor}80);
               display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;
               font-weight:700;font-size:1rem;color:#fff;flex-shrink:0">
            ${t.initials}
          </div>
          <div>
            <div style="font-family:'Orbitron',monospace;font-size:0.95rem;color:#fff;letter-spacing:0.04em">${t.name}</div>
            <div style="font-size:0.8rem;color:${t.accentColor};margin-top:2px">${t.specialty}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;font-size:0.85rem">
          <span style="color:#ffd64a">${stars}</span>
          <span style="opacity:0.7">${t.rating} (${t.reviewCount} reviews)</span>
        </div>

        <p style="font-size:0.85rem;opacity:0.6;margin-bottom:14px;line-height:1.5;
           display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
          ${t.bio}
        </p>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
          ${t.specialties.map(s => `<span style="font-size:0.7rem;padding:3px 10px;border-radius:12px;
            background:${t.accentColor}20;color:${t.accentColor};border:1px solid ${t.accentColor}30">${s}</span>`).join("")}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;
             border-top:1px solid rgba(255,255,255,0.06)">
          <div>
            <span style="font-size:1.1rem;font-weight:700;color:#fff">\u00A3${t.pricePerSession}</span>
            <span style="font-size:0.75rem;opacity:0.5">/session</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="pt-view-btn" data-tid="${t.id}"
              style="padding:8px 16px;border:1px solid rgba(8,165,226,0.3);border-radius:8px;
                     background:transparent;color:#0887e2;cursor:pointer;font-family:'Exo 2',sans-serif;
                     font-size:0.8rem;transition:0.3s">
              View Profile
            </button>
            <button class="pt-select-btn" data-tid="${t.id}" data-tname="${t.name}"
              ${hired ? "disabled" : ""}
              style="padding:8px 16px;border:none;border-radius:8px;
                     background:${hired ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg," + t.accentColor + "," + t.accentColor + "cc)"};
                     color:#fff;cursor:${hired ? "default" : "pointer"};font-family:'Exo 2',sans-serif;
                     font-size:0.8rem;font-weight:600;transition:0.3s">
              ${hired ? "Selected" : "Select Trainer"}
            </button>
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

    // Select trainer buttons
    grid.querySelectorAll(".pt-select-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const tid = btn.dataset.tid;
        const tname = btn.dataset.tname;
        try {
          if (tid.startsWith("mock_")) {
            // Mock trainer — simulate hiring
            showToast(`${tname} selected as your trainer! (Demo)`, "success");
            btn.textContent = "Selected";
            btn.disabled = true;
            btn.style.background = "rgba(255,255,255,0.1)";
            btn.style.cursor = "default";
          } else {
            await hireTrainer(clientId, tid);
            showToast(`${tname} hired as your trainer!`, "success");
            hiredIds.push(tid);
            btn.textContent = "Selected";
            btn.disabled = true;
            btn.style.background = "rgba(255,255,255,0.1)";
            btn.style.cursor = "default";
          }
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  }

  function _showTrainerProfileModal(t, isHired, cid) {
    const overlay = document.getElementById("pt-modal-overlay");
    const modal = document.getElementById("pt-modal");
    if (!overlay || !modal) return;

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
            <h2 style="font-family:'Orbitron',monospace;font-size:1.2rem;color:#fff;margin:0">${t.name}</h2>
            <div style="color:${t.accentColor};font-size:0.9rem;margin-top:4px">${t.specialty}</div>
            <div style="color:#ffd64a;font-size:0.85rem;margin-top:4px">
              ${"\u2605".repeat(Math.floor(Number(t.rating)))} ${t.rating} (${t.reviewCount} reviews)
            </div>
          </div>
        </div>
        <button id="pt-modal-close" style="background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;opacity:0.6">\u2715</button>
      </div>

      <p style="font-size:0.9rem;opacity:0.75;line-height:1.7;margin-bottom:20px">${t.bio}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px">
        <div style="text-align:center;padding:14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:1.4rem;font-weight:700;color:${t.accentColor}">${t.experience}</div>
          <div style="font-size:0.75rem;opacity:0.5;margin-top:4px">Experience</div>
        </div>
        <div style="text-align:center;padding:14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:1.4rem;font-weight:700;color:${t.accentColor}">${t.clients}</div>
          <div style="font-size:0.75rem;opacity:0.5;margin-top:4px">Active Clients</div>
        </div>
        <div style="text-align:center;padding:14px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:1.4rem;font-weight:700;color:${t.accentColor}">\u00A3${t.pricePerMonth}</div>
          <div style="font-size:0.75rem;opacity:0.5;margin-top:4px">Per Month</div>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <h4 style="font-size:0.85rem;opacity:0.6;margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">Certifications</h4>
        ${certBadges}
      </div>

      <div style="margin-bottom:20px">
        <h4 style="font-size:0.85rem;opacity:0.6;margin-bottom:8px;letter-spacing:0.08em;text-transform:uppercase">Availability</h4>
        ${availDays}
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
        <button id="pt-modal-msg" style="padding:10px 22px;border:1px solid rgba(8,165,226,0.3);border-radius:8px;
                background:transparent;color:#0887e2;cursor:pointer;font-family:'Exo 2',sans-serif;font-size:0.85rem">
          Message Trainer
        </button>
        <button id="pt-modal-select" ${isHired ? "disabled" : ""}
          style="padding:10px 22px;border:none;border-radius:8px;
                 background:${isHired ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg," + t.accentColor + "," + t.accentColor + "cc)"};
                 color:#fff;cursor:${isHired ? "default" : "pointer"};font-family:'Exo 2',sans-serif;font-size:0.85rem;font-weight:600">
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

    document.getElementById("pt-modal-msg").addEventListener("click", () => {
      showToast("Messaging coming soon!", "info");
    });

    const selectBtn = document.getElementById("pt-modal-select");
    if (selectBtn && !selectBtn.disabled) {
      selectBtn.addEventListener("click", async () => {
        try {
          if (t.id.startsWith("mock_")) {
            // Mock trainer — simulate hiring
            showToast(`${t.name} selected as your trainer! (Demo)`, "success");
          } else {
            await hireTrainer(cid, t.id);
            showToast(`${t.name} hired as your trainer!`, "success");
            hiredIds.push(t.id);
          }
          selectBtn.textContent = "Already Selected";
          selectBtn.disabled = true;
          selectBtn.style.background = "rgba(255,255,255,0.1)";
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
        t.specialties.some(s => s.toLowerCase().includes(specFilter.toLowerCase())) ||
        t.specialty.toLowerCase().includes(specFilter.toLowerCase())
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
  const dayOpts = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");

  const classes = await getTrainerClasses(trainerUid);
  const counts = {};
  for (const c of classes) {
    counts[c.id] = await getClassBookingCount(c.id);
  }

  // Group by day
  let classCards = "";
  for (const day of DAYS) {
    const dayClasses = classes.filter(c => c.day === day);
    if (dayClasses.length === 0) continue;
    classCards += `<h3 style="color:#0887e2;margin:18px 0 8px;font-family:Orbitron,sans-serif;font-size:0.9rem;
      letter-spacing:1px">${day}</h3>`;
    for (const c of dayClasses) {
      const booked = counts[c.id] || 0;
      const full = booked >= (c.capacity || 20);
      classCards += `
        <div class="card" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong style="font-size:1.05rem">${c.name}</strong>
            <span style="opacity:0.5;margin-left:10px">${c.time}</span>
            <div style="margin-top:4px;font-size:0.85rem;opacity:0.7">
              Booked: <span style="color:${full ? "#ff0033" : "#0f0"}">${booked}/${c.capacity || 20}</span>
            </div>
          </div>
          <button class="tc-del-btn" data-id="${c.id}" data-name="${c.name}"
            style="padding:6px 14px;border:none;border-radius:6px;
            background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
            font-family:Poppins,sans-serif;font-size:0.78rem">Delete</button>
        </div>`;
    }
  }
  if (!classCards) {
    classCards = `<div class="card" style="text-align:center;opacity:0.5;padding:30px">You haven't created any classes yet.</div>`;
  }

  panel.innerHTML = `
    <h2 style="color:#0887e2">My Classes</h2>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">Create New Class</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <input id="tc-name" type="text" placeholder="Class Name"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <select id="tc-day"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          ${dayOpts}
        </select>
        <input id="tc-time" type="time"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <input id="tc-capacity" type="number" min="1" placeholder="Capacity" value="20"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
      </div>
      <button id="tc-create-btn" style="margin-top:14px;padding:10px 28px;border:none;border-radius:8px;
        background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
        font-family:Poppins,sans-serif;font-weight:600">Create Class</button>
    </div>

    <div id="tc-class-list">${classCards}</div>
  `;

  // Create handler
  document.getElementById("tc-create-btn").addEventListener("click", async () => {
    const name = document.getElementById("tc-name").value.trim();
    const day = document.getElementById("tc-day").value;
    const time = document.getElementById("tc-time").value;
    const capacity = parseInt(document.getElementById("tc-capacity").value) || 20;
    if (!name) { showToast("Enter a class name.", "error"); return; }
    if (!time) { showToast("Select a time.", "error"); return; }
    try {
      await createClass(trainerUid, trainerName, { name, day, time, capacity });
      showToast("Class created!", "success");
      _loadTrainerClassesPanel(trainerUid, trainerName);
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  // Delete handlers
  panel.querySelectorAll(".tc-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showModal("Delete Class", `<p>Delete <strong>${btn.dataset.name}</strong>?</p>`, async () => {
        await deleteClass(btn.dataset.id);
        showToast("Class deleted.", "success");
        _loadTrainerClassesPanel(trainerUid, trainerName);
      });
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
  if (!user) {
    // DEV/TEST MODE: skip redirect so pages can be opened directly
    console.warn("[X-Gym] Trainer page: no user logged in — skipping redirect (test mode)");
    initPanelNav();
    _bindCardToPanel("card-cart",           "panel-cart");
    _bindCardToPanel("card-workout-builder","panel-workout-builder");
    _bindCardToPanel("card-membership",     "panel-membership");
    _bindCardToPanel("card-client-progress","panel-clients");
    _bindCardToPanel("card-client-tracker", "panel-client-detail");
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
    _bindCardToPanel("card-client-tracker", "panel-client-detail");
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
    _bindCardToPanel("card-client-tracker", "panel-client-detail");
    _bindCardToPanel("card-store",          "panel-share-code");
    _bindCardToPanel("card-classes",         "panel-classes");
    _bindCardToPanel("card-messenger",        "panel-messenger");
    _bindCardToPanel("card-settings",       "panel-settings");

    // Load panels
    _loadTrainerShareCodePanel(profile.shareCode);
    _loadTrainerClientsPanel(user.uid);
    _loadTrainerWorkoutBuilderPanel(user.uid);
    _loadTrainerMealPlannerPanel(user.uid);
    _loadCartPanel();
    _loadTrainerMembershipPanel(user.uid);
    _loadTrainerClassesPanel(user.uid, profile.name);
    _loadTrainerMessengerPanel(user.uid, profile.name);
  }
}

function _loadTrainerShareCodePanel(shareCode) {
  const panel = document.getElementById("panel-share-code");
  if (!panel) return;
  panel.innerHTML = `
    <h2 style="color:#0887e2">Your Share Code</h2>
    <div class="card">
      <p>Give this code to clients so they can find you:</p>
      <div style="font-size:2rem;font-weight:900;letter-spacing:6px;color:#0887e2;margin:14px 0">
        ${shareCode || "N/A"}
      </div>
    </div>
  `;
}

async function _loadTrainerClientsPanel(trainerUid) {
  const panel = document.getElementById("panel-clients");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#0887e2">My Clients</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>Add Client by Share Code</h3>
      <div style="display:flex;gap:12px;margin-top:12px">
        <input id="client-share-code-input" type="text" placeholder="Client share code"
          style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
                 background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <button id="add-client-btn"
          style="padding:10px 22px;border:none;border-radius:8px;
                 background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;
                 cursor:pointer;font-family:Poppins,sans-serif">
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
        <p style="font-size:0.85rem;opacity:0.6">Share Code: ${client.shareCode || "—"}</p>
        <button class="view-client-btn" data-cid="${client.id}" data-cname="${client.name}"
          style="margin-top:10px;padding:8px 18px;border:none;border-radius:8px;
                 background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;
                 cursor:pointer;font-family:Poppins,sans-serif">
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
    list.innerHTML = `<p style="color:#0887e2">${e.message}</p>`;
  }
}

async function _loadClientDetailPanel(clientId, clientName) {
  const panel = document.getElementById("panel-client-detail");
  if (!panel) return;

  panel.innerHTML = `<h2 style="color:#0887e2">${clientName}'s Details</h2>
    <p style="opacity:0.6">Loading\u2026</p>`;

  try {
    const [progressEntries, meals, workoutSessions, trainerNotes] = await Promise.all([
      getClientProgress(clientId),
      getClientMeals(clientId),
      getWorkoutSessions(clientId),
      getTrainerNotes(clientId)
    ]);

    // Get weekly stats
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
        <input id="wb-client-code" type="text" placeholder="Client share code"
          style="flex:1;${inputStyle}">
        <button id="wb-view-plans" style="padding:8px 18px;border:none;border-radius:8px;
          background:rgba(8,135,226,0.2);color:#0887e2;cursor:pointer;font-family:Poppins,sans-serif;
          font-size:0.85rem;white-space:nowrap">View Existing Plans</button>
      </div>
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
    const code = document.getElementById("wb-client-code").value.trim();
    if (!code) { showToast("Enter client share code first.", "error"); return; }
    const container = document.getElementById("wb-existing-plans");
    container.style.display = "block";
    container.innerHTML = '<p style="opacity:0.5">Loading...</p>';
    try {
      const client = await _findUserByShareCode(code, "client");
      if (!client) { container.innerHTML = '<p style="color:#ff0033">Client not found.</p>'; return; }
      const plans = await getTrainerWorkouts(trainerUid, client.id);
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
    const clientCode = document.getElementById("wb-client-code").value.trim();
    const day        = document.getElementById("wb-day").value;
    const category   = document.getElementById("wb-category").value;
    if (!clientCode) { showToast("Enter client share code.", "error"); return; }

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
      const client = await _findUserByShareCode(clientCode, "client");
      if (!client) { showToast("Client not found.", "error"); return; }
      await createWorkout(trainerUid, client.id, { day, category, exercises });
      showToast("Workout saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
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
        <input id="mp-client-code" type="text" placeholder="Client share code"
          style="flex:1;${inputStyle}">
        <button id="mp-view-plans" style="padding:8px 18px;border:none;border-radius:8px;
          background:rgba(8,135,226,0.2);color:#0887e2;cursor:pointer;font-family:Poppins,sans-serif;
          font-size:0.85rem;white-space:nowrap">View Existing Plans</button>
      </div>
      <div id="mp-existing-plans" style="margin-top:14px;display:none"></div>

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
    const code = document.getElementById("mp-client-code").value.trim();
    if (!code) { showToast("Enter client share code first.", "error"); return; }
    const container = document.getElementById("mp-existing-plans");
    container.style.display = "block";
    container.innerHTML = '<p style="opacity:0.5">Loading...</p>';
    try {
      const client = await _findUserByShareCode(code, "client");
      if (!client) { container.innerHTML = '<p style="color:#ff0033">Client not found.</p>'; return; }
      const plans = await getTrainerMealPlans(trainerUid, client.id);
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
    const clientCode = document.getElementById("mp-client-code").value.trim();
    if (!clientCode) { showToast("Enter client share code.", "error"); return; }

    const daySections = panel.querySelectorAll(".mp-day-section");
    if (daySections.length === 0) { showToast("Add at least one day.", "error"); return; }

    try {
      const client = await _findUserByShareCode(clientCode, "client");
      if (!client) { showToast("Client not found.", "error"); return; }

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
          await createMealPlan(trainerUid, client.id, { day, meals });
        }
      }
      showToast("Meal plan(s) saved!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  });
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
      _loadAdminMessengerPanel().catch(e => console.error("[X-Gym] Messenger panel error:", e))
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
    const [memberships, members] = await Promise.all([getAllMemberships(), getAllMembers()]);
    const memberMap = {};
    members.forEach(m => { memberMap[m.id] = m; });

    let html = `
      <h2 style="color:#0887e2">Memberships Management</h2>
      <div class="card" style="margin-bottom:24px">
        <h3>Create Membership</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <select id="mem-add-client" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <option value="">Select Member</option>
            ${members.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join("")}
          </select>
          <select id="mem-add-type" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
          <input id="mem-add-price" type="number" step="0.01" placeholder="Price (£)"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <input id="mem-add-expiry" type="date"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        </div>
        <button id="mem-add-btn" style="margin-top:14px;padding:10px 24px;border:none;border-radius:8px;
          background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
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
          description: `${type} membership — ${(memberMap[clientId] || {}).name || clientId}`,
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
              <p style="margin:4px 0;opacity:0.7;font-size:0.9rem">${m.type || "Standard"} — £${(m.price || 0).toFixed(2)}</p>
              <span style="color:${displayStatus === 'active' ? '#00c850' : '#0887e2'};font-weight:bold;text-transform:uppercase;font-size:0.8rem">${displayStatus}</span>
              <span style="margin-left:12px;opacity:0.6;font-size:0.85rem">Expires: ${formatDate(m.expiresAt)}</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="admin-toggle-mem" data-id="${m.id}" data-status="${m.status}"
                style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
                ${m.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button class="admin-delete-mem" data-id="${m.id}"
                style="padding:7px 16px;border:none;border-radius:8px;background:rgba(255,0,60,0.5);color:#fff;cursor:pointer;font-family:Poppins,sans-serif">
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
  db.ref("messages/" + convoId).orderByChild("timestamp").on("value", snap => {
    const msgs = [];
    snap.forEach(child => {
      msgs.push({ id: child.key, ...child.val() });
    });
    callback(msgs);
  });
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

/**
 * Get all pending invites for a trainer.
 */
async function getTrainerInvites(trainerId) {
  const snap = await db.ref("hiring_invites")
    .orderByChild("trainerId").equalTo(trainerId).once("value");
  const invites = [];
  snap.forEach(child => {
    invites.push({ id: child.key, ...child.val() });
  });
  return invites.filter(inv => inv.status === "pending");
}

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

// ============================================================
// CLIENT MESSENGER PANEL
// ============================================================
async function _loadClientMessengerPanel(clientId, clientName) {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

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

  panel.innerHTML = `
    <h2 style="color:#0887e2">💬 Messenger</h2>
    <p style="opacity:0.6;margin-bottom:16px">Select a trainer to chat with or send a hiring invite.</p>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
      <select id="msg-trainer-select"
        style="padding:10px 16px;border-radius:8px;border:1px solid rgba(8,165,226,0.3);
               background:rgba(0,18,32,0.9);color:#fff;font-family:'Exo 2',sans-serif;
               cursor:pointer;min-width:220px">
        <option value="">— Select a Trainer —</option>
        ${trainers.map(t => `<option value="${t.id}">${t.name || t.email}</option>`).join("")}
      </select>
      <button id="msg-send-invite-btn"
        style="padding:10px 20px;border:none;border-radius:8px;
               background:linear-gradient(135deg,#e96d25,#ff9a44);color:#fff;
               font-family:'Orbitron',monospace;font-size:0.75rem;cursor:pointer;
               letter-spacing:0.08em">
        📩 Send Hiring Invite
      </button>
    </div>

    <div id="msg-chat-area" style="display:none">
      <div id="msg-messages"
        style="background:rgba(0,18,32,0.7);border:1px solid rgba(8,165,226,0.15);
               border-radius:12px;padding:16px;height:350px;overflow-y:auto;
               margin-bottom:12px">
        <p style="opacity:0.4;text-align:center">Select a trainer to start chatting.</p>
      </div>
      <div style="display:flex;gap:10px">
        <input id="msg-input" type="text" placeholder="Type your message..."
          style="flex:1;padding:12px 16px;border-radius:8px;
                 border:1px solid rgba(8,165,226,0.3);background:rgba(0,18,32,0.9);
                 color:#fff;font-family:'Exo 2',sans-serif;outline:none">
        <button id="msg-send-btn"
          style="padding:12px 24px;border:none;border-radius:8px;
                 background:linear-gradient(135deg,#0887e2,#006af5);color:#fff;
                 font-family:'Orbitron',monospace;font-size:0.8rem;cursor:pointer;
                 letter-spacing:0.06em">
          Send
        </button>
      </div>
    </div>
  `;

  const select = document.getElementById("msg-trainer-select");
  const chatArea = document.getElementById("msg-chat-area");
  const messagesDiv = document.getElementById("msg-messages");
  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("msg-send-btn");
  const inviteBtn = document.getElementById("msg-send-invite-btn");
  let currentTrainerId = null;

  select.addEventListener("change", () => {
    currentTrainerId = select.value;
    if (!currentTrainerId) {
      chatArea.style.display = "none";
      return;
    }
    chatArea.style.display = "block";
    messagesDiv.innerHTML = "<p style='opacity:0.4;text-align:center'>Loading messages...</p>";

    listenMessages(clientId, currentTrainerId, (msgs) => {
      if (msgs.length === 0) {
        messagesDiv.innerHTML = "<p style='opacity:0.4;text-align:center'>No messages yet. Say hello!</p>";
        return;
      }
      messagesDiv.innerHTML = msgs.map(m => `
        <div style="margin-bottom:10px;text-align:${m.from === clientId ? 'right' : 'left'}">
          <span style="display:inline-block;padding:8px 14px;border-radius:10px;
                 max-width:70%;word-wrap:break-word;
                 background:${m.from === clientId ? 'rgba(8,135,226,0.3)' : 'rgba(233,109,37,0.2)'};
                 font-size:0.88rem">
            <strong style="font-size:0.72rem;opacity:0.6">${m.fromName || 'Unknown'}</strong><br>
            ${m.text}
          </span>
          <div style="font-size:0.65rem;opacity:0.35;margin-top:2px">${new Date(m.timestamp).toLocaleString()}</div>
        </div>
      `).join("");
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text || !currentTrainerId) return;
    sendMessage(clientId, currentTrainerId, clientName, text);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });

  inviteBtn.addEventListener("click", async () => {
    if (!currentTrainerId) {
      showToast("Select a trainer first.", "error");
      return;
    }
    try {
      await sendHiringInvite(clientId, clientName, currentTrainerId);
      showToast("Hiring invite sent!", "success");
    } catch (e) {
      showToast("Failed to send invite: " + e.message, "error");
    }
  });
}

// ============================================================
// TRAINER MESSENGER PANEL
// ============================================================
async function _loadTrainerMessengerPanel(trainerId, trainerName) {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

  // Fetch trainer's clients
  let clients = [];
  try {
    const clientsSnap = await db.ref("users/" + trainerId + "/clients").once("value");
    const clientIds = [];
    clientsSnap.forEach(child => { clientIds.push(child.key); });
    for (const cid of clientIds) {
      const userSnap = await db.ref("users/" + cid).once("value");
      if (userSnap.exists()) clients.push({ id: cid, ...userSnap.val() });
    }
  } catch (e) {
    console.error("[X-Gym] Failed to load clients for messenger:", e);
  }

  // Fetch pending invites
  let invites = [];
  try {
    invites = await getTrainerInvites(trainerId);
  } catch (e) {
    console.error("[X-Gym] Failed to load invites:", e);
  }

  panel.innerHTML = `
    <h2 style="color:#0887e2">💬 Messenger</h2>
    <p style="opacity:0.6;margin-bottom:16px">Chat with your clients and manage hiring invites.</p>

    ${invites.length > 0 ? `
      <div style="margin-bottom:24px">
        <h3 style="color:#e96d25;font-family:'Orbitron',monospace;font-size:0.9rem;margin-bottom:12px">
          📩 Pending Hiring Invites (${invites.length})
        </h3>
        <div id="msg-invites-list">
          ${invites.map(inv => `
            <div class="card" style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;padding:14px 18px">
              <span><strong>${inv.clientName || 'Unknown Client'}</strong> wants to hire you</span>
              <div style="display:flex;gap:8px">
                <button data-invite="${inv.id}" data-client="${inv.clientId}" data-action="accept"
                  style="padding:8px 16px;border:none;border-radius:6px;
                         background:rgba(0,200,80,0.7);color:#fff;cursor:pointer;
                         font-family:'Exo 2',sans-serif;font-size:0.82rem">
                  ✓ Accept
                </button>
                <button data-invite="${inv.id}" data-client="${inv.clientId}" data-action="decline"
                  style="padding:8px 16px;border:none;border-radius:6px;
                         background:rgba(220,30,30,0.7);color:#fff;cursor:pointer;
                         font-family:'Exo 2',sans-serif;font-size:0.82rem">
                  ✕ Decline
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px">
      <select id="msg-client-select"
        style="padding:10px 16px;border-radius:8px;border:1px solid rgba(8,165,226,0.3);
               background:rgba(0,18,32,0.9);color:#fff;font-family:'Exo 2',sans-serif;
               cursor:pointer;min-width:220px">
        <option value="">— Select a Client —</option>
        ${clients.map(c => `<option value="${c.id}">${c.name || c.email}</option>`).join("")}
      </select>
    </div>

    <div id="msg-chat-area" style="display:none">
      <div id="msg-messages"
        style="background:rgba(0,18,32,0.7);border:1px solid rgba(8,165,226,0.15);
               border-radius:12px;padding:16px;height:350px;overflow-y:auto;
               margin-bottom:12px">
        <p style="opacity:0.4;text-align:center">Select a client to start chatting.</p>
      </div>
      <div style="display:flex;gap:10px">
        <input id="msg-input" type="text" placeholder="Type your message..."
          style="flex:1;padding:12px 16px;border-radius:8px;
                 border:1px solid rgba(8,165,226,0.3);background:rgba(0,18,32,0.9);
                 color:#fff;font-family:'Exo 2',sans-serif;outline:none">
        <button id="msg-send-btn"
          style="padding:12px 24px;border:none;border-radius:8px;
                 background:linear-gradient(135deg,#0887e2,#006af5);color:#fff;
                 font-family:'Orbitron',monospace;font-size:0.8rem;cursor:pointer;
                 letter-spacing:0.06em">
          Send
        </button>
      </div>
    </div>
  `;

  // Invite accept/decline handlers
  panel.querySelectorAll("[data-invite]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const inviteId = btn.dataset.invite;
      const clientId = btn.dataset.client;
      const accept = btn.dataset.action === "accept";
      try {
        await respondToInvite(inviteId, accept, trainerId, clientId);
        showToast(accept ? "Invite accepted! Client linked." : "Invite declined.", accept ? "success" : "info");
        // Reload panel
        _loadTrainerMessengerPanel(trainerId, trainerName);
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    });
  });

  // Chat logic
  const select = document.getElementById("msg-client-select");
  const chatArea = document.getElementById("msg-chat-area");
  const messagesDiv = document.getElementById("msg-messages");
  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("msg-send-btn");
  let currentClientId = null;

  select.addEventListener("change", () => {
    currentClientId = select.value;
    if (!currentClientId) {
      chatArea.style.display = "none";
      return;
    }
    chatArea.style.display = "block";
    messagesDiv.innerHTML = "<p style='opacity:0.4;text-align:center'>Loading messages...</p>";

    listenMessages(trainerId, currentClientId, (msgs) => {
      if (msgs.length === 0) {
        messagesDiv.innerHTML = "<p style='opacity:0.4;text-align:center'>No messages yet.</p>";
        return;
      }
      messagesDiv.innerHTML = msgs.map(m => `
        <div style="margin-bottom:10px;text-align:${m.from === trainerId ? 'right' : 'left'}">
          <span style="display:inline-block;padding:8px 14px;border-radius:10px;
                 max-width:70%;word-wrap:break-word;
                 background:${m.from === trainerId ? 'rgba(8,135,226,0.3)' : 'rgba(233,109,37,0.2)'};
                 font-size:0.88rem">
            <strong style="font-size:0.72rem;opacity:0.6">${m.fromName || 'Unknown'}</strong><br>
            ${m.text}
          </span>
          <div style="font-size:0.65rem;opacity:0.35;margin-top:2px">${new Date(m.timestamp).toLocaleString()}</div>
        </div>
      `).join("");
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text || !currentClientId) return;
    sendMessage(trainerId, currentClientId, trainerName, text);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}

// ============================================================
// ADMIN MANAGE CLASSES PANEL
// ============================================================
async function _loadAdminClassesPanel() {
  const panel = document.getElementById("panel-classes");
  if (!panel) return;

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const classes = await getClasses();
  const trainers = await getAvailableTrainers();

  // Build booking counts
  const counts = {};
  for (const c of classes) {
    counts[c.id] = await getClassBookingCount(c.id);
  }

  const trainerOpts = trainers.map(t =>
    `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`
  ).join("");

  const dayOpts = DAYS.map(d => `<option value="${d}">${d}</option>`).join("");

  // Build weekly schedule rows grouped by day
  let scheduleRows = "";
  for (const day of DAYS) {
    const dayClasses = classes.filter(c => c.day === day);
    if (dayClasses.length === 0) continue;
    scheduleRows += `<tr><td colspan="7" style="background:rgba(8,135,226,0.1);color:#0887e2;font-weight:700;padding:10px 14px;
      font-family:Orbitron,sans-serif;font-size:0.85rem;letter-spacing:1px">${day}</td></tr>`;
    for (const c of dayClasses) {
      const booked = counts[c.id] || 0;
      const full = booked >= (c.capacity || 20);
      scheduleRows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
          <td style="padding:10px 14px">${c.name}</td>
          <td style="padding:10px 14px">${c.time}</td>
          <td style="padding:10px 14px">${c.trainerName || "Unassigned"}</td>
          <td style="padding:10px 14px">
            <span style="color:${full ? "#ff0033" : "#0f0"}">${booked}/${c.capacity || 20}</span>
          </td>
          <td style="padding:10px 14px">
            <button class="ac-edit-btn" data-id="${c.id}" data-name="${c.name}" data-day="${c.day}"
              data-time="${c.time}" data-trainer="${c.trainerId}" data-cap="${c.capacity}"
              style="padding:6px 14px;border:none;border-radius:6px;
              background:linear-gradient(90deg,#0887e2,#06c);color:#fff;cursor:pointer;
              font-family:Poppins,sans-serif;font-size:0.78rem;margin-right:6px">Edit</button>
            <button class="ac-del-btn" data-id="${c.id}" data-name="${c.name}"
              style="padding:6px 14px;border:none;border-radius:6px;
              background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
              font-family:Poppins,sans-serif;font-size:0.78rem">Delete</button>
          </td>
        </tr>`;
    }
  }
  if (!scheduleRows) {
    scheduleRows = `<tr><td colspan="7" style="text-align:center;padding:30px;opacity:0.5">No classes created yet.</td></tr>`;
  }

  panel.innerHTML = `
    <h2 style="color:#0887e2">Manage Classes</h2>

    <div class="card" style="margin-bottom:24px">
      <h3 style="margin-bottom:14px">Create New Class</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <input id="ac-name" type="text" placeholder="Class Name"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        <select id="ac-day"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          ${dayOpts}
        </select>
        <input id="ac-time" type="time"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <select id="ac-trainer"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <option value="">— Select Trainer —</option>
          ${trainerOpts}
        </select>
        <input id="ac-capacity" type="number" min="1" placeholder="Capacity (e.g. 20)" value="20"
          style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
      </div>
      <button id="ac-create-btn" style="margin-top:14px;padding:10px 28px;border:none;border-radius:8px;
        background:linear-gradient(90deg,#ff0033,#ff5500);color:#fff;cursor:pointer;
        font-family:Poppins,sans-serif;font-weight:600">Create Class</button>
    </div>

    <div class="card">
      <h3 style="margin-bottom:14px">Weekly Schedule</h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
          <thead>
            <tr style="border-bottom:2px solid rgba(8,135,226,0.3)">
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Class</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Time</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Trainer</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Booked</th>
              <th style="text-align:left;padding:10px 14px;color:#0887e2">Actions</th>
            </tr>
          </thead>
          <tbody>${scheduleRows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Create class
  document.getElementById("ac-create-btn").addEventListener("click", async () => {
    const name = document.getElementById("ac-name").value.trim();
    const day = document.getElementById("ac-day").value;
    const time = document.getElementById("ac-time").value;
    const trainerSel = document.getElementById("ac-trainer");
    const trainerId = trainerSel.value;
    const trainerName = trainerSel.selectedOptions[0]?.dataset.name || "";
    const capacity = parseInt(document.getElementById("ac-capacity").value) || 20;
    if (!name) { showToast("Enter a class name.", "error"); return; }
    if (!time) { showToast("Select a time.", "error"); return; }
    if (!trainerId) { showToast("Select a trainer.", "error"); return; }
    try {
      await createClass(trainerId, trainerName, { name, day, time, capacity });
      showToast("Class created!", "success");
      _loadAdminClassesPanel();
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  // Edit buttons
  panel.querySelectorAll(".ac-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const editHTML = `
        <div style="display:grid;gap:12px;margin-top:10px">
          <input id="ac-edit-name" value="${btn.dataset.name}" placeholder="Class Name"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <select id="ac-edit-day"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            ${DAYS.map(d => `<option value="${d}" ${d === btn.dataset.day ? "selected" : ""}>${d}</option>`).join("")}
          </select>
          <input id="ac-edit-time" type="time" value="${btn.dataset.time}"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
          <select id="ac-edit-trainer"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
            ${trainers.map(t => `<option value="${t.id}" data-name="${t.name}" ${t.id === btn.dataset.trainer ? "selected" : ""}>${t.name}</option>`).join("")}
          </select>
          <input id="ac-edit-cap" type="number" min="1" value="${btn.dataset.cap}"
            style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:rgba(255,255,255,0.05);color:#fff;font-family:Poppins,sans-serif">
        </div>`;
      showModal("Edit Class", editHTML, async () => {
        const trSel = document.getElementById("ac-edit-trainer");
        await updateClass(id, {
          name: document.getElementById("ac-edit-name").value.trim(),
          day: document.getElementById("ac-edit-day").value,
          time: document.getElementById("ac-edit-time").value,
          trainerId: trSel.value,
          trainerName: trSel.selectedOptions[0]?.dataset.name || "",
          capacity: parseInt(document.getElementById("ac-edit-cap").value) || 20
        });
        showToast("Class updated!", "success");
        _loadAdminClassesPanel();
      });
    });
  });

  // Delete buttons
  panel.querySelectorAll(".ac-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showModal("Delete Class", `<p>Delete <strong>${btn.dataset.name}</strong>? All bookings will also be removed.</p>`, async () => {
        await deleteClass(btn.dataset.id);
        showToast("Class deleted.", "success");
        _loadAdminClassesPanel();
      });
    });
  });
}

// ============================================================
// ADMIN MESSENGER PANEL
// ============================================================
async function _loadAdminMessengerPanel() {
  const panel = document.getElementById("panel-messenger");
  if (!panel) return;

  panel.innerHTML = `
    <h2 style="color:#0887e2">💬 Messenger — Admin View</h2>
    <p style="opacity:0.6;margin-bottom:20px">Monitor messaging activity across the platform. Message contents are private and not visible to admins.</p>
    <div id="admin-msg-loading" style="text-align:center;padding:20px;opacity:0.5">Loading data...</div>
    <div id="admin-msg-content" style="display:none"></div>
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

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">
        <div class="card">
          <h3 style="color:#0887e2;font-family:'Orbitron',monospace;font-size:0.9rem;margin-bottom:10px">
            Trainers (${trainers.length})
          </h3>
          <div style="max-height:250px;overflow-y:auto">
            ${trainers.length === 0 ? "<p style='opacity:0.5'>No trainers found.</p>" :
              trainers.map(t => `
                <div style="padding:8px 0;border-bottom:1px solid rgba(8,165,226,0.1);display:flex;align-items:center;gap:10px">
                  <span style="width:8px;height:8px;border-radius:50%;background:#00c850;flex-shrink:0"></span>
                  <span>${t.name || t.email}</span>
                  <span style="opacity:0.4;font-size:0.75rem;margin-left:auto">${t.email || ''}</span>
                </div>
              `).join("")}
          </div>
        </div>
        <div class="card">
          <h3 style="color:#0887e2;font-family:'Orbitron',monospace;font-size:0.9rem;margin-bottom:10px">
            Clients (${clientsList.length})
          </h3>
          <div style="max-height:250px;overflow-y:auto">
            ${clientsList.length === 0 ? "<p style='opacity:0.5'>No clients found.</p>" :
              clientsList.map(c => `
                <div style="padding:8px 0;border-bottom:1px solid rgba(8,165,226,0.1);display:flex;align-items:center;gap:10px">
                  <span style="width:8px;height:8px;border-radius:50%;background:#0887e2;flex-shrink:0"></span>
                  <span>${c.name || c.email}</span>
                  <span style="opacity:0.4;font-size:0.75rem;margin-left:auto">${c.email || ''}</span>
                </div>
              `).join("")}
          </div>
        </div>
      </div>

      <h3 style="color:#e96d25;font-family:'Orbitron',monospace;font-size:0.9rem;margin-bottom:14px">
        📊 Messaging Activity Log
      </h3>
      ${activity.length === 0 ? `
        <div class="card"><p style="opacity:0.5">No messaging activity recorded yet.</p></div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${activity.map(a => {
            const user1 = allUsers[a.participants[0]];
            const user2 = allUsers[a.participants[1]];
            const name1 = user1 ? (user1.name || user1.email) : a.participants[0];
            const name2 = user2 ? (user2.name || user2.email) : a.participants[1];
            const role1 = user1 ? user1.role : "unknown";
            const role2 = user2 ? user2.role : "unknown";
            return `
              <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px">
                <div>
                  <strong>${name1}</strong>
                  <span style="opacity:0.4;font-size:0.72rem;background:rgba(8,165,226,0.15);padding:2px 8px;border-radius:4px;margin:0 6px">${role1}</span>
                  ↔
                  <strong>${name2}</strong>
                  <span style="opacity:0.4;font-size:0.72rem;background:rgba(8,165,226,0.15);padding:2px 8px;border-radius:4px;margin:0 6px">${role2}</span>
                </div>
                <div style="text-align:right">
                  <span style="color:#0887e2;font-weight:600">${a.messageCount} messages</span>
                  <div style="font-size:0.7rem;opacity:0.4">${formatDate(a.lastTimestamp)}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}
    `;
  } catch (e) {
    console.error("[X-Gym] Admin messenger error:", e);
    panel.innerHTML += `<p style="color:#ff4444">Failed to load messenger data: ${e.message}</p>`;
  }
}