import { promises as fs } from "fs";
import path from "path";
import type { LibraryEntry, Recipe } from "./types";
import { pathSlug } from "./taxonomy";

// PDFs live under /public so Next.js serves them as static files for free.
// The metadata index lives outside /public under /data, since it's not
// meant to be served directly.
const LIBRARY_PUBLIC_DIR = path.join(process.cwd(), "public", "library");
const INDEX_PATH = path.join(process.cwd(), "data", "library-index.json");

async function ensureDirs() {
  await fs.mkdir(LIBRARY_PUBLIC_DIR, { recursive: true });
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
}

async function readIndex(): Promise<LibraryEntry[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf-8");
    return JSON.parse(raw) as LibraryEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(entries: LibraryEntry[]) {
  await fs.writeFile(INDEX_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

/** Builds the taxonomy-based relative path: region/cuisine/diet/name.lang.pdf */
export function buildLibraryPath(recipe: Recipe): { relDir: string; relFile: string; publicPath: string } {
  const relDir = path.join(
    pathSlug(recipe.cuisine_region),
    pathSlug(recipe.cuisine_country),
    pathSlug(recipe.diet_type)
  );
  const relFile = `${pathSlug(recipe.recipe_title)}.${recipe.language}.pdf`;
  const publicPath = `/library/${relDir.split(path.sep).join("/")}/${relFile}`;
  return { relDir, relFile, publicPath };
}

/**
 * Writes the PDF to its taxonomy folder and records an entry in the index.
 * Overwrites in place if the same title/language/category combo is saved again.
 */
export async function saveToLibrary(recipe: Recipe, pdfBuffer: Buffer): Promise<LibraryEntry> {
  await ensureDirs();

  const { relDir, relFile, publicPath } = buildLibraryPath(recipe);
  const targetDir = path.join(LIBRARY_PUBLIC_DIR, relDir);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, relFile), pdfBuffer);

  const entries = await readIndex();
  const id = publicPath; // path doubles as a stable, natural id

  const entry: LibraryEntry = {
    id,
    title: recipe.recipe_title,
    language: recipe.language,
    cuisine_region: recipe.cuisine_region,
    cuisine_country: recipe.cuisine_country,
    diet_type: recipe.diet_type,
    source_author: recipe.source_author,
    source_url: recipe.source_url,
    pdf_path: publicPath,
    thumbnail_base64: recipe.thumbnail_base64,
    created_at: new Date().toISOString(),
  };

  const withoutDupe = entries.filter((e) => e.id !== id);
  withoutDupe.unshift(entry);
  await writeIndex(withoutDupe);

  return entry;
}

export interface LibraryFilters {
  region?: string;
  cuisine?: string;
  diet?: string;
  language?: string;
}

export async function listLibrary(filters: LibraryFilters = {}): Promise<LibraryEntry[]> {
  const entries = await readIndex();
  return entries.filter((e) => {
    if (filters.region && e.cuisine_region !== filters.region) return false;
    if (filters.cuisine && e.cuisine_country !== filters.cuisine) return false;
    if (filters.diet && e.diet_type !== filters.diet) return false;
    if (filters.language && e.language !== filters.language) return false;
    return true;
  });
}
