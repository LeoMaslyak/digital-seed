# Level Up — Beyond the Starter Kit

> **After you've done the basic setup.** This guide layers in three more tools that turn your AI agent from useful into genuinely powerful: Daniel Miessler's PAI, Fabric, and professional-grade Claude Code plugins.

---

## The Stack at a Glance

```
Claude Code (your AI agent)
├── Digital Seed      ← you have this (base layer: memory, context, packs)
├── PAI                  ← Daniel Miessler's infrastructure layer
├── Fabric               ← 250+ reusable AI pattern workflows
├── gstack               ← engineering skills: QA, security review, ship workflow
└── superpowers          ← meta-skills: planning, debugging, code review
```

Each layer is independent — install any combination, in any order.

---

## 1. Daniel Miessler's PAI

**What it is:** A complete personal AI infrastructure by the person who coined the term. Think of DAI as the your organization-adapted version of PAI — similar philosophy, tuned for professional users.

**Why add it:** PAI has a richer identity/values system, voice features, and a larger community contributing patterns and packs.

**Install:**
```bash
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git ~/pai-install
cd ~/pai-install/Releases/v4.0.3
# Copy only the .claude dir — do NOT replace your whole home directory
cp -rn .claude/skills ~/.claude/
cp -rn .claude/hooks ~/.claude/
cp -rn .claude/PAI ~/.claude/
# Run the installer (merges, does not overwrite existing files)
bash .claude/install.sh
```

> **Safe merge:** the `cp -rn` flags skip any files that already exist, so your DAI setup is protected.

**After install:** Run `source ~/.zshrc && pai` to launch.

**Docs:** [github.com/danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure)

---

## 2. Fabric — 250+ AI Workflows

**What it is:** A CLI tool by Daniel Miessler that gives you ready-made "patterns" — structured prompts for specific tasks. Pipe any text in, get a structured AI output.

**Why add it:** Fabric patterns are immediately useful without setup. Summarise a paper, extract wisdom from a podcast, analyse a business proposal — one command each.

**Install (macOS):**
```bash
# Download the binary
curl -sL "https://github.com/danielmiessler/Fabric/releases/latest/download/fabric_Darwin_arm64.tar.gz" -o /tmp/fabric.tar.gz
tar -xf /tmp/fabric.tar.gz -C /tmp/
mv /tmp/fabric /usr/local/bin/fabric-ai
```

**Configure:**

> **Heads-up: Fabric needs an API key, not a subscription.** Claude Max is a chat subscription — it doesn't grant API access. You have two options:
> - **Option A (easiest):** Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com). Light Fabric use costs ~$2–5/month at typical user volume.
> - **Option B (free):** Install [Ollama](https://ollama.com) with a local model (`ollama pull llama3.2`) and select it during Fabric setup. Slower, but free forever.

```bash
mkdir -p ~/.config/fabric
fabric-ai --setup
# Option A: select "Anthropic" → paste your API key
# Option B: select "Ollama" → enter model name (e.g. llama3.2)
```

**Try it now:**
```bash
# Summarise anything
echo "Paste any article text here" | fabric-ai --pattern create_summary

# Extract the wisdom from a long read
cat some-article.txt | fabric-ai --pattern extract_wisdom

# Get a 5-sentence version of anything
echo "Long text..." | fabric-ai --pattern create_5_sentence_summary

# List all 250+ patterns
fabric-ai --listpatterns
```

**Docs:** [github.com/danielmiessler/fabric](https://github.com/danielmiessler/fabric)

---

## 3. Connect Claude Code to GitHub

Giving your AI agent access to GitHub lets it read issues, review code, and understand your projects.

**Step 1 — Install GitHub CLI:**
```bash
# macOS
brew install gh

# Windows (WSL)
sudo apt install gh
```

**Step 2 — Log in:**
```bash
gh auth login
# Choose: GitHub.com → HTTPS → Login with browser
```

**Step 3 — Tell Claude Code:**

Inside Claude Code, you can now reference any repo:
```
"Summarise the open issues in my repo username/repo-name"
"What changed in the last 5 commits of username/repo?"
```

---

## 4. Claude Code Plugins

Plugins extend what Claude Code can do. Install them once and every Claude session has access.

### superpowers — meta-skills for how to work

Adds planning, debugging, code review, and team workflow skills to Claude.

```bash
# Inside Claude Code, run:
/plugin install superpowers@claude-plugins-official
```

Key skills you'll use:
- `/brainstorming` — structured idea development with design docs
- `/investigate` — systematic debugging
- `/review` — pre-commit code review

### gstack — engineering workflow

Adds 30+ skills for QA, security audits, design review, and release automation.

**Install:** Open Claude Code and paste this prompt — Claude does the rest automatically:

> Install gstack: run `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` then add a "gstack" section to CLAUDE.md that lists the available skills: /office-hours, /browse, /qa, /design-review, /review, /ship, /investigate, /cso, /retro

Key skills:
- `/browse` — AI-controlled browser (faster than ChatGPT browsing)
- `/qa` — systematic QA testing
- `/investigate` — root-cause analysis
- `/review` — pre-PR code review
- `/ship` — safe merge + deploy workflow

---

## Putting It All Together

After installing everything, a typical session looks like:

```bash
# Start your AI with full context
cd ~/digital-seed && claude

# Or use Fabric for quick pattern runs
cat my-case-brief.pdf | fabric-ai --pattern analyze_paper
echo "Nestlé Q3 revenue grew 4.2% despite..." | fabric-ai --pattern extract_wisdom

# Use Claude Code with skills
claude  # then: /brainstorming "How should I structure my Finance midterm prep?"
claude  # then: /investigate "Why is my DCF model giving different results than the Excel?"
```

---

## What Each Tool Knows About You

| Tool | Knows | How |
|------|-------|-----|
| Digital Seed | Your goals, domains, preferences | `user/` files — loaded every session |
| PAI | Your identity, values, life philosophy | `~/.claude/USER/` files |
| Fabric | Nothing personal by default | Stateless — one-shot patterns |
| gstack | Your project structure | Reads from current working directory |
| superpowers | Nothing personal | Task-specific skills only |

The most important thing: keep your DAI `user/COMPASS.md` updated. Everything else is optional tooling. The AI that knows you is more valuable than the one with more plugins.

---

## Common Questions

**Do I need all of these?**
No. Start with DAI + Claude Code. Add PAI when you want a richer personal identity layer. Add Fabric when you find yourself doing the same text-processing task repeatedly. Add plugins when you start doing code projects.

**Does this work without an API key?**
Mostly. Claude Code with a Claude Max subscription handles DAI, PAI, and gstack — no separate key needed for those. Fabric is the exception: it needs a real Anthropic API key OR a free local Ollama model. See Section 2 above.

**My classmates are on Windows — does this work?**
Yes. See [install-claude-code.md](install-claude-code.md) for the WSL2 setup path. All tools above work identically inside WSL2.

**Is my personal data shared anywhere?**
No. `user/` files are gitignored. Your COMPASS.md, goals, and memory files never leave your machine unless you explicitly push them.
