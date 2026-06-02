# Chatty — Frontend

This is the React + Vite frontend for the **Chatty** realtime chat app.

For full setup, environment variables, scripts, API reference, theming, and
troubleshooting, see the **[main README at the repo root](../README.md)**.

## Quick commands (run from this `frontend/` folder)

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (default http://localhost:5173)
npm run build    # build the production bundle to dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

The frontend talks to the backend API at `http://localhost:5001/api` in
development (see `src/lib/axios.js`). Make sure the backend is running — start
both together from the repo root with `npm run dev:both`.
