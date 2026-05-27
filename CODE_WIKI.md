# Thara Al‑Sharq One Markets — Code Wiki

Progressive Web App (PWA) for supermarket delivery in Khafji. The repository contains:
- Customer-facing storefront (browse products, cart, checkout, orders, account).
- Admin dashboard (orders, products, offers, chat, staff management).
- Supabase integration for auth, data, and realtime chat with offline/local fallback.

## Table of Contents
- [1) Architecture](#1-architecture)
- [2) Runtime Entry Points & Routing](#2-runtime-entry-points--routing)
- [3) State Management (StoreContext)](#3-state-management-storecontext)
- [4) Supabase Data Layer](#4-supabase-data-layer)
- [5) Customer App (App.jsx)](#5-customer-app-appjsx)
- [6) Admin App (Admin.jsx)](#6-admin-app-adminjsx)
- [7) PWA & Offline](#7-pwa--offline)
- [8) Data Model (Supabase)](#8-data-model-supabase)
- [9) Dependency Relationships](#9-dependency-relationships)
- [10) Run & Build Instructions](#10-run--build-instructions)
- [11) Deployment (GitHub Pages)](#11-deployment-github-pages)
- [12) Repository Map](#12-repository-map)

---

## 1) Architecture

### High-level layers
- **Presentation layer (React UI)**: Customer UI in [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx), Admin UI in [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx), and auth pages under [pages/](file:///d:/ahmed/TharaApp/src/pages).
- **Application state (React Context)**: Single global store in [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx) holds auth, products, cart, orders, chat, and staff.
- **Data access (Supabase wrappers)**: Small API modules in [src/supabase/](file:///d:/ahmed/TharaApp/src/supabase) encapsulate queries, mapping, and realtime subscription.
- **Persistence fallbacks (Offline-friendly)**:
  - localStorage is used as the primary fallback store when Supabase isn’t configured/ready.
  - IndexedDB is used as a secondary backup via [storage.js](file:///d:/ahmed/TharaApp/src/utils/storage.js).
- **PWA (service worker + manifest)**: static assets and caching behavior in [public/sw.js](file:///d:/ahmed/TharaApp/public/sw.js) and [public/manifest.json](file:///d:/ahmed/TharaApp/public/manifest.json).

### Base path (“/thara-app/”) is a core constraint
This project is designed to run under `/thara-app/` (for GitHub Pages). That affects:
- Vite build config: [vite.config.js](file:///d:/ahmed/TharaApp/vite.config.js#L4-L18)
- Router basename: [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L44-L61)
- Service worker URL and cached paths: [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L13-L31), [sw.js](file:///d:/ahmed/TharaApp/public/sw.js#L1-L10)
- Manifest start URL: [manifest.json](file:///d:/ahmed/TharaApp/public/manifest.json#L1-L23)

---

## 2) Runtime Entry Points & Routing

### App bootstrap
- React root mounts in [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L44-L64).
- Global providers:
  - Error boundary: [ErrorBoundary.jsx](file:///d:/ahmed/TharaApp/src/components/ErrorBoundary.jsx)
  - Store provider: [StoreProvider](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L16-L305)
- Service worker registration emits `sw-update` when an updated worker is waiting: [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L13-L31).

### Routes
All routes are declared in [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L44-L61):
- `/` → Customer storefront [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx)
- `/login` → Customer login [CustomerLogin.jsx](file:///d:/ahmed/TharaApp/src/pages/CustomerLogin.jsx)
- `/register` → Registration [Register.jsx](file:///d:/ahmed/TharaApp/src/pages/Register.jsx)
- `/admin/login` → Admin login [Login.jsx](file:///d:/ahmed/TharaApp/src/pages/Login.jsx)
- `/admin/*` → Admin dashboard [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx) behind `ProtectedRoute`

### Admin access control
- `ProtectedRoute` checks `user` and `staffRole` from the store, with a hard-coded admin email fallback: [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L33-L42).
- Staff roles come from the `staff` table in Supabase (see [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L6-L55)) via [staffApi.getByEmail](file:///d:/ahmed/TharaApp/src/supabase/staff.js#L10-L14).

---

## 3) State Management (StoreContext)

### Overview
`StoreContext` is the central state and business-logic layer:
- Defines state slices for auth, products, orders, cart, chat, and staff: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L16-L46).
- Picks Supabase vs fallback behavior using `hasSupabase` and `supabaseReady`: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L47-L80).
- Exposes an API object via the provider value: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L288-L304).

### Initialization flow (Supabase-first, fallback-safe)
- If env vars exist, fetches initial `products`, `orders`, `chat` from Supabase: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L51-L63).
- Loads auth user, resolves staff role, then flips `supabaseReady=true`: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L64-L73).
- Listens for auth changes to keep `user` and `staffRole` in sync: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L82-L98).
- Subscribes to realtime chat after Supabase is ready: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L100-L107).

### Persistence rules
- When Supabase is not ready, products/orders/chat are persisted to localStorage: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L109-L113).
- Products/orders/chat are also backed up to IndexedDB via `storage.set`: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L114-L117), implemented in [storage.js](file:///d:/ahmed/TharaApp/src/utils/storage.js#L22-L79).
- Cart is always persisted in localStorage: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L119-L120).

### Key business functions (most important APIs)
- **Product filtering** (category + debounced search): [filteredProducts](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L128-L139).
- **Cart**
  - Offer-aware price selection: [getProductPrice](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L141-L141)
  - Add item: [addToCart](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L143-L151)
  - Update quantity (minimum 1): [updateCartQty](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L155-L162)
  - Total calculation: [cartTotal](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L164-L166)
- **Orders**
  - Place order (adds delivery fee rule: free above 100, else 15): [placeOrder](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L169-L195)
  - Update status (admin): [updateOrderStatus](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L197-L204)
- **Chat**
  - Send message (stores locally, optionally Supabase): [sendMessage](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L237-L247)
- **Auth**
  - Login (Supabase required): [login](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L250-L255)
  - Logout: [logout](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L257-L260)
- **Staff management** (admin-only UI, store exposes actions):
  - Load/list: [loadStaff](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L263-L269)
  - Create/update/remove: [addStaff / updateStaff / removeStaff](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L271-L286)

---

## 4) Supabase Data Layer

### Client bootstrap
Supabase client is created in [client.js](file:///d:/ahmed/TharaApp/src/supabase/client.js#L1-L20) using:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If env vars are missing, it logs a warning and uses placeholders, but the app’s store avoids calling Supabase using `hasSupabase`: [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L47-L49).

### Module overview
- **Auth**: [authApi](file:///d:/ahmed/TharaApp/src/supabase/auth.js#L3-L31)
  - `signIn(email,password)`, `signUp(email,password)`, `signOut()`, `getUser()`, `onAuthChange(cb)`
- **Products**: [productsApi](file:///d:/ahmed/TharaApp/src/supabase/products.js#L3-L51)
  - `list()`, `get(id)`, `create(product)`, `update(id, updates)`, `remove(id)`
  - Normalizes database rows via `mapProduct` and `toProductRow`: [products.js](file:///d:/ahmed/TharaApp/src/supabase/products.js#L53-L81)
- **Orders**: [ordersApi](file:///d:/ahmed/TharaApp/src/supabase/orders.js#L3-L60)
  - `list()`, `create(order)`, `createLegacy(order)`, `updateStatus(id,status)`
  - Prefers RPC `create_order_secure` and falls back if not present: [orders.js](file:///d:/ahmed/TharaApp/src/supabase/orders.js#L13-L31)
  - Normalizes rows via `mapOrder`: [orders.js](file:///d:/ahmed/TharaApp/src/supabase/orders.js#L63-L76)
- **Chat**: [chatApi](file:///d:/ahmed/TharaApp/src/supabase/chat.js#L3-L35)
  - `list()`, `send(sender,text)`, `subscribe(onMessage)`
  - Uses realtime channel subscription on INSERT: [chat.js](file:///d:/ahmed/TharaApp/src/supabase/chat.js#L23-L34)
- **Staff**: [staffApi](file:///d:/ahmed/TharaApp/src/supabase/staff.js#L3-L32)
  - `list()`, `getByEmail(email)`, `create(staffMember)`, `update(id, updates)`, `remove(id)`

---

## 5) Customer App (App.jsx)

### UI layout and navigation model
Customer app is a single page with an internal “tab” state (not separate routes):
- Tabs: home, orders, account: [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx#L61-L113)
- Slide animation direction is computed from tab order: [switchTab](file:///d:/ahmed/TharaApp/src/App.jsx#L85-L90)

### Key screens/components inside App.jsx
- **Update banner** listens for `sw-update` and sends `SKIP_WAITING` to the waiting SW, then reloads: [UpdateBanner](file:///d:/ahmed/TharaApp/src/App.jsx#L125-L139).
- **Header** includes search box, cart button, login link, and install shortcut: [AppHeader](file:///d:/ahmed/TharaApp/src/App.jsx#L153-L183).
- **Cart full-screen sheet** shows cart items, qty edits, total, and checkout action: [CartScreen](file:///d:/ahmed/TharaApp/src/App.jsx#L203-L255).
- **Home tab** shows category pills, offers, and product list: [HomeTab](file:///d:/ahmed/TharaApp/src/App.jsx#L257-L360).
- **Orders tab** shows user’s orders filtered by `customerEmail`: [OrdersTab](file:///d:/ahmed/TharaApp/src/App.jsx#L362-L392) and filtering logic [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx#L82-L84).
- **Account tab** shows login/register CTAs or user profile and logout: [AccountTab](file:///d:/ahmed/TharaApp/src/App.jsx#L394-L418).
- **Chat widget** (customer support) uses `sendMessage('customer', text)` and renders `chatMessages`: [ChatWidget](file:///d:/ahmed/TharaApp/src/App.jsx#L503-L538).

### Checkout and location selection (Leaflet)
Checkout is a modal sheet that requires:
- Location chosen on a Leaflet map (click to place marker)
- Location must fall within approximate Khafji bounds
- A Saudi mobile number `05XXXXXXXX` (simple regex validation)

Key code:
- Leaflet map creation and click-to-set-marker: [KhafjiMap](file:///d:/ahmed/TharaApp/src/App.jsx#L540-L595).
- Khafji bounds + validation: [isInKhafji](file:///d:/ahmed/TharaApp/src/App.jsx#L597-L600).
- Order submission payload to `placeOrder(...)`: [CheckoutModal confirm](file:///d:/ahmed/TharaApp/src/App.jsx#L685-L695).

---

## 6) Admin App (Admin.jsx)

### Access model
Admin UI is only reachable via the protected `/admin/*` route:
- Route guard: [ProtectedRoute](file:///d:/ahmed/TharaApp/src/main.jsx#L33-L42).
- Role gating inside the admin UI:
  - Catalog management allowed for `admin` and `manager`: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L24-L32)
  - Staff management visible for `admin` only: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L32-L66)

### Admin modules (tabs)
Admin’s UI is organized by internal tab state:
- **Orders**: [AdminOrders](file:///d:/ahmed/TharaApp/src/Admin.jsx#L81-L139)
  - Shows aggregated stats and allows changing `order.status` via `updateOrderStatus(...)`: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L108-L118)
- **Products**: [AdminProducts](file:///d:/ahmed/TharaApp/src/Admin.jsx#L141-L205)
  - Creates products through store’s `addProduct(...)`: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L153-L166)
  - Inline updates call `updateProduct(id, patch)` as the user types: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L189-L198)
  - Deletion: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L199-L200)
- **Offers**: [AdminOffers](file:///d:/ahmed/TharaApp/src/Admin.jsx#L207-L243)
  - Toggles `isOffer` and sets `offerPrice`: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L222-L237)
- **Chat**: [AdminChat](file:///d:/ahmed/TharaApp/src/Admin.jsx#L245-L282)
  - Uses store’s `sendMessage('admin', text)` for replies: [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L248-L252)
- **Staff**: delegated to [StaffManager.jsx](file:///d:/ahmed/TharaApp/src/components/StaffManager.jsx)

---

## 7) PWA & Offline

### Install UX
Two installation entry points:
- Header “تثبيت” shortcut in the customer app: [AddShortcutButton](file:///d:/ahmed/TharaApp/src/App.jsx#L14-L59).
- A richer install prompt component used in customer and admin:
  - Customer sheet: [InstallPrompt](file:///d:/ahmed/TharaApp/src/components/InstallPrompt.jsx#L122-L189)
  - Admin banner variant: [InstallPrompt variant="admin"](file:///d:/ahmed/TharaApp/src/components/InstallPrompt.jsx#L80-L120)

Dismissal is persisted for 7 days: [InstallPrompt.jsx](file:///d:/ahmed/TharaApp/src/components/InstallPrompt.jsx#L3-L13).

### Service worker
The service worker is custom (no Workbox):
- Precaches app shell assets + Leaflet CSS + Tajawal font CSS: [sw.js](file:///d:/ahmed/TharaApp/public/sw.js#L1-L10).
- Navigations are network-first with cache fallback (fallback to `/thara-app/`): [sw.js](file:///d:/ahmed/TharaApp/public/sw.js#L37-L49).
- Other GET requests are cache-first with network fill; images get a blank SVG when offline: [sw.js](file:///d:/ahmed/TharaApp/public/sw.js#L50-L66).

### Error containment
Unexpected rendering errors are caught by a global error boundary: [ErrorBoundary.jsx](file:///d:/ahmed/TharaApp/src/components/ErrorBoundary.jsx).

---

## 8) Data Model (Supabase)

The reference schema lives in [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql). Key entities:

### staff
- Purpose: identify admin/manager/employee users by email.
- Role resolution helper functions:
  - `current_staff_role()` and `is_staff(...)`: [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L21-L37)
- Used by:
  - route protection in [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx#L33-L42)
  - admin UI capability gating in [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx#L24-L32)

### products
- Fields include `price`, `offer_price`, `is_offer`, `image_url`, `stock_quantity`, `unit`: [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L68-L79)
- Mapped into app-friendly shape (`offerPrice`, `isOffer`, `imageUrl`) by [mapProduct](file:///d:/ahmed/TharaApp/src/supabase/products.js#L69-L81).

### orders
- Stores cart items as JSONB and customer/order metadata: [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L98-L109)
- Has a secure RPC path to build clean items and compute totals server-side:
  - `create_order_secure(...)`: [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L132-L223)
- Client behavior:
  - Calls RPC and falls back to legacy insert if RPC is missing: [ordersApi.create](file:///d:/ahmed/TharaApp/src/supabase/orders.js#L13-L31)

### chat_messages
- Simple support chat stream: [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql#L227-L244)
- Realtime subscriptions from the client use `postgres_changes` on inserts: [chatApi.subscribe](file:///d:/ahmed/TharaApp/src/supabase/chat.js#L23-L34).

---

## 9) Dependency Relationships

### Internal module dependencies (most important)
- [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx) depends on:
  - [StoreProvider](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx#L16-L305)
  - [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx), [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx), auth pages
  - [ErrorBoundary.jsx](file:///d:/ahmed/TharaApp/src/components/ErrorBoundary.jsx)
- [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx) depends on:
  - Supabase APIs: [productsApi](file:///d:/ahmed/TharaApp/src/supabase/products.js), [ordersApi](file:///d:/ahmed/TharaApp/src/supabase/orders.js), [chatApi](file:///d:/ahmed/TharaApp/src/supabase/chat.js), [authApi](file:///d:/ahmed/TharaApp/src/supabase/auth.js), [staffApi](file:///d:/ahmed/TharaApp/src/supabase/staff.js)
  - Offline persistence helper: [storage.js](file:///d:/ahmed/TharaApp/src/utils/storage.js)
  - Mock data fallback: [mockData.js](file:///d:/ahmed/TharaApp/src/data/mockData.js)
- [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx) depends on:
  - Context: [StoreContext](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx)
  - Leaflet: `import L from 'leaflet'` ([App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx#L1-L7))
  - Install prompt UI: [InstallPrompt.jsx](file:///d:/ahmed/TharaApp/src/components/InstallPrompt.jsx)
- [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx) depends on:
  - Context actions from [StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx)
  - Staff UI: [StaffManager.jsx](file:///d:/ahmed/TharaApp/src/components/StaffManager.jsx)

### External dependencies (runtime)
- React: UI runtime (`react`, `react-dom`)
- React Router: routing (`react-router-dom`)
- Supabase: auth + Postgres + realtime (`@supabase/supabase-js`)
- Leaflet: map interactions (`leaflet`)

---

## 10) Run & Build Instructions

### Prerequisites
- Node.js 20+ recommended (CI uses Node 20): [deploy.yml](file:///d:/ahmed/TharaApp/.github/workflows/deploy.yml#L15-L19)
- npm

### Install dependencies
```bash
npm install
```

If you hit peer dependency issues (CI uses this mode):
```bash
npm install --legacy-peer-deps
```

### Configure environment (optional but recommended)
Create a `.env` file (see [\.env.example](file:///d:/ahmed/TharaApp/.env.example)):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### Run development server
```bash
npm run dev
```

Open the app at:
- `http://localhost:5173/thara-app/`

### Production build and preview
```bash
npm run build
npm run preview
```

### Running without Supabase
If Supabase env vars are not set, the app still runs:
- Products start from the bundled dataset in [products-data.json](file:///d:/ahmed/TharaApp/src/data/products-data.json) via [mockData.js](file:///d:/ahmed/TharaApp/src/data/mockData.js).
- Orders/chat/products changes persist locally (localStorage + IndexedDB), but won’t sync between devices.

### Setting up Supabase schema (recommended)
- Run [schema.sql](file:///d:/ahmed/TharaApp/src/supabase/schema.sql) in Supabase SQL Editor to create tables, RLS policies, and the secure order RPC (`create_order_secure`).
- (Optional) Apply [security-migration.sql](file:///d:/ahmed/TharaApp/src/supabase/security-migration.sql) if your deployment process uses a separate migration step.

---

## 11) Deployment (GitHub Pages)

The GitHub Action builds and publishes `dist/` to the `gh-pages` branch: [deploy.yml](file:///d:/ahmed/TharaApp/.github/workflows/deploy.yml#L1-L30).
- Build uses Supabase credentials from GitHub Secrets: [deploy.yml](file:///d:/ahmed/TharaApp/.github/workflows/deploy.yml#L20-L23)
- `vite.config.js` base path (`/thara-app/`) is required for correct routing and asset links: [vite.config.js](file:///d:/ahmed/TharaApp/vite.config.js#L4-L6)

---

## 12) Repository Map

### Root
- [index.html](file:///d:/ahmed/TharaApp/index.html): HTML entry; sets RTL; links manifest/icons; includes Leaflet CSS CDN.
- [vite.config.js](file:///d:/ahmed/TharaApp/vite.config.js): base path and build chunk splitting.
- [package.json](file:///d:/ahmed/TharaApp/package.json): scripts and dependencies.
- [AGENTS.md](file:///d:/ahmed/TharaApp/AGENTS.md): repository guidelines (project overview, commands, structure).

### src/
- [main.jsx](file:///d:/ahmed/TharaApp/src/main.jsx): React mount, service worker register, route definitions, admin guard.
- [App.jsx](file:///d:/ahmed/TharaApp/src/App.jsx): customer UI + checkout + chat widget + Leaflet map.
- [Admin.jsx](file:///d:/ahmed/TharaApp/src/Admin.jsx): admin UI (orders/products/offers/chat/staff).
- [context/StoreContext.jsx](file:///d:/ahmed/TharaApp/src/context/StoreContext.jsx): state + business logic + Supabase integration + persistence.
- [supabase/](file:///d:/ahmed/TharaApp/src/supabase): Supabase client and domain APIs; schema/migrations.
- [components/](file:///d:/ahmed/TharaApp/src/components): reusable UI (install prompt, error boundary, staff manager).
- [pages/](file:///d:/ahmed/TharaApp/src/pages): login/register pages.
- [utils/storage.js](file:///d:/ahmed/TharaApp/src/utils/storage.js): IndexedDB wrapper used as secondary persistence.
- [data/](file:///d:/ahmed/TharaApp/src/data): bundled product/category dataset.

### public/
- [sw.js](file:///d:/ahmed/TharaApp/public/sw.js): service worker caching strategy.
- [manifest.json](file:///d:/ahmed/TharaApp/public/manifest.json): PWA manifest.
- Icons and logo used by UI and install prompt.

### scripts/
- [generate-sql.js](file:///d:/ahmed/TharaApp/scripts/generate-sql.js): regenerates the product seed section in `schema.sql` from `products-data.json`.
