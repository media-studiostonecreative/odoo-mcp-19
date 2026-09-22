import { describe, it, expect } from "vitest";
import { buildUtmUrl, slugify, InvalidUtmUrlError } from "@/lib/social/utm";

describe("slugify", () => {
  it("lowercases and hyphenates spaces and underscores", () => {
    expect(slugify("Fall Sale_Launch")).toBe("fall-sale-launch");
  });

  it("strips characters outside a-z0-9-", () => {
    expect(slugify("50% Off!!")).toBe("50-off");
  });
});

describe("buildUtmUrl", () => {
  it("appends canonical utm_source/medium/campaign params", () => {
    const url = buildUtmUrl("https://studiostonecreative.com/products/druk-dragon-kit", {
      source: "instagram",
      medium: "organic-social",
      campaign: "Fall Launch",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("instagram");
    expect(parsed.searchParams.get("utm_medium")).toBe("organic-social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("fall-launch");
  });

  it("includes utm_content only when provided", () => {
    const withoutContent = new URL(buildUtmUrl("https://studiostonecreative.com/", { source: "tiktok", medium: "paid-social", campaign: "test" }));
    expect(withoutContent.searchParams.has("utm_content")).toBe(false);

    const withContent = new URL(
      buildUtmUrl("https://studiostonecreative.com/", { source: "tiktok", medium: "paid-social", campaign: "test", content: "Video A" }),
    );
    expect(withContent.searchParams.get("utm_content")).toBe("video-a");
  });

  it("throws InvalidUtmUrlError for a non-absolute base URL", () => {
    expect(() => buildUtmUrl("/relative/path", { source: "pinterest", medium: "organic-social", campaign: "x" })).toThrow(InvalidUtmUrlError);
  });
});
