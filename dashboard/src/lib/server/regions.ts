import "server-only";

import { readOdoo } from "./safe-odoo";
import { cached } from "./cache";

export type Region =
  | "Canada"
  | "United States"
  | "United Kingdom"
  | "European Union"
  | "Other";

interface CountryGroupRow {
  id: number;
  country_ids: number[];
}

interface CountryRow {
  id: number;
  code: string | false;
}

/**
 * Resolves the "European Union VAT" country group's member country ids
 * live from Odoo (verified: exactly the 27 real EU member states, with
 * GB/US/CA absent) instead of hard-coding a country list, so a change to
 * that data in this Odoo instance is picked up automatically. Looked up
 * by name rather than a hard-coded id, and cached for 10 minutes since
 * country-group membership essentially never changes intra-day.
 */
async function getEuCountryIds(): Promise<Set<number>> {
  return cached(
    "regions:eu-country-ids",
    async () => {
      const groups = await readOdoo<CountryGroupRow[]>(
        "res.country.group",
        "search_read",
        { domain: [["name", "=", "European Union VAT"]], fields: ["country_ids"], limit: 1 },
      );
      const ids = groups[0]?.country_ids ?? [];
      return new Set(ids);
    },
    10 * 60_000,
  );
}

/** Loads {country_id -> ISO code} for a set of res.country ids. */
async function getCountryCodes(countryIds: number[]): Promise<Map<number, string>> {
  if (countryIds.length === 0) return new Map();
  const rows = await readOdoo<CountryRow[]>("res.country", "search_read", {
    domain: [["id", "in", countryIds]],
    fields: ["code"],
  });
  return new Map(rows.map((r) => [r.id, r.code || ""]));
}

/**
 * Maps a batch of res.partner country_id values to the dashboard's region
 * buckets. Priority: Canada > United States > United Kingdom > European
 * Union (via country_group_ids) > Other. No customer names involved.
 */
export async function regionsForCountryIds(
  countryIds: (number | null)[],
): Promise<Map<number | null, Region>> {
  const distinctIds = [...new Set(countryIds.filter((id): id is number => id != null))];
  const [codes, euIds] = await Promise.all([getCountryCodes(distinctIds), getEuCountryIds()]);

  const result = new Map<number | null, Region>();
  for (const id of countryIds) {
    if (id == null) {
      result.set(id, "Other");
      continue;
    }
    const code = codes.get(id);
    let region: Region;
    if (code === "CA") region = "Canada";
    else if (code === "US") region = "United States";
    else if (code === "GB") region = "United Kingdom";
    else if (euIds.has(id)) region = "European Union";
    else region = "Other";
    result.set(id, region);
  }
  return result;
}
