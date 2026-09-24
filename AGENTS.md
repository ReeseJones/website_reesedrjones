# AGENTS.md

## Context
- **Project:** Reese Jones's personal website ([reesedrjones.com](https://reesedrjones.com/))
- **Environment:** Browser-only Single Page Application (SPA). No Node.js runtime APIs.
- **Hosting:** Cloudflare via GitHub push (configured in [wrangler.jsonc](file:///D:/_/website_reesedrjones/wrangler.jsonc)).
- **Branches:** `main` (production, auto-deploys), `staging` (pre-release testing). Check branch before editing/committing.
- **Stack:** React 19, React Router 7, PixiJS 8, TypeScript, SCSS, Parcel 2

## Commands
- `npm run start` — Local dev server with live reload / HMR (cleans `dist`) (Not for agents)
- `npm run build` — Production build to `./dist`
- `npm run preview` — Build and run local Cloudflare preview (`wrangler dev`) (Not for agents)
- `npm run deploy` — Build and deploy directly to Cloudflare (`wrangler deploy`) (Not for agents)

## Rules
- **Verify builds:** Always run `npm run build` to confirm assets and TypeScript bundle cleanly.
- **Client-only:** Never import Node built-in modules (`fs`, `path`, `process`) in app code.
- **Asset imports:** Use relative ESM imports for images/assets (e.g., `import heroImg from "./hero.jpg"`).
- **Formatting:** Do not use markdown tables; prefer bulleted lists.
- **Design Docs:** Should use minimal code, but should feature the API, Types, Interfaces and design goals, as well as steps algorithms and procedures.
- **Barrel Files:** Do not make them.