#!/usr/bin/env bash
# Creates Aalsh23-bot/aalsh23-bot.github.io with root app-ads.txt for AdMob.
set -euo pipefail

OWNER="${GITHUB_OWNER:-Aalsh23-bot}"
REPO="${OWNER}.github.io"
DIR="${TMPDIR:-/tmp}/aalsh23-bot-github-io-$$"
LINE="google.com, pub-9139788549801123, DIRECT, f08c47fec0942fa0"

cleanup() { rm -rf "$DIR"; }
trap cleanup EXIT

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI first: https://cli.github.com/"
  exit 1
fi

gh auth status >/dev/null

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  echo "Repo $OWNER/$REPO already exists — cloning…"
  gh repo clone "$OWNER/$REPO" "$DIR"
  cd "$DIR"
else
  echo "Creating $OWNER/$REPO…"
  mkdir -p "$DIR"
  cd "$DIR"
  git init -b main
  gh repo create "$OWNER/$REPO" --public --source=. --remote=origin --description "Root GitHub Pages for AdMob app-ads.txt"
fi

printf '%s\n' "$LINE" > app-ads.txt
printf '%s\n' "# ${OWNER}.github.io" "" "Root site for AdMob \`app-ads.txt\`." > README.md

git add app-ads.txt README.md
if git diff --cached --quiet; then
  echo "Nothing to commit (file already up to date)."
else
  git -c user.email="$(gh api user --jq .email 2>/dev/null || echo 'dev@users.noreply.github.com')" \
      -c user.name="$(gh api user --jq .login)" \
      commit -m "Add root app-ads.txt for AdMob verification" || \
  git commit -m "Add root app-ads.txt for AdMob verification"
fi

git push -u origin HEAD:main

echo "Enable Pages if needed: repo Settings → Pages → Deploy from branch → main / root"
echo "Then open: https://${OWNER}.github.io/app-ads.txt"
echo "In AdMob, press: البحث عن تحديثات"<|eos|>