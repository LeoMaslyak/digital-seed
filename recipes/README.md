# Integration Recipes

Recipes are small, copyable setup guides. They explain what the integration does, what stays local, what requires external credentials, and what command or prompt to run next.

Start with `bun run seed recipe list` (it now prints a one-line description for each entry).

## Authoring a new recipe

1. Copy [`_template/README.md`](_template/README.md) into a new `recipes/<your-slug>/README.md`.
2. Fill in every section. Keep it under ~120 lines.
3. New recipes start as **Experimental / adapt-yourself**. They graduate to **Official alpha-supported** only after a maintainer signs off and the gate stack exercises them.
4. Use fictional credentials, draft-first defaults, and link to [What Leaves Your Machine?](../docs/what-leaves-your-machine.md) when the recipe touches external services.

See [`docs/integration-recipes.md`](../docs/integration-recipes.md) for the status legend, and [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the broader contribution flow.
