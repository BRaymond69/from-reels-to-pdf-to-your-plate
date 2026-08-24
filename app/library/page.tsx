import Link from "next/link";
import { ChefHat, Download, ArrowLeft } from "lucide-react";
import { listLibrary } from "@/lib/library";
import { CUISINE_TAXONOMY, CUISINE_REGIONS, DIET_TYPES, type CuisineRegion } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { region?: string; cuisine?: string; diet?: string; language?: string };
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const { region, cuisine, diet, language } = searchParams;
  const entries = await listLibrary({ region, cuisine, diet, language });

  const cuisineOptions =
    region && CUISINE_REGIONS.includes(region as CuisineRegion)
      ? CUISINE_TAXONOMY[region as CuisineRegion]
      : [];

  return (
    <main className="min-h-screen bg-charcoal text-paper px-6 py-14">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-pencil hover:text-mustard transition-colors"
        >
          <ArrowLeft size={13} /> Back
        </Link>

        <div className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-mustard">
          <ChefHat size={14} /> My Cookbook
        </div>
        <h1 className="font-display text-3xl sm:text-4xl mt-2">Saved recipe cards</h1>

        {/* Filters — plain GET form, no client JS required */}
        <form className="mt-8 flex flex-wrap gap-3 font-mono text-xs" method="get">
          <select
            name="region"
            defaultValue={region ?? ""}
            className="bg-charcoal border border-basil/50 px-3 py-2 text-paper"
          >
            <option value="">All regions</option>
            {CUISINE_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            name="cuisine"
            defaultValue={cuisine ?? ""}
            className="bg-charcoal border border-basil/50 px-3 py-2 text-paper"
          >
            <option value="">All cuisines</option>
            {(cuisineOptions.length > 0
              ? cuisineOptions
              : Array.from(new Set(CUISINE_REGIONS.flatMap((r) => CUISINE_TAXONOMY[r])))
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            name="diet"
            defaultValue={diet ?? ""}
            className="bg-charcoal border border-basil/50 px-3 py-2 text-paper"
          >
            <option value="">All diets</option>
            {DIET_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            name="language"
            defaultValue={language ?? ""}
            className="bg-charcoal border border-basil/50 px-3 py-2 text-paper"
          >
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ko">한국어</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-mustard text-ink uppercase tracking-widest hover:bg-tomato hover:text-paper transition-colors"
          >
            Filter
          </button>
          {(region || cuisine || diet || language) && (
            <Link
              href="/library"
              className="px-4 py-2 border border-pencil/50 text-pencil hover:text-paper hover:border-paper transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Results */}
        {entries.length === 0 ? (
          <p className="mt-14 text-pencil font-mono text-sm">
            No saved cards yet{region || cuisine || diet || language ? " matching those filters" : ""}.
            Generate a recipe from the home page and hit "Save to Cookbook".
          </p>
        ) : (
          <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {entries.map((entry) => (
              <a
                key={entry.id}
                href={entry.pdf_path}
                target="_blank"
                rel="noreferrer"
                className="group border border-ink/0 hover:border-mustard bg-paper-grain text-ink p-4 flex flex-col transition-colors"
              >
                {entry.thumbnail_base64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.thumbnail_base64}
                    alt={entry.title}
                    className="w-full aspect-square object-cover border border-ink mb-3"
                  />
                )}
                <div className="font-mono text-[9px] uppercase tracking-widest text-tomato">
                  {entry.cuisine_region} &middot; {entry.cuisine_country} &middot; {entry.diet_type}
                </div>
                <h2 className="font-display text-base leading-snug mt-1 flex-1">{entry.title}</h2>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-pencil">
                  <span>{entry.language.toUpperCase()}</span>
                  <span className="inline-flex items-center gap-1 group-hover:text-basil transition-colors">
                    <Download size={11} /> Open PDF
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
