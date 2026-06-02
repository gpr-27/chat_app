# Chatty — Realtime Messaging App

A full-stack realtime chat application built on the MERN stack. It features
JWT authentication, live one-to-one messaging over WebSockets, typing
indicators, read receipts, unread counts, image sharing, peer-to-peer
audio/video calls (WebRTC), online presence, and a polished **light + dark**
"Soft Pastel Glass" interface.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Features](#features)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Seeding sample users](#seeding-sample-users)
- [Running the app](#running-the-app)
- [Using the app](#using-the-app)
- [Theming (light / dark)](#theming-light--dark)
- [API reference](#api-reference)
- [Socket.IO events](#socketio-events)
- [Production build](#production-build)
- [Deployment (Render)](#deployment-render)
- [Troubleshooting](#troubleshooting)

---

## Tech stack

**Backend**
- Node.js + Express 4 (REST API)
- Socket.IO 4 (realtime messaging, presence, typing, read receipts, WebRTC signaling)
- MongoDB + Mongoose 8 (data store)
- JSON Web Tokens via `jsonwebtoken` (auth, stored in an httpOnly cookie)
- `bcryptjs` (password hashing)
- Cloudinary (image uploads for avatars and image messages)
- `cookie-parser`, `cors`, `dotenv`

**Frontend**
- React 18 + Vite 7
- Zustand 5 (state management)
- Tailwind CSS 3 + daisyUI 4 (styling and theming)
- React Router 6 (routing)
- Axios (HTTP), `socket.io-client` (realtime)
- `react-hot-toast` (notifications), `lucide-react` (icons)

---

## Features

- **Authentication** — sign up, log in, log out; passwords hashed with bcrypt; sessions held in a secure httpOnly JWT cookie.
- **Realtime 1:1 messaging** — messages appear instantly via Socket.IO; no refresh needed.
- **Typing indicators** — see when the other person is typing, live.
- **Read receipts** — single check = delivered, double check = seen.
- **Unread counts** — per-conversation unread badges that stay live even when the chat is closed.
- **Image messages** — attach an image (uploaded to Cloudinary) with a full-screen lightbox preview.
- **Emoji picker** — quick emoji insertion in the composer.
- **Message deletion** — delete your own messages (removed in realtime for the recipient too).
- **Online presence** — green dots and an "online" count; "Active now / Offline" status in the chat header.
- **Audio & video calls** — peer-to-peer WebRTC calls with mute, camera toggle, incoming-call modal, and a full-screen call overlay.
- **Smart sidebar** — contact search, "online only" filter, last-message previews, relative timestamps, sorted by most-recent conversation.
- **Profile** — update your avatar; view account details.
- **Light + dark themes** — animated toggle, persisted to `localStorage`, with a no-flash first paint that respects your OS preference.
- **Responsive** — mobile-friendly layout (sidebar/chat swap on small screens).

---

## Project structure

```
chat_app/
├── .env.example              # template for environment variables
├── package.json              # root scripts (dev, frontend, dev:both, build, start)
│
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app entry; mounts routes, serves frontend in prod
│       ├── controllers/
│       │   ├── auth.controller.js      # signup, login, logout, updateProfile, checkAuth
│       │   └── message.controller.js   # sidebar users, get/send/delete messages
│       ├── lib/
│       │   ├── db.js          # Mongoose connection
│       │   ├── socket.js      # Socket.IO server: presence, typing, read receipts, calls
│       │   ├── cloudinary.js  # Cloudinary config
│       │   └── utils.js       # generateToken (signs JWT, sets cookie)
│       ├── middleware/
│       │   └── auth.middleware.js      # protectRoute (verifies JWT cookie)
│       ├── models/
│       │   ├── user.model.js           # User schema + bcrypt hooks
│       │   └── message.model.js        # Message schema (text, image, seen)
│       ├── routes/
│       │   ├── auth.route.js
│       │   └── message.route.js
│       └── seeds/
│           └── user.seed.js            # inserts 15 sample users
│
└── frontend/
    ├── index.html            # includes the no-flash theme script
    ├── vite.config.js
    ├── tailwind.config.js    # daisyUI "pastel-glass" (light) + "pastel-night" (dark) themes
    └── src/
        ├── main.jsx
        ├── App.jsx           # routes, global socket subscriptions, theme init
        ├── index.css         # design system (CSS variables drive light/dark)
        ├── lib/
        │   ├── axios.js      # axios instance (baseURL + credentials)
        │   └── utils.js      # date/time formatting helpers
        ├── store/
        │   ├── useAuthStore.js     # auth state + socket connection
        │   ├── useChatStore.js     # messages, contacts, typing, read receipts
        │   ├── useCallStore.js     # WebRTC call state machine
        │   └── useThemeStore.js    # light/dark theme (persisted)
        ├── pages/
        │   ├── HomePage.jsx        # sidebar + chat shell
        │   ├── LoginPage.jsx
        │   ├── SignUpPage.jsx
        │   └── ProfilePage.jsx
        └── components/
            ├── auth/AuthImagePattern.jsx
            ├── call/CallOverlay.jsx, IncomingCallModal.jsx
            ├── chat/ChatContainer.jsx, ChatHeader.jsx, MessageInput.jsx,
            │        NoChatSelected.jsx, Sidebar.jsx
            ├── layout/Navbar.jsx, ThemeToggle.jsx
            └── skeletons/MessageSkeleton.jsx, SidebarSkeleton.jsx
```

---

## Prerequisites

- **Node.js 18+** and npm
- A **MongoDB** database — either:
  - a free **MongoDB Atlas** cluster (cloud), or
  - a **local MongoDB** instance (`mongodb://localhost:27017/chat_app`)
- A **Cloudinary** account (free tier is fine) — required for avatar and image-message uploads.

---

## Quick start

```bash
# 1. Clone and enter the project
cd chat_app

# 2. Create your environment file and fill in the values
cp .env.example .env
#   → edit .env: set MONGODB_URI, JWT_SECRET, and the three CLOUDINARY_* values

# 3. Install dependencies (root + backend + frontend) and build the frontend
npm run build

# 4. (Optional) seed sample users
node backend/src/seeds/user.seed.js

# 5. Start both servers in development
npm run dev:both
```

Then open **http://localhost:5173** in your browser.

> `npm run build` installs dependencies in the root, `backend/`, and `frontend/`,
> then produces a production frontend bundle. For development you only strictly
> need the dependencies installed — see [Running the app](#running-the-app).

---

## Environment variables

The backend loads `.env` from the **repo root**. Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable                 | Required | Example / notes                                                        |
| ------------------------ | -------- | ---------------------------------------------------------------------- |
| `PORT`                   | no       | `5001` — API/socket server port (default `5001`)                       |
| `NODE_ENV`               | no       | `development` keeps auth cookies non-secure for `http://localhost`     |
| `CLIENT_URL`             | yes\*    | `http://localhost:5173` — allowed CORS / Socket.IO origin (the frontend)|
| `MONGODB_URI`            | **yes**  | `mongodb://localhost:27017/chat_app` or your Atlas SRV string          |
| `JWT_SECRET`             | **yes**  | A long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLOUDINARY_CLOUD_NAME`  | **yes**  | from your Cloudinary dashboard                                         |
| `CLOUDINARY_API_KEY`     | **yes**  | from your Cloudinary dashboard                                         |
| `CLOUDINARY_API_SECRET`  | **yes**  | from your Cloudinary dashboard                                         |

\* `CLIENT_URL` defaults to `http://localhost:5173` if unset, but set it
explicitly to match wherever your frontend runs.

> `.env` is gitignored — never commit real secrets.

---

## Seeding sample users

Populate the database with 15 ready-to-use accounts:

```bash
node backend/src/seeds/user.seed.js
```

Every seeded user has the password **`123456`**. Examples:

| Email                          | Password |
| ------------------------------ | -------- |
| `emma.thompson@example.com`    | `123456` |
| `olivia.miller@example.com`    | `123456` |
| `james.anderson@example.com`   | `123456` |
| `william.clark@example.com`    | `123456` |

(…and 11 more — see `backend/src/seeds/user.seed.js`.)

To see realtime features (typing, read receipts, presence, calls), log in as
two different users in two browsers (or one normal window + one incognito
window) and chat between them.

---

## Running the app

You need **two processes**: the backend API/socket server and the frontend
Vite dev server.

### Option A — one command (recommended for dev)

From the repo root:

```bash
npm run dev:both
```

This uses `concurrently` to run both servers together.

### Option B — two terminals

```bash
# Terminal 1 — backend (with auto-reload via nodemon)
npm run dev

# Terminal 2 — frontend (Vite dev server)
npm run frontend
```

### Default URLs

| Service          | URL                       |
| ---------------- | ------------------------- |
| Frontend (Vite)  | http://localhost:5173     |
| Backend (Express)| http://localhost:5001     |
| API base path    | http://localhost:5001/api |

### All available scripts

**Root `package.json`:**

| Script              | What it does                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Start the backend with `nodemon` (auto-reload)                   |
| `npm run frontend`  | Start the frontend Vite dev server                              |
| `npm run dev:both`  | Start backend **and** frontend together                         |
| `npm run build`     | Install all deps and build the production frontend bundle        |
| `npm start`         | Run the backend in production mode (`node backend/src/index.js`) |

**`frontend/package.json`:** `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.

---

## Using the app

1. **Create an account** — go to `/signup`, enter your name, email, and a
   password (min 6 characters). You're logged in automatically. (Or log in at
   `/login` with a seeded account, e.g. `emma.thompson@example.com` / `123456`.)
2. **Pick a contact** — the sidebar lists everyone else. Use the search box or
   the **"Online only"** toggle to filter. Conversations are sorted by most
   recent activity, with last-message previews and unread badges.
3. **Send messages** — type in the composer and press Enter or the send button.
   - Click the **emoji** button to insert emoji.
   - Click the **image** button to attach a picture (shown with a preview;
     click a sent image to open the lightbox).
4. **Watch realtime features** — when the other person is typing you'll see a
   typing indicator; your sent messages show a single check (delivered) that
   becomes a double check (seen) once they read it.
5. **Delete a message** — hover your own message and click the trash icon.
6. **Start a call** — open a conversation and click the **phone** (audio) or
   **video** icon in the chat header. The other user gets an incoming-call
   modal to accept or decline. During a call you can mute, toggle your camera,
   and hang up.
7. **Update your profile** — click your avatar in the navbar → Profile → tap the
   camera icon to upload a new photo.
8. **Switch theme** — use the sun/moon toggle (in the navbar, or floating on the
   login/signup pages). Your choice is remembered.
9. **Log out** — click **Logout** in the navbar.

> Realtime behaviors (typing, receipts, presence, calls) require **two logged-in
> users**. The easiest setup is one normal browser window + one incognito window.

---

## Theming (light / dark)

The app ships with two daisyUI themes defined in `frontend/tailwind.config.js`:

- **`pastel-glass`** — the light theme (lavender / peach / mint on a soft off-white).
- **`pastel-night`** — the dark theme (the same accents on a deep ink-violet base).

How it works:
- The bespoke frosted-glass design system in `frontend/src/index.css` is driven
  by **CSS custom properties** scoped per theme, so every glass surface, message
  bubble, input, and chip adapts automatically.
- `frontend/src/store/useThemeStore.js` (Zustand) persists your choice to
  `localStorage["chat-theme"]` and sets `data-theme`, `color-scheme`, and the
  `<meta name="theme-color">` on `<html>`.
- An inline script in `frontend/index.html` applies the saved (or OS-preferred)
  theme **before** React mounts, preventing a flash of the wrong theme.
- `frontend/src/components/layout/ThemeToggle.jsx` is the animated sun/moon
  button, mounted in the navbar and as a floating button on the auth pages.

To add a new themed surface, define a CSS variable per theme in `index.css`
(rather than hardcoding a color), or use daisyUI's `bg-base-*` /
`text-base-content` / `text-primary` utility classes.

---

## API reference

Base URL: `http://localhost:5001/api`. All protected routes require the JWT
cookie set at login (sent automatically by the browser; axios uses
`withCredentials: true`).

### Auth — `/api/auth`

| Method | Endpoint           | Auth | Body                              | Description                          |
| ------ | ------------------ | ---- | --------------------------------- | ------------------------------------ |
| POST   | `/signup`          | —    | `{ fullName, email, password }`   | Create account; sets JWT cookie      |
| POST   | `/login`           | —    | `{ email, password }`             | Log in; sets JWT cookie              |
| POST   | `/logout`          | —    | —                                 | Clear the JWT cookie                 |
| PUT    | `/update-profile`  | ✅   | `{ profilePic }` (base64 image)   | Upload/replace avatar via Cloudinary |
| GET    | `/check`           | ✅   | —                                 | Return the current authenticated user|

### Messages — `/api/messages`

| Method | Endpoint      | Auth | Body                       | Description                                            |
| ------ | ------------- | ---- | -------------------------- | ----------------------------------------------------- |
| GET    | `/users`      | ✅   | —                          | Sidebar contacts with last message + unread count     |
| GET    | `/:id`        | ✅   | —                          | Full conversation with user `:id`                     |
| POST   | `/send/:id`   | ✅   | `{ text?, image? }`        | Send a message to user `:id` (text and/or base64 image)|
| DELETE | `/:id`        | ✅   | —                          | Delete your own message `:id`                          |

---

## Socket.IO events

The client connects with `?userId=<id>` in the handshake query. Key events:

**Server → client**
- `getOnlineUsers` — array of currently-online user IDs
- `newMessage` — a new incoming message
- `messageDeleted` — `{ messageId }` to remove from the open chat
- `messagesSeen` — `{ byUserId }` to mark your sent messages as seen
- `typing` / `stopTyping` — `{ senderId }`
- Calls: `call:incoming`, `call:answered`, `call:ice`, `call:rejected`, `call:ended`, `call:busy`, `call:unavailable`

**Client → server**
- `typing` / `stopTyping` — `{ receiverId }`
- `markSeen` — `{ senderId }` (persists `seen: true` and notifies the sender)
- Calls: `call:offer`, `call:answer`, `call:ice`, `call:reject`, `call:end`, `call:busy`

> Calls are **peer-to-peer** WebRTC; the server only relays SDP/ICE between the
> two parties. ICE servers are configured by env (`VITE_STUN_URLS`,
> `VITE_TURN_*`). Left unset, the app falls back to free public STUN **and a free
> public TURN relay**, so calls work across mobile data and strict NATs out of
> the box. A TURN relay is what carries the audio/video when a direct path can't
> be formed — without one, calls connect but no media flows. For production set
> your own TURN server (it takes precedence over the free fallback).

---

## Production build

1. Set `NODE_ENV=production` in `.env` (this makes auth cookies `secure`, so you
   must serve over HTTPS) and point `CLIENT_URL` at your deployed frontend origin.
2. Build the frontend and start the server:

   ```bash
   npm run build     # installs deps + builds frontend/dist
   npm start         # node backend/src/index.js
   ```

In production the Express server serves the built frontend from
`frontend/dist` and routes all non-API paths to the SPA's `index.html` (see
`backend/src/index.js`), so a single process serves both the API and the app.

It also enables production hardening: a `GET /api/health` probe, security
headers (helmet), gzip compression, per-IP rate limiting, `trust proxy` for
running behind a reverse proxy, and graceful shutdown on `SIGTERM`/`SIGINT`.

---

## Deployment (Render)

The whole app deploys as **one Render web service**: the Express/Socket.IO
backend serves the built SPA from `frontend/dist`, so the UI, REST API, and
realtime/WebRTC-signaling layer all share a single origin (and HTTPS, which
calls require for camera/mic access).

The repo ships a [`render.yaml`](./render.yaml) Blueprint, so deploying is:

1. Push this repo to GitHub.
2. **Render Dashboard → New → Blueprint**, pick the repo.
3. Fill in the secret env vars (MongoDB URI, Clerk keys, Cloudinary), then **Apply**.

Render runs `npm run build` (installs deps + builds the SPA) then `npm start`
(`node backend/src/index.js`), health-checks `GET /api/health`, and injects
`PORT` + `RENDER_EXTERNAL_URL` automatically — so you don't set those yourself.

**See [DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide: every env var, using
MongoDB Atlas, custom domains, TURN-for-calls, and scaling/Socket.IO notes.

---

## Troubleshooting

**Backend logs `MongooseServerSelectionError` / `ReplicaSetNoPrimary` / "IP isn't whitelisted"**
Your MongoDB isn't reachable. If using Atlas:
- Add your current public IP under **Atlas → Network Access** (or `0.0.0.0/0`
  for development), and wait for it to become **Active**.
- Make sure the cluster isn't **paused** (free M0 clusters auto-pause when idle — click **Resume**).
- Double-check the username/password and database name in `MONGODB_URI`.

Mongoose reconnects automatically once the database is reachable — no restart needed.

**Vite fails to start: `Cannot find module @rollup/rollup-...` or "You installed esbuild for another platform"**
This is the known npm optional-dependencies bug — a native binary is missing
from `frontend/node_modules`. Fix:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

(If a plain reinstall doesn't repair it, delete the specific broken package
folder under `node_modules/@rollup/` or `node_modules/@esbuild/` and reinstall.)

**Port already in use (`EADDRINUSE`) / the wrong app loads on `localhost:5173`**
Another process (or another project) is using the port. Either stop it, or run
Vite on a different port and point the backend's CORS at it:

```bash
# frontend on a custom port
cd frontend && npx vite --port 5190

# backend allowing that origin
CLIENT_URL=http://localhost:5190 npm run dev
```

> Note: on macOS, `localhost` resolves to IPv6 (`::1`) first. If a different dev
> server is bound to the same port on `::1`, your browser may load *it* instead.
> Using a unique port avoids this.

**Avatar / image upload fails**
Check that all three `CLOUDINARY_*` values in `.env` are correct.

**Calls connect but there's no audio/video (esp. between two phones)**
This is NAT traversal failing. STUN alone can't relay media between strict or
mobile (symmetric-NAT) networks — you need a **TURN** relay. The app already
falls back to a free public TURN server, but those are best-effort; for reliable
calls set your own via `VITE_TURN_URL` / `VITE_TURN_USERNAME` /
`VITE_TURN_CREDENTIAL` (a free [Metered](https://www.metered.ca/tools/openrelay)
API key or self-hosted coturn). Browsers also require **HTTPS** (or `localhost`)
to grant camera/microphone access — Render serves HTTPS by default.

**Logged out unexpectedly / `401 Unauthorized`**
The JWT cookie expires after 7 days, or `NODE_ENV=production` without HTTPS will
prevent the cookie from being stored. Use `NODE_ENV=development` for local
`http://localhost`.

---

Happy chatting! 💬
