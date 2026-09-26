#!/usr/bin/env bash
# Gathers the facts needed to say where italiano changes currently stand.
# Purely factual — no interpretation. SKILL.md decides what to recommend.
#
# macOS has no `timeout`, so the Vercel lookup just runs and takes a couple of
# seconds. It's guarded so a CLI/auth failure degrades to a note rather than
# killing the whole report.

set -uo pipefail

PROD_URL="https://italiano-prego.vercel.app"

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: not inside a git repository"
  exit 1
}

echo "=== GIT ==="
echo "branch: $(git rev-parse --abbrev-ref HEAD)"
echo "head: $(git rev-parse --short HEAD) $(git log -1 --format=%s)"

# Untracked files count too — `git diff --quiet` would call a tree with only
# new files clean.
DIRTY_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
echo "uncommitted_files: $DIRTY_COUNT"
if [ "$DIRTY_COUNT" -gt 0 ]; then
  git status --porcelain | sed 's/^/  /' | head -20
fi

echo "stashes: $(git stash list 2>/dev/null | wc -l | tr -d ' ')"

echo
echo "=== VS GITHUB ==="
if git fetch origin --quiet 2>/dev/null; then
  echo "fetched: yes"
else
  echo "fetched: no (offline or auth problem — ahead/behind may be stale)"
fi

UPSTREAM="origin/$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --verify "$UPSTREAM" >/dev/null 2>&1; then
  echo "unpushed_commits: $(git rev-list --count "$UPSTREAM"..HEAD)"
  echo "unpulled_commits: $(git rev-list --count HEAD.."$UPSTREAM")"
  UNPUSHED=$(git log --oneline "$UPSTREAM"..HEAD 2>/dev/null | head -10)
  [ -n "$UNPUSHED" ] && echo "$UNPUSHED" | sed 's/^/  /'
else
  echo "unpushed_commits: n/a (no upstream branch $UPSTREAM)"
fi

echo
echo "=== PRODUCTION ==="
if command -v vercel >/dev/null 2>&1; then
  VERCEL=(vercel)
else
  VERCEL=(npx --no-install vercel)
fi
PROD=$("${VERCEL[@]}" inspect "$PROD_URL" 2>&1)
if echo "$PROD" | grep -q "id"; then
  echo "$PROD" | grep -E "^[[:space:]]+(id|created)" | sed 's/^[[:space:]]*/  /'
else
  echo "  could not read production (vercel CLI missing, errored, or not logged in)"
fi
