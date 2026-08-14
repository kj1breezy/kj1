# RAVE — Private Trading Journal

A personal trading journal, log, and control system: dashboard with equity curve and behavioral analytics, full trade log, P&L calendar, a macro economic calendar cross-referenced against your own trade notes, prop-firm account/drawdown tracking, and a local rule-based Coach that reads your actual trade history for patterns — no external AI calls, no data leaving your device unless you connect Drive sync yourself.

Your real ES futures trade history (Jan–Aug 2026) is pre-loaded — hit **Import ES History** in the sidebar on first launch to bring it in.

## Quick start

Open `index.html` in any browser right now — it works immediately, saving to that browser's local storage. For the full experience (installed as an app on your iPhone, MacBook Air, and PC, syncing between them), follow **SETUP.md** — about 15 minutes, one time.

## What's in this folder

- `index.html`, `styles.css`, `app.js` — the app itself
- `sync.js` — Google Drive sync (private, your account only, entirely optional)
- `coach.js` — the local pattern-analysis engine behind the Coach tab
- `manifest.json`, `sw.js`, `icons/` — what makes this installable as an app (PWA)
- `SETUP.md` — step-by-step hosting + sync + install guide

## Privacy

Everything lives in this browser's local storage by default. If you connect Google Drive in Settings, your data syncs to a hidden folder in *your own* Drive that only this app can see — not your regular Drive, not visible to other apps, not sent anywhere else. The Coach tab never makes a network call; every insight it shows is computed from your own logged trades, on-device.
