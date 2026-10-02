"use client";

import LocalApp from "@/components/LocalApp";
import StaticDemoApp from "@/components/StaticDemoApp";

// Build-time branch between the two entry points this one route can
// become. `NEXT_PUBLIC_STATIC_DEMO` is statically replaced by Next's
// compiler, so each build only ever ships ONE of these two branches —
// see scripts/build-static-demo.sh and docs/AGENTS.md.
//
//   - unset / "0" (default): LocalApp — the full app, talks to app/api/*,
//     real filesystem persistence. `npm run dev` / `npm run build` as always.
//   - "1": StaticDemoApp — browser-only, localStorage-backed, no server.
//     Built via `npm run build:demo` for GitHub Pages.
export default function Page() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "1") {
    return <StaticDemoApp />;
  }
  return <LocalApp />;
}
