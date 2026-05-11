# <Recipe name> Recipe

> **Status:** Experimental / adapt-yourself. Update to **Official alpha-supported** only after this recipe is exercised by the alpha gate stack and a maintainer has signed off.

A one-sentence description that fits on the `bun run seed recipe list` output. Lead with what the integration is for, not how cool it is.

## When to use this

- Concrete situations where reaching for this integration is the right call.
- Be specific. "When you already have X and want Y" beats "for productivity."

## When **not** to use this

- Cases where another recipe (or none at all) is a better fit.
- Anything outside the first-15-minute path that is not paying its way yet.

## What it connects to

- External services, APIs, or local tools this recipe touches.
- Note any account types, plans, or credentials required.

## What stays local vs. what leaves your machine

- Files / context the recipe reads locally.
- Anything that goes to an external service — be explicit. Link to
  [What Leaves Your Machine?](../../docs/what-leaves-your-machine.md).

## Simplest free setup

```bash
# Replace with the actual minimal commands. Prefer:
# - no signup
# - no paid services
# - local-first / read-only defaults
# - draft/confirm before sending, uploading, or deleting
```

Walk a stranger through the smallest path that does one useful thing.

## What to avoid sharing

- Specific files, fields, or content categories that should NOT be sent to this integration.
- Anything that should stay in `.env` or in ignored `user/*.md` files.

## First-prompt suggestion

```text
A short, copy-pasteable prompt the user can give their AI agent
once this recipe is set up. Should reference this recipe's role,
not just "do everything".
```

## Troubleshooting

- One or two common failure modes and what to try.
- Link to [Troubleshooting](../../docs/troubleshooting.md) for the general guide.

---

**Authoring notes (delete this section before merging):**

- Keep the recipe under ~120 lines. If it grows past that, the recipe is doing too much.
- Use fictional/placeholder credentials in examples.
- Prefer draft-first defaults. External writes, sends, deletes, and uploads should require explicit confirmation.
- New recipes start as **Experimental / adapt-yourself**.
- See `docs/integration-recipes.md` and `CONTRIBUTING.md` for the status legend and contribution flow.
