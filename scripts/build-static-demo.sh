#!/usr/bin/env bash
# Builds the browser-only static demo (app/page.tsx -> StaticDemoApp) into
# ./out, suitable for GitHub Pages. See docs/AGENTS.md, "static demo"
# follow-up, and next.config.mjs.
#
# Next's static export (`output: 'export'`) can't contain Route Handlers
# that read the request body (our POST /api/projects etc. — see
# node_modules/next/dist/docs/01-app/02-guides/static-exports.md), so this
# temporarily moves app/api out of the `app/` tree for the duration of the
# build, and always restores it afterward (even on failure, via the trap).
set -euo pipefail
cd "$(dirname "$0")/.."

API_DIR="app/api"
# Outside app/ entirely — a dot-prefixed folder INSIDE app/ is still
# discovered as a route by the app router (only underscore-prefixed
# folders are excluded, and even that's for sub-paths, not worth relying
# on here); moving fully out of app/ avoids any ambiguity.
BACKUP_DIR=".api.static-build-backup"

cleanup() {
  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$API_DIR"
    mv "$BACKUP_DIR" "$API_DIR"
    echo "Restored $API_DIR"
  fi
}
trap cleanup EXIT

if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$BACKUP_DIR"
fi

# A stale .next/ from a previous `next dev`/`next build` can contain
# generated type-checker files (.next/dev/types/validator.ts) that still
# reference app/api/* route modules — which we just moved out of the tree
# above — and fail the typecheck with "Cannot find module". Always start
# this build from a clean .next/.
rm -rf .next

# NEXT_PUBLIC_BASE_PATH: pass this in for a GitHub Pages *project* site
# (served at <user>.github.io/<repo>/, not the domain root), e.g.:
#   NEXT_PUBLIC_BASE_PATH=/productos-reference-build ./scripts/build-static-demo.sh
STATIC_EXPORT=1 NEXT_PUBLIC_STATIC_DEMO=1 npx next build

echo ""
echo "Static demo exported to ./out — serve it with any static file server, e.g.:"
echo "  npx serve out"
