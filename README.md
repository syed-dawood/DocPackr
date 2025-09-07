# DocPackr

Private, offline-first document packer. Drag/drop PDFs & images → rename by safe templates → compress on-device → ZIP with a manifest. Optional OCR hints for smarter defaults.

![Main Flow](docs/shots/flow.gif)

## Features

- Offline-first PWA (works fully offline after first load)
- Drag & drop or paste PDFs/images; accessible UI components
- Safe templating with tokens, fallbacks, and helpers: `{{Field}}`, `{{First||Last}}`, `{{slug(Last)}}`, `{{upper(DocType)}}`
- Smart hints: filename/EXIF + optional on-device OCR (Tesseract.js)
- Client-only compression:
  - Images → compressed PDF (max 2000px, quality 0.7)
  - PDFs → light normalize; text-only PDFs marked “server recommended”
- ZIP export with `manifest.txt` (columns: `OriginalName | NewName | OriginalSize | FinalSize | SHA256 | ISO8601`)
- PWA service worker caches shell + assets; zero file uploads
- Playwright e2e, GitHub Actions CI

![Pack Panel](docs/shots/pack.png)

## Stack

- Next.js 14 App Router (TypeScript)
- Tailwind CSS + shadcn/ui (Radix)
- JSZip, pdf-lib, browser-image-compression, exifreader, Tesseract.js
- Minimal service worker for offline caching
- Playwright + GitHub Actions
- Optional .NET 8 Minimal API for high‑ratio PDF compression/signing

## How It Works

1. Ingest: drag/drop/paste via `src/components/DropBox.tsx`
2. Hints: `src/lib/smart/hints.ts` infers `DocType`, `Side`, `DateISO` from filename/EXIF; optional OCR for small files
3. Template: `src/lib/template.ts` renders safe names with fallbacks/funcs; validated and capped length
4. Compression:
   - Images: `src/lib/compress/image.ts` → JPEG/WebP downscale; `pdf-lib` wraps to one‑page PDF
   - PDFs: `src/lib/compress/pdf.ts` light save; text‑only PDFs flagged for server compression
5. Pack: `src/lib/pack.ts` zips files, writes `manifest.txt`, computes `SHA-256` via `src/lib/hash.ts`
6. Offline/PWA: `public/sw.js` caches shell; registered in `src/components/PWARegister.tsx`

![Home](docs/shots/home.png)

## Privacy

- 100% client‑side; no files leave your device.
- OCR runs locally via WebAssembly (Tesseract.js).
- Optional server compression is opt‑in, not required for the main flow.

## Roadmap

- Multi‑page merge/reorder; page splitting
- Batch metadata editing and saved presets
- PDF text layer optimization on device
- Optional .NET service integration (high‑ratio compression, signing)
- i18n; keyboard shortcuts; more template helpers

## Development

Prereqs: Node 20, pnpm 9.

```bash
pnpm install
pnpm dlx husky init  # enable git hooks (optional)
pnpm dev             # http://localhost:3000
```

Quality gates:

```bash
pnpm typecheck && pnpm lint
pnpm test:e2e
```

Build & run:

```bash
pnpm build && pnpm start
```

## Deploy

- Vercel (one‑liner): `vercel --prod`
- Fly.io (.NET service one‑liner): `fly launch --now` (from your .NET service folder)

`vercel.json` includes `{ "cleanUrls": true }`.

## Deploy (Vercel)

- Required env (Project Settings → Environment Variables):
  - NEXT_PUBLIC_APP_NAME=DocPackr
  - NEXT_PUBLIC_OCR_ENABLED=true
  - NEXT_PUBLIC_AI_ENABLED=false
  - NEXT_PUBLIC_API_BASE=
  - DOCSIGN_PUBLIC_KEY=
  - (optional server-side) OPENAI_API_KEY
- Build: `pnpm build`
- Install: `pnpm i --frozen-lockfile`

## License

MIT

## Not Legal Advice

DocPackr helps you organize documents but does not provide legal advice. Verify naming and filing requirements with the relevant authority before submission.
