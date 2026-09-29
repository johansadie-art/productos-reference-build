import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductOS (Reference Build)",
  description: "Idea in. Product out. — reference prototype of the shared-context, multi-agent pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white antialiased">{children}</body>
    </html>
  );
}
