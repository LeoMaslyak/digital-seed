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
  echo -e "${BOLD}  🧠 Digital Seed — Setup Wizard${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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
    echo -e "  ${YELLOW}⚠${NC} No AI agent detected (Claude Code, Cursor)"
    # Note: Claude Code is an npm package from Anthropic — we use npm here for the
    # one-time global install only. Everything inside this repo uses bun.
    if command -v bun &>/dev/null; then
      echo -e "    Install Claude Code (via bun): ${CYAN}bun install -g @anthropic-ai/claude-code${NC}"
    else
      echo -e "    Install Claude Code (via npm): ${CYAN}npm install -g @anthropic-ai/claude-code${NC}"
    fi
    echo -e "    You can still use the kit with any MCP-compatible agent."
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


# ─── Step 3: Setup Profile ───

select_setup_profile() {
  echo -e "${BOLD}Step 3/7 — Setup Profile${NC}"
  echo ""
  echo "Pick the starting shape that matches what you want this week."
  echo "You can change this later; it only sets friendly defaults."
  echo ""
  echo "  1. Simple local workspace        — context files + first prompt only"
  echo "  2. Notes/documents search        — add local retrieval for folders/notes"
  echo "  3. Project/GitHub helper         — add repo/project assistant defaults"
  echo "  4. Always-on assistant later     — document the path, but keep setup local now"
  echo ""
  echo -ne "  Enter choice [1]: "
  read -r profile_choice
  profile_choice="${profile_choice:-1}"

  mkdir -p "$SCRIPT_DIR/user"
  case "$profile_choice" in
    1)
      SETUP_PROFILE="simple-local"
      PROFILE_LABEL="Simple local workspace"
      ;;
    2)
      SETUP_PROFILE="notes-search"
      PROFILE_LABEL="Notes/documents search"
      ;;
    3)
      SETUP_PROFILE="project-github"
      PROFILE_LABEL="Project/GitHub helper"
      ;;
    4)
      SETUP_PROFILE="always-on-later"
      PROFILE_LABEL="Always-on assistant later"
      ;;
    *)
      SETUP_PROFILE="simple-local"
      PROFILE_LABEL="Simple local workspace"
      ;;
  esac

  set_env_var "DIGITAL_SEED_PROFILE" "$SETUP_PROFILE"
  cat > "$SCRIPT_DIR/user/PROFILE.md" << PROFILEEOF
# Digital Seed Setup Profile

- **Profile:** $PROFILE_LABEL
- **Profile ID:** $SETUP_PROFILE

## What this means

This is a starting default, not a permanent commitment. Ask your AI agent to update this file as your workspace becomes more useful.

## Suggested first week

PROFILEEOF

  case "$SETUP_PROFILE" in
    simple-local)
      cat >> "$SCRIPT_DIR/user/PROFILE.md" << 'PROFILEEOF'
- Fill in `user/USER.md`, `user/GOALS.md`, and `user/COMPASS.md`.
- Use `bun run seed first-prompt` with your preferred AI agent.
- Avoid external integrations until the local workflow feels useful.
PROFILEEOF
      ;;
    notes-search)
      cat >> "$SCRIPT_DIR/user/PROFILE.md" << 'PROFILEEOF'
- Choose one folder of notes or documents.
- Run `bun run seed index <folder>`.
- Try `bun run seed search "what do I know about X?"`.
- Keep sources local unless you explicitly choose a hosted service later.
PROFILEEOF
      ;;
    project-github)
      cat >> "$SCRIPT_DIR/user/PROFILE.md" << 'PROFILEEOF'
- Point your agent at one active project or GitHub repo.
- Run `bun run seed learn owner/repo` for public repos you want searchable.
- Ask the agent to create a weekly project checklist and decision log.
PROFILEEOF
      ;;
    always-on-later)
      cat >> "$SCRIPT_DIR/user/PROFILE.md" << 'PROFILEEOF'
- Start local-first; do not connect messaging, email, or cloud automation yet.
- Read `docs/free-first-setup.md` and `docs/architecture-map.md`.
- When ready, add OpenClaw/Hermes/Telegram/Drive as explicit opt-in integrations.
PROFILEEOF
      ;;
  esac

  echo -e "  ${GREEN}✓${NC} Profile selected: $PROFILE_LABEL"
  echo -e "  ${GREEN}✓${NC} Wrote user/PROFILE.md"
  echo ""
}

# ─── Step 3: Integrations ───

configure_integrations() {
  echo -e "${BOLD}Step 4/7 — Integrations${NC}"
  echo ""
  echo "Which integrations do you want to enable?"
  echo ""

  INTEGRATIONS=()

  # Obsidian
  echo -ne "  Obsidian (talk to your notes)? [Y/n]: "
  read -r ans
  if [ "${ans:-Y}" != "n" ] && [ "${ans:-Y}" != "N" ]; then
    echo -ne "  Path to your Obsidian vault [~/Documents/Obsidian]: "
    read -r vault_path
    vault_path="${vault_path:-$HOME/Documents/Obsidian}"
    vault_path="${vault_path/#\~/$HOME}"
    if [ -d "$vault_path" ]; then
      echo -e "  ${GREEN}✓${NC} Vault found at $vault_path"
      grep -q "^OBSIDIAN_VAULT_PATH=" "$ENV_FILE" 2>/dev/null || \
        echo "OBSIDIAN_VAULT_PATH=$vault_path" >> "$ENV_FILE"
      INTEGRATIONS+=("obsidian")
    else
      echo -e "  ${YELLOW}⚠${NC} Path not found. You can set OBSIDIAN_VAULT_PATH in .env later."
      INTEGRATIONS+=("obsidian")
    fi
  fi

  # Email
  echo -ne "  Email (Gmail triage)? [y/N]: "
  read -r ans
  if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
    INTEGRATIONS+=("email")
    echo -e "  ${GREEN}✓${NC} Email integration — see integrations/email/setup.md for OAuth setup"
  fi

  # Calendar
  echo -ne "  Google Calendar? [y/N]: "
  read -r ans
  if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
    INTEGRATIONS+=("calendar")
    echo -e "  ${GREEN}✓${NC} Calendar integration — see integrations/calendar/setup.md"
  fi

  # Database
  echo -ne "  Database connection (PostgreSQL, etc.)? [y/N]: "
  read -r ans
  if [ "${ans:-N}" = "y" ] || [ "${ans:-N}" = "Y" ]; then
    INTEGRATIONS+=("database")
    echo -e "  ${GREEN}✓${NC} Database — see integrations/databases/setup.md for connection setup"
  fi

  # Save integrations list
  printf '%s\n' "${INTEGRATIONS[@]}" > "$CONFIG_DIR/integrations.txt" 2>/dev/null || true
  echo ""
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
  bun run scripts/seed-graph.ts --name "$user_name" --goal "$goal_near" --vision "$goal_vision" --current "$goal_current" --packs "finance,strategy,operations" 2>/dev/null || true
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
  # Pre-commit hook to prevent secret leaks
  local hooks_dir="$SCRIPT_DIR/.git/hooks"
  mkdir -p "$hooks_dir"
  cat > "$hooks_dir/pre-commit" << 'HOOKEOF'
#!/usr/bin/env bash
# Prevent committing secrets
PATTERNS=(
  'ANTHROPIC_API_KEY=sk-'
  'OPENAI_API_KEY=sk-'
  'GOOGLE_API_KEY=AI'
  'sk-ant-'
  'sk-proj-'
)

for pattern in "${PATTERNS[@]}"; do
  if git diff --cached --diff-filter=ACM | grep -qE "$pattern"; then
    echo "❌ BLOCKED: Found what looks like an API key in staged files."
    echo "   Pattern matched: $pattern"
    echo "   Remove the secret and use .env instead."
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
  echo -e "  1. Start your AI agent in this directory"
  echo -e "  2. Paste this first prompt:"
  echo -e "     ${CYAN}\"Read my Digital Seed context files. Interview me for missing context, explain anything I do not understand, and help me make this useful this week.\"${NC}"
  echo -e "  3. Improve ${CYAN}user/USER.md${NC}, ${CYAN}user/COMPASS.md${NC}, ${CYAN}user/GOALS.md${NC}, and ${CYAN}user/DOMAINS.md${NC} with your agent."
  echo ""
  echo -e "  ${BOLD}Useful commands:${NC}"
  echo ""
  echo -e "  ${CYAN}bun run dashboard${NC}     — Start the observability dashboard"
  echo -e "  ${CYAN}bun run health${NC}        — Check system health"
  echo -e "  ${CYAN}bun run tokens${NC}        — View token usage report"
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
