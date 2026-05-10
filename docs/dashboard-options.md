# Dashboard Options

Digital Seed is not trying to become a dashboard product.

Digital Seed no longer ships an in-tree dashboard as part of the default product. If you want a visual layer, start from a mature dashboard project and connect it to simple Digital Seed files or APIs.

## Recommended approach

If you want a dashboard, start from a mature open-source project and adapt it:

- **Service / homelab dashboard:** [Dashy](https://github.com/Lissy93/dashy) — self-hostable personal dashboard with widgets, status checks, themes, and a UI editor.
- **Modern app/admin dashboard:** [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) — Next.js, shadcn/ui, TypeScript, Tailwind, charts, tables, forms, and app structure.
- **React admin templates:** browse [GitHub's `react-admin-template` topic](https://github.com/topics/react-admin-template) if you want a broader menu of React dashboards.

## How to connect one to Digital Seed

Keep the dashboard as a separate app. Point it at simple local files or small API endpoints:

- `user/GOALS.md` for goals
- `user/DOMAINS.md` for projects and responsibilities
- `data/pending-tasks.json` for queued work
- `data/rag/status.json` for retrieval/index status
- `logs/audit.jsonl` for action history, if present

Start read-only. A dashboard should show state before it can trigger actions.

## Why this is not default

Most users do not need a dashboard on day one. They need:

1. clear context files,
2. a useful first prompt,
3. local notes/doc search,
4. safe integration recipes,
5. an agent that explains what it is doing.

A dashboard is a good later layer once the underlying workflow is real.
