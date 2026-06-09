# Repository Guidelines

## Getting Started on a New Machine
1. **Clone**: `git clone https://github.com/kamlali9990-ui/thara-app.git`
2. **Install deps**: `npm install` (includes Supabase CLI as devDependency)
3. **.env file**: Copy `.env.example` to `.env` (already has correct values)
4. **Supabase login** (one-time per machine):
   - Create a PAT at `https://supabase.com/dashboard/account/tokens`
   - `set SUPABASE_ACCESS_TOKEN=sbp_your_token`
   - `npm run supabase:login`
   - `npm run supabase:link`
5. **Run**: `npm run dev`

> Save your Supabase PAT in a **password manager** (Bitwarden, etc.) — you'll need it on every new machine.

## Project Overview
**Thara Al-Sharq One Markets (أسواق ثرا الشرق ون)** is a Progressive Web App (PWA) designed for supermarket delivery services in Khafji. It features a customer-facing interface, an admin panel, and integration with Supabase for data management and Leaflet for location services.

## Project Structure & Module Organization
- **`.\src\main.jsx`**: Application entry point. Handles Service Worker registration, routing configuration, and global providers.
- **`.\src\App.jsx`**: Main customer-facing application logic, including tab navigation (Home, Orders, Account) and cart management.
- **`.\src\Admin.jsx`**: Admin dashboard implementation for managing orders, products, and staff roles.
- **`.\src\components\`**: Reusable UI components (e.g., `.\src\components\InstallPrompt.jsx`, `.\src\components\ErrorBoundary.jsx`).
- **`.\src\context\StoreContext.jsx`**: Centralized state management using React Context API for products, cart, user authentication, and orders.
- **`.\src\supabase\`**: Supabase client configuration and database interaction logic.
- **`.\src\data\mockData.js`**: Fallback and initial data structures for products and categories.
- **`.\public\`**: Static assets and PWA-specific files like `.\public\sw.js` and `.\public\manifest.json`.

## Build, Test, and Development Commands
- **Development**: `npm run dev` (Starts Vite dev server)
- **Production Build**: `npm run build` (Outputs to `dist/`)
- **Preview Build**: `npm run preview` (Locally preview production build)
- **Run tests**: `npm test` (Vitest, single run)
- **Watch tests**: `npm run test:watch` (Vitest, watch mode)
- **Setup on new machine**: `npm run setup` (Installs deps + links Supabase project)
- **Supabase CLI** (via npx, no global install needed):
  - `npm run supabase:login` — Login with PAT (set `SUPABASE_ACCESS_TOKEN` env var first)
  - `npm run supabase:link` — Link to remote project
  - `npm run supabase:query` — Run SQL against remote DB
- **Deploy Edge Functions**: `npx supabase functions deploy cloudinary-sign` (after login + link)
- **Scripts**: `node scripts\generate-sql.js` (Utility for generating SQL migrations)

## Coding Style & Naming Conventions
- **Framework**: React 18 with Vite. Uses Functional Components and Hooks.
- **Language**: JavaScript (ES Modules).
- **Styling**: Vanilla CSS in `.\src\index.css`. RTL (Right-to-Left) is enforced via `dir="rtl"` in `.\index.html`.
- **Optimization**: Vite manual chunking is configured for `supabase`, `leaflet`, and `vendor` libraries in `.\vite.config.js`.
- **PWA**: Strict adherence to PWA standards for offline support and installation prompts.

## Deployment & Environments
- **Base URL**: The application is configured to run under `/thara-app/` base path.
- **CI/CD**: GitHub Actions workflow defined in `.\.github\workflows\deploy.yml`.

## DB Maintenance
- **Apply pending migrations**: `npx supabase db push`
  - If version conflicts occur, use `npx supabase migration repair --status applied <version>` first
  - Or: copy `scripts/apply-targeted-migration.sql` into Supabase Dashboard > SQL Editor
- **Health check**: `node scripts/health-check.mjs`
- **Supabase Dashboard**: https://supabase.com/dashboard/project/oqwphazzuxmrxwbnothk

## Commit & Pull Request Guidelines
- **Language**: Commit messages are primarily in Arabic.
- **Conventions**: Messages often start with functional descriptions (e.g., "إصلاح" for Fix, "إضافة" for Add, "تحسين" for Improve).
- **Branching**: Direct commits to the main branch appear common for feature updates and fixes.
