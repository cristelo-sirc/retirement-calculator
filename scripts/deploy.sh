#!/usr/bin/env bash
#
# deploy.sh - reliable one-command deploy for the Retirement Calculator.
#
# WHY THIS EXISTS:
#   This project folder is a FUSE mount. Git's lock/rename operations fail
#   inside it ("operation not permitted"), so commits made in-place die
#   partway. This script does ALL git work in a fresh clone on the sandbox's
#   own (writable) disk, then pushes. It also pins the commit author to the
#   GitHub no-reply email so GitHub's email-privacy rule (GH007) can't reject
#   the push.
#
# USAGE:
#   GITHUB_TOKEN=<github-PAT> bash scripts/deploy.sh "commit message"
#
#   Deploys the CURRENT contents of this repo folder to origin/main.
#   _archive/, data/, .git, .claude and junk files are never deployed.
#
set -euo pipefail

COMMIT_MSG="${1:-deploy: update site}"
GIT_NAME="Cris Garza"
GIT_EMAIL="cristelo-sirc@users.noreply.github.com"
SLUG="cristelo-sirc/retirement-calculator"
BRANCH="main"

# Resolve this repo folder (the mount) from the script's own location.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: set GITHUB_TOKEN to a GitHub PAT with push access." >&2
  echo "Usage: GITHUB_TOKEN=<pat> bash scripts/deploy.sh \"message\"" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Cloning ${BRANCH} into a writable workspace..."
git clone --quiet --branch "$BRANCH" \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${SLUG}.git" "$WORK/repo" 2>/dev/null \
  || { echo "ERROR: clone failed (check token / network)." >&2; exit 1; }

cd "$WORK/repo"
git config user.name  "$GIT_NAME"
git config user.email "$GIT_EMAIL"

echo "==> Syncing files from the project folder..."
rsync -a --delete \
  --exclude '.git/' --exclude '_archive/' --exclude 'data/' \
  --exclude '.claude/' --exclude '.DS_Store' --exclude '.fuse_hidden*' \
  "$SRC"/ ./

git add -A
if git diff --cached --quiet; then
  echo "==> Nothing to deploy (already up to date)."
  exit 0
fi

git commit --quiet -m "$COMMIT_MSG"
echo "==> Pushing to origin/${BRANCH}..."
git push --quiet origin "$BRANCH"
echo "==> Deployed $(git rev-parse --short HEAD): ${COMMIT_MSG}"
