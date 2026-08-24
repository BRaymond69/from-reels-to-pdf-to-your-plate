import type { CuisineRegion, DietType } from "./taxonomy";

export type OutputLanguage = "en" | "fr" | "ko";

export interface RawExtraction {
  sourceUrl: string;
  platform: "instagram" | "tiktok";
  authorHandle: string;
  captionText: string;
  transcript: string | null;
  thumbnailUrl: string;
  thumbnailBase64: string | null;
}

export interface Ingredient {
  amount_and_name: string;
}

export interface Recipe {
  recipe_title: string;
  category: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: string;
  calories: string;
  source_author: string;
  source_url: string;
  thumbnail_base64: string | null;
  language: OutputLanguage;
  cuisine_region: CuisineRegion;
  cuisine_country: string;
  diet_type: DietType;
  ingredients: Ingredient[];
  steps: string[];
  notes: string;
}

export interface ExtractApiResponse {
  ok: boolean;
  recipe?: Recipe;
  error?: string;
}

export interface LibraryEntry {
  id: string;
  title: string;
  language: OutputLanguage;
  cuisine_region: CuisineRegion;
  cuisine_country: string;
  diet_type: DietType;
  source_author: string;
  source_url: string;
  /** Public path under /public, e.g. /library/asian/korean/vegan/name.ko.pdf */
  pdf_path: string;
  thumbnail_base64: string | null;
  created_at: string;
}
