<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow preferences

- When recommending a Git commit message, always include the work duration and the exact model configuration used in the commit body.
- Write the duration as `작업 시간: ...`.
- Write the full exposed model identifier and reasoning effort as `작업 모델: gpt-5.6-sol medium` rather than using a broad family name such as `Codex (GPT-5)`. Do not omit the reasoning effort or guess unavailable configuration values.
