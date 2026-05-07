# The Gym — ASCEND BEYOND

A full-stack gym management web application built as an Agile Development assignment. The platform serves three distinct user roles (Admin, Trainer, Client) with real-time Firebase integration, a simulated payment system, class scheduling, messaging, and a member store.

---

## Project Structure

```
Agile-Development-Assignment-main/
├── index.html                  # Public landing page — hero, memberships, contact form
├── DashboardClient.xxx.html    # Client dashboard — classes, trainer, membership, cart, messages
├── trainerdashboard.xx.html    # Trainer dashboard — clients, workout/meal builder, classes, messages
├── AdminDashboard.html         # Admin dashboard — member management, store, finances, queries
├── XGYM_Cart.html              # Store page — product catalogue, cart, checkout, order history
├── messaging-app.html          # Standalone real-time messaging interface
├── dashboard-test.html         # Development / QA test page
├── BackendMain.js              # Core backend (~11,000 lines) — Firebase auth, all panel logic
├── app.js                      # Lightweight app-level state (GymState class, localStorage)
├── styles.css                  # Global stylesheet
├── REQUIREMENTS_GATHERING.md   # Feature specifications
└── NOTIFICATION_SYSTEM_GUIDE.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend / Database | Firebase Realtime Database |
| Authentication | Firebase Auth (email / password) |
| Fonts | Google Fonts — Orbitron, Exo 2, Black Han Sans |
| Animations | GSAP 3 + ScrollTrigger |

---

## User Roles

### Admin
- Full member management (view, edit, remove)
- Store management — add, edit, delete products
- Membership plan management and financial analytics
- Trainer-client link oversight
- Class scheduling oversight
- Messenger with **Conversations** and **Queries** tabs (see contact form queries from the public landing page)

### Trainer
- View and manage linked clients
- Build workout programs and meal plans for clients
- Create and manage gym classes
- Real-time messaging with clients
- Personal membership and store access

### Client
- Book gym classes
- View trainer-assigned workout programs and meal plans
- Send trainer invites and manage trainer relationship
- Purchase memberships and products via the store
- Real-time messaging with trainer
- Full cart and order history

**Role assignment is automatic on registration:**
- Emails in `TRAINER_EMAILS` whitelist → Trainer
- Emails in `ADMIN_ACCOUNTS` map → Admin
- All others → Client

---

## Features

### Landing Page (`index.html`)
- Animated hero section with GSAP-powered entrance
- Membership tiers (Basic £19.99/mo, Pro £34.99/mo, Premium £54.99/mo)
- Products and Booking nav links — both require login before proceeding
- Login / Register overlay with role-based post-login routing
- **Contact form** — submits name, email, subject and message to Firebase (`contact_queries/`); viewable by admin under the Queries tab
- Light / Dark mode toggle (persisted in `localStorage`)

### Store (`XGYM_Cart.html`)
- **Login-gated** — unauthenticated users are redirected to the login page
- Product catalogue synced live from Firebase (`store_items/`) — always reflects admin changes
- Slide-out cart panel with quantity controls and per-item subtotals
- **Test card autofill** — "Fill test card" banner populates `4242 4242 4242 4242 / TEST USER / 12/28 / 123` for demo payments
- Checkout modal supports two payment methods:
  - **Card** — Luhn-validated card number, expiry, CVV, optional save-for-later
  - **Direct Debit** — sort code / account number with authorisation checkbox
- Order history modal with real Firebase data + demo fallback
- Membership plan auto-add — clicking a tier on the homepage pre-loads it into the cart on arrival

### Messenger
- Real-time Firebase-backed messaging between clients and trainers
- Admin view with **Conversations** tab (all activity) and **Queries** tab (contact form submissions)
- Unread badge count on the Queries tab
- "Mark read" per-query to track admin follow-up
- Full **dark and light mode** support across all three dashboards

### Authentication Flow
| Action | Behaviour |
|---|---|
| Click **Booking** (nav) | Shows login/register form → after login routes to appropriate dashboard |
| Click **Products** (nav) | Shows login/register form → after login opens the store |
| Click membership tier **Get Started** | Shows login/register form → after login pre-adds the chosen plan to cart |
| Already logged in + click **Booking** | Routes directly to dashboard (role-based, no re-login required) |
| Already logged in + click **Products** | Opens store directly |

---

## Firebase Data Structure

```
/users/{uid}               — user profile (name, email, role, shareCode)
/store_items/{id}          — products managed by admin
/store_carts/{uid}         — (future: cross-device cart sync)
/store_purchases/{uid}     — completed orders
/memberships/{uid}         — active membership per user
/membership_plans/{id}     — plan definitions (name, price, duration)
/paymentCards/{uid}/{id}   — saved payment cards
/messages/{convoId}/{msgId}— real-time chat messages
/trainer_invites/{tid}/{cid} — client–trainer invite state
/classes/{id}              — class definitions
/class_bookings/{classId}/{uid} — class enrolments
/transactions/{id}         — financial transaction log
/contact_queries/{id}      — public contact form submissions
  - name, email, subject, message, timestamp, status (unread/read)
```

---

## Session / Storage Model

| Key | Storage | Purpose |
|---|---|---|
| `xgym_user` | sessionStorage | Current user (uid, name, email, role) |
| `xgym_cards` | sessionStorage | Saved payment cards loaded at login |
| `xgym_plans` | sessionStorage | Available membership plans |
| `xgym_store_items` | sessionStorage | Product catalogue snapshot (refreshed live from Firebase) |
| `xgym_active_membership` | sessionStorage | User's current membership status |
| `xgym_cart` | localStorage | Persistent cart across sessions |
| `xgym_post_login` | sessionStorage | Post-login redirect flag (`"store"` = go to store) |
| `xgym_post_login_plan` | sessionStorage | Membership plan to auto-add to cart after login |
| `xgym_pending_card` | sessionStorage | Card to sync to Firebase on next dashboard load |
| `xgym_pending_memberships` | sessionStorage | Membership purchases to sync on next dashboard load |
| `xgym-theme` | localStorage | UI theme preference (`"light"` or `"dark"`) |

---

## Changes Made (Session Log)

### Bug Fixes & Navigation
- **Dead links fixed** — `Products` nav link now triggers auth then goes to store; `Contact` nav link scrolls to the contact form section
- **Booking nav link reworked** — now always requires login; after login routes to the user's role-appropriate dashboard (not the store)
- **Products nav link reworked** — requires login; after login opens the store via `_openStore()`

### Store (`XGYM_Cart.html`)
- **Login gate added** — Firebase Auth check on page load; unauthenticated users are redirected to `index.html` with a post-login flag
- **Test card autofill** — green "Fill test card" button above payment form pre-populates all card fields with valid test data
- **Live Firebase sync** — store items are fetched fresh from Firebase on every page load, not just from the sessionStorage snapshot written at login
- **Membership plan pre-selection** — clicking a tier CTA on the homepage saves the plan, and the store auto-adds it to the cart and opens the panel on arrival
- Firebase Auth SDK added alongside the existing database SDK

### Authentication Flow (`BackendMain.js`)
- `xgym_post_login` flag now read in both login and register handlers — if set to `"store"`, calls `_openStore(uid)` instead of redirecting to dashboard
- Membership tier CTAs wired to login modal with plan data persisted in sessionStorage

### Messenger UI (`BackendMain.js` — `_ensureMessengerStyles`)
- All hardcoded dark-only colour values replaced with explicit `color` properties
- Full `body.light .xmsg-*` override set added matching each dashboard's light palette
- Dark mode bubble contrast improved — message cards now visually distinct from thread background
- Disabled button state (`.xmsg-btn:disabled`) added
- Admin messenger now has **tabbed layout**: Conversations tab + Queries tab

### Admin Queries Panel (`BackendMain.js` — `_loadAdminMessengerPanel`)
- Two-tab interface (Conversations / Queries) with animated tab bar and unread badge
- Queries tab reads `contact_queries/` from Firebase, sorted newest-first
- Click a query to see full message, sender details, timestamp and read status
- "Mark read" button updates Firebase and decrements the badge counter
- Full dark and light mode styling for all new tab and query card elements

### Contact Form (`index.html`)
- New `#contact-section` section added above the footer
- Fields: Name, Email, Subject, Message
- On submit: writes to Firebase `contact_queries/{id}` with `status: "unread"`
- Success / error feedback shown inline; form resets on success
- Full dark and light mode CSS included
- `Contact` nav link now scrolls to this section

---

## Running the Project

This is a static web project — no build step required.

1. Open `index.html` in a browser (or serve with a local server such as VS Code Live Server)
2. Register an account or use an existing one
3. Admin accounts are defined in `ADMIN_ACCOUNTS` inside `BackendMain.js`
4. For store payment testing, use the "Fill test card" button in checkout

> Firebase credentials are embedded in `BackendMain.js` and `XGYM_Cart.html`. This is acceptable for a university assignment but should use environment variables in production.

---

## Authors

Built by the Agile Development Assignment team — 2026.
