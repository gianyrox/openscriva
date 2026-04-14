#!/usr/bin/env bash
# check-secrets.sh — Scan public-facing files for leaked secrets.
#
# Checks README.md, docs/, proposals/, agent definitions, example files,
# and CLAUDE.md for patterns that shouldn't be in open-source-ready files.
# Returns exit 1 if secrets found (in --ci mode).
#
# Usage:
#   ./scripts/check-secrets.sh                    # scan and report
#   ./scripts/check-secrets.sh --ci               # exit 1 on findings (for CI)
#   ./scripts/check-secrets.sh --project-dir DIR  # scan a different directory
#   ./scripts/check-secrets.sh --install-hook     # install as pre-commit hook
#
# Safe locations (NOT scanned): .env, k8s/secrets/, brain/

set -euo pipefail

CI_MODE=false
INSTALL_HOOK=false
PROJECT_DIR=""

# ── Parse args ───────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)           CI_MODE=true; shift ;;
        --install-hook) INSTALL_HOOK=true; shift ;;
        --project-dir)  PROJECT_DIR="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [--ci] [--install-hook] [--project-dir DIR]"
            echo ""
            echo "  --ci               Exit 1 on findings (for CI)"
            echo "  --install-hook     Install check-secrets as a pre-commit hook"
            echo "  --project-dir DIR  Scan a different directory (default: cwd)"
            exit 0
            ;;
        *)  echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Change to project directory if specified ─────────────────────────────────

if [ -n "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
fi

# ── Install hook mode ────────────────────────────────────────────────────────

if $INSTALL_HOOK; then
    SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
    # If running inside a different project dir, use a relative/copied path
    if [ -n "$PROJECT_DIR" ]; then
        SCRIPT_PATH="scripts/check-secrets.sh"
    fi

    if [ -f ".pre-commit-config.yaml" ]; then
        # Check if check-secrets hook already exists
        if grep -q "id: check-secrets" .pre-commit-config.yaml 2>/dev/null; then
            echo "Hook already installed in .pre-commit-config.yaml"
            exit 0
        fi

        # Append to existing local repo hooks, or add a new local repo entry
        if grep -q "repo: local" .pre-commit-config.yaml 2>/dev/null; then
            # Append a new hook to the existing local repo section
            # Find the last line of the file and append before it
            cat >> .pre-commit-config.yaml << EOF

      - id: check-secrets
        name: Scan for leaked secrets
        entry: ${SCRIPT_PATH} --ci
        language: script
        pass_filenames: false
EOF
        else
            # Add a new local repo entry
            cat >> .pre-commit-config.yaml << EOF

  - repo: local
    hooks:
      - id: check-secrets
        name: Scan for leaked secrets
        entry: ${SCRIPT_PATH} --ci
        language: script
        pass_filenames: false
EOF
        fi
        echo "Installed check-secrets hook in .pre-commit-config.yaml"
    else
        # No pre-commit config — install as a git hook directly
        if [ -d ".git" ]; then
            HOOK_FILE=".git/hooks/pre-commit"
            if [ -f "$HOOK_FILE" ]; then
                # Append to existing hook if not already there
                if ! grep -q "check-secrets" "$HOOK_FILE" 2>/dev/null; then
                    echo "" >> "$HOOK_FILE"
                    echo "# Nucleus secrets scan" >> "$HOOK_FILE"
                    echo "${SCRIPT_PATH} --ci" >> "$HOOK_FILE"
                    echo "Appended check-secrets to existing ${HOOK_FILE}"
                else
                    echo "check-secrets already in ${HOOK_FILE}"
                fi
            else
                cat > "$HOOK_FILE" << EOF
#!/usr/bin/env bash
# Pre-commit hook: scan for leaked secrets
${SCRIPT_PATH} --ci
EOF
                chmod +x "$HOOK_FILE"
                echo "Created ${HOOK_FILE} with check-secrets"
            fi
        else
            echo "No .git directory found — cannot install hook"
            exit 1
        fi
    fi
    exit 0
fi

# ── Build scan targets ───────────────────────────────────────────────────────
# Start with the original scan dirs, then add new targets if they exist

SCAN_TARGETS=""

# Original targets
for target in README.md docs/ proposals/; do
    [ -e "$target" ] && SCAN_TARGETS="$SCAN_TARGETS $target"
done

# New targets: agent definitions
[ -d ".claude/agents/" ] && SCAN_TARGETS="$SCAN_TARGETS .claude/agents/"

# New targets: CLAUDE.md (project instructions may contain secrets)
[ -f "CLAUDE.md" ] && SCAN_TARGETS="$SCAN_TARGETS CLAUDE.md"

# New targets: example/sample files (env examples sometimes leak)
EXAMPLE_FILES=$(find . -maxdepth 3 -name "*.example" -o -name "*.sample" 2>/dev/null | head -20 || true)
if [ -n "$EXAMPLE_FILES" ]; then
    SCAN_TARGETS="$SCAN_TARGETS $EXAMPLE_FILES"
fi

# Trim leading whitespace
SCAN_TARGETS="${SCAN_TARGETS# }"

if [ -z "$SCAN_TARGETS" ]; then
    echo "No scannable files found."
    exit 0
fi

FOUND=0

# Patterns to catch — source of truth: OPENSOURCE_POLICY.md §5.1
patterns=(
    # Legacy AGFarms-specific
    '5\.161\.236\.151'          # Hetzner server IP
    '@GF@rm'                    # Password fragment
    'nucleus2026'               # Legacy Nucleus admin password (scrubbed 2026-04-14)
    'nucleus:nucleus[0-9]{2,}'  # Basic-auth variant
    # GitHub
    'ghp_[a-zA-Z0-9]{36}'       # GitHub classic PAT
    'github_pat_[A-Za-z0-9_]{82}' # GitHub fine-grained PAT
    'gho_[a-zA-Z0-9]{36}'       # GitHub OAuth token
    'ghs_[a-zA-Z0-9]{36}'       # GitHub app server token
    # Anthropic
    'sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{40,}' # Anthropic API key (tight)
    'sk-ant-[a-zA-Z0-9]+'       # Anthropic API key (legacy/loose)
    # OpenAI / generic sk-
    'sk-[A-Za-z0-9]{48}'        # OpenAI style
    # Stripe
    'sk_live_[0-9a-zA-Z]{24,}'  # Stripe live secret
    'sk_test_[0-9a-zA-Z]{24,}'  # Stripe test secret
    'rk_live_[0-9a-zA-Z]{24,}'  # Stripe restricted live
    # AWS
    'AKIA[0-9A-Z]{16}'          # AWS access key ID
    'aws_secret_access_key[[:space:]]*=[[:space:]]*[A-Za-z0-9/+=]{40}'
    # Slack
    'xoxb-[0-9]+-[0-9]+-[0-9a-zA-Z]+' # Slack bot
    'xoxp-[0-9]+-[0-9]+-[0-9]+-[0-9a-f]+' # Slack user
    # PostHog
    'phc_[a-zA-Z0-9]{30,}'      # PostHog project (public-by-design but flag anyway)
    'phx_[A-Za-z0-9]{40,}'      # PostHog personal (write access)
    # Langfuse
    'sk-lf-[a-f0-9]{8,}'        # Langfuse secret
    'pk-lf-[a-f0-9]{8,}'        # Langfuse public (flag anyway)
    # Private keys + JWTs
    '-----BEGIN (RSA |OPENSSH |EC |DSA |PGP |)PRIVATE KEY-----'
    'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' # JWT
    # Database URIs with credentials
    'mongodb\+srv://[^:]+:[^@]+@'
    'postgres(ql)?://[^:]+:[^@]+@[^/]+'
    'mysql://[^:]+:[^@]+@[^/]+'
    'redis://[^:]*:[^@]+@[^/]+'
    # Nucleus Brain legacy
    'nb_[0-9a-f]{64}'           # Instance Manager API key
    'eai_[0-9a-f]{64}'           # Governance API key
    # Telegram
    'bot[0-9]{8,}:[A-Za-z0-9]'  # Telegram bot token
    '-100[0-9]{10,}'            # Telegram group ID
    # Known identifiers (PII)
    'ssh.*@5\.'                 # SSH to Hetzner
    '6563314833'                # Gian Telegram ID
    '7333798946'                # Anthony Telegram ID
)

for pattern in "${patterns[@]}"; do
    matches=$(grep -rn "$pattern" $SCAN_TARGETS 2>/dev/null || true)
    if [[ -n "$matches" ]]; then
        echo "LEAKED: pattern '$pattern' found:"
        echo "$matches" | head -5
        echo ""
        FOUND=$((FOUND + 1))
    fi
done

if [[ $FOUND -gt 0 ]]; then
    echo "Found $FOUND secret pattern(s) in public files."
    echo "Move secrets to .env or k8s/secrets/."
    $CI_MODE && exit 1
    exit 0
else
    echo "No secrets found in public files."
fi
