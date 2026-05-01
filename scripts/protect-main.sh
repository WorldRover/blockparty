#!/usr/bin/env bash
# Apply the canonical WorldRover branch-protection profile to `main`.
# Solo-friendly: blocks force-push and deletion, requires linear history,
# requires a PR for any change (0 approvals — still enforces the PR flow),
# and requires at least the `markdown-lint` status check.
#
# Usage: ./scripts/protect-main.sh [OWNER/REPO] [check_context ...]
#
# OWNER/REPO is optional — defaults to the repo in the current directory.
# Pass it when running against a different repo (matches init-labels.sh).
#
# check_context strings must match what GitHub reports verbatim. For jobs
# with no `name:` key, this is the job ID (e.g. `markdown-lint`, `build`).
# For jobs with a display name, GitHub uses the name directly. To see the
# exact strings for a repo:
#
#   gh api repos/OWNER/REPO/commits/main/check-runs --jq '.[].name'
#
# Examples:
#   ./scripts/protect-main.sh
#   ./scripts/protect-main.sh build
#   ./scripts/protect-main.sh WorldRover/myrepo build
#
# Re-running is idempotent — it overwrites the protection ruleset.

set -euo pipefail

REPO=""

for arg in "$@"; do
  # OWNER/REPO: contains / but no spaces (repo names can't have spaces).
  # Check contexts like "CI / job (event)" also contain / but do have spaces.
  if [[ "$arg" == */* ]] && [[ "$arg" != *" "* ]]; then
    REPO="$arg"
  fi
done

if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
fi

# Build contexts array: markdown-lint plus any non-repo extra args.
contexts=("markdown-lint")
for c in "$@"; do
  [[ "$c" == */* ]] && [[ "$c" != *" "* ]] && continue
  contexts+=("$c")
done

# Build JSON array from contexts.
contexts_json=$(printf ',"%s"' "${contexts[@]}")
contexts_json="[${contexts_json:1}]"

gh api -X PUT "repos/${REPO}/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ${contexts_json}
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": false
}
JSON

echo "Branch protection applied to ${REPO}@main."
echo "Required status checks: ${contexts_json}"

# Verify that each required context exists in recent CI runs.
# A context that doesn't match any check run shows "Expected — Waiting" permanently.
# Skip the check if no runs exist yet (new repo, CI hasn't fired).
recent=$(gh api "repos/${REPO}/commits/main/check-runs" --jq '[.check_runs[].name]' 2>/dev/null || echo "[]")
if [[ $(echo "$recent" | jq 'length') -gt 0 ]]; then
  for ctx in "${contexts[@]}"; do
    if ! echo "$recent" | jq -e --arg c "$ctx" 'contains([$c])' > /dev/null 2>&1; then
      echo ""
      echo "⚠  Warning: \"$ctx\" not found in recent check runs on ${REPO}@main."
      echo "   This context will show \"Expected — Waiting\" permanently."
      echo "   Actual check names: $(echo "$recent" | jq -r 'join(", ")')"
      echo "   Re-run this script with the correct context strings."
    fi
  done
fi
