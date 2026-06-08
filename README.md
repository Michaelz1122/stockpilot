# StockPilot AI

Mobile-first ERP & inventory management for small/medium retail stores in Egypt. Built with Expo (React Native), TypeScript, Supabase, NativeWind, Zustand, React Hook Form + Zod, **i18next** for Arabic/English, full **RTL** support, and an AI assistant with a pluggable provider layer.

**Languages:** Arabic (default) + English. The first launch shows an onboarding language picker. Language can be changed any time from More → Settings. Switching languages that change layout direction triggers an `Updates.reloadAsync()` so the RTL flip applies immediately.

**Arabic search:** All product/customer/supplier search uses `normalizeArabic()` which folds alef/ya/hamza/ta-marbuta variants, strips tashkeel/tatweel, and normalizes Eastern Arabic digits. Queries like "مفتاح", "بريزه", "بريزة", or "مروحه غساله" all match consistently. The AI Assistant uses the same normalization for tool-driven lookups.

## Quick start

```bash
npm install
npx expo start
```

Open in **Expo Go**, an iOS Simulator, or an Android Emulator. The app is wired to a live Supabase project (URL + publishable key are baked into `app.json`). Sign up from the auth screen, create your first store, then optionally tap **More → Create demo store** to populate an Arabic sample store (مفتاح، بريزة، مروحة غسالة…).

## Supabase

The schema lives in [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) and is already deployed to project `umwqlcfctxatfuozbkpp`. Typed clients use [`src/lib/database.types.ts`](./src/lib/database.types.ts) (generated via `mcp__supabase__generate_typescript_types`). To redeploy elsewhere, run the migration through `supabase db push` or paste it into the SQL editor.

Schema highlights:

- **9 tables** with full RLS isolation per `auth.uid()` via the `app.is_store_owner()` security-definer helper
- **Transaction-based inventory** — current stock is always derived from `inventory_transactions`
- **Auto-triggers** on sales/purchase invoice items create matching `OUT`/`IN` inventory movements, compute `line_total`, and resync invoice header totals
- **4 views** (`v_product_stock`, `v_product_with_stock`, `v_customer_balance`, `v_supplier_balance`), all `security_invoker = true`
- **Arabic-tolerant search**: `normalize_arabic()` SQL function + GIN trigram indexes on generated `search_blob` columns; `search_products / customers / suppliers` RPCs accept queries in Arabic or English
- **Business RPCs**: `create_sale_invoice`, `create_purchase_invoice` (atomic, with permission checks), `dashboard_summary`, `sales_by_period`, `top_customers`, `low_stock`
- **`seed_demo_store()`** RPC creates a fully-populated Arabic Egyptian retail store (products, customers, suppliers, opening purchases, sample sales) owned by the calling user
- Extensions (`pg_trgm`, `unaccent`) live in the dedicated `extensions` schema
- Passes `get_advisors` with zero security warnings

## Architecture

```
app/                Expo Router screens
  (tabs)/           Dashboard, Products, Invoices, Contacts, More
  auth/             Sign in / sign up
  stores/           Store create
  products/         Detail + new
  customers/, suppliers/
  invoices/         New sale, new purchase, sale/[id], purchase/[id]
  inventory/        Stock movements + new movement
  reports/          Reports dashboard
  import/, export/  Excel wizards
  ai/               AI assistant

src/
  ai/               Pluggable provider abstraction + tools
    providers/      local, openai, openrouter
  components/       Reusable UI kit (Button, Card, Input, Select, ListItem, …)
  hooks/            useAsync, useActiveStore
  lib/              env, supabase client, types, validation, format, cache, local-db
  repositories/     Data access (Supabase + local fallback)
  services/         Reports + Excel import/export engine
  state/            Zustand stores (auth, active store)

supabase/migrations/ SQL
```

### Repository pattern

Every repository (`ProductsRepo`, `CustomersRepo`, etc.) transparently chooses between Supabase and a local AsyncStorage-backed store. The local backend is used in demo mode and provides offline fallback when Supabase is not configured.

### Inventory model

Stock is never stored as a direct value — `inventory_transactions` is the source of truth. The `v_product_stock` view aggregates it, and Postgres triggers create transactions automatically when invoice items are created or deleted. The local backend mirrors this behavior.

### AI provider abstraction

`src/ai/types.ts` defines `AIProvider`. Out of the box:

- `local` — offline rule-based provider (default, no API key required)
- `openai` — OpenAI Chat Completions API
- `openrouter` — OpenRouter (compatible with the same API)

To add a paid provider:

```ts
import { registerAIProvider } from '@/ai';
registerAIProvider('myco', myProvider);
```

Then set `EXPO_PUBLIC_AI_PROVIDER=myco`.

The assistant exposes business tools in `src/ai/tools.ts`: `find_product`, `find_customer`, `find_supplier`, `low_stock`, `top_customers`, `sales_today`, `dashboard_summary`. The OpenAI/OpenRouter provider implements full function-calling against them; the local provider uses keyword matching in Arabic and English.

### Excel engine

`src/services/excel.service.ts` provides a 5-step wizard:

1. Pick file (`expo-document-picker`)
2. Preview sheets
3. Map columns (auto-detected from English + Arabic aliases)
4. Validate
5. Import

Supported entities: products, customers, suppliers, inventory movements, price-list updates.

Exports re-use the same engine to produce `.xlsx` files via `expo-sharing`.

## Build

```bash
npx expo prebuild       # generate native projects (optional)
eas build -p android    # production builds
eas build -p ios
```
