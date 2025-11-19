# Vercel Deployment Guide

This repo serves the web app from the `public/` folder. The included `vercel.json` config keeps clean project structure while routing production traffic to `public`.

## One-time Setup

- Create a new Vercel project and import this repository.
- Framework Preset: "Other" (no build).
- Build Command: leave empty.
- Output Directory: leave empty.
- Root Directory: repository root (do not set to `public/`).
- Environment variables: none required for static hosting (Supabase keys are loaded client-side as configured in `public/assets`).

The provided `vercel.json` handles:
- Rewrite `/` → `/public/index.html` (URL remains `/`).
- Redirect `/robots.txt`, `/favicon.ico`, `/manifest.json` to their `/public` equivalents.
- Headers: `X-Robots-Tag: noindex` for `/public/dev/*`, SW `no-cache`, asset caching for `/public/assets/*`.

## Smoke Test Checklist

After deploy, verify these on the live URL:
- Landing loads: `/` → `public/index.html`.
- Calendar modal: opens, traps focus, ESC closes, body lock works.
- Hi Dashboard: `/public/hi-dashboard.html` renders with medallion (rings/parallax on desktop), palette overrides apply.
- Hi Muscle: `/public/hi-muscle.html` loads (no raw text), calendar stylesheet present.
- Profile: `/public/profile.html` loads (no inline code leaking), calendar works.
- PWA/Service Worker: registered (HiPWA scope auto-detects `/public/`).
- Dev pages (e.g. `/public/dev/preflight/index.html`) are accessible but `noindex` (not for end users).

## Notes

- CSP: current meta tags already allow `cdn.jsdelivr.net`, `unpkg.com`, and your Supabase project. Google Fonts (if blocked by CSP) gracefully fall back to system fonts; we can add `fonts.googleapis.com`/`fonts.gstatic.com` later if needed.
- Localhost dev-only links inside certain diagnostic pages are expected and safe; they’re under `/public/dev/*` and flagged `noindex`.
- Service Worker: pass `?no-sw=1` on any page to disable it temporarily for debugging.

## Optional: Alternative Project Setup

Instead of using `vercel.json`, you can set the project’s Root Directory to `public/`. If you choose that, remove or ignore the `vercel.json` file (the rewrite `/ → /public/index.html` would no longer apply in that mode).