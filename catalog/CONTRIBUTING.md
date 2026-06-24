# Contributing to the Digital Seed tool catalog

The catalog (`catalog/catalog.yaml`) is how Digital Seed guides newcomers to the
**right** open-source tools and keeps them away from sketchy or unnecessary ones.
Anyone can propose a tool — open a PR adding an entry. CI validates this file on
every PR, and a maintainer reviews the trust tier before merging.

The catalog is curated, not a dump. We seed it from community "awesome" lists
(awesome-mcp-servers, awesome-ai-agents, awesome-llm-apps, …) and from tools the
maintainers have actually looked at — but a listing is **discovery, not a safety
guarantee**. Quality and safety are encoded per-entry below.

## What makes a good entry

Every entry MUST:

1. **Point at a real repo.** `repo:` must be an `https://` URL on github.com,
   gitlab.com, or codeberg.org. No bare package names, no invented paths. CI
   rejects anything else. (This is the #1 rule — a guide that sends a beginner to
   a non-existent or typosquatted repo is the exact harm we exist to prevent.)
2. **Declare its blast radius** in `accesses:` using only the controlled
   vocabulary (CI rejects unknown terms):
   `local-only · filesystem · network · shell · credentials · runs-continuously ·
   spends-money · your-email · your-calendar · your-files · your-messages ·
   your-code · your-notes`.
   Be honest and complete — this is the column a non-technical user relies on.
3. **Set an accurate trust tier:**
   - `vetted` — a maintainer reviewed it: real, maintained, sane permissions,
     pinned install, no sketchy postinstall. Reserve for things you'd hand a
     non-technical friend.
   - `community` — a real, notable, widely-used project, but not deeply reviewed
     here (most awesome-list-derived entries; OpenClaw, Hermes).
   - `unvetted` — no single safe package exists yet; the user must evaluate it.
4. **Pick the right `phase`** (1 local context · 2 local search · 3 integrations ·
   4 always-on agent), so the guide doesn't push a heavy tool on a day-one user.
5. **Pin installs.** If you give an `install.package`, pin an exact version. CI
   runs `npm view` on every `install.package` and fails on a 404. Never tell a
   user to `npx -y` a floating/unverified name.
6. **Write an honest `caution:`** — especially the permissions and the "verify
   before trusting" note for `community`/`unvetted` tiers.

## Entry shape

```yaml
- id: my-tool                       # unique, kebab-case
  name: My Tool
  category: mcp-server              # agent-runtime | mcp-server | integration | reference | utility
  serves: ["plain-language need", "another phrasing"]
  phase: 3
  repo: https://github.com/owner/repo
  install: { method: npm, package: "name", pinned: "1.2.3", runs_install_scripts: false }
  trust: { tier: community, provenance: community, reviewed: "what you checked" }
  accesses: [your-notes, filesystem]
  when_to_use: "When the user wants ..."
  caution: "Verify before trusting because ..."
  alternatives: [other-id]
```

`reference` entries (a curated directory / awesome list to explore) may omit
`install`/`accesses`.

## Validate locally before you PR

```bash
bun run scripts/catalog-check.ts     # schema + blast-radius + repo-URL + npm-exists
bun run seed catalog --check         # quick structural check
bun run seed catalog                 # see how your entry renders
```

A maintainer makes the final call on the trust tier. When in doubt, propose
`community` or `unvetted` — never overstate `vetted`.
