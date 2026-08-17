# Publishing RAVE as an app

RAVE already works as an installable PWA (Settings → Install as an app). This
doc is for the bigger step: putting RAVE on the **Apple App Store** and
**Google Play** as a listed, downloadable app. Everything automatable is
scripted; everything below that isn't (accounts, signing, store review) is
called out explicitly.

## 0. One-time accounts you'll need (only once you're ready to actually submit)

- **Apple Developer Program** — $99/year, sign up at developer.apple.com. Needed for an App Store listing and for TestFlight beta testing.
- **Google Play Console** — $25 one-time, at play.google.com/console.
- A **support email/URL** and a **privacy policy URL** — both stores require these in the listing. Since RAVE stores everything locally/in the user's own Drive and never talks to a RAVE-owned server, the privacy policy is short — ask me to draft one when you're ready and I'll write it from how the app actually handles data.

## 1. Generate the asset bundle (automated, run any time)

```
pip install pillow --break-system-packages   # only needed once
python3 scripts/prepare-app-release.py
```

This regenerates everything in `resources/`:

- `icon.png` — 1024×1024 master app icon (no transparency, full-bleed — exactly what both stores want)
- `icon-foreground.png` / `icon-background.png` — Android adaptive-icon layers
- `splash.png` / `splash-dark.png` — 2732×2732 launch screens
- `package.json` / `capacitor.config.json` — scaffold for wrapping the PWA as a native shell (created once, left alone on later runs so you can customize them)

Re-run the script any time the logo changes — point `SOURCE_WORDMARK` at the top of `scripts/prepare-app-release.py` at the new file if the brand asset's filename changes.

## 2. Wrap the PWA in a native shell (Capacitor)

RAVE is a single static site, which is exactly what [Capacitor](https://capacitorjs.com) wraps into a real iOS/Android app — no rewrite needed.

```
npm install
npx cap add ios       # requires a Mac with Xcode installed
npx cap add android    # requires Android Studio
npx capacitor-assets generate   # reads resources/ and drops sized icons/splash into both native projects
npx cap sync
```

## 3. Open and build natively

- **iOS**: `npx cap open ios` → opens Xcode. Set your Team (from your Apple Developer account), bump the bundle identifier if you want something other than `com.rave.journal` (set in `capacitor.config.json`), then Product → Archive to build for TestFlight/App Store submission.
- **Android**: `npx cap open android` → opens Android Studio. Build → Generate Signed Bundle/APK, using a new keystore (Android Studio can create one) — save that keystore file somewhere safe, you'll need the exact same one for every future update.

## 4. Store listing checklist

Both stores ask for roughly the same things — worth having ready before you start the submission forms:

- App name, subtitle/short description, full description
- Screenshots at each required device size (I can generate these from the live app once you tell me which device sizes you need — Playwright can drive the app and capture them)
- App icon (already generated above)
- Privacy policy URL
- Support URL / contact email
- Age rating questionnaire (RAVE has no user-generated public content, no ads, no gambling mechanics — should be a fast, low-friction rating)
- Category — Finance or Productivity both fit
- Apple: App Store Connect also wants an "App Privacy" data-collection declaration — since RAVE only touches the user's own device storage and their own Google Drive, this should be a short "no data collected by developer" declaration

## 5. What to ask me when you're ready

Say the word and I can:
- Draft the privacy policy and store descriptions from the app's actual behavior
- Generate the store screenshot set at whatever exact sizes Apple/Google are asking for that week (these requirements shift — I'll check current specs rather than assume)
- Re-run the asset script if the branding has changed since
- Walk through anything in the checklist above interactively

What I can't do for you: sign up for the developer accounts, click through Xcode/Android Studio's native build UI, or submit the listing — those need to happen on your machine with your logins.
