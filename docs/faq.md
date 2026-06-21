# FAQ

## Personal Context

**Q: What's COMPASS.md and why does it matter?**
It's the file your AI reads at session start to understand your goals, values, and priorities. Without it your AI is generic — it answers questions but doesn't know what you care about. Fill it in once and every session after is better.

**Q: What's ANTI-GOALS.md for?**
It tells your AI what you've consciously decided not to do. This prevents suggestions that conflict with your actual choices — a new project when you've decided to focus, a career path you've already ruled out. Even a short list is valuable.

**Q: Do I have to fill in all the `user/` files?**
Start with COMPASS.md — that's the one with the most leverage. DOMAINS.md is worth doing if you're using the skill packs. The rest (PREFERENCES.md, ANTI-GOALS.md) can be filled in gradually as you notice gaps.

**Q: How does my AI use these files?**
It does a tiered scan at session start: a lightweight summary pass first, then loads full detail only for files relevant to your current request. This keeps context loading fast and token-efficient.

**Q: Can I share my `user/` files with collaborators?**
No — and the system is designed to discourage it. The four files you fill in (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`) are gitignored; the three starter templates (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) are tracked, so run `bun run seed privacy-scan` before pushing forks and install the optional pre-commit hook with `bun run seed hooks install`. See [SECURITY.md](../SECURITY.md#data-storage) for the full trust boundary. For collaboration, use `collab/` instead.

See [governance.md](governance.md) for a full guide to the personal context files.

---

## General

**Q: Do I need to be a developer?**
You need to be comfortable running terminal commands. The setup wizard handles configuration — no coding required to use it. You'll need basic familiarity with a text editor to edit your personal context files.

**Q: What does it cost?**
The kit is free and open source. Costs depend on the AI agent or model provider you choose. Subscription-based tools may not require separate API keys; API-based tools charge according to the provider's current pricing. Ollama/local models can run without model API costs, subject to your hardware.

**Q: Which AI agent should I use?**
Digital Seed does not recommend one agent for everyone. Claude Code is strong for terminal/project work; Cursor and Windsurf are strong editor-based options; OpenClaw and Hermes are useful for always-on assistant workflows. See `docs/agent-chooser.md` and choose based on how you work.

**Q: Can I use ChatGPT?**
Not directly — ChatGPT doesn't support MCP. You can copy patterns manually, but you won't get the full infrastructure benefits.

**Q: Is my data private?**
Mostly. `data/`, `logs/`, and the four personal `user/*.md` files (`USER.md`, `GOALS.md`, `MEMORY.md`, `PREFERENCES.md`) are gitignored. Three other `user/` files (`COMPASS.md`, `ANTI-GOALS.md`, `DOMAINS.md`) ship as tracked starter templates — if you fill them with personal content in a fork, `git status` will not warn you. Run `bun run seed privacy-scan` before pushing, and optionally install the pre-commit hook with `bun run seed hooks install`. API calls go directly from your machine to your chosen provider. See [SECURITY.md](../SECURITY.md) and [what-leaves-your-machine.md](what-leaves-your-machine.md).

**Q: Can I use this offline?**
Yes for local operations. See [offline-mode.md](offline-mode.md) and set `offline: true` in `config/config.yaml` to disable network-dependent tasks.

---

## Setup

**Q: Setup fails with "command not found: bun"**
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or ~/.bashrc
```

**Q: I don't have an API key yet**
Choose Ollama during setup for a fully local, free setup. Install Ollama from [ollama.ai](https://ollama.ai), then run `ollama pull llama3.2` or `ollama pull mistral`.

**Q: Can I use multiple AI providers?**
Yes. Configure as many as you want in `.env`. The routing system will use the appropriate one per task.

**Q: How do I re-run setup after changing API keys?**
`.env` is just a text file — edit it directly. If you originally used the optional wizard, `bun run setup` re-runs it.

---

## Skill Packs

**Q: What's included in each pack?**

| Pack | Patterns | Agent | Templates |
|------|----------|-------|-----------|
| Finance | DCF analysis, ratio analysis, LBO primer | Finance specialist (threshold 0.82) | Project workflow, learning prep |
| Strategy | Five Forces, BCG Matrix, Competitive Dynamics | Strategy specialist | Project workflow, learning prep |
| Operations | Process Analysis, Supply Chain | Operations specialist | Project workflow, learning prep |

**Q: Can I modify the pack patterns?**
Yes — they're just markdown files in `patterns/<name>/system.md`. Edit them directly. Your changes don't affect other users' installations.

**Q: How do I create my own pattern?**
```bash
mkdir patterns/my-pattern
echo "# My Pattern\n\nInstructions here..." > patterns/my-pattern/system.md
bun run marketplace install my-pattern  # registers it
bun run marketplace publish my-pattern  # generates PR to share with everyone
```

---

## Collaboration

**Q: How does the learning group feature work?**
Each member runs their own kit instance. You add your analysis to the shared `collab/study-groups/<group>/members/<you>.md` file. The system auto-merges everyone's contributions into `context.md`. Your personal files (`user/`, `data/`) are never part of the merge.

**Q: What's the pre-commit hook doing?**
The hook is opt-in — install it once with `bun run seed hooks install` (or via the optional `./setup.sh` wizard). Once installed, before every `git commit` it scans staged files for: email addresses, phone numbers, API keys, absolute file paths, and password literals. If it finds any in `collab/` files, the commit is blocked. See [SECURITY.md](../SECURITY.md#pre-commit-secret-hook).

**Q: Can I bypass the pre-commit hook?**
Yes: `git commit --no-verify`. Use this only in emergencies — the hook is there to protect you.

**Q: The collab boundary check flagged my content — what triggered it?**
```bash
bun run collab check
```
Shows exactly what pattern matched and the surrounding text. Common false positives: timestamps that look like phone numbers (we've tuned this), or file paths in code examples (use relative paths in shared content).

---

## Autonomous Tasks

**Q: What tasks run automatically?**
Only categories you've enabled in `config/autonomy.yaml`. Default: `memory-maintenance` and `daily-digest` are set to `notify` (run + tell you). Everything else is `off`.

**Q: What does "notify" vs "auto" mean?**
- `notify`: runs the task AND sends you a message about what was done
- `auto`: runs silently, results included in the daily digest only
- `off`: never runs

**Q: Will it interrupt me at night?**
No. The activity state detector identifies when you're sleeping (night hours + >60 min silence) and automatically downgrades `notify` tasks to `auto` — so you get results in the morning digest without being woken up.

---

## Technical

**Q: What's in `.claude/settings.json`?**
MCP server configuration — tells Claude Code how to connect to the memory, tasks, RAG, and graph servers. This file is **gitignored**: copy it from the tracked `.claude/settings.example.json` (`cp .claude/settings.example.json .claude/settings.json`) and **never paste real secrets** (API keys, DB passwords, OAuth file contents) into it — keep secrets in `.env`. Don't edit it manually unless you know what you're doing.

**Q: How does RAG search work?**
The `rag-server` indexes your `user/`, `patterns/`, and `docs/` directories using embeddings. By **default it uses local embeddings (Ollama `nomic-embed-text`)** so your content stays on your machine. It only uses OpenAI (`text-embedding-3-small`) — i.e. uploads the indexed file text to OpenAI — if you **explicitly opt in** with `RAG_EMBED_CLOUD=1`. Indexed content is stored locally in `data/rag/`. Use `bun run embed` to re-index after adding content.

**Q: Can I add my Obsidian vault to RAG?**
Yes — add your vault path to `config/embeddings.yaml` under `paths:`. Then run `bun run embed`.

**Q: How do I index a GitHub repo?**
```bash
bun run repo-bot learn owner/repo          # public repo
bun run repo-bot learn owner/repo --token <PAT>  # private repo
bun run repo-bot search-all "my query"     # search across all indexed repos
```

**Q: The token report shows nothing**
Token tracking starts automatically after your first agent interaction. Run `bun run tokens` after a session.

---

## Contributing

**Q: How do I contribute a pattern?**
1. Create `patterns/<name>/system.md`
2. Test it locally
3. Run `bun run marketplace publish patterns/<name>` for PR instructions
4. Open a PR to `LeoMaslyak/digital-seed`

**Q: How do I contribute a skill pack?**
Copy an existing pack from `packs/`, customise it, and add an entry to `data/registry.json`. Open a PR — packs are warmly welcomed, especially for community domains not yet covered.

**Q: Something's broken — how do I report it?**
Open an issue at [github.com/LeoMaslyak/digital-seed](https://github.com/LeoMaslyak/digital-seed/issues). Include: your OS, Bun version (`bun --version`), and the exact error message.
