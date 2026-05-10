# Finance Pack

**your organization Finance I & II support**

## What's included

**Patterns:**
- `dcf-analysis` — Full DCF walkthrough with WACC, terminal value, sensitivity
- `ratio-analysis` — Profitability, liquidity, leverage, efficiency, multiples
- `lbo-primer` — LBO model: entry, debt schedule, exit, MOIC/IRR

**Agent override:**
- `study.yaml` — Finance-tuned study specialist

**Templates:**
- `project-analysis.md` — Structured case analysis template
- `learning-prep.md` — Formula sheet + learning checkpoint strategy

## Install

```bash
bun run marketplace install pack:finance
```

## Usage

```
Tell me the DCF value of Nestlé given: Revenue €95B, EBIT margin 16%,
WACC 8%, terminal growth 2%, capex 3% of revenue.
```

The agent will apply the `dcf-analysis` pattern automatically.
