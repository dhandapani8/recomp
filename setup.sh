#!/usr/bin/env bash
set -e

command -v node >/dev/null 2>&1 || { echo "node is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }

npm install

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local. Replace every placeholder before starting Recomp."
fi

echo "Recomp is ready. Run: npm run dev"
