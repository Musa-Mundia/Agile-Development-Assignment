# Requirements Gathering — The Gym (X-Gym / ASCEND BEYOND)

## 1. Project Overview

**Application Name:** X-Gym / The Gym — ASCEND BEYOND  
**Type:** Web-based gym management system  
**Technology Stack:** HTML5, CSS3, Vanilla JavaScript, Firebase (Authentication + Realtime Database)  
**Backend File:** `BackendMain.js` — single unified backend handling auth, data, UI rendering  
**Styling:** `styles.css` + inline per-page styles; supports Light/Dark mode  
**Font Libraries:** Orbitron, Exo 2, Black Han Sans (Google Fonts)

---

## 2. User Roles

| Role    | Assignment Method                                         |
|---------|-----------------------------------------------------------|
| Admin   | Hardcoded email map in `BackendMain.js` (`ADMIN_ACCOUNTS`) |
| Trainer | Whitelist of emails (`TRAINER_EMAILS`) checked on registration |
| Client  | Default role for all other registered users               |

**Role-based routing after login:**
- Admin → `AdminDashboard.html`
- Trainer → `trainerdashboard.xx.html`
- Client → `DashboardClient.xxx.html`

---

## 3. Pages / Files Inventory

| File | Purpose |
|------|---------|
| `index.html` | Landing page — hero section, navigation, login/register modal |
| `AdminDashboard.html` | Admin role dashboard with sidebar navigation and panels |
| `trainerdashboard.xx.html` | Trainer role dashboard with sidebar navigation and panels |
| `DashboardClient.xxx.html` | Client role dashboard with sidebar navigation and panels |
| `XGYM_Cart.html` | Dedicated shopping cart / checkout page |
| `ClientBooking.html` | Class booking interface for clients |
| `ClassBookingMockup.html` | Mockup/prototype of the class booking UI |
| `messaging-app.html` | Standalone messaging interface |
| `admin-messages.html` | Admin-specific messaging view |
| `dashboard-test.html` / `dashboard-test-identical.html` | Development test pages |
| `app.js` | Application-level JavaScript |
| `BackendMain.js` | All-in-one backend: Firebase auth, DB, role routing, cart, panel loaders |
| `styles.css` | Global stylesheet |

---

## 4. Authentication Requirements

### 4.1 Registration
- User provides: name, email, password
- System auto-assigns role:
  - Email in `TRAINER_EMAILS` → role: `trainer`
  - Email in `ADMIN_ACCOUNTS` → role: `admin`
  - All others → role: `client`
- User profile written to Firebase RTDB at `users/{uid}`
- A unique 8-character alphanumeric **share code** is generated per user on registration

### 4.2 Login
- Firebase Email/Password authentication
- On login, system checks hardcoded admin map first, then fetches RTDB profile
- User redirected to role-appropriate dashboard

### 4.3 Logout
- Clears Firebase auth session
- Redirects to `index.html`

### 4.4 Auth State Monitoring
- `onAuthChange(callback)` — reactive listener for auth state changes
- `waitForAuth()` — promise-based auth resolution
- `getCurrentUser()` — synchronous current user retrieval

---

## 5. Data Models (Firebase Realtime Database)

| RTDB Path | Description |
|-----------|-------------|
| `users/{uid}` | User profiles: name, email, role, shareCode, rating, reviewCount, bio, specialty, etc. |
| `workouts` | Workout plans assigned to clients; indexed by `clientId` |
| `workout_sessions` | Client workout session logs (LiftStreak tracker) |
| `meals` | Meal log entries per client; indexed by `clientId` |
| `memberships` | Active memberships per client; indexed by `clientId` |
| `membership_plans` | Available membership plan definitions (name, price, duration, features) |
| `membership_payments` | Client membership payment history |
| `classes` | Gym class listings (name, type, trainer, schedule, capacity, location) |
| `class_bookings` | Client bookings for classes |
| `class_waitlist` | Waitlist entries when a class reaches capacity |
| `client_trainer` | Client ↔ Trainer link records (status: active) |
| `trainer_clients` | Trainer ↔ Client relationship records |
| `client_invites/{clientId}/{trainerId}` | Trainer hire invitations from client side |
| `trainer_invites/{trainerId}/{clientId}` | Trainer invite records |
| `trainer_reviews/{trainerId}` | Client reviews of trainers (rating, text, timestamp) |
| `client_biography/{clientId}` | Client biography/profile info |
| `store_items` | Store product catalogue (name, price, description, image) |
| `store_purchases/{clientId}` | Client purchase history from the store |
| `paymentCards/{uid}` | Saved payment card details per user |
| `training_sessions` | Logged trainer-client session records |

**Cart:** Stored in browser `localStorage` under key `xgym_cart` (not Firebase).

---

## 6. Feature Requirements by Role

### 6.1 Admin Features

**Dashboard Panels:**

| Panel | Functionality |
|-------|--------------|
| Overview | Summary statistics: total members, active memberships, total revenue, store item count, trainer-client links |
| Members | View all registered users; search/filter members; delete user accounts |
| Memberships | View all memberships; manage membership plan definitions (create plans); review membership requests |
| Finances | View all financial transactions; income breakdown by type (membership, store sales, general income) |
| Admins | View list of all hardcoded admin accounts |
| Trainer Links | View all active trainer-client link relationships; manage/review link requests |
| Classes | View all classes across all trainers |
| Messenger | Send and receive messages with members/trainers/clients |
| Store | Full CRUD management of store product items (add, edit, delete) |

**Notification Types (Admin):**
- `messenger` — New messages
- `members` — New member registrations
- `memberships` — New membership requests
- `trainer-links` — New trainer-client link requests

---

### 6.2 Trainer Features

**Dashboard Panels:**

| Panel | Functionality |
|-------|--------------|
| Share Code | Display trainer's personal share code; regenerate share code; add clients by entering client share code |
| Clients | View list of linked clients; tab-based views (client list / trainer hours); click client to view detail |
| Client Detail | View individual client profile, progress, biography, and workout history |
| Workout Builder | Create and assign workout plans to specific clients (exercises, sets, reps, notes) |
| Meal Planner | Create and assign meal plans to specific clients (meals, macros, schedule) |
| Classes | Create, edit, and delete gym classes (name, type, day, time, duration, capacity, location, description, public/private toggle) |
| Membership | View trainer's own membership status |
| Messenger | Real-time messaging with clients |
| Settings | Edit public trainer profile (name, specialty, bio) |
| Cart | Access to gym store and cart |

**Trainer Hours Tracking:**
- Trainers can log and view their working/training hours

**Trainer Public Profile Fields:**
- Name, specialty, biography, rating (aggregate from client reviews), review count

**Notification Types (Trainer):**
- `messenger` — New messages from clients
- `clients` — Client progress updates / requests
- `classes` — New class enrolments / updates

---

### 6.3 Client Features

**Dashboard Panels:**

| Panel | Functionality |
|-------|--------------|
| Cart | View shopping cart contents; checkout with saved payment card |
| Trainers | View all available trainers; view trainer profile, rating, reviews; hire a trainer |
| Workouts | View workout plans assigned by trainer; log personal workout sessions (LiftStreak tracker) |
| Progress | View workout session history and progress data; shareable via share code |
| Meals | View assigned meal plans; log personal meal entries |
| Biography | View and edit personal biography/profile (height, weight, goals, etc.) |
| Booking | Browse and book available gym classes; view booked classes; join waitlist when class is full |
| Pick Trainer | Browse trainer profiles and initiate hire process |
| Membership | View active membership; select and purchase membership plan using payment card |
| Messenger | Real-time messaging with trainer or gym |
| Settings | Manage saved payment cards (add, set default, remove) |

**Trainer Hire Flow:**
1. Client browses available trainers
2. Client selects trainer and clicks hire
3. `client_trainer` and `trainer_clients` records created
4. Both `client_invites` and `trainer_invites` updated with `accepted` status

**Class Booking Flow:**
1. Client views available classes
2. Client books a class (capacity checked)
3. If class is full → client added to waitlist
4. When a spot opens → first waitlisted client is automatically booked

**Membership Purchase Flow:**
1. Client views available membership plans
2. Client selects plan and proceeds to payment
3. Payment card selected or new card entered
4. `memberships`, `membership_payments` records created

**Trainer Review System:**
- Clients can leave star ratings and written reviews for trainers
- Trainer's aggregate rating and review count updated on each new review

**Notification Types (Client):**
- `messenger` — New messages from trainer
- `workouts` — New workout plans assigned
- `meals` — New meal plans assigned
- `booking` — Class booking updates
- `trainer` — Trainer invitations/updates
- `cart` — Cart updates

---

## 7. Cart & Store Requirements

### Store (Admin-managed)
- Admin creates store items with: name, price, description, image
- Items stored in `store_items` RTDB path
- Full CRUD: create, read, update, delete

### Cart (Client/Trainer)
- Stored in `localStorage` (key: `xgym_cart`)
- Operations: `getCart()`, `addToCart(item)`, `removeFromCart(itemId)`
- Cart persists across page refreshes within the same browser session
- Checkout requires a saved payment card
- On checkout: `store_purchases/{clientId}` record created in Firebase

### Payment Cards
- Stored in Firebase at `paymentCards/{uid}`
- Fields: cardHolder, cardNumber, last4, expiry, isDefault, addedAt
- Operations: save card, get cards, remove card, set default
- New cards can be added during checkout flow

---

## 8. Notification System Requirements

- Animated pulsing badge on sidebar navigation items
- Shows numeric count of unread/pending items
- Handles overflow: displays `99+` when count exceeds 99
- Persists across page refresh (stored in `localStorage`)
- Auto-clears when the user navigates to the relevant panel
- Supports Light and Dark mode styling
- Exposed global API: `window.XGymNotifications`
  - `addNotification(type, count)`
  - `clearNotification(type)`
  - `notifications` — read current counts

---

## 9. Messaging Requirements

- Real-time messaging between users
- Roles supported: Client ↔ Trainer, Admin ↔ Any
- Messages stored in Firebase under `messages/{userId}`
- New unread messages trigger notification badges
- Separate standalone pages: `messaging-app.html`, `admin-messages.html`
- Embedded messenger panels within all three dashboards (`panel-messenger`)

---

## 10. UI / UX Requirements

### Theme
- Dark mode by default; Light mode toggle available
- Colour palette: electric blue (`#0887e2`), deep black (`#000d14`), fire orange (`#e96d25`), gold (`#ffd64a`), white (`#f1f9fe`)
- Fonts: Orbitron (headings/badges), Exo 2 (body), Black Han Sans (display)
- Animated particle canvas background (3 layers at varying opacity)
- Animated aura/glow radial gradient layer
- Lightning bolt flash animation effects

### Navigation
- Fixed left sidebar on all dashboards (270px wide)
- Role badge displayed under logo (e.g., "ADMIN PANEL", "TRAINER", "CLIENT")
- Active panel highlighted; inactive panels hidden by default
- Hover: item slides right with blue glow text-shadow
- Logout button at bottom of sidebar in fire orange

### Feedback
- Toast notifications: success (green), error (red), info (orange); bottom-right corner; 3-second auto-dismiss with slide animation
- Modal dialogs: blur overlay, dark card, optional confirm callback

### Share Code System
- Every user receives a unique 8-character alphanumeric share code on registration
- Trainers use client share codes to add clients to their roster
- Clients can share their progress via share code

---

## 11. Business Rules

1. Admin accounts are hardcoded in `BackendMain.js` — they are NOT stored in Firebase.
2. Trainer role is assigned by email whitelist at registration time — not changeable via UI.
3. All other registered users default to the `client` role.
4. A client can hire multiple trainers; a trainer can have multiple clients.
5. When a class reaches capacity, new registrants are placed on a waitlist; they are automatically promoted to booked when a spot opens.
6. Trainer aggregate rating is recalculated on every new review submission.
7. Cart state is local (localStorage) and not synced to Firebase.
8. Payment cards are stored in Firebase per user; one can be marked as default.
9. If a client's membership record is missing but a payment record exists, the system attempts to auto-recover the membership record.
10. Messages with `read: false` flag trigger notification badges on the receiver's dashboard.

---

## 12. Non-Functional Requirements (Observed)

| Requirement | Observation |
|-------------|-------------|
| Persistence | Firebase Realtime Database for all server-side data; localStorage for cart and notifications |
| Responsiveness | `viewport` meta tag set; `overflow-x: hidden` applied to body |
| Performance | Particle animations use `canvas` elements with fixed z-index; panel data loaded asynchronously |
| Security | Firebase Auth for identity; role assignment logic is server-enforced via RTDB profile |
| Scalability | All panels dynamically populated by `BackendMain.js` at runtime — HTML shells are empty containers |
| Browser Compatibility | Standard HTML5/CSS3/ES6+ — no transpiler/bundler detected |

---

## 13. Identified Gaps / Open Questions

1. **Admin role management** — Admins are hardcoded; there is no UI to add or remove admins dynamically.
2. **Trainer whitelist** — Trainer emails are hardcoded; no admin UI to add/remove trainer-eligible emails.
3. **Payment processing** — Card details are stored as plain text strings in Firebase; no real payment gateway integration is present.
4. **Class attendance marking** — `class_waitlist` and attendance data structures exist but attendance marking UI may be incomplete.
5. **Password reset** — No password reset/forgotten password flow was observed in the codebase.
6. **Image upload** — Store items reference images but no upload mechanism was identified (may use URLs only).
7. **Mobile responsiveness** — Sidebar layout at 270px fixed width may not be optimised for small screens.
8. **Message read receipts** — `read` flag exists on messages but delivery/read receipt UI was not confirmed.
