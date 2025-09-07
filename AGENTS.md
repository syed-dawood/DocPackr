# Repository Guidelines

## Project Structure & Module Organization
- App (Next.js App Router): `src/app` (pages, API routes), layout in `src/app/layout.tsx`.
- UI components: `src/components` (PascalCase files, co-located styles as needed).
- Core logic: `src/lib` (pure TS modules, camelCase files; subfolders like `compress/`, `smart/`).
- Public assets/PWA: `public/` (icons, `sw.js`).
- E2E tests: `tests/*.spec.ts` with fixtures in `tests/fixtures/`.
- Optional server (for advanced PDF ops): `server/` (.NET 8 minimal API).
- Docs and screenshots: `docs/` (e.g., `docs/shots/`).

## Build, Test, and Development Commands
- `pnpm dev` — Run Next.js locally on `http://localhost:3000`.
- `pnpm build` — Production build.
- `pnpm start` — Start built app (port 3000).
- `pnpm lint` — ESLint (Next + recommended + Prettier).
- `pnpm typecheck` — TypeScript strict type checking.
- `pnpm format` / `pnpm format:check` — Prettier write/check.
- `pnpm test:e2e` — Playwright tests (spins up the app if needed).

Prereqs: Node 20+, pnpm 9+. Install with `pnpm install`.

## Coding Style & Naming Conventions
- Formatting: Prettier (no semicolons, single quotes, trailing commas, width 100). EditorConfig enforces 2‑space indent and LF.
- Linting: ESLint extends `next/core-web-vitals`, `eslint:recommended`, `prettier`.
- TypeScript: strict, path alias `@/*` → `src/*`.
- Naming: React components PascalCase (`PackPanel.tsx`), modules/utilities camelCase (`template.ts`, `image.ts`). Avoid default exports in new code.

## Testing Guidelines
- Framework: Playwright (`@playwright/test`). Place specs under `tests/` with `*.spec.ts`.
- Write scenario-style tests covering key flows (e.g., pack/zip, OCR hints). Use fixtures in `tests/fixtures/`.
- Run locally with `pnpm test:e2e`. CI uses the same entry.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits when possible (e.g., `feat(ui): add redaction preview`, `fix(pack): preserve EXIF date`). Keep changes focused.
- PRs: include a clear description, linked issues, and screenshots/GIFs for UI changes (store in `docs/shots/`). Note any breaking changes or config steps.
- Checks required: `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` must pass.

## Security & Configuration Tips
- Never commit real secrets. Use `.env.local` for local dev (see `.env.example` if provided).
- App is offline‑first; OCR runs client‑side (WASM). The optional `server/` service is not required for the main flow.
