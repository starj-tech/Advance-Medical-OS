# Abecca — Clinical Portal

The primary clinical / patient-facing portal of the **Omni-Med Nexus** platform. See the
[root README](../../README.md) for the overall architecture.

- **Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript
- **Status:** animated boot screen placeholder — not yet wired to the core engine

## Development

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
```

Running several apps at once? Use a different port: `npm run dev -- -p 3001`.

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the dev server         |
| `npm run build` | Production build             |
| `npm run start` | Serve the production build   |
| `npm run lint`  | Run ESLint                   |
