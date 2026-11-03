import type { Tone } from "../domain/labels";

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  good: "text-good",
  warning: "text-warning",
  serious: "text-serious",
  critical: "text-critical",
  neutral: "text-ink-2",
  muted: "text-ink-3",
};

export const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent",
  good: "bg-good",
  warning: "bg-warning",
  serious: "bg-serious",
  critical: "bg-critical",
  neutral: "bg-ink-2",
  muted: "bg-ink-3",
};
