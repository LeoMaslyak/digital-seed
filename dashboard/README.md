# DAI Cockpit

A slick dark-mode dashboard for your Digital Seed. Open it every morning to see your tasks, queue AI jobs, and launch case decks or Excel models in one click.

## Start it

```bash
bun run dev
```

Then open **http://localhost:3000** in your browser.

## Make it yours

Everything is in plain JSX files — no build step, no compilation, no framework to learn. Open a file, edit, reload. That's it.

| File | What to change |
|---|---|
| `dai/topbar.jsx` | Your name, initials, session clock |
| `dai/middle.jsx` | Your identity chips and USER.md summary quote |
| `dai/lower.jsx` | Domain packs, study group members, token budget cap |
| `dai/footer.jsx` | Integration pills (add/remove services) |
| `dai/hero.jsx` | Deck and Excel model dropdown options |
| `dai/app.jsx` | Greeting name, daily schedule line |

Search for `// CUSTOMIZE:` comments throughout the files — those are the exact spots.

## Accent color

Hit `⌘T` (or `Ctrl+T`) to open the Tweaks panel. Switch between teal, amber, and violet accents live. No code needed.

## Live data

The dashboard pulls real data from your DAI system:

| Source | File it reads |
|---|---|
| Active tasks | `data/tasks.json` |
| Token usage | `data/token-usage.json` |
| RAG index size | `data/rag-index.json` |
| Knowledge Base sync | `data/knowledge base-meta.json` |
| User goals | `user/GOALS.md` |

If a file doesn't exist yet, the dashboard shows sensible demo data. Nothing breaks.

## Mobile view

In the Tweaks panel (`⌘T`), switch Viewport to **Mobile** to see the 390px iPhone layout inside a phone frame. Useful for showing the dashboard to classmates.

## Add a new integration pill

Open `dai/footer.jsx` and add a line to the `items` array:

```jsx
{ status: 'ok', name: 'Your Tool', detail: 'Connected' },
```

Status options: `'ok'` (green), `'warn'` (amber), `'err'` (red), `'mute'` (greyed out).

## Add a new API endpoint

Open `src/server.ts` and add a route before the static file handler:

```typescript
if (url.pathname === "/api/my-data") {
  return Response.json({ hello: "world" });
}
```

Then fetch it from any JSX component with `fetch('/api/my-data')`.
