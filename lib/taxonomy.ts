/**
 * Single source of truth for the cuisine taxonomy. Kept as a closed set
 * (rather than free-text from the LLM) so folder paths and filter dropdowns
 * stay consistent — the LLM is instructed to pick the closest match, with
 * "Other" fallbacks at every level for dishes that don't fit neatly.
 */
export const CUISINE_TAXONOMY = {
  Asian: ["Chinese", "Korean", "Japanese", "Indonesian", "Thai", "Vietnamese", "Other Asian"],
  Western: ["French", "Italian", "Spanish", "American", "British", "Other Western"],
  "South American": ["Brazilian", "Peruvian", "Argentinian", "Colombian", "Other South American"],
  Caribbean: ["Cuban", "Jamaican", "Puerto Rican", "Haitian", "Other Caribbean"],
  Other: ["Other"],
} as const;

export type CuisineRegion = keyof typeof CUISINE_TAXONOMY;
export const CUISINE_REGIONS = Object.keys(CUISINE_TAXONOMY) as CuisineRegion[];

export const DIET_TYPES = ["Meat", "Veggie", "Vegan"] as const;
export type DietType = (typeof DIET_TYPES)[number];

export function isValidRegion(region: string): region is CuisineRegion {
  return CUISINE_REGIONS.includes(region as CuisineRegion);
}

export function isValidCuisine(region: CuisineRegion, cuisine: string): boolean {
  return (CUISINE_TAXONOMY[region] as readonly string[]).includes(cuisine);
}

export function isValidDiet(diet: string): diet is DietType {
  return (DIET_TYPES as readonly string[]).includes(diet);
}

/** Slugifies for safe use as a folder/file path segment. */
export function pathSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "other";
}
