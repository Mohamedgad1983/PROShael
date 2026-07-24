# JWT → httpOnly cookie migration (admin + PWA)

## Why
The web clients store the JWT in `localStorage` (`admin/src/services/api.js`,
`mobile/src/utils/api.js`), so any injected script (XSS) can read and exfiltrate
it. Moving the token into an **httpOnly** cookie makes it unreadable from JS.

This is a **coordinated backend + frontend cutover** and MUST be tested on a
Cloudflare Pages preview deploy before it reaches production — a mistake here
locks every admin/member out. It is deliberately **not** applied as part of the
automated hardening because it cannot be safely verified without a browser test.

## What already exists
- `alshuail-backend/src/middleware/cookie-auth.js` — `setAuthCookie`,
  `clearAuthCookie`, `extractToken` (cookie first, then `Bearer`).
- `src/routes/auth.js` already calls `setAuthCookie` on `/login` and
  `/biometric-login`, and `clearAuthCookie` on logout.
- `cookie-parser` is mounted in `server.js`.

## The gap
- The main `authenticate` middleware (`src/middleware/auth.js`) reads **only**
  the `Authorization` header — it ignores the cookie, so the cookie set at login
  is never honored.
- `src/routes/passwordAuth.routes.js` `/login` (and OTP verify) do **not** set
  the cookie.
- The frontends do not send credentials and read the token from `localStorage`.

## Key facts that make this feasible
- `alshailfund.com` (admin) and `api.alshailfund.com` (API) share the same
  registrable domain, so they are **same-site** — the existing
  `SameSite=Strict` cookie WILL be sent on credentialed XHR/fetch from the admin
  to the API. No `SameSite=None` is required. (The PWA at `app.alshailfund.com`
  is likewise same-site.)
- Mobile apps (iOS/Flutter) use `Bearer` and cannot use cookies. The backend
  must therefore keep accepting **both** — `extractToken` already does
  (cookie first, header fallback), so mobile is unaffected.

## Steps

### 1. Backend (backward-compatible, deploy first, verify nothing breaks)
1. In `src/middleware/auth.js` `authenticate`, take the token from a
   header-first, cookie-fallback source so existing Bearer clients are
   byte-identical and cookie clients start working:
   ```js
   const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies && req.cookies.auth_token);
   ```
2. Call `setAuthCookie(res, token)` in `passwordAuth.controller` login / OTP
   verify / face-id responses (auth.js already does this).
3. Keep returning the token in the JSON body too for now (mobile still needs it).
Deploy and confirm: existing header-based auth still returns 200; `/login`
responses now include a `Set-Cookie: auth_token=…; HttpOnly` header.

### 2. Frontend (the actual cutover — test on a preview first)
1. Admin (`src/services/api.js`, `AuthContext`, `RouteGuard`, `websocket`) and
   PWA (`src/utils/api.js`, `authService`): set `withCredentials: true` (axios)
   / `credentials: 'include'` (fetch/WebSocket) on all API calls.
2. Stop persisting the JWT in `localStorage`; rely on the cookie. Keep any
   non-secret UI state (role, name) if needed, but never the token.
3. Logout calls the backend logout route (clears the cookie) instead of just
   removing a `localStorage` key.
4. CORS already sets `Access-Control-Allow-Credentials: true` with a specific
   origin — verify it stays specific (never `*`) once credentials are on.

### 3. Verify on a Cloudflare preview deploy
- Log in → confirm `auth_token` cookie is set `HttpOnly; Secure; SameSite=Strict`
  and that no token is written to `localStorage`.
- Navigate protected pages, refresh, and log out; confirm the cookie is cleared.
- Confirm iOS/Flutter (Bearer) still authenticate unchanged.
- Only then merge to `main`.

## Defense-in-depth (independent of the cutover)
Add a Content-Security-Policy to the served HTML (Cloudflare Pages
`public/_headers` for admin, nginx for the PWA) to reduce XSS in the first place.
Start report-only, then enforce `script-src 'self'` once inline scripts are
accounted for.
