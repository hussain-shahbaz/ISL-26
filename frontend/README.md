# ExamPro — Frontend

The web client for the Secure Online Examination System. A single-page React
application that talks to the platform exclusively through the API gateway.

## Stack

- **React 19 + TypeScript** — strict, type-checked UI
- **Vite** — dev server and production bundler (code-split, lazy routes)
- **Tailwind CSS v4** — design tokens, dual light/dark theme
- **Framer Motion** — scroll reveals, page transitions, micro-interactions
- **TanStack Query** — server-state cache, retries, invalidation
- **Zustand** — local auth/session and toast state (persisted)
- **React Router** — routing with role-aware guards
- **Axios** — API client with token refresh interceptors

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173
```

The API base URL defaults to `/api` (`src/lib/api.ts`). In development the Vite
dev server proxies `/api` to the gateway on `:3000` (see `vite.config.ts`), so no
CORS setup or env file is needed locally. In the Docker build the app is served
as static assets by Nginx, which reverse-proxies `/api` to the gateway — again
same-origin. Override the base only if you need to, by setting `VITE_API_BASE_URL`
at build time.

## Scripts

| Command            | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start the Vite dev server with HMR       |
| `npm run build`    | Type-check (`tsc`) then build to `dist/` |
| `npm run preview`  | Preview the production build locally     |
| `npm run lint`     | Run ESLint                               |

## Structure

```text
src/
├── components/        # Shared UI: ui/ primitives, app shell, brand, forms
├── features/          # Domain modules (auth, exams, admin, risk)
│   └── <feature>/     #   api.ts + feature-local components/hooks
├── pages/             # Route screens (landing, auth/, app/)
├── lib/               # api client, theme, utils
├── store/             # Zustand stores (auth, toast)
├── types.ts           # Shared domain types
└── App.tsx            # Lazy-loaded route tree
```

### Conventions

- All network calls live in a feature's `api.ts` — components never call Axios
  directly. Data is consumed through TanStack Query hooks.
- Everything talks to the gateway through the shared `api` client (`src/lib/api.ts`);
  the base URL is `/api` by default and overridable via `VITE_API_BASE_URL`.
- UI primitives in `components/ui` are the only place raw styling lives;
  compose them rather than re-styling.

## Proctoring

The exam runner (`pages/app/ExamRunner.tsx`) enforces a server-driven secure
timer and a client-side integrity monitor (`features/exams/useProctoring.ts`)
that detects tab switches, focus loss, fullscreen exits, clipboard use and
restricted shortcuts. Repeated violations auto-submit the attempt.
