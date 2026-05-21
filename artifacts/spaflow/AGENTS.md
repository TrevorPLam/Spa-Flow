# artifacts/spaflow — Frontend

- **Router:** Wouter — use `useLocation`, `useRoute`, `useParams` from `wouter`. `react‑router‑dom` is **not installed**; do not import it.
- **React version:** 19.1.0 (exact pin in pnpm catalog) — some React 18 patterns differ.
- **API:** only auto‑generated client (`api-client-react`); no raw `fetch`.
- **Data:** TanStack Query (stale 30s, retry 1). Dashboard/occupancy refetch 30s.
- **Auth:** access token HttpOnly cookie (`spaflow_session`); refresh token in `localStorage` key `spaflow_refresh_token`. Global fetch interceptor patches `window.fetch` for 401 → refresh (mutex dedup, exponential backoff max 30s). Never bypass interceptor.
- **Components:** Radix UI + Tailwind; new in `src/components/`.
- **Charts:** Recharts (`reports.tsx` only) — do not introduce a second charting library.
- **Mockups:** use `artifacts/mockup-sandbox` (no production impact).
- **Testing:** MSW for API mocking (`src/test/mocks/handlers/`). E2E Page Objects in `tests/e2e/pages/`. Visual thresholds: `maxDiffPixels:100`, `maxDiffPixelRatio:0.01`, `threshold:0.2`. Update baselines with `--update-snapshots`.
- **Build:** Vite with `@replit/vite-plugin-runtime-error-modal` — do not remove.
- **Security:** no secrets, no `dangerouslySetInnerHTML` (use DOMPurify + innerHTML or `html‑react‑parser` if sanitized HTML is unavoidable). CSP from backend — don't override.
- **Password forms:** enforce NIST SP 800‑63B Rev 4 — min 15 chars, max 64, no composition rules.
