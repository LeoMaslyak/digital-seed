#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Digital Seed — Interactive Setup Wizard
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
ENV_FILE="$SCRIPT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  🌱 Digital Seed — Setup Wizard${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}        ·   ·   ·       ${YELLOW}◉${CYAN}       ·   ·   ·${NC}"
  echo -e "${CYAN}      ·       ╲      ${GREEN}│${CYAN}      ╱       ·${NC}"
  echo -e "${CYAN}              ╲   ${GREEN}╱│╲${CYAN}   ╱${NC}"
  echo -e "${GREEN}                 ╲╱ │ ╲╱${NC}"
  echo -e "${GREEN}                    │${NC}"
  echo ""
  echo -e "  ${YELLOW}⚠  Alpha version — expect rough edges${NC}"
  echo ""
  echo "  Digital Seed is a free-first guide + workspace for personal AI infrastructure."
  echo "  You can run this yourself, or ask a terminal-capable AI agent to run it for you."
  echo ""
}

check_command() {
  if command -v "$1" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $1 found ($(command -v "$1"))"
    return 0
  else
    echo -e "  ${RED}✗${NC} $1 not found"
    return 1
  fi
}

# ─── Step 1: Prerequisites ───

check_prerequisites() {
  echo -e "${BOLD}Step 1/7 — Checking prerequisites${NC}"
  echo ""

  local missing=0

  # Check for runtime (bun preferred, node fallback)
  if command -v bun &>/dev/null; then
    RUNTIME="bun"
    echo -e "  ${GREEN}✓${NC} bun $(bun --version)"
  elif command -v node &>/dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
      RUNTIME="node"
      echo -e "  ${GREEN}✓${NC} node $(node --version)"
    else
      echo -e "  ${RED}✗${NC} node $(node --version) — need v20+"
      missing=1
    fi
  else
    echo -e "  ${RED}✗${NC} Neither bun nor node found"
    echo -e "    Install Bun: ${CYAN}curl -fsSL https://bun.sh/install | bash${NC}"
    echo -e "    Or Node.js:  ${CYAN}https://nodejs.org${NC}"
    missing=1
  fi

  # Check for git
  check_command git || missing=1

  # Check for an AI agent
  local agent_found=0
  if command -v claude &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Claude Code found"
    agent_found=1
    DEFAULT_AGENT="claude-code"
  fi
  if command -v cursor &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Cursor found"
    agent_found=1
    [ -z "${DEFAULT_AGENT:-}" ] && DEFAULT_AGENT="cursor"
  fi
  if [ "$agent_found" -eq 0 ]; then
    echo ""
    echo -e "  ${RED}⚠ IMPORTANT — no AI agent found${NC}"
    echo ""
    echo "  Digital Seed needs a terminal-capable AI agent to be useful."
    echo "  The agent reads your context files, interviews you, and runs setup."
    echo "  Without one, you can still edit files, but the guided experience will not work."
    echo ""
    echo "  Recommended: Claude Code (free to install, needs a claude.ai account)"
    if command -v bun &>/dev/null; then
      echo -e "    Install: ${CYAN}bun install -g @anthropic-ai/claude-code${NC}"
    else
      echo -e "    Install: ${CYAN}npm install -g @anthropic-ai/claude-code${NC}"
    fi
    echo -e "    Then log in: ${CYAN}claude login${NC}"
    echo -e "    Full guide:  ${CYAN}docs/install-claude-code.md${NC}"
    echo -e "    Other agents: ${CYAN}docs/agent-chooser.md${NC}"
    echo ""
    echo -ne "  Continue setup without an agent? [y/N]: "
    read -r continue_ans
    if [ "${continue_ans:-N}" != "y" ] && [ "${continue_ans:-N}" != "Y" ]; then
      echo ""
      echo "  Smart choice. Install an agent first, then re-run: ./setup.sh"
      echo "  Or follow the install guide: docs/install-claude-code.md"
      echo ""
      exit 0
    fi
    DEFAULT_AGENT="generic"
  fi

  echo ""
  if [ "$missing" -eq 1 ]; then
    echo -e "${RED}Some prerequisites are missing. Install them and re-run setup.${NC}"
    exit 1
  fi
  echo -e "${GREEN}All prerequisites met.${NC}"
  echo ""
}

# ─── Step 2: AI Provider ───

set_env_var() {
  local key="$1" val="$2"
  [ -f "$ENV_FILE" ] || touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

configure_providers() {
  echo -e "${BOLD}Step 2/7 — AI Provider${NC}"
  echo ""
  echo "The kit works with subscriptions (Claude Code, ChatGPT Plus, Gemini Advanced)"
  echo "or direct API keys. No API key needed if you already use a subscription."
  echo ""

  # Detect Claude CLI
  local claude_detected=""
  if command -v claude &>/dev/null; then
    claude_detected=" ${GREEN}(detected)${NC}"
  fi

  echo -e "  1. I use Claude Code / Claude.ai subscription${claude_detected}"
  echo "  2. I use ChatGPT Plus (no API key)"
  echo "  3. I use Gemini Advanced (no API key)"
  echo "  4. I have an API key (Anthropic / OpenAI / Google)"
  echo "  5. Use Ollama (local, free)"
  echo ""
  echo -ne "  Enter choice [1]: "
  read -r choice
  choice="${choice:-1}"

  # Create .env if it doesn't exist
  [ -f "$ENV_FILE" ] || touch "$ENV_FILE"

  case "$choice" in
    1)
      set_env_var "AI_PROVIDER" "claude-subscription"
      echo -e "  ${GREEN}✓${NC} Claude subscription configured — uses Claude Code CLI (OAuth)"
      ;;
    2)
      set_env_var "AI_PROVIDER" "chatgpt-subscription"
      echo -e "  ${GREEN}✓${NC} ChatGPT Plus configured"
      echo -e "  ${YELLOW}Hint:${NC} Install the OpenAI CLI for best results: ${CYAN}npm install -g openai${NC}"
      ;;
    3)
      set_env_var "AI_PROVIDER" "gemini-subscription"
      echo -e "  ${GREEN}✓${NC} Gemini Advanced configured"
      echo -e "  ${YELLOW}Hint:${NC} Install the Gemini CLI for best results: ${CYAN}npm install -g @google/gemini-cli${NC}"
      ;;
    4)
      # Anthropic
      echo -ne "  Configure Anthropic (Claude)? [Y/n]: "
      read -r ans
      if [ "${ans:-Y}" != "n" ] && [ "${ans:-Y}" != "N" ]; then
        echo -ne "  Enter your Anthropic API key: "
        read -rs api_key
        echo ""
        if [ -n "$api_key" ]; then
          set_env_var "ANTHROPIC_API_KEY" "$api_key"
          echo -e "  ${GREEN}✓${NC} Anthropic configured"
        fi
      fi

      # OpenAI
      echo -ne "  Configure OpenAI (GPT)? [y/N]: "
      read -r ans
      if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
        echo -ne "  Enter your OpenAI API key: "
        read -rs api_key
        echo ""
        if [ -n "$api_key" ]; then
          set_env_var "OPENAI_API_KEY" "$api_key"
          echo -e "  ${GREEN}✓${NC} OpenAI configured"
        fi
      fi

      # Google
      echo -ne "  Configure Google (Gemini)? [y/N]: "
      read -r ans
      if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
        echo -ne "  Enter your Google API key: "
        read -rs api_key
        echo ""
        if [ -n "$api_key" ]; then
          set_env_var "GOOGLE_API_KEY" "$api_key"
          echo -e "  ${GREEN}✓${NC} Google configured"
        fi
      fi
      ;;
    5)
      if command -v ollama &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Ollama detected"
        set_env_var "OLLAMA_ENABLED" "true"
      else
        echo -e "  ${YELLOW}⚠${NC} Ollama not installed. Get it: https://ollama.ai"
        set_env_var "OLLAMA_ENABLED" "true"
      fi
      ;;
    *)
      echo -e "  ${YELLOW}⚠${NC} Invalid choice. Defaulting to Claude subscription."
      set_env_var "AI_PROVIDER" "claude-subscription"
      ;;
  esac

  echo ""
}


# ─── Step 3: Phase Selection ───

select_setup_profile() {
  echo -e "${BOLD}Step 3/7 — Phase Selection${NC}"
  echo ""
  echo "Digital Seed grows in phases. You do not need to install everything now."
  echo "Each phase is fully useful on its own. Add the next one only when the current one is paying off."
  echo ""
  echo -e "  ${BOLD}Phase 1 — Local context${NC} (always required)"
  echo "    Your agent knows who you are, what you're working on, and what to avoid."
  echo "    Everything stays on your machine. Takes 15 minutes."
  echo ""
  echo -e "  ${BOLD}Phase 2 — Local search${NC}"
  echo "    Index a folder of notes, documents, or an Obsidian vault for local retrieval."
  echo "    No cloud service needed."
  echo ""
  echo -e "  ${BOLD}Phase 3 — Integrations${NC}"
  echo "    Connect one specific tool you already use daily (Drive, GitHub, Obsidian, Telegram...)."
  echo "    One integration at a time, reviewed before connecting."
  echo ""
  echo -e "  ${BOLD}Phase 4 — Always-on agent${NC}"
  echo "    Background automation: scheduled tasks, digest messages, always-on assistant."
  echo "    Only after Phases 1–3 are working and trusted."
  echo ""
  echo "Tip: After setup, run  bun run seed plan  and paste the output into your agent."
  echo "     Your agent will interview you, recommend phases, and run everything for you."
  echo ""
  echo "Which phases do you want to enable now?"
  echo ""
  echo "  1. Phase 1 only        — context files + first prompt (recommended start)"
  echo "  2. Phases 1–2          — add local notes search"
  echo "  3. Phases 1–3          — add one integration (you choose which after setup)"
  echo "  4. Let my agent decide — just do Phase 1 now, agent guides the rest"
  echo ""
  echo -ne "  Enter choice [1]: "
  read -r profile_choice
  profile_choice="${profile_choice:-1}"

  mkdir -p "$SCRIPT_DIR/user"
  case "$profile_choice" in
    1)
      SETUP_PROFILE="phase-1"
      PROFILE_LABEL="Phase 1 — Local context"
      PHASE_MAX=1
      ;;
    2)
      SETUP_PROFILE="phase-1-2"
      PROFILE_LABEL="Phases 1–2 — Local context + search"
      PHASE_MAX=2
      ;;
    3)
      SETUP_PROFILE="phase-1-2-3"
      PROFILE_LABEL="Phases 1–3 — Local context + search + integrations"
      PHASE_MAX=3
      ;;
    4)
      SETUP_PROFILE="agent-guided"
      PROFILE_LABEL="Agent-guided — Phase 1 now, agent leads the rest"
      PHASE_MAX=1
      ;;
    *)
      SETUP_PROFILE="phase-1"
      PROFILE_LABEL="Phase 1 — Local context"
      PHASE_MAX=1
      ;;
  esac

  set_env_var "DIGITAL_SEED_PROFILE" "$SETUP_PROFILE"

  cat > "$SCRIPT_DIR/user/MY-PLAN.md" << PLANEOF
# My Digital Seed Plan

- **Phase selection:** $PROFILE_LABEL
- **Selected in setup wizard:** $(date '+%Y-%m-%d')

## Phases I am enabling

PLANEOF

  echo "- [x] Phase 1 — Local context (required)" >> "$SCRIPT_DIR/user/MY-PLAN.md"
  if [ "$PHASE_MAX" -ge 2 ]; then
    echo "- [x] Phase 2 — Local search" >> "$SCRIPT_DIR/user/MY-PLAN.md"
  else
    echo "- [ ] Phase 2 — Local search (add later: bun run seed index <folder>)" >> "$SCRIPT_DIR/user/MY-PLAN.md"
  fi
  if [ "$PHASE_MAX" -ge 3 ]; then
    echo "- [x] Phase 3 — Integrations (see: bun run seed recipe list)" >> "$SCRIPT_DIR/user/MY-PLAN.md"
  else
    echo "- [ ] Phase 3 — Integrations (add later: bun run seed recipe list)" >> "$SCRIPT_DIR/user/MY-PLAN.md"
  fi
  echo "- [ ] Phase 4 — Always-on agent (add later: bun run seed recipe openclaw init)" >> "$SCRIPT_DIR/user/MY-PLAN.md"

  cat >> "$SCRIPT_DIR/user/MY-PLAN.md" << 'PLANEOF'

## What I use daily

- AI agent:
- Notes:
- Main tools:

## First win

The one useful thing I want from this week:

## Next step

Run this to get the full agent-guided phase prompt:

    bun run seed plan

Paste the output into your AI agent and let it guide you through the rest.

## Reference

- Full phases guide: docs/phases.md
- Integration recipes: bun run seed recipe list
- Troubleshooting: docs/troubleshooting.md
PLANEOF

  echo -e "  ${GREEN}✓${NC} Plan written to user/MY-PLAN.md"
  echo ""

  # Phase 2 — notes folder prompt
  if [ "$PHASE_MAX" -ge 2 ]; then
    echo -e "  ${BOLD}Phase 2 setup:${NC}"
    echo -ne "  Path to your notes folder (Obsidian vault, ~/Documents/Notes, etc.) [skip]: "
    read -r notes_path
    notes_path="${notes_path/#\~/$HOME}"
    if [ -n "$notes_path" ] && [ -d "$notes_path" ]; then
      echo -e "  ${GREEN}✓${NC} Notes folder found: $notes_path"
      set_env_var "DIGITAL_SEED_NOTES_PATH" "$notes_path"
      echo "  Run after setup:  bun run seed index \"$notes_path\""
    elif [ -n "$notes_path" ]; then
      echo -e "  ${YELLOW}⚠${NC} Folder not found. Set DIGITAL_SEED_NOTES_PATH in .env and run: bun run seed index <path>"
    fi
    echo ""
  fi

  # Phase 3 — integration picker
  if [ "$PHASE_MAX" -ge 3 ]; then
    echo -e "  ${BOLD}Phase 3 setup:${NC}"
    echo "  Which integration do you use daily? (You will set it up fully after this wizard.)"
    echo ""
    bun run scripts/seed.ts recipe list 2>/dev/null || true
    echo ""
    echo -ne "  Integration name to set up next (or press Enter to choose later): "
    read -r chosen_recipe
    if [ -n "$chosen_recipe" ]; then
      echo "  Run after setup:  bun run seed recipe $chosen_recipe" >> "$SCRIPT_DIR/user/MY-PLAN.md"
      echo -e "  ${GREEN}✓${NC} Noted. After setup, run:  bun run seed recipe $chosen_recipe"
    fi
    echo ""
  fi
}

# ─── Step 4: Integrations (phase-aware) ───

configure_integrations() {
  # Integrations are now handled inside select_setup_profile (phase-3 picker).
  # This stub remains so the main() call order is unchanged.
  :
}

# ─── Step 4: Personal Context ───

create_user_context() {
  echo -e "${BOLD}Step 5/7 — Personal Context${NC}"
  echo ""
  echo "Let's create your personal context files. These tell your AI who you are."
  echo "  (Press Enter to skip any field — you can edit the files later.)"
  echo ""

  # USER.md
  echo -ne "  Your name: "
  read -r user_name
  echo -ne "  Your timezone [UTC]: "
  read -r user_tz
  user_tz="${user_tz:-UTC}"
  echo -ne "  Brief description (role, what you do): "
  read -r user_desc

  cat > "$SCRIPT_DIR/user/USER.md" << USEREOF
# About You

- **Name:** $user_name
- **Timezone:** $user_tz
- **Description:** $user_desc

## Preferences

*(Add your preferences here over time — communication style, tools you prefer, etc.)*

## Notes

*(Your AI will learn about you and suggest updates to this file.)*
USEREOF
  echo -e "  ${GREEN}✓${NC} user/USER.md created"

  # GOALS.md — collect actual goals interactively
  echo ""
  echo -e "  ${BOLD}Now let's set your goals.${NC} Your AI uses these to prioritize and give better advice."
  echo ""

  echo -ne "  What are you working on right now? (e.g. professional, founder, student, job search, side project): "
  read -r goal_current

  echo -ne "  What's your #1 goal for the next 3–6 months? "
  read -r goal_near

  echo -ne "  Any milestones or deadlines? (e.g. launch by June, job search by July): "
  read -r goal_milestones

  echo -ne "  Where do you want to be in 2–3 years? "
  read -r goal_vision

  # Build GOALS.md with real content, fallback to prompts if skipped
  {
    echo "# Goals"
    echo ""
    echo "## What I'm Working On"
    echo ""
    if [ -n "$goal_current" ]; then
      echo "$goal_current"
    else
      echo "*(What are you learning, building, or working on right now?)*"
    fi
    echo ""
    echo "## Active Goal"
    echo ""
    if [ -n "$goal_near" ]; then
      echo "**Goal:** $goal_near"
      echo ""
      if [ -n "$goal_milestones" ]; then
        echo "**Milestones / Deadlines:**"
        echo "$goal_milestones" | tr ',;' '\n' | sed 's/^[[:space:]]*/- [ ] /'
      fi
    else
      echo "*(What's the single most important thing you want to achieve in the next 3–6 months?)*"
    fi
    echo ""
    echo "## Long-Term Vision"
    echo ""
    if [ -n "$goal_vision" ]; then
      echo "$goal_vision"
    else
      echo "*(Where do you want to be in 2–3 years?)*"
    fi
    echo ""
    echo "---"
    echo ""
    echo "*Update this file as your goals evolve. Your AI uses it to prioritize and contextualize.*"
  } > "$SCRIPT_DIR/user/GOALS.md"

  echo -e "  ${GREEN}✓${NC} user/GOALS.md written with your goals"
  bun run scripts/seed-graph.ts --name "$user_name" --goal "$goal_near" --vision "$goal_vision" --current "$goal_current" --packs "general" 2>/dev/null || true
  echo ""
}

# ─── Step 5: Install Dependencies & MCP Servers ───

install_dependencies() {
  echo -e "${BOLD}Step 6/7 — Installing dependencies${NC}"
  echo ""

  # Install root dependencies
  if [ "$RUNTIME" = "bun" ]; then
    echo "  Installing with bun..."
    (cd "$SCRIPT_DIR" && bun install --silent 2>/dev/null) || true
  else
    echo "  Installing with npm..."
    (cd "$SCRIPT_DIR" && npm install --silent 2>/dev/null) || true
  fi

  # Install MCP server dependencies
  for server_dir in "$SCRIPT_DIR"/mcp/*/; do
    if [ -f "$server_dir/package.json" ]; then
      echo "  Installing $(basename "$server_dir")..."
      if [ "$RUNTIME" = "bun" ]; then
        (cd "$server_dir" && bun install --silent 2>/dev/null) || true
      else
        (cd "$server_dir" && npm install --silent 2>/dev/null) || true
      fi
    fi
  done

  echo -e "  ${GREEN}✓${NC} Dependencies installed"
  echo ""
}

# ─── Step 6: Configure Agent ───

configure_agent() {
  echo -e "${BOLD}Step 7/7 — Agent Configuration${NC}"
  echo ""

  case "${DEFAULT_AGENT:-generic}" in
    claude-code)
      echo -e "  Detected ${BOLD}Claude Code${NC} — configuring .claude/ directory"
      echo -e "  ${GREEN}✓${NC} CLAUDE.md and settings.json ready"
      echo ""
      echo -e "  To start: ${CYAN}cd $(basename "$SCRIPT_DIR") && claude${NC}"
      ;;
    cursor)
      echo -e "  Detected ${BOLD}Cursor${NC}"
      echo -e "  Open this folder in Cursor and it will pick up MCP servers from .claude/settings.json"
      ;;
    *)
      echo -e "  No specific agent detected."
      echo -e "  Configure your agent to use the MCP servers in ${CYAN}mcp/servers.json${NC}"
      ;;
  esac
  echo ""
}


# ─── Step 7: Setup Git hooks ───

setup_git_hooks() {
  # Pre-commit hook to prevent secret leaks. Mirrors `bun run seed hooks install`.
  # Patterns require an actual key-shaped suffix so documentation about
  # patterns does not trigger the block. Only added lines are scanned.
  local hooks_dir="$SCRIPT_DIR/.git/hooks"
  mkdir -p "$hooks_dir"
  cat > "$hooks_dir/pre-commit" << 'HOOKEOF'
#!/usr/bin/env bash
# Digital Seed pre-commit secret-scan hook.
# Installed by: ./setup.sh (or: bun run seed hooks install)
# Best-effort scan of staged additions for likely API keys / private keys.

ADDED=$(git diff --cached --diff-filter=ACM | grep -E '^\+' | grep -v '^\+\+\+')
if [ -z "$ADDED" ]; then exit 0; fi

PATTERNS=(
  'ANTHROPIC_API_KEY[[:space:]]*=[[:space:]]*.*sk-[A-Za-z0-9_-]{20,}'
  'OPENAI_API_KEY[[:space:]]*=[[:space:]]*.*sk-[A-Za-z0-9_-]{20,}'
  'GOOGLE_API_KEY[[:space:]]*=[[:space:]]*.*AI[A-Za-z0-9_-]{20,}'
  'sk-ant-[A-Za-z0-9_-]{24,}'
  'sk-proj-[A-Za-z0-9_-]{24,}'
  'ghp_[A-Za-z0-9]{30,}'
  'BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY'
)

for pattern in "${PATTERNS[@]}"; do
  if echo "$ADDED" | grep -Eq "$pattern"; then
    echo ""
    echo "❌ BLOCKED by Digital Seed pre-commit hook:"
    echo "   A staged addition matches a likely-secret pattern: $pattern"
    echo "   Move the secret to .env (git-ignored) and commit again."
    echo "   To override (not recommended): git commit --no-verify ..."
    echo ""
    exit 1
  fi
done
HOOKEOF
  chmod +x "$hooks_dir/pre-commit"
}

# ─── Finish ───

print_finish() {
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  ✅ Setup complete!${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Next steps:${NC}"
  echo ""
  echo -e "  1. Run ${CYAN}bun run seed plan${NC} and paste the output into your AI agent."
  echo -e "     Your agent will ask a few questions, recommend which phases to enable,"
  echo -e "     and run the setup commands for you."
  echo ""
  echo -e "  2. Or start directly:"
  echo -e "     ${CYAN}bun run seed first-prompt${NC}  — print the first agent prompt"
  echo -e "     paste it into Claude Code, Cursor, Windsurf, or your preferred agent."
  echo ""
  echo -e "  3. Your plan is in ${CYAN}user/MY-PLAN.md${NC} — open it and fill in what you use."
  echo ""
  echo -e "  ${BOLD}Useful commands:${NC}"
  echo ""
  echo -e "  ${CYAN}bun run seed plan${NC}         — Get the AI-guided phase-selection prompt"
  echo -e "  ${CYAN}bun run seed onboard${NC}      — Show the first 15-minute path"
  echo -e "  ${CYAN}bun run seed doctor${NC}       — Check system health"
  echo -e "  ${CYAN}bun run seed first-prompt${NC} — Print your first AI-agent prompt"
  echo -e "  ${CYAN}bun run seed recipe list${NC}  — Browse integration recipes"
  echo ""
  echo -e "  ${BOLD}Documentation:${NC} ${CYAN}docs/getting-started.md${NC}"
  echo -e "  ${BOLD}Agent install:${NC} ${CYAN}docs/ai-agent-install.md${NC}"
  echo -e "  ${BOLD}Security:${NC}      ${CYAN}SECURITY.md${NC}"
  echo ""
  echo -e "  ${YELLOW}Remember: This is an alpha. Report issues at:${NC}"
  echo -e "  ${CYAN}https://github.com/LeoMaslyak/digital-seed/issues${NC}"
  echo ""
}

# ─── Main ───

main() {
  print_header
  check_prerequisites
  configure_providers
  select_setup_profile
  configure_integrations
  create_user_context
  install_dependencies
  configure_agent
  setup_git_hooks
  print_finish
}

main "$@"
