// The Website Health board tints panels by tone; this board uses a single border
// colour on purpose. Kept so any shared call site still type-checks.
export type PanelTone = "default" | "blue" | "magenta" | "violet" | "cyan" | "red" | "yellow";

export function toneVars(): Record<string, string> {
  return {};
}
