#!/usr/bin/env bash
set -e

G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'; B='\033[1m'; NC='\033[0m'
ok()   { echo -e "${G}✓  $1${NC}"; }
step() { echo -e "\n${B}${C}▶  $1${NC}"; }
err()  { echo -e "\n\033[0;31m✗  $1${NC}\n"; exit 1; }

echo ""
echo -e "${B}${C}╔══════════════════════════════════╗${NC}"
echo -e "${B}${C}║  recomp — one-time setup         ║${NC}"
echo -e "${B}${C}╚══════════════════════════════════╝${NC}"

step "Checking prerequisites"
command -v node >/dev/null 2>&1 || err "node not found"
command -v npm  >/dev/null 2>&1 || err "npm not found"
command -v gh   >/dev/null 2>&1 || err "gh not found — run: brew install gh && gh auth login"
gh auth status >/dev/null 2>&1  || err "Not logged in to GitHub — run: gh auth login"
ok "Prerequisites OK"

step "Switching ae-ui dep from file: to npm"
npm install ae-ui --save
ok "ae-ui dep updated to npm version"

step "Installing all dependencies"
npm install --silent
ok "node_modules ready"

step "Creating GitHub repo dhandapani8/recomp (private)"
if gh repo view dhandapani8/recomp >/dev/null 2>&1; then
  echo -e "   ${Y}Repo already exists — skipping creation${NC}"
else
  gh repo create dhandapani8/recomp --private --description "AI-assisted body recomposition tracker" --source=. --remote=origin --push
  ok "Repo created and pushed"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/dhandapani8/recomp.git"
fi
git push -u origin main 2>/dev/null || true
ok "Code pushed to GitHub"

step "Copying .env.local.example → .env.local"
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  ok ".env.local created (edit RECOMP_PASSWORD if you want auth)"
else
  echo -e "   ${Y}.env.local already exists — skipping${NC}"
fi

echo ""
echo -e "${G}${B}╔══════════════════════════════════╗${NC}"
echo -e "${G}${B}║  recomp ready!                   ║${NC}"
echo -e "${G}${B}╚══════════════════════════════════╝${NC}"
echo ""
echo -e "   GitHub:    ${C}https://github.com/dhandapani8/recomp${NC}"
echo -e "   Dev server: ${B}npm run dev${NC}  →  http://localhost:3000"
echo ""
