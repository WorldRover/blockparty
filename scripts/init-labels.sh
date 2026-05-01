#!/usr/bin/env bash
# Create the canonical WorldRover label set on the current repo.
# Idempotent: existing labels with the same names are left alone (gh exits non-zero
# but we ignore it). To force-update colors/descriptions, run with `--update`.

set -euo pipefail

REPO="${1:-}"
UPDATE_FLAG=""

# Allow `./init-labels.sh --update` or `./init-labels.sh OWNER/REPO --update`
for arg in "$@"; do
  case "$arg" in
    --update) UPDATE_FLAG="--force" ;;
    */*)      REPO="$arg" ;;
  esac
done

if [[ -z "$REPO" ]]; then
  REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
fi

echo "Initializing labels on $REPO"

create() {
  local name="$1" description="$2" color="$3"
  if [[ -n "$UPDATE_FLAG" ]]; then
    gh label create "$name" --description "$description" --color "$color" --force --repo "$REPO"
  else
    gh label create "$name" --description "$description" --color "$color" --repo "$REPO" 2>/dev/null \
      || echo "  · skipped (exists): $name"
  fi
}

# Domain
create "ui"    "User interface, visual, layout"          "9b59b6"
create "data"  "Measurement, computation, baselines, scoring" "0e8a16"
create "infra" "Dependencies, tooling, CI, platform support"  "1abc9c"

# Priority
create "P1" "High priority"              "b60205"
create "P2" "Medium priority"            "ff9f1c"
create "P3" "Low priority / nice to have" "c2e0c6"

# Type
create "type: bug"          "Something isn't working"               "d73a4a"
create "type: feature"      "New functionality"                     "1d76db"
create "type: docs"         "Documentation only"                    "999999"
create "type: enhancement"  "Refinement of existing functionality"  "7057ff"
create "type: refactor"     "Behavior-preserving restructuring"     "e4e669"

# Standard
create "duplicate"        "This issue or pull request already exists" "cfd3d7"
create "good first issue" "Good for newcomers"                        "7057ff"
create "help wanted"      "Extra attention is needed"                 "008672"
create "invalid"          "This doesn't seem right"                   "e4e669"
create "question"         "Further information is requested"          "d876e3"
create "wontfix"          "This will not be worked on"                "ffffff"

# Remove the GitHub default labels that overlap with the type:- variants.
# These deletions are also non-fatal — if they don't exist, gh prints a warning.
echo "Removing redundant default labels"
gh label delete "bug"           --yes --repo "$REPO" 2>/dev/null || true
gh label delete "enhancement"   --yes --repo "$REPO" 2>/dev/null || true
gh label delete "documentation" --yes --repo "$REPO" 2>/dev/null || true

echo
echo "Done. Final label set:"
gh label list --repo "$REPO"
