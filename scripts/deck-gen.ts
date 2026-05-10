#!/usr/bin/env bun
/**
 * Slide deck generator — creates polished PPTX presentations with varied layouts.
 *
 * Usage:
 *   bun run scripts/deck-gen.ts case|strategy|finance
 *   bun run scripts/deck-gen.ts case --fill --case 'Nestlé sustainability'
 *   bun run scripts/deck-gen.ts                        (list templates)
 */

import PptxGenJS from "pptxgenjs";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { aiCall } from "./lib/ai-call.ts";
import { fetchCaseContext } from "./lib/web-fetcher.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const EXPORTS_DIR = join(ROOT, "exports");

// ── Brand constants ──────────────────────────────────────────────────
const BG = "1a1a2e";
const BG_CARD = "16213e";
const ACCENT = "4A90D9";
const WHITE = "FFFFFF";
const FONT = "Calibri";

const TEMPLATES: Record<string, string> = {
  case: "your organization project analysis (Title, Situation, Analysis, Options, Recommendation, Q&A)",
  strategy: "Strategy presentation (Title, Market, Competitive, Options, Recommendation)",
  finance: "Finance presentation (Title, Overview, DCF, Comparables, Investment Thesis)",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Slide layout builders ────────────────────────────────────────────

function accentBar(pptx: PptxGenJS, slide: any): void {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.06,
    fill: { color: ACCENT },
  });
}

function addTitleSlide(
  pptx: PptxGenJS,
  data: { company: string; subtitle: string; domain: string; date: string; team?: string },
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  // Vertical accent bar on right
  slide.addShape(pptx.ShapeType.rect, {
    x: 12.4, y: 0, w: 0.18, h: "100%",
    fill: { color: ACCENT },
  });

  // Company / case name
  slide.addText(data.company, {
    x: 1.0, y: 2.0, w: 10.0, h: 1.2,
    fontSize: 40, fontFace: FONT, color: WHITE, bold: true,
  });

  // Subtitle
  slide.addText(data.subtitle, {
    x: 1.0, y: 3.2, w: 10.0, h: 0.6,
    fontSize: 20, fontFace: FONT, color: ACCENT,
  });

  // Domain & date
  slide.addText(`${data.domain}  •  ${data.date}`, {
    x: 1.0, y: 4.0, w: 10.0, h: 0.5,
    fontSize: 14, fontFace: FONT, color: "AAAAAA",
  });

  // Team members
  if (data.team) {
    slide.addText(data.team, {
      x: 1.0, y: 6.0, w: 8.0, h: 0.5,
      fontSize: 12, fontFace: FONT, color: "888888",
    });
  }
}

function addBulletSlide(
  pptx: PptxGenJS,
  title: string,
  bullets: string[],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.0, h: 0.8,
    fontSize: 28, fontFace: FONT, color: WHITE, bold: true,
  });

  // Accent underline
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 2.0, h: 0.04,
    fill: { color: ACCENT },
  });

  slide.addText(
    bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    {
      x: 0.8, y: 1.5, w: 10.5, h: 4.5,
      fontSize: 16, fontFace: FONT, color: WHITE,
      paraSpaceAfter: 10,
      lineSpacingMultiple: 1.15,
    },
  );
}

function addTwoColumnSlide(
  pptx: PptxGenJS,
  title: string,
  left: string[],
  right: string[],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.0, h: 0.8,
    fontSize: 28, fontFace: FONT, color: WHITE, bold: true,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 2.0, h: 0.04,
    fill: { color: ACCENT },
  });

  const rows = Math.max(left.length, right.length);
  const rowH = 0.85;
  const startY = 1.55;

  for (let i = 0; i < rows; i++) {
    const y = startY + i * rowH;

    // Divider line between rows
    if (i > 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: y - 0.05, w: 11.0, h: 0.01,
        fill: { color: "333355" },
      });
    }

    // Left column — framework headings
    if (left[i]) {
      slide.addText(left[i], {
        x: 0.8, y, w: 5.0, h: rowH,
        fontSize: 15, fontFace: FONT, color: ACCENT, bold: true,
        valign: "top",
      });
    }

    // Right column — details
    if (right[i]) {
      slide.addText(right[i], {
        x: 6.2, y, w: 5.6, h: rowH,
        fontSize: 14, fontFace: FONT, color: WHITE,
        valign: "top",
      });
    }
  }
}

function addThreeCardSlide(
  pptx: PptxGenJS,
  title: string,
  cards: { title: string; bullets: string[]; pro: string; con: string }[],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.0, h: 0.8,
    fontSize: 28, fontFace: FONT, color: WHITE, bold: true,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 2.0, h: 0.04,
    fill: { color: ACCENT },
  });

  const cardW = 3.5;
  const cardH = 4.8;
  const gap = 0.45;
  const startX = 0.8;
  const startY = 1.5;

  for (let i = 0; i < Math.min(cards.length, 3); i++) {
    const card = cards[i];
    const x = startX + i * (cardW + gap);

    // Card background with border
    slide.addShape(pptx.ShapeType.rect, {
      x, y: startY, w: cardW, h: cardH,
      fill: { color: BG_CARD },
      rectRadius: 0.08,
      line: { color: ACCENT, width: 1.0 },
    });

    // Card title
    slide.addText(card.title, {
      x: x + 0.25, y: startY + 0.2, w: cardW - 0.5, h: 0.5,
      fontSize: 14, fontFace: FONT, color: ACCENT, bold: true,
    });

    // Bullets
    slide.addText(
      card.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: x + 0.25, y: startY + 0.8, w: cardW - 0.5, h: 2.4,
        fontSize: 12, fontFace: FONT, color: WHITE,
        paraSpaceAfter: 6,
      },
    );

    // Pro
    slide.addText(`✓  ${card.pro}`, {
      x: x + 0.25, y: startY + 3.4, w: cardW - 0.5, h: 0.5,
      fontSize: 11, fontFace: FONT, color: "66BB6A",
    });

    // Con
    slide.addText(`✗  ${card.con}`, {
      x: x + 0.25, y: startY + 3.9, w: cardW - 0.5, h: 0.5,
      fontSize: 11, fontFace: FONT, color: "EF5350",
    });
  }
}

function addTableSlide(
  pptx: PptxGenJS,
  title: string,
  headers: string[],
  rows: string[][],
  alignRight?: number[], // column indices to right-align
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  slide.addText(title, {
    x: 0.8, y: 0.4, w: 11.0, h: 0.8,
    fontSize: 28, fontFace: FONT, color: WHITE, bold: true,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 2.0, h: 0.04,
    fill: { color: ACCENT },
  });

  const rightCols = new Set(alignRight ?? []);

  const tableRows: any[][] = [];

  // Header row
  tableRows.push(
    headers.map((h, ci) => ({
      text: h,
      options: {
        bold: true,
        color: WHITE,
        fill: { color: ACCENT },
        fontSize: 13,
        fontFace: FONT,
        align: rightCols.has(ci) ? "right" : "left",
        border: { type: "none" },
      },
    })),
  );

  // Data rows
  for (let ri = 0; ri < rows.length; ri++) {
    const rowColor = ri % 2 === 0 ? BG : BG_CARD;
    tableRows.push(
      rows[ri].map((cell, ci) => ({
        text: cell,
        options: {
          color: WHITE,
          fill: { color: rowColor },
          fontSize: 12,
          fontFace: FONT,
          align: rightCols.has(ci) ? "right" : "left",
          border: { type: "none" },
        },
      })),
    );
  }

  slide.addTable(tableRows, {
    x: 0.8, y: 1.5, w: 11.0,
    colW: headers.map(() => 11.0 / headers.length),
    rowH: 0.5,
    margin: [4, 8, 4, 8],
  });
}

function addBigStatementSlide(
  pptx: PptxGenJS,
  statement: string,
  bullets: string[],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  // Big statement — top third, font 36+
  slide.addText(statement, {
    x: 1.0, y: 0.6, w: 11.0, h: 2.2,
    fontSize: 36, fontFace: FONT, color: WHITE, bold: true,
    align: "center", valign: "middle",
  });

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.0, y: 3.0, w: 5.33, h: 0.04,
    fill: { color: ACCENT },
  });

  // Supporting bullets — smaller, below
  slide.addText(
    bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
    {
      x: 1.5, y: 3.4, w: 10.0, h: 3.4,
      fontSize: 14, fontFace: FONT, color: "CCCCCC",
      paraSpaceAfter: 10,
    },
  );
}

function addCloseSlide(pptx: PptxGenJS, text: string): void {
  const slide = pptx.addSlide();
  slide.background = { color: BG };
  accentBar(pptx, slide);

  // Decorative accent elements
  slide.addShape(pptx.ShapeType.rect, {
    x: 5.5, y: 5.2, w: 2.33, h: 0.04,
    fill: { color: ACCENT },
  });

  slide.addText(text, {
    x: 1.0, y: 2.0, w: 11.33, h: 2.5,
    fontSize: 36, fontFace: FONT, color: WHITE, bold: true,
    align: "center", valign: "middle",
  });
}

// ── Content types ────────────────────────────────────────────────────

interface CaseContent {
  title: { company: string; subtitle: string; domain: string; date: string; team?: string };
  situation: { bullets: string[] };
  analysis: { left: string[]; right: string[] };
  options: { title: string; bullets: string[]; pro: string; con: string }[];
  recommendation: { statement: string; bullets: string[] };
}

interface StrategyContent {
  title: { company: string; subtitle: string; domain: string; date: string; team?: string };
  market: { bullets: string[] };
  competitive: { left: string[]; right: string[] };
  options: { title: string; bullets: string[]; pro: string; con: string }[];
  recommendation: { statement: string; bullets: string[] };
}

interface FinanceContent {
  title: { company: string; subtitle: string; domain: string; date: string; team?: string };
  overview: { bullets: string[] };
  dcf: { headers: string[]; rows: string[][]; alignRight: number[] };
  comparables: { headers: string[]; rows: string[][]; alignRight: number[] };
  thesis: { statement: string; bullets: string[] };
}

// ── Default content ──────────────────────────────────────────────────

function defaultCaseContent(): CaseContent {
  return {
    title: {
      company: "[Company Name]",
      subtitle: "Project Analysis Analysis",
      domain: "Strategy / Finance I",
      date: today(),
      team: "Team Members",
    },
    situation: {
      bullets: [
        "Market leader facing disruption from low-cost entrants",
        "Revenue growth slowing: 12% → 4% over 3 years",
        "Board pressure to defend margin while investing in digital",
        "Regulatory environment tightening in core European markets",
      ],
    },
    analysis: {
      left: ["Five Forces", "Financial Trend", "Competitor Move", "Root Cause"],
      right: [
        "Rivalry HIGH — 3 new entrants with 30% lower cost base",
        "EBITDA margin compressed 18% → 13%",
        "Key competitor acquired logistics arm (vertical integration)",
        "Underinvestment in tech: capex/sales 2% vs 6% peer avg",
      ],
    },
    options: [
      {
        title: "Acquire & Integrate",
        bullets: ["Target digital logistics player", "Full capability transfer in 12 months", "Restructure supply chain"],
        pro: "Speed to capability",
        con: "Integration risk, €800M cost",
      },
      {
        title: "Build Organically",
        bullets: ["Hire 200-person tech team", "Internal R&D over 3-5 years", "Pilot in 2 markets first"],
        pro: "Full control, lower risk",
        con: "3-5yr lag, talent shortage",
      },
      {
        title: "Strategic Partnership",
        bullets: ["JV with established tech player", "Shared economics 60/40", "18-month co-development"],
        pro: "Low capex, fast",
        con: "IP exposure, limited control",
      },
    ],
    recommendation: {
      statement: "Pursue a targeted acquisition of a digital logistics player, funded by divesting two non-core brands",
      bullets: [
        "De-risk: structure as earn-out with 18-month integration milestone",
        "Fund: divest [Brand A] and [Brand B] — non-core, €600M combined",
        "Measure: EBITDA recovery to 16% within 24 months of close",
      ],
    },
  };
}

function defaultStrategyContent(): StrategyContent {
  return {
    title: {
      company: "[Company Name]",
      subtitle: "Strategic Analysis",
      domain: "Strategy I",
      date: today(),
      team: "Team Members",
    },
    market: {
      bullets: [
        "TAM: €45B globally, growing at 8% CAGR through 2030",
        "SAM: €12B in European core markets with regulatory tailwind",
        "Customer segments shifting: B2B growing 3x faster than B2C",
        "Digital channel penetration still <20% — significant headroom",
      ],
    },
    competitive: {
      left: ["Market Leader", "Fast Follower", "Disruptor", "Our Position"],
      right: [
        "35% share, but declining — slow to adapt to digital",
        "22% share, aggressive M&A strategy (3 deals in 18 months)",
        "8% share, 4x growth rate — digital-native, asset-light model",
        "15% share — strong brand equity, weak digital capabilities",
      ],
    },
    options: [
      {
        title: "Market Penetration",
        bullets: ["Double down on core markets", "Aggressive pricing to defend share", "Increase sales force by 40%"],
        pro: "Low risk, leverages existing strengths",
        con: "Limited upside, margin pressure",
      },
      {
        title: "Geographic Expansion",
        bullets: ["Enter LATAM via partnership", "Adapt product for local regs", "Target $500M revenue by Y3"],
        pro: "Large addressable market",
        con: "Execution complexity, FX risk",
      },
      {
        title: "Platform Pivot",
        bullets: ["Build two-sided marketplace", "Convert from product to platform", "Ecosystem revenue model"],
        pro: "10x valuation re-rate potential",
        con: "High capex, 3-year J-curve",
      },
    ],
    recommendation: {
      statement: "Execute a phased platform pivot while defending core market share through selective pricing",
      bullets: [
        "Phase 1 (0-12m): Launch marketplace MVP in 2 pilot markets, €15M investment",
        "Phase 2 (12-24m): Scale to 5 markets if unit economics validate (target LTV/CAC >3x)",
        "Hedge: maintain 90% of current sales capacity during transition",
      ],
    },
  };
}

function defaultFinanceContent(): FinanceContent {
  return {
    title: {
      company: "[Company Name]",
      subtitle: "Financial Analysis & Valuation",
      domain: "Finance I",
      date: today(),
      team: "Team Members",
    },
    overview: {
      bullets: [
        "Revenue: €8.2B (FY2025), 5-year CAGR of 6.3%",
        "EBITDA margin: 14.2% (peer median: 16.8%)",
        "Net debt / EBITDA: 2.4x — within investment-grade threshold",
        "ROIC of 11.3% vs WACC of 8.7% — positive economic value creation",
      ],
    },
    dcf: {
      headers: ["Metric", "2026E", "2027E", "2028E", "2029E", "Terminal"],
      rows: [
        ["Revenue (€M)", "8,700", "9,220", "9,775", "10,360", "—"],
        ["EBITDA (€M)", "1,240", "1,385", "1,530", "1,680", "—"],
        ["FCF (€M)", "620", "710", "805", "890", "—"],
        ["Discount Factor", "0.92", "0.85", "0.78", "0.72", "0.72"],
        ["PV of FCF (€M)", "571", "603", "628", "641", "8,540"],
      ],
      alignRight: [1, 2, 3, 4, 5],
    },
    comparables: {
      headers: ["Company", "EV/EBITDA", "P/E", "EV/Revenue", "Margin"],
      rows: [
        ["Peer A", "12.4x", "22.1x", "1.8x", "16.5%"],
        ["Peer B", "10.8x", "18.7x", "1.5x", "15.2%"],
        ["Peer C", "14.1x", "25.3x", "2.1x", "18.1%"],
        ["Median", "12.4x", "22.1x", "1.8x", "16.5%"],
        ["[Company]", "11.2x", "19.8x", "1.6x", "14.2%"],
      ],
      alignRight: [1, 2, 3, 4],
    },
    thesis: {
      statement: "BUY — 25% upside to fair value of €48/share based on blended DCF and comparables",
      bullets: [
        "Bull case (€58): Margin expansion to peer median + successful product launch = 45% upside",
        "Base case (€48): Moderate growth, gradual margin improvement = 25% upside",
        "Bear case (€32): Margin stagnation, competitive pressure = 16% downside",
      ],
    },
  };
}

// ── Fill mode: Claude-generated content ──────────────────────────────

function buildFillPrompt(template: string, caseName: string): string {
  const dateStr = today();

  if (template === "case") {
    return `You are generating content for an your organization professional project analysis presentation about: "${caseName}".
Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "title": { "company": "Company Name", "subtitle": "Short case description", "domain": "Strategy I", "date": "${dateStr}" },
  "situation": { "bullets": ["4 specific bullets about the company situation with real data/numbers"] },
  "analysis": {
    "left": ["Framework 1", "Framework 2", "Framework 3", "Framework 4"],
    "right": ["Specific finding for Framework 1", "Specific finding for Framework 2", "Specific finding for Framework 3", "Specific finding for Framework 4"]
  },
  "options": [
    { "title": "Option A name", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "main advantage", "con": "main disadvantage" },
    { "title": "Option B name", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "main advantage", "con": "main disadvantage" },
    { "title": "Option C name", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "main advantage", "con": "main disadvantage" }
  ],
  "recommendation": { "statement": "One clear recommendation sentence", "bullets": ["supporting point 1", "supporting point 2", "supporting point 3"] }
}
Make the content specific, realistic, with actual numbers and data points appropriate for an professional case discussion. Use frameworks like Porter's Five Forces, SWOT, or value chain analysis where relevant.`;
  }

  if (template === "strategy") {
    return `You are generating content for an your organization professional strategy presentation about: "${caseName}".
Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "title": { "company": "Company Name", "subtitle": "Strategy topic", "domain": "Strategy I", "date": "${dateStr}" },
  "market": { "bullets": ["4 specific bullets about market size, growth, trends with real numbers"] },
  "competitive": {
    "left": ["Competitor/Dimension 1", "Competitor/Dimension 2", "Competitor/Dimension 3", "Our Position"],
    "right": ["Specific competitive insight 1", "Specific competitive insight 2", "Specific competitive insight 3", "Our positioning and capabilities"]
  },
  "options": [
    { "title": "Option A", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "advantage", "con": "disadvantage" },
    { "title": "Option B", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "advantage", "con": "disadvantage" },
    { "title": "Option C", "bullets": ["detail 1", "detail 2", "detail 3"], "pro": "advantage", "con": "disadvantage" }
  ],
  "recommendation": { "statement": "Clear strategic recommendation", "bullets": ["supporting point 1", "supporting point 2", "supporting point 3"] }
}
Make content specific to the case with realistic numbers and your organization-style strategic analysis.`;
  }

  // finance
  return `You are generating content for an your organization professional finance/valuation presentation about: "${caseName}".
Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "title": { "company": "Company Name", "subtitle": "Valuation topic", "domain": "Finance I", "date": "${dateStr}" },
  "overview": { "bullets": ["4 specific bullets about financial performance with real numbers"] },
  "dcf": {
    "headers": ["Metric", "2026E", "2027E", "2028E", "2029E", "Terminal"],
    "rows": [
      ["Revenue (€M)", "num", "num", "num", "num", "—"],
      ["EBITDA (€M)", "num", "num", "num", "num", "—"],
      ["FCF (€M)", "num", "num", "num", "num", "—"],
      ["Discount Factor", "num", "num", "num", "num", "num"],
      ["PV of FCF (€M)", "num", "num", "num", "num", "num"]
    ],
    "alignRight": [1,2,3,4,5]
  },
  "comparables": {
    "headers": ["Company", "EV/EBITDA", "P/E", "EV/Revenue", "Margin"],
    "rows": [
      ["Real peer 1", "Xx", "Xx", "Xx", "X%"],
      ["Real peer 2", "Xx", "Xx", "Xx", "X%"],
      ["Real peer 3", "Xx", "Xx", "Xx", "X%"],
      ["Median", "Xx", "Xx", "Xx", "X%"],
      ["Target company", "Xx", "Xx", "Xx", "X%"]
    ],
    "alignRight": [1,2,3,4]
  },
  "thesis": { "statement": "BUY/HOLD/SELL — clear thesis with target price", "bullets": ["Bull case", "Base case", "Bear case"] }
}
Use realistic financial data appropriate for the company/sector. Include actual peer companies.`;
}

async function callAI(prompt: string): Promise<string | null> {
  try {
    return await aiCall(prompt);
  } catch (e) {
    console.error("⚠️  AI call failed, falling back to defaults:", (e as Error).message?.slice(0, 100));
    return null;
  }
}

function parseClaudeResponse(raw: string): any | null {
  try {
    // Try direct parse
    return JSON.parse(raw);
  } catch {
    // Try extracting JSON from possible markdown wrapper
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function fillContent<T>(template: string, caseName: string, defaultFn: () => T, webContext?: string): Promise<T> {
  console.log(`🤖 Generating content for: "${caseName}" ...`);
  let prompt = buildFillPrompt(template, caseName);
  if (webContext) {
    prompt = `Here is recent web context about this company/case:\n---\n${webContext}\n---\nUse this to make your assumptions more accurate and realistic.\n\n${prompt}`;
  }
  const raw = await callAI(prompt);
  if (!raw) return defaultFn();

  const parsed = parseClaudeResponse(raw);
  if (!parsed) {
    console.error("⚠️  Could not parse AI response, using defaults");
    return defaultFn();
  }

  console.log("✅ Content generated successfully");
  return parsed as T;
}

// ── Deck builders per template ───────────────────────────────────────

function buildCaseDeck(pptx: PptxGenJS, content: CaseContent): void {
  addTitleSlide(pptx, content.title);
  addBulletSlide(pptx, "Situation", content.situation.bullets);
  addTwoColumnSlide(pptx, "Analysis", content.analysis.left, content.analysis.right);
  addThreeCardSlide(pptx, "Options", content.options);
  addBigStatementSlide(pptx, content.recommendation.statement, content.recommendation.bullets);
  addCloseSlide(pptx, "Q&A");
}

function buildStrategyDeck(pptx: PptxGenJS, content: StrategyContent): void {
  addTitleSlide(pptx, content.title);
  addBulletSlide(pptx, "Market Overview", content.market.bullets);
  addTwoColumnSlide(pptx, "Competitive Landscape", content.competitive.left, content.competitive.right);
  addThreeCardSlide(pptx, "Strategic Options", content.options);
  addBigStatementSlide(pptx, content.recommendation.statement, content.recommendation.bullets);
}

function buildFinanceDeck(pptx: PptxGenJS, content: FinanceContent): void {
  addTitleSlide(pptx, content.title);
  addBulletSlide(pptx, "Company Overview", content.overview.bullets);
  addTableSlide(pptx, "DCF Summary", content.dcf.headers, content.dcf.rows, content.dcf.alignRight);
  addTableSlide(pptx, "Comparable Companies", content.comparables.headers, content.comparables.rows, content.comparables.alignRight);
  addBigStatementSlide(pptx, content.thesis.statement, content.thesis.bullets);
}

// ── Main export ──────────────────────────────────────────────────────

export async function generateDeck(
  template: string,
  outputDir: string,
  options?: { fill?: boolean; caseName?: string; webContext?: string },
): Promise<string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Digital Seed";

  const useFill = options?.fill && options?.caseName;

  switch (template) {
    case "case": {
      const content = useFill
        ? await fillContent("case", options!.caseName!, defaultCaseContent, options?.webContext)
        : defaultCaseContent();
      buildCaseDeck(pptx, content);
      break;
    }
    case "strategy": {
      const content = useFill
        ? await fillContent("strategy", options!.caseName!, defaultStrategyContent, options?.webContext)
        : defaultStrategyContent();
      buildStrategyDeck(pptx, content);
      break;
    }
    case "finance": {
      const content = useFill
        ? await fillContent("finance", options!.caseName!, defaultFinanceContent, options?.webContext)
        : defaultFinanceContent();
      buildFinanceDeck(pptx, content);
      break;
    }
    default:
      throw new Error(`Unknown template: ${template}`);
  }

  const outPath = join(outputDir, `${template}-deck-${today()}.pptx`);
  await pptx.writeFile({ fileName: outPath });
  return outPath;
}

// ── Google Slides upload ─────────────────────────────────────────────

function gogAvailable(): boolean {
  try {
    execSync("which gog", { stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

function uploadToGoogleSlides(filePath: string): string | null {
  try {
    const output = execSync(`gog drive upload "${filePath}"`, {
      encoding: "utf-8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Parse file ID from gog output — look for a Google Drive file ID pattern
    const idMatch = output.match(/(?:id[:\s]+|\/d\/|fileId[:\s]+)([a-zA-Z0-9_-]{20,})/i)
      || output.match(/([a-zA-Z0-9_-]{25,})/);
    if (idMatch) {
      return idMatch[1];
    }
    // If we can't parse ID, print raw output for user
    console.log("📤 Upload output:", output);
    return null;
  } catch (e) {
    console.error("⚠️  Google Drive upload failed:", (e as Error).message?.slice(0, 150));
    return null;
  }
}

// ── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

// Parse flags
let template: string | undefined;
let fillMode = false;
let caseName: string | undefined;
let format: "pptx" | "google-slides" = "pptx";
let webMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--fill") {
    fillMode = true;
  } else if (args[i] === "--case" && args[i + 1]) {
    caseName = args[i + 1];
    i++;
  } else if (args[i] === "--format" && args[i + 1]) {
    format = args[i + 1] as "pptx" | "google-slides";
    i++;
  } else if (args[i] === "--web") {
    webMode = true;
  } else if (!args[i].startsWith("--")) {
    template = args[i];
  }
}

if (!template) {
  console.log("Available deck templates:\n");
  for (const [key, desc] of Object.entries(TEMPLATES)) {
    console.log(`  ${key.padEnd(12)} ${desc}`);
  }
  console.log("\nUsage:");
  console.log("  bun run seed deck <template>                              Template with defaults");
  console.log("  bun run seed deck <template> --fill --case 'Description'  Claude-generated content");
  console.log("\nExamples:");
  console.log("  bun run seed deck case");
  console.log("  bun run seed deck case --fill --case 'Nestlé sustainability'");
  console.log("  bun run seed deck finance --fill --case 'Inditex DCF valuation'");
  process.exit(0);
}

if (!TEMPLATES[template]) {
  console.error(`Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(", ")}`);
  process.exit(1);
}

let webContext: string | undefined;
if (webMode && caseName) {
  console.log("🌐 --web: fetching live context...");
  webContext = await fetchCaseContext(caseName) || undefined;
}

const outPath = await generateDeck(template, EXPORTS_DIR, { fill: fillMode, caseName, webContext });
console.log(`✅ Generated: ${outPath}`);

if (format === "google-slides") {
  if (gogAvailable()) {
    console.log("📤 Uploading to Google Drive...");
    const fileId = uploadToGoogleSlides(outPath);
    if (fileId) {
      console.log(`🔗 Google Slides: https://docs.google.com/presentation/d/${fileId}/edit`);
    }
  } else {
    console.log("\n📋 To open in Google Slides:");
    console.log("   1. Go to drive.google.com");
    console.log("   2. Click '+ New' → 'File upload'");
    console.log(`   3. Upload: ${outPath}`);
    console.log("   4. Right-click → 'Open with' → 'Google Slides'");
  }
}
