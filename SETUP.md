# LEDGER — Setup Guide

This turns the app into something installed on your iPhone, MacBook Air, and PC, with your trades syncing privately between all three through your own Google Drive. Nothing here goes through Anthropic, Claude, or any third-party server you don't control — the only outside service involved is Google Drive, and only if you choose to connect it.

Three steps: **host the files**, **create a free Google sign-in key**, **install it as an app on each device**. About 15 minutes total, once.

---

## Step 1 — Put the app somewhere with a real web address

Google's sign-in system (and installing a PWA on iPhone) both require the app to be served over `https://`, not opened as a local file. The easiest free option is **GitHub Pages**.

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** in the top right → **New repository**. Name it something like `trading-journal`. Set it to **Public** (GitHub Pages on the free tier needs a public repo for a project site). Click **Create repository**.
3. On the new repo page, click **uploading an existing file** (or drag-and-drop).
4. Drag in every file from the folder you were given: `index.html`, `styles.css`, `app.js`, `sync.js`, `coach.js`, `manifest.json`, `sw.js`, and the whole `icons` folder. Commit the upload.
5. Go to **Settings → Pages** (left sidebar). Under "Build and deployment", set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
6. Wait about a minute, then refresh — GitHub shows your live URL, something like:
   `https://your-username.github.io/trading-journal/`

That URL is your app from now on. Open it on any device's browser to use the journal immediately (local storage works with zero further setup) — Drive sync just adds cross-device sync on top.

*Alternative:* if you'd rather not use GitHub, [Netlify Drop](https://app.netlify.com/drop) lets you drag the same folder onto the page and get a live HTTPS URL in seconds, no account required (though creating a free account keeps the URL stable long-term).

---

## Step 2 — Create your Google OAuth Client ID

This is what lets *you* sign in with *your own* Google account to sync to *your own* Drive. It takes a few clicks in Google's console and costs nothing.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account you want your journal synced to.
2. Top left, click the project dropdown → **New Project**. Name it e.g. "Trading Journal". Create it, then make sure it's selected.
3. In the search bar at top, type **"Google Drive API"** → open it → click **Enable**.
4. Left sidebar: **APIs & Services → OAuth consent screen**.
   - User type: **External** → Create.
   - App name: "Trading Journal" (or anything). User support email: your email. Developer contact: your email. Save and continue through the remaining screens (you can leave scopes and test users default, or add yourself as a test user when prompted — do that).
   - Publishing status can stay in **Testing** — that's fine for personal use indefinitely, it just means only accounts you explicitly add as "test users" can sign in, which is exactly what you want for a private tool. Add your own Google account under **Test users**.
5. Left sidebar: **APIs & Services → Credentials** → **+ Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: "Trading Journal Web".
   - Under **Authorized JavaScript origins**, click **+ Add URI** and paste your GitHub Pages URL *without* the trailing path, e.g. `https://your-username.github.io` (just the origin, no `/trading-journal/`).
   - Click **Create**. Copy the **Client ID** it shows you (ends in `.apps.googleusercontent.com`).
6. Open your journal → **Settings** tab → paste that Client ID into "Google OAuth Client ID" → **Save Client ID** → **Connect Google Drive**. Sign in and approve access when Google asks.

That's it — trades now sync to a private, hidden folder in your Drive (`appDataFolder`) that doesn't show up in your regular Drive file list and that no other app can read.

**One honest limitation:** because this app has no backend server, Google's sign-in token is short-lived (about an hour). The app quietly tries to refresh it in the background while you have it open; if that fails (e.g. you didn't open the app for a while), Settings will just show "Not connected" and a single tap on "Connect Google Drive" gets you signed back in — your data is never at risk, local storage always has it regardless of sync state.

---

## Step 3 — Install it as an app on each device

**iPhone (Safari):**
1. Open your GitHub Pages URL in Safari.
2. Tap the Share icon (square with an arrow) → **Add to Home Screen** → Add.
3. It now opens full-screen from your home screen, no browser chrome, like a native app.

**MacBook Air (Chrome or Edge):**
1. Open the URL.
2. Look for the install icon (a monitor with a down arrow) in the address bar, or open the browser menu → **Install Trading Journal…**
3. It opens in its own window and appears in Launchpad / your Applications-like app list.

**PC (Chrome or Edge):**
1. Same as Mac — install icon in the address bar, or browser menu → **Install app**.
2. It's pinned like a normal desktop app, with its own icon and window.

Sign into the **same Google account** on all three when connecting Drive sync, and log a trade on any device — it'll show up on the others within a few seconds (or immediately if you tap "Sync now" in Settings).

---

## Keeping it updated later

If you (or I, in a future session) change the code, just re-upload the changed files to the same GitHub repo (or re-drag to Netlify). The installed app on each device checks for updates automatically in the background and will use the new version next time you fully close and reopen it.

## If something goes wrong

- **"No Google Client ID set"** — you skipped Step 2, or didn't hit "Save Client ID" before "Connect".
- **Google sign-in shows "app not verified"** — normal for a personal project in Testing mode. Click "Advanced" → "Go to Trading Journal (unsafe)" — this warning exists for apps used by the public, not for your own app with your own account as the only test user.
- **Sync says "Error" after working fine for a while** — your access token expired; tap Connect again in Settings, it's one click and no data is lost.
- **Nothing shows on a second device** — make sure you connected the *same* Google account on both, and tap "Sync now" once on each.
