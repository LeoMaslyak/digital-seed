# Web Fetching, Scraping & Google Drive

## What is this?

These commands let you **grab content from the web** and **manage files** — all from the command line. No browser clicking required.

- **Web fetching** = downloading a web page and converting it to clean, readable text (stripping ads, menus, etc.)
- **Web scraping** = extracting specific pieces of data from a page (e.g., all the headings, all the links in a table)
- **Drive integration** = uploading/downloading files to Google Drive from the terminal

## Why professional users should care

- **Case research**: Quickly grab company news, financial data, or industry reports as clean text
- **Bulk reading**: Save a list of article URLs and fetch them all at once
- **Paper downloads**: Download PDFs or datasets from domain materials in bulk
- **AI summaries**: Fetch a long article and get an instant AI summary
- **Google Drive**: Upload your exports (decks, spreadsheets) directly to Drive for sharing

---

## Commands

### Fetch a web page

```bash
# Get clean text from any URL
bun run seed web fetch https://learning checkpointple.com/article

# Fetch + get an AI summary
bun run seed web fetch https://learning checkpointple.com/article --summarize
```

### Scrape specific data

```bash
# Extract all h2 headings from a page
bun run seed web scrape https://learning checkpointple.com --selector h2

# Extract table rows, output as JSON
bun run seed web scrape https://learning checkpointple.com --selector "table tr" --json
```

### Bulk operations

Create a text file with one URL per line:

```
# urls.txt — my research list
https://learning checkpointple.com/article-1
https://learning checkpointple.com/article-2
https://learning checkpointple.com/report.pdf
```

Then:

```bash
# Fetch all as text
bun run seed web bulk urls.txt

# Download all files locally (saved to exports/)
bun run seed web bulk urls.txt --download

# Download all files and upload to Google Drive
bun run seed web bulk urls.txt --drive

# Fetch all and get AI summaries
bun run seed web bulk urls.txt --summarize
```

### Web research

```bash
# Search the web and get an AI-powered summary
bun run seed web research "Porter's five forces airline industry"
bun run seed web research "Inditex sustainability strategy 2025"
```

### Google Drive

```bash
# Upload a file
bun run seed drive upload exports/case-deck-2026-03-20.pptx

# Download a file from a URL
bun run seed drive download https://learning checkpointple.com/report.pdf

# Download + immediately upload to Drive
bun run seed drive download https://learning checkpointple.com/report.pdf --drive

# Bulk download from a URL list
bun run seed drive bulk urls.txt --drive
```

---

## Tips & Troubleshooting

### Some websites block scraping

This is normal. If a fetch fails or returns garbage:

1. **Try `--selector`** — sometimes only the full page is blocked but specific elements work
2. **Try a different URL** — some sites have mobile or API versions that are more accessible
3. **Use official APIs** — many data providers (World Bank, FRED, Yahoo Finance) have free APIs
4. **Use `web research`** — this searches via Google which can often access content directly

### Google Drive setup

Drive uploads use the `gog` CLI tool. If you don't have it installed:

- The commands will still work for downloading — files are saved to the `exports/` folder
- To enable Drive uploads, install gog and authenticate with your Google account
- Without gog, you'll see manual upload instructions instead

### Character limits

- Fetched pages are capped at 50,000 characters by default (plenty for most articles)
- AI summaries process the first ~30,000 characters
- Bulk fetch preview shows first 2,000 characters per URL

### What this does NOT do

- No login/authentication — only public pages
- No JavaScript rendering — static HTML only
- No paywall bypassing — respects access restrictions
- No browser automation — lightweight fetch only
