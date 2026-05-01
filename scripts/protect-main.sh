#!/usr/bin/env bash
# Apply the canonical WorldRover branch-protection profile to `main` on the
# current GitHub repo. Solo-friendly: blocks force-push and deletion, requires
# a PR for any change to main, and requires a status check named `markdown-lint`
# (the one job every starter-derived repo has). Skip the review requirement —
# solo work doesn't have a reviewer, and a 0-approval PR-required rule still
# enforces the PR flow.
#
# Usage: ./scripts/protect-main.sh [extra_check_name ...]
#
# Required checks given as arguments are added on top of `markdown-lint`. For a
# Node project that runs typecheck + build under a `build` job, you would call:
#
#   ./scripts/protect-main.sh build
#
# Re-running is idempotent — it overwrites the protection ruleset.

set -euo pipefail

repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

# Build the contexts list: markdown-lint plus any extra args.
contexts_json='["markdown-lint"'
for c in "$@"; do
  contexts_json+=",\"$c\""
done
contexts_json+="]"

# shellcheck disable=SC2016
gh api -X PUT "repos/${repo}/branches/main/protection" \
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

echo "Branch protection applied to ${repo}@main."
echo "Required status checks: ${contexts_json}"
