// dashboard/src/lib/social/utm.ts

/**
 * Canonical UTM taxonomy so links never fragment into instagram/Instagram/IG/insta-style
 * variants that can't be grouped together in Shopify's campaign reports.
 */
export const UTM_SOURCES = ["instagram", "facebook", "tiktok", "pinterest"] as const;
export type UtmSource = (typeof UTM_SOURCES)[number];

export const UTM_MEDIUMS = ["organic-social", "paid-social"] as const;
export type UtmMedium = (typeof UTM_MEDIUMS)[number];

export interface UtmParams {
  source: UtmSource;
  medium: UtmMedium;
  campaign: string;
  content?: string;
}

export class InvalidUtmUrlError extends Error {}

/** Appends canonical UTM params to a base URL. Slugifies the campaign/content values
 * (lowercase, spaces/underscores to hyphens) so they match the taxonomy consistently
 * regardless of how a user types them. */
export function buildUtmUrl(baseUrl: string, params: UtmParams): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new InvalidUtmUrlError(`"${baseUrl}" is not a valid absolute URL.`);
  }
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", slugify(params.campaign));
  if (params.content) url.searchParams.set("utm_content", slugify(params.content));
  return url.toString();
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
