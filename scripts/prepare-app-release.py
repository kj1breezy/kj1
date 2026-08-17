#!/usr/bin/env python3
"""
prepare-app-release.py — RAVE's "get me ready to publish" button.

Run this whenever you're ready to turn RAVE from a web app into a real
iOS / Android app listing. It does NOT touch your Google Play or Apple
Developer accounts, and it does NOT submit anything — those steps need a
human with the right logins. What it DOES do, automatically, in seconds:

  1. Builds resources/icon.png       — 1024x1024 full-bleed app icon (no
                                        transparency, no pre-baked rounding —
                                        that's what App Store / Play Store want)
  2. Builds resources/icon-foreground.png — transparent-background Android
                                        adaptive-icon foreground layer
  3. Builds resources/icon-background.png — solid Android adaptive-icon
                                        background layer
  4. Builds resources/splash.png and resources/splash-dark.png — 2732x2732
                                        launch screens (light/dark)
  5. Writes/updates capacitor.config.json and a minimal package.json so the
     repo is one `npm install` away from `npx cap add ios` / `npx cap add
     android`
  6. Regenerates PUBLISHING.md with the exact next commands to run

Requires only Pillow (already used elsewhere in this repo):
    pip install pillow --break-system-packages

Usage:
    python3 scripts/prepare-app-release.py
"""
import json
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(ROOT, 'icons')
RES_DIR = os.path.join(ROOT, 'resources')

SOURCE_WORDMARK = os.path.join(ICONS_DIR, 'logo-wordmark-r4.png')  # transparent, current brand asset
BG_BLACK = (5, 3, 7, 255)
BRAND_MAGENTA = (255, 77, 224, 255)

os.makedirs(RES_DIR, exist_ok=True)


def load_wordmark():
    if not os.path.exists(SOURCE_WORDMARK):
        raise SystemExit(
            f"Missing {SOURCE_WORDMARK}. Update SOURCE_WORDMARK at the top of this "
            "script to point at whatever the current transparent logo file is."
        )
    return Image.open(SOURCE_WORDMARK).convert('RGBA')


def centered_paste(canvas, art, scale_to_frac):
    """Paste `art` onto `canvas`, scaled so its longest side is scale_to_frac
    of canvas width, centered."""
    cw, ch = canvas.size
    target_w = int(cw * scale_to_frac)
    ratio = target_w / art.width
    target_h = int(art.height * ratio)
    art_r = art.resize((target_w, target_h), Image.LANCZOS)
    x = (cw - target_w) // 2
    y = (ch - target_h) // 2
    canvas.alpha_composite(art_r, (x, y))
    return canvas


def make_full_bleed_icon(size=1024):
    """App Store / Play Store master icon: solid background, no alpha, no
    pre-applied rounding (the stores round it themselves)."""
    canvas = Image.new('RGBA', (size, size), BG_BLACK)
    # soft ambient glow behind the mark, matching the in-app aesthetic
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [size * 0.18, size * 0.28, size * 0.82, size * 0.72],
        fill=(255, 77, 224, 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(size // 10))
    canvas.alpha_composite(glow)
    wordmark = load_wordmark()
    canvas = centered_paste(canvas, wordmark, 0.62)
    return canvas.convert('RGB')  # flatten — store icons must not carry an alpha channel


def make_adaptive_foreground(size=1024):
    """Android adaptive icon foreground: transparent bg, content kept inside
    the ~66% safe zone so it isn't clipped by launcher masks."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    wordmark = load_wordmark()
    canvas = centered_paste(canvas, wordmark, 0.5)
    return canvas


def make_adaptive_background(size=1024):
    canvas = Image.new('RGBA', (size, size), BG_BLACK)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([size * 0.1, size * 0.1, size * 0.9, size * 0.9], fill=(255, 77, 224, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(size // 6))
    canvas.alpha_composite(glow)
    return canvas.convert('RGB')


def make_splash(size=2732, dark=True):
    bg = BG_BLACK if dark else (247, 244, 249, 255)
    canvas = Image.new('RGBA', (size, size), bg)
    if dark:
        glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse(
            [size * 0.22, size * 0.35, size * 0.78, size * 0.65],
            fill=(255, 77, 224, 70),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(size // 12))
        canvas.alpha_composite(glow)
    wordmark = load_wordmark()
    if not dark:
        # darken the wordmark colors so they read on a light splash background
        r, g, b, a = wordmark.split()
        wordmark = Image.merge('RGBA', (r.point(lambda v: v * 0.75), g, b.point(lambda v: v * 0.85), a))
    canvas = centered_paste(canvas, wordmark, 0.34)
    return canvas.convert('RGB')


def write_capacitor_scaffold():
    pkg_path = os.path.join(ROOT, 'package.json')
    if not os.path.exists(pkg_path):
        pkg = {
            "name": "rave-trading-journal",
            "version": "1.0.0",
            "private": True,
            "description": "RAVE — private trading journal PWA, wrapped for app store distribution.",
            "scripts": {
                "release:assets": "python3 scripts/prepare-app-release.py",
                "cap:sync": "npx cap sync"
            },
            "devDependencies": {
                "@capacitor/cli": "^6.0.0",
                "@capacitor/assets": "^3.0.5"
            },
            "dependencies": {
                "@capacitor/core": "^6.0.0",
                "@capacitor/ios": "^6.0.0",
                "@capacitor/android": "^6.0.0"
            }
        }
        with open(pkg_path, 'w') as f:
            json.dump(pkg, f, indent=2)
            f.write('\n')

    cap_config_path = os.path.join(ROOT, 'capacitor.config.json')
    if not os.path.exists(cap_config_path):
        cap_config = {
            "appId": "com.rave.journal",
            "appName": "RAVE",
            "webDir": ".",
            "backgroundColor": "#000000",
            "server": {"androidScheme": "https"}
        }
        with open(cap_config_path, 'w') as f:
            json.dump(cap_config, f, indent=2)
            f.write('\n')


def main():
    print("Generating app-store-ready assets into resources/ ...")
    make_full_bleed_icon().save(os.path.join(RES_DIR, 'icon.png'))
    make_adaptive_foreground().save(os.path.join(RES_DIR, 'icon-foreground.png'))
    make_adaptive_background().save(os.path.join(RES_DIR, 'icon-background.png'))
    make_splash(dark=True).save(os.path.join(RES_DIR, 'splash.png'))
    make_splash(dark=False).save(os.path.join(RES_DIR, 'splash-dark.png'))
    print("  resources/icon.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png")

    write_capacitor_scaffold()
    print("Wrote/confirmed package.json and capacitor.config.json")

    print("\nDone. See PUBLISHING.md for the exact next commands.")


if __name__ == '__main__':
    main()
