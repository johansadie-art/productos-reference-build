import { NavStageId } from "@/lib/stageUi";

/**
 * Simple, single-colour (currentColor) line icons for the top-bar stage
 * switcher — replaces the multi-coloured emoji glyphs used elsewhere (e.g.
 * the Design/Ideation chat pill), which is intentional: those still use the
 * warmer emoji-per-stage treatment, but the top bar reads as one consistent
 * product "logo mark" per stage rather than a rainbow of emoji.
 */
const PATHS: Record<NavStageId, React.ReactNode> = {
  Ideate: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.35.26.5.6.5 1V16h6v-1.1c0-.4.15-.74.5-1A6 6 0 0 0 12 3Z" />
    </>
  ),
  Research: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.7-4.7" />
    </>
  ),
  PRD: (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12.5h6M9 16h6" />
    </>
  ),
  Design: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1.1.9-2 2-2H16a5 5 0 0 0 5-5c0-3.9-4-6.5-9-6.5Z" />
      <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  Code: (
    <>
      <path d="M9 8 5 12l4 4" />
      <path d="M15 8l4 4-4 4" />
    </>
  ),
  Deploy: (
    <>
      <path d="M12 2l3 6 6 1-4.5 4.5L17.5 20 12 17l-5.5 3 1-6.5L3 9l6-1 3-6Z" />
    </>
  ),
};

export function StageIcon({ id, className }: { id: NavStageId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-[18px] w-[18px]"}
      aria-hidden
    >
      {PATHS[id]}
    </svg>
  );
}
