# Skill Packs

Pre-built bundles of patterns, agent overrides, and templates for community domains.

## Available Packs

| Pack | Domains | Patterns | Key Frameworks |
|------|---------|----------|----------------|
| `finance` | Finance I & II | dcf-analysis, ratio-analysis, lbo-primer | DCF, Comps, LBO, DuPont |
| `strategy` | Business Policy, Competitive Strategy | five-forces, bcg-matrix, competitive-dynamics | Porter, VRIO, BCG |
| `operations` | Operations Management, Supply Chain | process-analysis, supply-chain | Little's Law, EOQ, TOC |

## Install a Pack

```bash
bun run marketplace install pack:finance
bun run marketplace install pack:strategy
bun run marketplace install pack:operations
```

## Pack Structure

```
packs/<name>/
  pack.json          ← metadata: id, name, patterns, frameworks, domains
  README.md
  patterns/
    <pattern-name>/
      system.md      ← prompt instructions for this pattern
  agents/
    learning.yaml       ← agent override (domain-specific learning specialist)
  templates/
    project-analysis.md    ← structured project analysis template
    learning-prep.md     ← formula sheet and learning strategy
```

## Create Your Own Pack

1. Fork the repo
2. Copy an existing pack folder and customise
3. Add your pack to `data/registry.json`
4. Open a PR
