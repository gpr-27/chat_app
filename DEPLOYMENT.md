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

- **MongoDB Atlas** — database. Create a free M0 cluster, a DB user, and allow
  Render's egress IPs (or `0.0.0.0/0` to start). Copy the `mongodb+srv://…` URI.
- **Cloudinary** — image/avatar uploads. Copy cloud name + API key + secret.
- **Clerk** — authentication. Copy the **Publishable** and **Secret** keys.
- A **GitHub** repo holding this code (Render deploys from GitHub).

---

## Deploy with the Blueprint

1. Push this repository to GitHub.
2. In the **Render Dashboard → New → Blueprint**, select the repo. Render reads
   `render.yaml` and shows the service.
3. Render prompts for the env vars marked `sync: false`. Fill them in:

   | Variable                     | Value                                             |
   | ---------------------------- | ------------------------------------------------- |
   | `MONGODB_URI`                | your Atlas connection string                      |
   | `CLERK_PUBLISHABLE_KEY`      | `pk_live_…` (or `pk_test_…`)                       |
   | `CLERK_SECRET_KEY`           | `sk_live_…` (optional but recommended)            |
   | `VITE_CLERK_PUBLISHABLE_KEY` | the **same** `pk_…` value (baked into the SPA)     |
   | `CLOUDINARY_CLOUD_NAME`      | from your Cloudinary dashboard                     |
   | `CLOUDINARY_API_KEY`         | from your Cloudinary dashboard                     |
   | `CLOUDINARY_API_SECRET`      | from your Cloudinary dashboard                     |

   `JWT_SECRET` is generated automatically. `NODE_ENV`, `PORT`, `CLIENT_URL`,
   and the same-origin `VITE_API_URL=/api` / `VITE_SOCKET_URL=/` are handled for
   you (`PORT` and `RENDER_EXTERNAL_URL` are injected by Render).

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
| `CLOUDINARY_CLOUD_NAME`      |    ✅    | —                                 |
| `CLOUDINARY_API_KEY`         |    ✅    | —                                 |
| `CLOUDINARY_API_SECRET`      |    ✅    | —                                 |
| `GUEST_RETENTION_DAYS`       |    ✅    | `30`                              |
| `LOG_LEVEL`                  |    ✅    | `info`                            |
| `VITE_APP_ENV`               |    ✅    | `production`                      |
| `VITE_API_URL`               |    ✅    | `/api` (same-origin)              |
| `VITE_SOCKET_URL`            |    ✅    | `/` (same-origin)                 |
| `VITE_CLERK_PUBLISHABLE_KEY` |    ✅    | same `pk_…` as the backend        |
| `VITE_STUN_URLS`             |    –     | free Google STUN if unset         |
| `VITE_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | – | free public TURN if unset |

> Changing a `VITE_*` value requires a **rebuild** (they're inlined into the SPA),
> so trigger a redeploy after editing them. Backend-only vars take effect on
> restart.

---

## Voice/video calls (TURN)

Calls are WebRTC peer-to-peer. Two peers on the same Wi-Fi connect with STUN
alone, but two phones on mobile data (or behind strict/symmetric NATs) need a
**TURN relay** to carry the media — otherwise the call "connects" but no audio or
video arrives.

Out of the box the app falls back to **free public STUN + TURN** servers, so calls
work with zero configuration. Those public relays are best-effort, though. For
production reliability, provision your own and set these on the Render service:

```
VITE_TURN_URL=turn:<your-host>:3478
VITE_TURN_USERNAME=<user>
VITE_TURN_CREDENTIAL=<secret>
```

A free [Metered Open Relay](https://www.metered.ca/tools/openrelay) API key or a
self-hosted [coturn](https://github.com/coturn/coturn) both work. When
`VITE_TURN_URL` is set it takes precedence over the free fallback. Redeploy after
changing it.

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
