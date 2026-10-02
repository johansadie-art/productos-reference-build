// STATIC_EXPORT=1 switches this to a static export build (no server, no
// app/api/*) for the GitHub Pages demo — see scripts/build-static-demo.sh,
// which also sets NEXT_PUBLIC_STATIC_DEMO=1 (read by app/page.tsx) and
// temporarily moves app/api out of the tree (Route Handlers that read the
// request body, like our POST routes, aren't static-exportable — see
// node_modules/next/dist/docs/01-app/02-guides/static-exports.md).
// Normal local dev/build (`npm run dev` / `npm run build`) is completely
// unaffected — this block is a no-op unless STATIC_EXPORT is set.
const isStaticExport = process.env.STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        // Project pages (<user>.github.io/<repo>/) are served from a
        // subpath, not the domain root — set via the workflow/script to
        // the actual repo name at build time.
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
