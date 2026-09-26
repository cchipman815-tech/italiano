#!/usr/bin/env bash
# Answers "will anything break if I ship this?" before picking an option.
#
# Baseline is origin/main, because that is what production is built from. The
# comparison therefore includes uncommitted AND untracked work — "ship it"
# commits everything, so everything is in scope.
#
# Two classes of problem, and the second is the dangerous one:
#   - Safe failures: typecheck/build errors. Vercel's build fails, the deploy
#     is discarded, production keeps serving the old version.
#   - Unsafe failures: things that build and deploy fine, then break at runtime
#     or open a hole — an unapplied migration, a missing env var, a change to
#     the auth gate. Those reach Chance and Jennifer. They get flagged loudest.

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ERROR: not a git repo"; exit 1; }

# Overridable so this can be pointed at a branch point or an old commit — both
# for previewing a branch and for testing that the risk checks below still fire.
BASE="${ITALIANO_BASE:-origin/main}"
git rev-parse --verify "$BASE" >/dev/null 2>&1 || BASE="HEAD"

# Everything that would reach production: diff vs origin/main, plus untracked.
CHANGED=$( { git diff --name-only "$BASE"; git ls-files --others --exclude-standard; } | sort -u )

echo "=== WHAT WOULD SHIP (vs $BASE) ==="
if [ -z "$CHANGED" ]; then
  echo "  nothing — production already matches"
  exit 0
fi
echo "$CHANGED" | sed 's/^/  /'

LOG=$(mktemp -d)
trap 'rm -rf "$LOG"' EXIT

echo
echo "=== AUTOMATED CHECKS ==="
if npm run typecheck >"$LOG/tc" 2>&1; then
  echo "  typecheck: PASS"
else
  echo "  typecheck: FAIL"
  tail -15 "$LOG/tc" | sed 's/^/    /'
fi

if npm test >"$LOG/test" 2>&1; then
  # Read the "Tests" line specifically — "Test Files" appears first and reports
  # file count, which reads as a much smaller number than it should.
  echo "  tests: PASS ($(grep -E '^[[:space:]]*Tests[[:space:]]' "$LOG/test" | grep -oE '[0-9]+ passed' | head -1))"
else
  echo "  tests: FAIL"
  tail -20 "$LOG/test" | sed 's/^/    /'
fi

echo
echo "=== RUNTIME RISKS (build+deploy fine, break in production) ==="
RISK=0
has() { echo "$CHANGED" | grep -qE "$1"; }

# Migrations are applied out-of-band, never by the deploy. Shipping code that
# expects a column nobody applied is the classic silent breakage.
MIGRATIONS=$(echo "$CHANGED" | grep -E '^supabase/migrations/.*\.sql$' || true)
if [ -n "$MIGRATIONS" ]; then
  echo "  [!] New/changed migration — confirm it is applied to the live DB BEFORE shipping:"
  echo "$MIGRATIONS" | sed 's/^/      /'
  RISK=1
fi

# proxy.ts gates every page; api-helpers/users gate every API route. A mistake
# here is not a broken page, it is an open door.
if has '^(proxy\.ts|lib/api-helpers\.ts|lib/users\.ts)$'; then
  echo "  [!] Auth gate changed (proxy.ts / lib/api-helpers.ts / lib/users.ts)."
  echo "      After shipping, verify a cookieless request to an /api route gets 401"
  echo "      and a signed-out visit to /home redirects to /login."
  RISK=1
fi

# getUserIdFromCookie is async. Without `await` the Promise is always truthy and
# the `if (!userId) return unauthorized()` guard never fires — this shipped to
# production once (fixed 2026-09-25). Checked repo-wide, not just changed files.
UNAWAITED=$(grep -rnE 'getUserIdFromCookie\(\)' app lib 2>/dev/null \
  | grep -vE 'await[[:space:]]+getUserIdFromCookie\(\)|export async function getUserIdFromCookie' || true)
if [ -n "$UNAWAITED" ]; then
  echo "  [!] getUserIdFromCookie() called without await — that route has no auth check:"
  echo "$UNAWAITED" | sed 's/^/      /'
  RISK=1
fi

# Env vars live in Vercel, not in the repo. A new one referenced in code but
# never added to the Vercel project is undefined at runtime, not at build time.
NEWVARS=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.mjs|*.js)
      for v in $(grep -ohE 'process\.env\.[A-Z_][A-Z0-9_]*' "$f" 2>/dev/null | sed 's/process\.env\.//' | sort -u); do
        grep -q "^${v}=" .env.local.example 2>/dev/null || NEWVARS="$NEWVARS $v"
      done
      ;;
  esac
done <<< "$CHANGED"
NEWVARS=$(echo "$NEWVARS" | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ')
if [ -n "$NEWVARS" ]; then
  echo "  [!] Env var(s) referenced but absent from .env.local.example: $NEWVARS"
  echo "      Confirm they exist in the Vercel project or they'll be undefined in prod."
  RISK=1
fi

# Lockfile and dependencies must move together. A lockfile change on its own is
# usually an accidental local `npm install` — on 2026-09-25 one had stripped
# the `libc` fields Vercel's Linux build uses to pick native binaries. Compares
# the dependency sections only, so editing `scripts` doesn't trip it.
DEPS_CHANGED=no
if has '^package\.json$'; then
  DEPS_CHANGED=$(git show "$BASE:package.json" 2>/dev/null | node -e '
    const fs = require("fs")
    const a = JSON.parse(fs.readFileSync(0, "utf8") || "{}")
    const b = JSON.parse(fs.readFileSync("package.json", "utf8"))
    const keys = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "overrides"]
    process.stdout.write(keys.some(k => JSON.stringify(a[k] || {}) !== JSON.stringify(b[k] || {})) ? "yes" : "no")
  ' 2>/dev/null || echo yes)
fi
if [ "$DEPS_CHANGED" = yes ] && ! has '^package-lock\.json$'; then
  echo "  [!] Dependencies changed without package-lock.json — CI's 'npm ci' will fail."
  RISK=1
elif has '^package-lock\.json$' && [ "$DEPS_CHANGED" = no ]; then
  echo "  [!] package-lock.json changed but no dependency did — probably accidental."
  echo "      Discard with 'git checkout package-lock.json' unless deps were meant to change."
  RISK=1
fi

# Debug leftovers that tests won't catch.
FOCUSED=$(git diff "$BASE" -- '*.test.ts' '*.test.tsx' 2>/dev/null | grep -E '^\+.*\.(only|skip)\(' || true)
if [ -n "$FOCUSED" ]; then
  echo "  [!] .only()/.skip() added to a test — the suite may be green because it barely ran."
  RISK=1
fi

[ "$RISK" -eq 0 ] && echo "  none detected"

echo
echo "=== NOTE ==="
echo "  CI and Vercel run independently: a red CI does NOT block the deploy."
echo "  If checks fail above, shipping puts that commit live anyway."
