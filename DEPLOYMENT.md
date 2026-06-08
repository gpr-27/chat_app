# Deployment guide (Render)

This app deploys as **one Render web service**. The Express + Socket.IO backend
serves the built React SPA from `frontend/dist`, so the UI, the REST API, and the
realtime / WebRTC-signaling layer all run on a **single origin** over HTTPS
(which voice/video calls require for camera + microphone access).

The repo ships a [`render.yaml`](./render.yaml) Blueprint that describes the whole
service, so deployment is mostly filling in secrets.

---

## Architecture

```
                ┌──────────────────────────────────────────────┐
   Browser ───▶ │  Render web service  (https://<app>.onrender.com)
   (SPA + WS)   │                                              │
                │   node backend/src/index.js                  │
                │     ├── GET /api/*        → REST API          │
                │     ├── /socket.io        → realtime + calls  │
                │     └── *                 → frontend/dist SPA │
                └───────────────────┬──────────────────────────┘
                                    │
                          MongoDB Atlas (external)
                          Cloudinary, Clerk (external)
```

WebRTC media (audio/video) is **peer-to-peer** and does not flow through the
server — the server only relays SDP/ICE. Cross-network calls additionally need a
TURN relay (see [Voice/video calls](#voicevideo-calls-turn)).

---

## Prerequisites

External services (all have free tiers):

- **MongoDB Atlas** — database (**required**). Create a free M0 cluster, a DB
  user, and allow Render's egress IPs (or `0.0.0.0/0` to start). Copy the
  `mongodb+srv://…` URI.
- **Clerk** — authentication (**required**). Copy the **Publishable** key
  (`pk_test_…` works for testing); the Secret key is optional.
- **Cloudinary** — image/avatar uploads (**optional**). Copy cloud name + API key
  + secret. If you skip it, the app boots and runs text-only.
- **ExpressTURN** — free TURN relay for cross-network calls (**optional**, free
  1 TB/mo). See [Voice/video calls](#voicevideo-calls-turn).
- A **GitHub** repo holding this code (Render deploys from GitHub).

---

## Deploy with the Blueprint

1. Push this repository to GitHub.
2. In the **Render Dashboard → New → Blueprint**, select the repo. Render reads
   `render.yaml` and shows the service.
3. Render prompts for the env vars marked `sync: false`. Fill them in:

   | Variable                     | Required | Value                                         |
   | ---------------------------- | :------: | --------------------------------------------- |
   | `MONGODB_URI`                |    ✅    | your Atlas connection string                  |
   | `CLERK_PUBLISHABLE_KEY`      |    ✅    | `pk_test_…` (or `pk_live_…`)                   |
   | `VITE_CLERK_PUBLISHABLE_KEY` |    ✅    | the **same** `pk_…` value (baked into the SPA) |
   | `CLERK_SECRET_KEY`           |    –     | `sk_…` (only for Clerk Backend API calls)     |
   | `CLOUDINARY_CLOUD_NAME`      |    –     | enables image upload (text-only if unset)     |
   | `CLOUDINARY_API_KEY`         |    –     | "                                             |
   | `CLOUDINARY_API_SECRET`      |    –     | "                                             |
   | `VITE_TURN_USERNAME`         |    –     | ExpressTURN user (cross-network calls)        |
   | `VITE_TURN_CREDENTIAL`       |    –     | ExpressTURN password                          |

   `JWT_SECRET` is generated automatically. `NODE_ENV`, `PORT`, `CLIENT_URL`,
   and the same-origin `VITE_API_URL=/api` / `VITE_SOCKET_URL=/` are handled for
   you (`PORT` and `RENDER_EXTERNAL_URL` are injected by Render). Optional vars
   left blank simply disable their feature — the service still boots.

   > Tip: instead of typing each one, open **render-upload.env** (generated in the
   > repo root, gitignored), fill in the 3 required values, and paste the whole
   > file into the dashboard's **Environment → "Add from .env"**.

4. Click **Apply**. Render runs the build, then the start command, then health-
   checks `GET /api/health`. The first build takes a few minutes.

That's it — open the service URL.

### What Render runs

| Step         | Command           | Notes                                                                        |
| ------------ | ----------------- | ---------------------------------------------------------------------------- |
| Build        | `npm run build`   | installs root + backend + frontend deps, builds the SPA into `frontend/dist` |
| Start        | `npm start`       | `node backend/src/index.js` — serves API + SPA                               |
| Health check | `GET /api/health` | returns `200` when MongoDB is connected                                      |

Vite reads the `VITE_*` variables from the build environment, so the SPA is
compiled with your same-origin API/socket paths and Clerk key.

---

## Environment variables

All backend + frontend config. On Render you set these on the service (the
Blueprint pre-fills the non-secret ones); locally they live in the root `.env`
(see [`.env.example`](./.env.example)).

| Variable                     | Required | Example / default                 |
| ---------------------------- | :------: | --------------------------------- |
| `NODE_ENV`                   |    ✅    | `production`                      |
| `PORT`                       |   auto   | injected by Render                |
| `CLIENT_URL`                 |   auto   | defaults to `RENDER_EXTERNAL_URL` |
| `MONGODB_URI`                |    ✅    | `mongodb+srv://…`                 |
| `JWT_SECRET`                 |    ✅    | generated by Render               |
| `CLERK_PUBLISHABLE_KEY`      |    ✅    | `pk_live_…`                       |
| `CLERK_SECRET_KEY`           |    –     | `sk_live_…`                       |
| `CLOUDINARY_CLOUD_NAME`      |    –     | enables image upload if all 3 set |
| `CLOUDINARY_API_KEY`         |    –     | —                                 |
| `CLOUDINARY_API_SECRET`      |    –     | —                                 |
| `GUEST_RETENTION_DAYS`       |    ✅    | `30`                              |
| `LOG_LEVEL`                  |    ✅    | `info`                            |
| `VITE_APP_ENV`               |    ✅    | `production`                      |
| `VITE_API_URL`               |    ✅    | `/api` (same-origin)              |
| `VITE_SOCKET_URL`            |    ✅    | `/` (same-origin)                 |
| `VITE_CLERK_PUBLISHABLE_KEY` |    ✅    | same `pk_…` as the backend        |
| `VITE_STUN_URLS`             |    –     | free Google/Cloudflare STUN if unset |
| `VITE_TURN_USERNAME` / `_CREDENTIAL` | – | ExpressTURN creds for cross-network calls |
| `VITE_TURN_URL`              |    –     | override relay URLs (defaults to ExpressTURN) |

> Changing a `VITE_*` value requires a **rebuild** (they're inlined into the SPA),
> so trigger a redeploy after editing them. Backend-only vars take effect on
> restart.

---

## Voice/video calls (TURN)

Calls are WebRTC peer-to-peer. Two peers on the **same network** connect with the
built-in free STUN servers alone. But two phones on mobile data (or behind
strict/symmetric NATs) need a **TURN relay** to carry the media — otherwise the
call "connects" but no audio or video arrives.

> ⚠️ There is **no longer a reliable no-signup public TURN relay** — the old
> Metered "openrelayproject" credentials this app used to ship were retired and no
> longer authenticate, which silently broke cross-network calls. So you now enable
> TURN with your own (free) credentials.

**Recommended free TURN — ExpressTURN** (1 TB/month, static credentials, no card):

1. Sign up at **[expressturn.com](https://www.expressturn.com/)**.
2. Copy the dashboard **Username** and **Password**.
3. Set these on the Render service and redeploy:

   ```
   VITE_TURN_USERNAME=<your ExpressTURN username>
   VITE_TURN_CREDENTIAL=<your ExpressTURN password>
   ```

That's it — the app defaults the relay URLs to ExpressTURN over both UDP/TCP
(`turn:relay1.expressturn.com:3478`) and TLS/443
(`turns:relay1.expressturn.com:443?transport=tcp`, which punches through the
strictest mobile/corporate firewalls). To use your own relay instead, also set
`VITE_TURN_URL` (comma-separated URLs allowed) — it shares the username/credential
above.

Other options: **Cloudflare Realtime TURN** or **Twilio** (both need a small
backend endpoint to mint short-lived credentials), or a self-hosted
[coturn](https://github.com/coturn/coturn). Any `VITE_*` change needs a redeploy
(they're baked into the SPA).

**Do calls cost anything?** No. STUN is free, and ExpressTURN's free tier (1 TB/mo)
is far more than a test deployment will ever use. You only pay if you choose a paid
relay like Twilio.

---

## Custom domain

Render → your service → **Settings → Custom Domains** → add your domain and
follow the DNS instructions. TLS is provisioned automatically. No app change is
needed — `CLIENT_URL` follows `RENDER_EXTERNAL_URL`, and the SPA is same-origin.

---

## Operations

- **Logs** — Render dashboard → your service → **Logs** (live tail).
- **Manual deploy / rollback** — **Manual Deploy** → pick a commit, or roll back
  to a previous successful deploy.
- **Health** — `GET https://<app>.onrender.com/api/health` returns service +
  DB status.
- **Seeding sample users** — open the service **Shell** and run
  `node backend/src/seeds/user.seed.js`.

> **Free tier note:** free web services sleep after ~15 min of inactivity and
> cold-start on the next request (a few seconds). Open Socket.IO connections also
> drop when the instance sleeps. Upgrade to a paid instance type for always-on
> behaviour.

---

## Scaling and Socket.IO

A single instance needs no extra setup. If you scale to **multiple instances**,
Socket.IO needs a shared adapter (e.g. Redis) so events and the online-user map
are shared across instances, and you should enable session affinity. For this
app's scale, one instance is plenty — scale the instance type up before scaling
out.

---

## Troubleshooting

- **Build fails on `VITE_CLERK_PUBLISHABLE_KEY`** — set it on the service; the SPA
  can't build without it.
- **App starts but can't reach the DB** — check `MONGODB_URI` and that Atlas
  **Network Access** allows Render (try `0.0.0.0/0`), and the cluster isn't paused.
- **Calls connect but no audio/video** — TURN issue; see
  [Voice/video calls](#voicevideo-calls-turn).
- **CORS / socket errors** — only relevant if you set a custom `CLIENT_URL`; make
  sure it exactly matches the origin the browser loads.
