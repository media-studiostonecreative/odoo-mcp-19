/**
 * Pure helpers for editing a scheduled post (content idea): turning typed
 * hashtags back into tiered entries, and describing an edit in one line for the
 * activity history. No DB access, safe to import from a client component.
 */

export type HashtagTier = "core" | "subject" | "discovery" | "seasonal" | "regional";

export interface EditableHashtag {
  tier: HashtagTier;
  tag: string;
}

/** Tags typed without a tier get this one; it's the neutral, product-describing tier. */
const DEFAULT_TIER: HashtagTier = "subject";

/**
 * Parses "#stonecarving mapleleaf, #FallCraft" into hashtag entries. A tag that
 * already existed (compared case-insensitively) keeps its tier; new tags get
 * the default tier. Duplicates are dropped, order is kept.
 */
export function parseHashtagInput(text: string, existing: EditableHashtag[] = []): EditableHashtag[] {
  const tierByTag = new Map(existing.map((h) => [h.tag.replace(/^#/, "").toLowerCase(), h.tier]));
  const seen = new Set<string>();
  const out: EditableHashtag[] = [];
  for (const raw of text.split(/[\s,]+/)) {
    const bare = raw.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!bare) continue;
    const key = bare.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ tag: `#${bare}`, tier: tierByTag.get(key) ?? DEFAULT_TIER });
  }
  return out;
}

export interface EditableIdeaFields {
  product: string;
  hook: string | null;
  caption: string;
  hashtags: EditableHashtag[];
  cta: string | null;
  target_date: string | null;
  platform: string;
  format: string;
  pillar: string | null;
}

const FIELD_LABELS: Record<keyof EditableIdeaFields, string> = {
  product: "title",
  hook: "hook",
  caption: "caption",
  hashtags: "hashtags",
  cta: "call to action",
  target_date: "date",
  platform: "platform",
  format: "format",
  pillar: "pillar",
};

/** Short values are worth showing as "from → to"; long text just says it changed. */
const SHOW_VALUES: (keyof EditableIdeaFields)[] = ["target_date", "platform", "format", "pillar"];

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Which of the editable fields a patch actually changes, compared to the current post. */
export function changedFields(before: EditableIdeaFields, patch: Partial<EditableIdeaFields>): (keyof EditableIdeaFields)[] {
  return (Object.keys(FIELD_LABELS) as (keyof EditableIdeaFields)[]).filter((k) => k in patch && !same(before[k], patch[k]));
}

/** e.g. "Edited caption and hashtags; date Sep 25 → Sep 28". Empty string when nothing changed. */
export function describeIdeaEdit(before: EditableIdeaFields, patch: Partial<EditableIdeaFields>): string {
  const changed = changedFields(before, patch);
  if (changed.length === 0) return "";
  const shown = changed.filter((k) => SHOW_VALUES.includes(k));
  const text = changed.filter((k) => !SHOW_VALUES.includes(k)).map((k) => FIELD_LABELS[k]);
  const parts: string[] = [];
  if (text.length > 0) parts.push(`Edited ${joinList(text)}`);
  for (const k of shown) parts.push(`${FIELD_LABELS[k]} ${display(before[k])} → ${display(patch[k])}`);
  const sentence = parts.join("; ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  return String(value);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
