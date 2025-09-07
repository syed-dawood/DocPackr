## Title

Use Conventional Commits in the title, e.g.:
feat(ui): add redaction preview

## Summary

Briefly explain the problem and the proposed solution.

## Related Issues

Closes #123 (and/or) Relates to #456

## Changes

- What changed at a high level
- Any migrations or config updates
- Notable edge cases handled

## Screenshots / GIFs

For UI changes, include before/after images or a short GIF (place assets under `docs/shots/`).

## How to Test

Steps to validate locally:
- pnpm install
- pnpm typecheck && pnpm lint
- pnpm dev (or pnpm build && pnpm start)
- pnpm test:e2e

## Checklist

- [ ] Title follows Conventional Commits
- [ ] Code formatted (`pnpm format`)
- [ ] Type checks pass (`pnpm typecheck`)
- [ ] Lint clean (`pnpm lint`)
- [ ] E2E pass (`pnpm test:e2e`)
- [ ] Added/updated docs or screenshots if UI
- [ ] No secrets committed (.env.local used)

## Breaking Changes

List any breaking changes and upgrade notes, or “None”.

## Notes

Anything reviewers should know (trade-offs, follow-ups, TODOs).

