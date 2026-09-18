// dashboard/src/components/ui/tones.ts
export type PanelTone = "default" | "blue" | "magenta" | "violet" | "cyan" | "red" | "yellow";

export const TONE_BORDERS: Record<PanelTone, { border: string; borderStrong: string }> = {
  default: { border: "rgba(233, 238, 245, 0.14)", borderStrong: "rgba(233, 238, 245, 0.26)" },
  blue: { border: "rgba(143, 211, 255, 0.3)", borderStrong: "rgba(143, 211, 255, 0.55)" },
  magenta: { border: "rgba(255, 107, 214, 0.3)", borderStrong: "rgba(255, 107, 214, 0.55)" },
  violet: { border: "rgba(190, 143, 255, 0.3)", borderStrong: "rgba(190, 143, 255, 0.55)" },
  cyan: { border: "rgba(125, 224, 220, 0.3)", borderStrong: "rgba(125, 224, 220, 0.55)" },
  red: { border: "rgba(255, 59, 92, 0.32)", borderStrong: "rgba(255, 59, 92, 0.58)" },
  yellow: { border: "rgba(255, 224, 90, 0.32)", borderStrong: "rgba(255, 224, 90, 0.58)" },
};

export function toneVars(tone: PanelTone = "default"): Record<string, string> {
  const c = TONE_BORDERS[tone];
  return { "--border": c.border, "--border-strong": c.borderStrong };
}
