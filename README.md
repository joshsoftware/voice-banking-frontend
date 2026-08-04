# Voice Banking Frontend

## 1. Project Overview

Voice Banking is a mobile-first React frontend for a voice-enabled banking experience. It lets customers authenticate with OTP, choose a preferred language, enroll a voiceprint, and interact with a realtime banking assistant through WebRTC.

The application is optimized for a mobile banking flow while still running as a normal web app. It includes a device-style app shell, protected onboarding routes, voice registration, a realtime listening assistant, feedback capture, admin feedback review, PWA support, and Dockerized production deployment.

### Core Capabilities

- OTP-based login with access and refresh tokens.
- Protected onboarding for language selection and voice registration.
- Realtime voice assistant powered by Pipecat over WebRTC.
- Hold-to-speak microphone interaction with bot audio playback.
- Voiceprint enrollment and verification support.
- Account, transaction, loan, transfer, and OTP interaction surfaces.
- Multilingual UI and voice prompts.
- Feedback submission and admin feedback review.
- PWA service worker with offline fallback and sensitive-route cache exclusions.
- Production build served by Nginx in Docker.

## 2. Technology Stack

| Area | Technology |
| --- | --- |
| Framework | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 with CSS design tokens |
| Routing | React Router DOM |
| Realtime voice | `@pipecat-ai/client-js` with custom `SmallWebRTCTransport` |
| Pipecat transport | `@pipecat-ai/small-webrtc-transport` |
| State/context | React context providers |
| Utility libraries | `clsx`, `tailwind-merge` |
| Linting | ESLint |
| Deployment | Docker multi-stage build with Nginx |

 
### Session Behavior

The auth provider:

- Loads tokens from `localStorage` on mount.
- Syncs auth state when tokens change across browser tabs.
- Detects token clearing when the tab becomes visible again.
- Clears active customer data on logout.
- Clears session-scoped language state.
- Removes per-session chat histories during logout.
- Registers a global session invalidation handler with the HTTP client.

The HTTP client:

- Adds `Authorization: Bearer <token>` to requests when an access token exists.
- Attempts token refresh on `401`, unless the failed call was already `/auth/refresh`.
- Clears tokens and redirects to `/welcome` when refresh fails.
- Calls the registered invalidation handler when the backend returns `Session expired or invalidated`.

## 3. Customer Data and Demo Routing

Primary files:

- `src/lib/customerData.ts`
- `src/lib/demoCustomer.ts`
- `src/lib/esbCustomer.ts`

The customer layer routes between two customer data sources:

- Bandhan ESB fixtures for mapped phone numbers.
- Mock-bank demo customers for all other numbers.

`src/lib/customerData.ts` is the unified access layer. It exposes helpers for:

- Finding a customer by phone number.
- Setting and clearing the active customer.
- Reading account and loan data.
- Checking and updating voice registration status.
- Allowing or disallowing voice registration skip.

The auth login flow updates legacy/demo customer state after OTP verification so older UI components can continue reading the active customer.


## 4. Realtime Voice Assistant

### Connection Flow

1. `Listening` mounts and calls `connect()`.
2. `useSmallWebRTC` creates a `CustomSmallWebRTCTransport`.
3. The frontend calls `/start` manually to capture the backend session ID and ICE config.
4. The Pipecat client connects using `/sessions/{sessionId}/api/offer`.
5. The custom transport creates an SDP offer, waits for ICE gathering, and posts the offer.
6. The backend returns an SDP answer.
7. The client enters the listening state after `connected` and `botReady` events.

### Custom WebRTC Transport

`src/lib/customTransport.ts` extends `SmallWebRTCTransport` to avoid repeated offer loops and unsupported trickle ICE behavior.

Key behavior:

- Waits for ICE gathering before sending the offer.
- Resolves ICE wait after 8 seconds to avoid hanging forever.
- Embeds ICE candidates directly in SDP.
- Skips redundant negotiations.
- Disables trickle ICE candidate PATCH calls by making `sendIceCandidate` a no-op.
- Handles peer connection closure during negotiation gracefully.

### Push-to-Talk Behavior

The listening experience uses hold-to-speak:

- The bot connects with the microphone disabled.
- Holding the mic button enables local mic capture.
- Releasing the button disables local mic capture and moves the UI into processing.
- A short beep is played when mic capture starts.
- Holding the mic while the bot is speaking interrupts local bot playback.
- A no-sound timer warns the user if no voice is detected.

### Chat and Structured Responses

Chat state is persisted per auth session and customer:

`voicebank.chatHistory:{authSessionId}:{customerId}`

The assistant supports both prose and structured server events. Transaction and loan statement responses can be displayed as formatted tables when the backend emits a `TRANSACTION_LIST` signal or when recognizable transaction prose is parsed.

## 5. Voice Registration Flow

### User Flow

1. User sees a consent screen explaining voice registration.
2. User grants consent and microphone access.
3. The app selects a random image challenge set.
4. For each image, the user records a spoken description.
5. The app submits each completed step to the enrollment backend.
6. On successful enrollment, the app marks the customer voice as registered.
7. User continues to the realtime listening assistant.

### Enrollment State

The registration page tracks:

- Consent state.
- Enrollment session ID.
- Realtime WebRTC session ID.
- Peer connection and PC ID.
- Selected image challenge list.
- Current image index.
- Countdown and recording progress.
- Mic availability and voice activity.
- Enrollment errors and retry state.

## 6. Localization

### Supported Languages

| Code | Language |
| --- | --- |
| `en` | English |
| `hi` | Hindi |
| `ta` | Tamil |
| `kn` | Kannada |
| `te` | Telugu |
| `ml` | Malayalam |
| `bn` | Bengali |
| `mr` | Marathi |
| `gu` | Gujarati |

### Language Resolution

The language provider resolves language in this order for authenticated sessions:

1. Backend/session preferred language.
2. Per-phone stored language.
3. Default language, `en`.

Logged-out users default to English.

## 7. PWA Implementation

### Registration

The service worker is registered only in production:

```ts
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
```

### Service Worker Strategy

`public/sw.js` defines:

- Static cache: `voicebank-static-v2`
- Runtime cache: `voicebank-runtime-v2`
- Offline fallback: `/offline.html`

Precached shell URLs:

- `/`
- `/index.html`
- `/offline.html`
- `/manifest.webmanifest`
- `/favicon.svg`

Network-only patterns are used for sensitive or realtime endpoints:

- `/start`
- `/sessions`
- `/api`
- `/voiceprint`
- `/verify`
- `/enrollment`
- `/auth`
- `/otp`

Navigation requests use network-first behavior with cached shell/offline fallback. Hashed JS/CSS assets under `/assets/` use cache-first behavior. Other same-origin static assets use stale-while-revalidate.


## 8. Environment Variables

Environment variables are read through Vite, so runtime browser values must be available at build time unless the app is changed to load runtime config.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE` | WebRTC/Pipecat session backend. |
| `VITE_AUTH_API_BASE` | Auth backend for OTP, tokens, logout, and language. |
| `VITE_VOICEPRINT_API_BASE` | Voiceprint and enrollment backend. |
| `VITE_JAVA_API_BASE` | Java banking API base used by frontend constants. |
| `VITE_JAVA_BACKEND` | Vite dev proxy target for `/api/v1`. |
| `VITE_ADMIN_USERNAME` | Admin login username. |
| `VITE_ADMIN_PASSWORD` | Admin login password. |

Do not commit secrets or production credentials in `.env`.

## 9. Build, Run, and Deployment

### Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run lint checks:

```bash
npm run lint
```

### Docker Build

The `Dockerfile` uses two stages:

1. Node 20 Alpine builder installs dependencies and runs `npm run build`.
2. Nginx 1.27 Alpine serves the compiled `dist` directory.

Build manually:

```bash
docker build -t voice-banking-frontend:1.0.0 .
```

Run manually:

```bash
docker run --rm -p 8085:80 voice-banking-frontend:1.0.0
```

### Docker Compose

`docker-compose.yml` builds the frontend image and exposes it on port `8085`.

```bash
docker compose up --build
```

### Nginx Behavior

`nginx.conf`:

- Serves static files from `/usr/share/nginx/html`.
- Uses `try_files $uri $uri/ /index.html` for React Router SPA fallback.
- Caches `/assets/` files for one year with immutable cache headers.

## 10. Security and Privacy Notes

- Voice, auth, session, and API endpoints are excluded from service worker caching.
- Access and refresh tokens are stored in `localStorage`; this is simple for a frontend demo but increases exposure to XSS compared with HttpOnly cookies.
- Voice registration requires explicit consent before the image challenge begins.
- Mic access is requested through browser permission prompts.
- Local media tracks are stopped during disconnect, registration cleanup, and unmount.
- Cross-tab token changes trigger logout/sync behavior.
- Backend `401` and session invalidation responses clear tokens and redirect to `/welcome`.
- Admin login is frontend credential based through Vite env variables and sessionStorage; it should not be treated as strong production-grade authorization by itself.

## 11. Operational Checklist

Before running a new environment:

- Set `VITE_API_BASE`, `VITE_AUTH_API_BASE`, and `VITE_VOICEPRINT_API_BASE`.
- Set Java backend values if `/api/v1` routes are used.
- Confirm backend supports `/start` and `/sessions/{id}/api/offer`.
- Confirm enrollment backend supports `/enrollment/start` or compatible `/start` behavior.
- Confirm `/manifest.webmanifest`, `/offline.html`, `/favicon.svg`, and service worker assets are available in the production build.
- Serve over HTTPS for microphone, service worker, and PWA behavior outside localhost.
- Verify mobile browser microphone permissions and autoplay behavior.
- Run `npm run build` before shipping.