# Wafi — Owner Dashboard

React 19 + Vite + Tailwind v4 + Three.js. Arabic, RTL, dark.

```bash
npm run dev     # http://localhost:5173
npm run build
```

## Sign-in

The app opens on a login screen (`src/pages/Login.tsx`) that calls `POST /login` on the Wafi API and keeps the
Sanctum token in `src/state/auth.ts` (localStorage with "remember me", otherwise sessionStorage). Every API call
sends it as a Bearer token; a `401` signs out, and the profile menu calls `POST /logout` to revoke it.

## Owner dashboard (default)

`src/owner/` is the real dashboard, built on the Owner Dashboard API (read-only apart from marking alerts read and editing SLA policies)
(`https://wafii.sa/wafiservices/api/v1`, proxied as `/api` in development; production builds call it directly unless `VITE_API_BASE` overrides it —
the API sends `Access-Control-Allow-Origin: *`).

| Page | Endpoint |
|---|---|
| النظرة العامة | `GET /dashboard/summary` (8 internal services + storefront `payments` shown separately), recent `/activity-feed`, 30-day net from `/dashboard/revenue` |
| سجل الطلبات | `GET /tickets` — service / status / date filters and paging in the URL, live SLA badge per row; row → details drawer (`GET /tickets/{service}/{id}` with `history` and `sla`, re-polled every 30s while open), `admin_url` opens in a new tab |
| التحليلات والإيرادات | `GET /dashboard/timeseries` (created / closed per bucket, Asia/Riyadh) and `GET /dashboard/revenue` (Moyasar ledger only) |
| طلبات الشراء | `GET /orders` — backed by `over_stage` (the only table with a value + company) |
| العملاء | `GET /customers?search=` directory, `GET /customers/{phone}` full history |
| التنبيهات | `GET /notifications`, `POST /notifications/read` — also the topbar bell (polled every 60s) |
| سجل النشاط | `GET /activity-feed` — every service but warranty logs; payments entries are Moyasar, not staff |
| الموظفون | `GET /staff/online` (heartbeat-based, polled every 20s), `GET /staff`; row → `GET /staff/{id}/stats` drawer |
| الإعدادات | `GET /sla-policies`, `PUT /sla-policies` (save clears the cached tickets and alerts) |

- Null fields (`assigned_to`, `created_by`, `status`, `last_activity`, `admin_url`, phone) render as
  "غير متتبَّع" / "بدون حالة" etc., using what each service can report (`src/owner/services.ts`). Nothing is filled in.
- Rate limits: authenticated calls queue client-side at 100/min (server: 120); responses are cached 20 s and
  shared; auto-refresh runs only on a visible tab: overview / feed / bell 60 s, staff 120 s, who-is-online 20 s, an open ticket drawer 30 s. Realtime push (Reverb) is not available on the current host, so everything polls.
  Login honours `Retry-After` after a 429 (10/min per IP).

## Demo command center

`VITE_DATA_SOURCE=mock` replaces the owner dashboard with the earlier offline command center (`src/DemoApp.tsx`,
seeded simulation in `src/services/mock/`, labelled "بيانات تجريبية" throughout). It still requires sign-in and
never touches real data.

## Layout

```
src/
  owner/       real dashboard: API client, router, shell, pages, ticket drawer
  pages/Login.tsx, state/auth.ts, services/api/httpClient.ts   sign-in, token, rate limit
  DemoApp.tsx + domain/ services/mock/ state/ analytics/ layout/ panels/ pages/   demo command center
  charts/ three/ ui/   shared
```

## Component registries (shadcn / Animate UI)

`components.json` registers `@animate-ui` for the shadcn CLI; `@/` maps to `src/` and `cn()` lives in
`src/lib/utils.ts`. Add components with `npx shadcn@latest add @animate-ui/<name>`.

Icons are Animate UI (Lucide) components in `src/components/animate-ui/icons/`, built on `motion` +
`@animate-ui/react`. Use them through `<Icon name="…">` — `src/ui/Icon.tsx` maps the dashboard's
names to them, so a new icon goes into that map. Icons animate on their own hover, or when wrapped in
`<AnimateIcon animateOnHover asChild>` (nav links, KPI cards, buttons). `AnimateUIProvider` in `App.tsx`
ties them to the effects setting: "off" stops them, "auto" follows the OS reduce-motion setting.

The dashboard's colours are `@theme` tokens in `src/index.css`, not shadcn's `--background`/`--primary`
variables, so restyle any other added components to those tokens (`bg-surface`, `text-ink`,
`border-line`, `text-accent`).

## Change highlight & avatar groups

- `useChanged(value, resetKey)` / `<Changed>` (`src/ui/`) outline a number for ~3 s when the data behind it
  changes (KPI cards, stats, workflow strip, order tiles, nav badges, bell). Changing `resetKey` (date range,
  filters, selected record) re-baselines silently so only real data changes light up.
- `<TeamAvatars>` wraps Animate UI's Avatar Group (`src/components/animate-ui/components/animate/avatar-group.tsx`,
  needs `@floating-ui/react`): online staff on the overview, members per department, and the team that served
  a customer. Each avatar lifts on hover, shows a tooltip, and opens the employee panel.
