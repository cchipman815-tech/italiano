---
name: italiano-deploy
description: Use whenever Chance has finished editing italiano and is deciding what to do with the changes — or asks how to ship, deploy, push, go live, roll back, or "what do I say again?". Also use when asked what's live versus local, whether something made it to production, or for a pre-flight check on whether changes will break anything. Reviews the pending changes for real breakage, then shows the exact phrase to use next.
---

# Shipping italiano changes

## Overview

italiano deploys from git: **push to `main` → Vercel builds that commit → it takes the
production alias (https://italiano-prego.vercel.app) automatically.** So
`commit → push → live` is literally true, and "push" carries a production consequence.

Chance runs this after editing, before deciding what to do. Two questions, in this
order: **will anything break**, and **what do I say**. Answer the first with evidence,
then the second with a recommendation grounded in the actual work — not a table dump.

## Run both scripts first

```bash
bash .claude/skills/italiano-deploy/scripts/status.sh
bash .claude/skills/italiano-deploy/scripts/preflight.sh
```

`status.sh` gathers where things stand (branch, uncommitted and untracked files, stash
count, ahead/behind after a real fetch, what production is serving). `preflight.sh`
runs typecheck and tests, then scans what would ship for the failure modes those miss.

## Step 1 — Report what would break

Lead with a verdict: **safe to ship**, **safe but check X**, or **don't ship yet**.
Then the evidence. "Tests pass, 3 files changed, none risky" beats "looks good."

Two kinds of failure, not equally serious:

- **Safe failures** — typecheck or build errors. Vercel's build fails, the deploy is
  discarded, production keeps serving the previous version.
- **Unsafe failures** — things that build and deploy cleanly, then break at runtime or
  open a hole: an unapplied migration, an env var that only exists on this Mac, a
  change to the auth gate. These reach Chance and Jennifer. `preflight.sh` flags them
  under RUNTIME RISKS; treat anything there as blocking until Chance confirms it's handled.

Interrupt for these:

- **A stash is present.** A stash means real work is sitting outside the tree — ask
  whether it should be restored before shipping.
- **`unpulled_commits` > 0.** Something reached GitHub that isn't local (e.g. a PR merged
  in the browser). Pull first, or the push will be rejected.
- **`package-lock.json` modified without `package.json`.** On 2026-09-25 a stray local
  `npm install` had stripped the `libc` fields that pick Linux native binaries on
  Vercel's build machines. Recommend `git checkout package-lock.json` unless Chance
  meant to change dependencies.

## Step 2 — Show the table

| Chance says | What happens |
|---|---|
| **"Ship it"** / **"push it live"** | commit → push to `main` → CI runs → production deploys. The default. |
| **"Commit it, don't ship yet"** | Saved in git locally, nothing leaves the Mac. For unfinished work. |
| **"Put it on a branch"** | Committed and pushed to a branch — off the Mac, CI runs, Vercel makes a preview, production untouched. |
| **"Roll it back"** | `vercel rollback` repoints production to the previous build. Doesn't touch git or Supabase. |

## Step 3 — Recommend one, and say why

Pick the option that fits **what was actually being worked on in this conversation**
and justify it in a sentence or two. The scripts narrow the options; the nature of the
work picks between them.

- Finished, self-contained, checks green → **"ship it"**, plainly.
- Security or auth fix → **"ship it"**, and say why waiting has a cost — an unshipped
  fix protects nobody.
- Mid-feature, or one of several planned changes → **"commit it, don't ship yet"**.
- Risky or hard to verify locally, or shipping only *part* of the work → **"put it on
  a branch"**. Never stash the rest aside to ship a subset.
- Something already live is misbehaving → **"roll it back"** first, diagnose after.
- Migration flagged → apply it to Supabase first, *then* ship, and say so explicitly.

If it's genuinely a toss-up, give the tradeoff rather than inventing a preference.

## After shipping — verify

Once Vercel reports the new deployment `Ready` (run `status.sh` again; the production
id changes), check the live site actually does what the change intended. For API auth,
a cookieless request must get 401:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'Content-Type: application/json' -d '{}' https://italiano-prego.vercel.app/api/sentences/generate
```

## If asked for the CLI path

**"Just deploy what's in my folder"** should sound an alarm — `vercel deploy --prod`
bypasses git and ships whatever sits on disk, uncommitted work included. It's the
emergency path (GitHub down, Git integration disconnected). Deploy from a clean
checkout instead of the working folder:

```bash
D=$(mktemp -d)/deploy && git worktree add --detach "$D" origin/main \
  && mkdir -p "$D/.vercel" && cp .vercel/project.json "$D/.vercel/" \
  && (cd "$D" && npx vercel --prod) ; git worktree remove --force "$D"
```

After any `vercel rollback`, a later deploy does **not** take the production alias —
the rollback pins it. Finish with `vercel promote <new-url> --yes` and confirm via
`vercel inspect https://italiano-prego.vercel.app` that the id matches.

## Notes

- If a push to `main` doesn't produce a new production deployment within ~2 minutes,
  Vercel's Git integration is off (Vercel → italiano → Settings → Git). Use the CLI path
  until it's reconnected.
- If Claude's `git push` or deploy is blocked by the permission classifier,
  `.claude/settings.local.json` (per-machine, gitignored) is missing its allow rules.
  Hand Chance the exact command instead of working around it.
- CI (`.github/workflows/ci.yml`) runs typecheck + tests on every push to `main` and on
  PRs, but **does not gate the deploy** — Vercel builds regardless. Red CI means the bad
  commit is already live: treat it as an alarm, not a lock.
- `supabase/migrations/` is applied out-of-band (Supabase dashboard / MCP), never by
  the deploy.
- Auth is a `userId` cookie (1 = Chance, 2 = Jennifer). The gate is `proxy.ts` for pages
  and `getUserIdFromCookie()` in each API route — which is async and must be awaited.
