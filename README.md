# Toolify

Toolify is a collection of free online tools for images, text, video, audio, finance, PDFs, and everyday utilities. Every tool runs fully in the browser, so files never leave the device.

The site is a Next.js App Router app hosted on Cloudflare Workers through the OpenNext adapter.

## Requirements

- Node 20 or newer
- npm

## Install

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm run dev
```

This starts the Next.js dev server on port 3000.

To run the app inside the Workers runtime, build and preview it:

```bash
npm run preview
```

## Test

Unit and logic tests use Vitest:

```bash
npm run test
```

End to end tests use Playwright with Chromium on mobile and desktop viewports. Playwright starts its own dev server, so no server needs to run first:

```bash
npm run e2e
```

## Lint and format

The project uses Biome:

```bash
npm run lint
npm run format
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. The `.env.local` file is ignored by git and must never be committed.

For local Worker development, copy `.dev.vars.example` to `.dev.vars`.

## Project layout

- `src/app` holds routes and global styles
- `src/components/smoothui` holds installed components, never delete from here
- `src/components/primitives` holds Toolify controls built on those components
- `src/lib` holds shared helpers such as formatting
- `messages` holds one translation file per locale, checked for parity
- `scripts/check-locales.mjs` fails the build when a locale misses a key
- `public/assets` holds the logo, wordmark, and fonts
- `tests/unit` holds Vitest tests
- `tests/e2e` holds Playwright tests
- `wrangler.jsonc` configures the Cloudflare Worker
