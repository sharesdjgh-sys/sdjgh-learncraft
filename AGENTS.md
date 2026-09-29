<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow preferences

- Keep agent command execution out of visible console windows on Windows. Use `exec_command` with `login: false` and `tty: false` for ordinary commands.
- When starting background processes with PowerShell, use `Start-Process -WindowStyle Hidden` and redirect output to logs when needed. Do not launch visible `cmd /c start`, terminal windows, or interactive shells unless the user requests them.
- These options control agent-launched commands; do not claim they suppress windows created by the Codex host unless that behavior has been verified.

- When recommending a Git commit message, always include the work duration and the exact model configuration used in the commit body.
- Write the duration as `작업 시간: ...`.
- Write the full exposed model identifier and reasoning effort as `작업 모델: gpt-5.6-sol medium` rather than using a broad family name such as `Codex (GPT-5)`. Do not omit the reasoning effort or guess unavailable configuration values.
