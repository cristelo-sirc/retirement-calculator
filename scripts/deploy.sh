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
# TOKEN:
#   Uses $GITHUB_TOKEN if set, otherwise reads data/deploy-token.txt
#   (gitignored and never deployed).
#
# USAGE:
#   bash scripts/deploy.sh "commit message"
#
set -euo pipefail

COMMIT_MSG="${1:-deploy: update site}"
GIT_NAME="Cris Garza"
GIT_EMAIL="cristelo-sirc@users.noreply.github.com"
SLUG="cristelo-sirc/retirement-calculator"
BRANCH="main"

# Resolve this repo folder (the mount) from the script's own location.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Token: prefer env var, else the private gitignored file.
TOKEN_FILE="$SRC/data/deploy-token.txt"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$GITHUB_TOKEN" ] && [ -f "$TOKEN_FILE" ]; then
  GITHUB_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
fi
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: no GitHub token found." >&2
  echo "Set GITHUB_TOKEN=<pat> or put the token in data/deploy-token.txt" >&2
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
