#!/usr/bin/env bun
/**
 * Excel template generator — creates pre-filled financial workbooks.
 *
 * Usage:
 *   bun run scripts/excel-gen.ts dcf|ratios|project
 *   bun run scripts/excel-gen.ts            (list templates)
 */

import ExcelJS from "exceljs";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import { aiCall } from "./lib/ai-call.ts";
import { fetchCaseContext } from "./lib/web-fetcher.ts";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const EXPORTS_DIR = join(ROOT, "exports");

const TEMPLATES: Record<string, string> = {
  dcf: "Discounted Cash Flow model (Assumptions, Projections, Valuation, Sensitivity)",
  ratios: "Financial ratios template (Liquidity, Profitability, Leverage, Efficiency)",
  project: "general project analysis data table (company, financials, ratios, notes)",
  case: "legacy alias for project analysis",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function headerStyle(): Partial<ExcelJS.Style> {
  return {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A90D9" } },
    alignment: { horizontal: "center" },
  };
}

function buildDCF(wb: ExcelJS.Workbook): void {
  // Assumptions
  const assumptions = wb.addWorksheet("Assumptions");
  const aHeaders = ["Parameter", "Value", "Unit"];
  assumptions.addRow(aHeaders);
  assumptions.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
  const aData = [
    ["Revenue Growth Rate", 0.08, "%"],
    ["COGS % of Revenue", 0.60, "%"],
    ["OpEx % of Revenue", 0.15, "%"],
    ["Tax Rate", 0.25, "%"],
    ["WACC", 0.10, "%"],
    ["Terminal Growth Rate", 0.02, "%"],
    ["CapEx % of Revenue", 0.05, "%"],
    ["D&A % of Revenue", 0.03, "%"],
    ["Change in NWC % of Revenue", 0.02, "%"],
  ];
  aData.forEach((r) => assumptions.addRow(r));
  assumptions.columns = [{ width: 30 }, { width: 15 }, { width: 10 }];

  // Projections
  const proj = wb.addWorksheet("Projections");
  const years = ["Item", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];
  proj.addRow(years);
  proj.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
  const baseRev = 1000;
  const projData = [
    ["Revenue", baseRev, baseRev * 1.08, baseRev * 1.08 ** 2, baseRev * 1.08 ** 3, baseRev * 1.08 ** 4],
    ["COGS", -600, -648, -700, -756, -816],
    ["Gross Profit", 400, 432, 467, 504, 544],
    ["Operating Expenses", -150, -162, -175, -189, -204],
    ["EBIT", 250, 270, 292, 315, 340],
    ["Tax", -62.5, -67.5, -73, -78.75, -85],
    ["NOPAT", 187.5, 202.5, 219, 236.25, 255],
    ["D&A", 30, 32.4, 35, 37.8, 40.8],
    ["CapEx", -50, -54, -58.3, -63, -68],
    ["Δ NWC", -20, -21.6, -23.3, -25.2, -27.2],
    ["Free Cash Flow", 147.5, 159.3, 172.7, 185.85, 200.6],
  ];
  projData.forEach((r) => proj.addRow(r));
  proj.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];

  // Valuation
  const val = wb.addWorksheet("Valuation");
  val.addRow(["Valuation Summary"]);
  val.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
  const valData = [
    ["Sum of PV of FCFs", "=NPV(0.10, Projections!B12:F12)"],
    ["Terminal Value", "=Projections!F12*(1+0.02)/(0.10-0.02)"],
    ["PV of Terminal Value", "=B3/(1.10^5)"],
    ["Enterprise Value", "=B2+B4"],
    ["Net Debt", 200],
    ["Equity Value", "=B5-B6"],
    ["Shares Outstanding", 100],
    ["Implied Price/Share", "=B7/B8"],
  ];
  valData.forEach((r) => val.addRow(r));
  val.columns = [{ width: 28 }, { width: 22 }];

  // Sensitivity
  const sens = wb.addWorksheet("Sensitivity");
  sens.addRow(["WACC \\ Terminal Growth", "1.0%", "1.5%", "2.0%", "2.5%", "3.0%"]);
  sens.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
  const waccRates = [0.08, 0.09, 0.10, 0.11, 0.12];
  const growthRates = [0.01, 0.015, 0.02, 0.025, 0.03];
  const fcf5 = 200.6;
  for (const w of waccRates) {
    const row: (string | number)[] = [`${(w * 100).toFixed(0)}%`];
    for (const g of growthRates) {
      const tv = (fcf5 * (1 + g)) / (w - g);
      const pvTV = tv / (1 + w) ** 5;
      row.push(Math.round(pvTV));
    }
    sens.addRow(row);
  }
  sens.columns = [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];
}

function buildRatios(wb: ExcelJS.Workbook): void {
  const sections: [string, string[][]][] = [
    ["Liquidity", [
      ["Current Ratio", "Current Assets / Current Liabilities", "1.5"],
      ["Quick Ratio", "(Current Assets - Inventory) / Current Liabilities", "1.2"],
      ["Cash Ratio", "Cash / Current Liabilities", "0.3"],
      ["Working Capital", "Current Assets - Current Liabilities", "500"],
    ]],
    ["Profitability", [
      ["Gross Margin", "Gross Profit / Revenue", "40%"],
      ["Operating Margin", "EBIT / Revenue", "25%"],
      ["Net Margin", "Net Income / Revenue", "18%"],
      ["ROE", "Net Income / Shareholders Equity", "15%"],
      ["ROA", "Net Income / Total Assets", "8%"],
      ["ROIC", "NOPAT / Invested Capital", "12%"],
    ]],
    ["Leverage", [
      ["Debt-to-Equity", "Total Debt / Shareholders Equity", "0.8"],
      ["Debt-to-Assets", "Total Debt / Total Assets", "0.4"],
      ["Interest Coverage", "EBIT / Interest Expense", "6.0"],
      ["Equity Multiplier", "Total Assets / Shareholders Equity", "1.8"],
    ]],
    ["Efficiency", [
      ["Asset Turnover", "Revenue / Total Assets", "1.2"],
      ["Inventory Turnover", "COGS / Average Inventory", "8.0"],
      ["Receivables Turnover", "Revenue / Average Receivables", "10.0"],
      ["Days Sales Outstanding", "365 / Receivables Turnover", "36.5"],
      ["Days Inventory Outstanding", "365 / Inventory Turnover", "45.6"],
    ]],
  ];

  for (const [name, rows] of sections) {
    const ws = wb.addWorksheet(name);
    ws.addRow(["Ratio", "Formula", "Value"]);
    ws.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
    rows.forEach((r) => ws.addRow(r));
    ws.columns = [{ width: 28 }, { width: 48 }, { width: 14 }];
  }
}

function buildCase(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet("Project Data");
  const headers = ["Field", "Value", "Notes"];
  ws.addRow(headers);
  ws.getRow(1).eachCell((c) => Object.assign(c, { style: headerStyle() }));
  const data = [
    ["Company Name", "", "Enter company name"],
    ["Industry", "", "Sector / sub-sector"],
    ["Year", "", "Fiscal year"],
    ["Revenue (€M)", "", ""],
    ["EBITDA (€M)", "", ""],
    ["Net Income (€M)", "", ""],
    ["Total Assets (€M)", "", ""],
    ["Total Debt (€M)", "", ""],
    ["Shareholders Equity (€M)", "", ""],
    ["Employees", "", ""],
    ["Revenue Growth (%)", "", "YoY"],
    ["Gross Margin (%)", "", ""],
    ["EBITDA Margin (%)", "", ""],
    ["Net Margin (%)", "", ""],
    ["ROE (%)", "", ""],
    ["Debt/Equity", "", ""],
    ["Current Ratio", "", ""],
    ["Key Issue 1", "", "From the source material"],
    ["Key Issue 2", "", ""],
    ["Key Issue 3", "", ""],
    ["Recommendation", "", "Your analysis"],
  ];
  data.forEach((r) => ws.addRow(r));
  ws.columns = [{ width: 28 }, { width: 22 }, { width: 32 }];
}

// ── AI fill ─────────────────────────────────────────────────────────

interface DCFAssumptions {
  baseRevenue: number;
  revenueGrowth: number;
  cogsPercent: number;
  opexPercent: number;
  taxRate: number;
  wacc: number;
  terminalGrowth: number;
  capexPercent: number;
  daPercent: number;
  nwcPercent: number;
}

interface RatiosFill {
  company: string;
  sector: string;
  year: string;
  liquidity: { currentRatio: string; quickRatio: string; cashRatio: string; workingCapital: string };
  profitability: { grossMargin: string; operatingMargin: string; netMargin: string; roe: string; roa: string; roic: string };
  leverage: { debtToEquity: string; debtToAssets: string; interestCoverage: string; equityMultiplier: string };
  efficiency: { assetTurnover: string; inventoryTurnover: string; receivablesTurnover: string; dso: string; dio: string };
}

interface CaseFill {
  companyName: string;
  industry: string;
  year: string;
  revenue: string;
  ebitda: string;
  netIncome: string;
  totalAssets: string;
  totalDebt: string;
  equity: string;
  employees: string;
  revenueGrowth: string;
  grossMargin: string;
  ebitdaMargin: string;
  netMargin: string;
  roe: string;
  debtEquity: string;
  currentRatio: string;
  keyIssue1: string;
  keyIssue2: string;
  keyIssue3: string;
  recommendation: string;
}

function buildExcelFillPrompt(template: string, topicName: string): string {
  if (template === "dcf") {
    return `You are generating DCF assumptions for: "${topicName}".
Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "baseRevenue": 1000,
  "revenueGrowth": 0.08,
  "cogsPercent": 0.60,
  "opexPercent": 0.15,
  "taxRate": 0.25,
  "wacc": 0.10,
  "terminalGrowth": 0.02,
  "capexPercent": 0.05,
  "daPercent": 0.03,
  "nwcPercent": 0.02
}
Use realistic numbers for this company/topic. baseRevenue in millions (local currency). All percentages as decimals (e.g. 8% = 0.08).`;
  }

  if (template === "ratios") {
    return `You are generating financial ratios for: "${topicName}".
Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "company": "Company Name",
  "sector": "Sector",
  "year": "2025",
  "liquidity": { "currentRatio": "1.5", "quickRatio": "1.2", "cashRatio": "0.3", "workingCapital": "500" },
  "profitability": { "grossMargin": "40%", "operatingMargin": "25%", "netMargin": "18%", "roe": "15%", "roa": "8%", "roic": "12%" },
  "leverage": { "debtToEquity": "0.8", "debtToAssets": "0.4", "interestCoverage": "6.0", "equityMultiplier": "1.8" },
  "efficiency": { "assetTurnover": "1.2", "inventoryTurnover": "8.0", "receivablesTurnover": "10.0", "dso": "36.5", "dio": "45.6" }
}
Use realistic financial data for the company/sector.`;
  }

  // project
  return `You are generating project analysis financial data for: "${topicName}".
Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "companyName": "Company Name",
  "industry": "Industry/Sector",
  "year": "2025",
  "revenue": "€8,200M",
  "ebitda": "€1,150M",
  "netIncome": "€720M",
  "totalAssets": "€15,400M",
  "totalDebt": "€4,200M",
  "equity": "€6,800M",
  "employees": "125,000",
  "revenueGrowth": "6.3%",
  "grossMargin": "42%",
  "ebitdaMargin": "14%",
  "netMargin": "8.8%",
  "roe": "10.6%",
  "debtEquity": "0.62",
  "currentRatio": "1.3",
  "keyIssue1": "First key strategic issue",
  "keyIssue2": "Second key issue",
  "keyIssue3": "Third key issue",
  "recommendation": "Your recommended action"
}
Use realistic data for this company.`;
}

function parseJSON(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function applyDCFFill(wb: ExcelJS.Workbook, data: DCFAssumptions): void {
  const assumptions = wb.getWorksheet("Assumptions");
  if (!assumptions) return;

  const vals: [string, number][] = [
    ["Revenue Growth Rate", data.revenueGrowth],
    ["COGS % of Revenue", data.cogsPercent],
    ["OpEx % of Revenue", data.opexPercent],
    ["Tax Rate", data.taxRate],
    ["WACC", data.wacc],
    ["Terminal Growth Rate", data.terminalGrowth],
    ["CapEx % of Revenue", data.capexPercent],
    ["D&A % of Revenue", data.daPercent],
    ["Change in NWC % of Revenue", data.nwcPercent],
  ];

  for (const [param, value] of vals) {
    assumptions.eachRow((row) => {
      if (row.getCell(1).value === param) {
        row.getCell(2).value = value;
      }
    });
  }

  // Rebuild projections with AI-sourced assumptions
  const proj = wb.getWorksheet("Projections");
  if (!proj) return;

  const g = data.revenueGrowth;
  const base = data.baseRevenue;
  const revs = Array.from({ length: 5 }, (_, i) => Math.round(base * (1 + g) ** i));
  const cogs = revs.map((r) => Math.round(-r * data.cogsPercent));
  const gross = revs.map((r, i) => r + cogs[i]);
  const opex = revs.map((r) => Math.round(-r * data.opexPercent));
  const ebit = gross.map((gp, i) => gp + opex[i]);
  const tax = ebit.map((e) => Math.round(-e * data.taxRate));
  const nopat = ebit.map((e, i) => e + tax[i]);
  const da = revs.map((r) => Math.round(r * data.daPercent));
  const capex = revs.map((r) => Math.round(-r * data.capexPercent));
  const nwc = revs.map((r) => Math.round(-r * data.nwcPercent));
  const fcf = nopat.map((n, i) => n + da[i] + capex[i] + nwc[i]);

  const projRows: (string | number)[][] = [
    ["Revenue", ...revs],
    ["COGS", ...cogs],
    ["Gross Profit", ...gross],
    ["Operating Expenses", ...opex],
    ["EBIT", ...ebit],
    ["Tax", ...tax],
    ["NOPAT", ...nopat],
    ["D&A", ...da],
    ["CapEx", ...capex],
    ["Δ NWC", ...nwc],
    ["Free Cash Flow", ...fcf],
  ];

  for (let i = 0; i < projRows.length; i++) {
    const row = proj.getRow(i + 2); // row 1 is header
    for (let j = 0; j < projRows[i].length; j++) {
      row.getCell(j + 1).value = projRows[i][j];
    }
  }

  // Update Sensitivity with new WACC and FCF
  const sens = wb.getWorksheet("Sensitivity");
  if (!sens) return;
  const fcf5 = fcf[4];
  const waccRates = [data.wacc - 0.02, data.wacc - 0.01, data.wacc, data.wacc + 0.01, data.wacc + 0.02];
  const growthRates = [0.01, 0.015, data.terminalGrowth, data.terminalGrowth + 0.005, data.terminalGrowth + 0.01];

  // Update header
  sens.getRow(1).getCell(1).value = "WACC \\ Terminal Growth";
  for (let gi = 0; gi < growthRates.length; gi++) {
    sens.getRow(1).getCell(gi + 2).value = `${(growthRates[gi] * 100).toFixed(1)}%`;
  }

  for (let wi = 0; wi < waccRates.length; wi++) {
    const row = sens.getRow(wi + 2);
    row.getCell(1).value = `${(waccRates[wi] * 100).toFixed(0)}%`;
    for (let gi = 0; gi < growthRates.length; gi++) {
      const w = waccRates[wi];
      const gRate = growthRates[gi];
      if (w <= gRate) { row.getCell(gi + 2).value = "N/A"; continue; }
      const tv = (fcf5 * (1 + gRate)) / (w - gRate);
      const pvTV = tv / (1 + w) ** 5;
      row.getCell(gi + 2).value = Math.round(pvTV);
    }
  }
}

function applyRatiosFill(wb: ExcelJS.Workbook, data: RatiosFill): void {
  const mapping: Record<string, Record<string, string>> = {
    Liquidity: {
      "Current Ratio": data.liquidity.currentRatio,
      "Quick Ratio": data.liquidity.quickRatio,
      "Cash Ratio": data.liquidity.cashRatio,
      "Working Capital": data.liquidity.workingCapital,
    },
    Profitability: {
      "Gross Margin": data.profitability.grossMargin,
      "Operating Margin": data.profitability.operatingMargin,
      "Net Margin": data.profitability.netMargin,
      "ROE": data.profitability.roe,
      "ROA": data.profitability.roa,
      "ROIC": data.profitability.roic,
    },
    Leverage: {
      "Debt-to-Equity": data.leverage.debtToEquity,
      "Debt-to-Assets": data.leverage.debtToAssets,
      "Interest Coverage": data.leverage.interestCoverage,
      "Equity Multiplier": data.leverage.equityMultiplier,
    },
    Efficiency: {
      "Asset Turnover": data.efficiency.assetTurnover,
      "Inventory Turnover": data.efficiency.inventoryTurnover,
      "Receivables Turnover": data.efficiency.receivablesTurnover,
      "Days Sales Outstanding": data.efficiency.dso,
      "Days Inventory Outstanding": data.efficiency.dio,
    },
  };

  for (const [sheetName, ratios] of Object.entries(mapping)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    ws.eachRow((row) => {
      const label = String(row.getCell(1).value ?? "");
      if (ratios[label] !== undefined) {
        row.getCell(3).value = ratios[label];
      }
    });
  }
}

function applyCaseFill(wb: ExcelJS.Workbook, data: CaseFill): void {
  const ws = wb.getWorksheet("Project Data");
  if (!ws) return;

  const mapping: Record<string, string> = {
    "Company Name": data.companyName,
    "Industry": data.industry,
    "Year": data.year,
    "Revenue (€M)": data.revenue,
    "EBITDA (€M)": data.ebitda,
    "Net Income (€M)": data.netIncome,
    "Total Assets (€M)": data.totalAssets,
    "Total Debt (€M)": data.totalDebt,
    "Shareholders Equity (€M)": data.equity,
    "Employees": data.employees,
    "Revenue Growth (%)": data.revenueGrowth,
    "Gross Margin (%)": data.grossMargin,
    "EBITDA Margin (%)": data.ebitdaMargin,
    "Net Margin (%)": data.netMargin,
    "ROE (%)": data.roe,
    "Debt/Equity": data.debtEquity,
    "Current Ratio": data.currentRatio,
    "Key Issue 1": data.keyIssue1,
    "Key Issue 2": data.keyIssue2,
    "Key Issue 3": data.keyIssue3,
    "Recommendation": data.recommendation,
  };

  ws.eachRow((row) => {
    const label = String(row.getCell(1).value ?? "");
    if (mapping[label] !== undefined) {
      row.getCell(2).value = mapping[label];
    }
  });
}

async function fillExcelContent(wb: ExcelJS.Workbook, template: string, topicName: string, webContext?: string): Promise<void> {
  console.log(`🤖 Generating Excel assumptions for: "${topicName}" ...`);
  let prompt = buildExcelFillPrompt(template, topicName);
  if (webContext) {
    prompt = `Here is recent web context about this company/topic:\n---\n${webContext}\n---\nUse this to make your assumptions more accurate and realistic.\n\n${prompt}`;
  }

  let raw: string | null = null;
  try {
    raw = await aiCall(prompt);
  } catch (e) {
    console.error("⚠️  AI call failed, keeping defaults:", (e as Error).message?.slice(0, 100));
    return;
  }

  if (!raw) return;
  const parsed = parseJSON(raw);
  if (!parsed) {
    console.error("⚠️  Could not parse AI response, keeping defaults");
    return;
  }

  if (template === "dcf") applyDCFFill(wb, parsed as DCFAssumptions);
  else if (template === "ratios") applyRatiosFill(wb, parsed as RatiosFill);
  else if (template === "case" || template === "project") applyCaseFill(wb, parsed as CaseFill);

  console.log("✅ AI-generated assumptions applied");
}

export async function generateExcel(template: string, outputDir: string, options?: { fill?: boolean; topicName?: string; webContext?: string }): Promise<string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Digital Seed";
  wb.created = new Date();

  switch (template) {
    case "dcf":
      buildDCF(wb);
      break;
    case "ratios":
      buildRatios(wb);
      break;
    case "case":
    case "project":
      buildCase(wb);
      break;
    default:
      throw new Error(`Unknown template: ${template}`);
  }

  if (options?.fill && options?.topicName) {
    await fillExcelContent(wb, template, options.topicName, options.webContext);
  }

  const outPath = join(outputDir, `${template}-${today()}.xlsx`);
  await wb.xlsx.writeFile(outPath);
  return outPath;
}

// ── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

let template: string | undefined;
let fillMode = false;
let topicName: string | undefined;
let webMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--fill") {
    fillMode = true;
  } else if (args[i] === "--topic" && args[i + 1]) {
    topicName = args[i + 1];
    i++;
  } else if (args[i] === "--web") {
    webMode = true;
  } else if (!args[i].startsWith("--")) {
    template = args[i];
  }
}

if (!template) {
  console.log("Available Excel templates:\n");
  for (const [key, desc] of Object.entries(TEMPLATES)) {
    console.log(`  ${key.padEnd(10)} ${desc}`);
  }
  console.log("\nUsage:");
  console.log("  bun run scripts/excel-gen.ts <template>");
  console.log("  bun run scripts/excel-gen.ts <template> --fill --topic 'Company name'");
  process.exit(0);
}

if (!TEMPLATES[template]) {
  console.error(`Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(", ")}`);
  process.exit(1);
}

let webContext: string | undefined;
if (webMode && topicName) {
  console.log("🌐 --web: fetching live context...");
  webContext = await fetchCaseContext(topicName) || undefined;
}

const outPath = await generateExcel(template, EXPORTS_DIR, { fill: fillMode, topicName, webContext });
console.log(`✅ Generated: ${outPath}`);
