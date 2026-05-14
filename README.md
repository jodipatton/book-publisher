# book-publisher (monorepo)

npm workspaces. Each app under `apps/` is independent.

## Apps

- **[apps/fashion-creator](apps/fashion-creator/)** — VoiceAtelier. Voice-driven
  fashion design app. Reads body proportions from a photo, renders original
  outfit designs from spoken descriptions and inspiration images, in both
  photorealistic and fashion-sketch styles. Per-user taste profile learns each
  user's idiolect over time.

## Run from the repo root

```bash
npm install            # installs every workspace
npm run dev            # apps/fashion-creator dev server on http://localhost:3000
npm test               # vitest across the active app
npm run build          # production build of the active app
```

Each script delegates to `apps/fashion-creator` via `npm --workspace`. To target
a different workspace, replace `fashion-creator` in `package.json`'s scripts or
run `npm --workspace <name> <script>` directly.

## Add another app

1. `mkdir apps/<new-app>` and seed its own `package.json`, `tsconfig.json`, etc.
2. It joins the workspace automatically via the root `workspaces` glob.
3. Either point the root scripts at it, or just call it explicitly with
   `npm --workspace <new-app> run <script>`.
