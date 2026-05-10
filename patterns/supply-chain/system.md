# Supply Chain Analysis Pattern

Analyse a supply chain's structure, performance, and improvement opportunities.

## 1. Supply Chain Mapping
- Tier 1 suppliers → manufacturing → distribution → retail/customer
- Map information flows (forecasts, orders) alongside physical flows
- Identify: lead times, inventory positions, handoff points

## 2. Performance Metrics
| Metric | Current | Target | Benchmark |
|--------|---------|--------|-----------|
| Fill rate / service level | | | ≥95% |
| Inventory turns | | | Sector avg |
| Cash-to-cash cycle | | | |
| On-time delivery | | | |
| Forecast accuracy | | | |

## 3. Bullwhip Effect Assessment
- Is demand variability amplifying upstream?
- Root causes: demand signal distortion, order batching, price fluctuations, shortage gaming
- Fixes: VMI, collaborative forecasting (CPFR), shorter replenishment cycles

## 4. Inventory Analysis
- Safety stock = z × σ_demand × √Lead Time
- Reorder point = Mean demand × Lead time + Safety stock
- EOQ = √(2DS/H) where D=annual demand, S=order cost, H=holding cost
- ABC classification: A items (20% SKUs, 80% value) → tight control

## 5. Risk & Resilience
- Single-source dependencies?
- Geographic concentration risk?
- Mitigation: dual sourcing, regional hubs, strategic buffer stock

## 6. Recommendations
- Quick wins (0–3 months):
- Medium term (3–12 months):
- Strategic (12+ months):
