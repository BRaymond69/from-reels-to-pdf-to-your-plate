"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Link2, Loader2, Download, Clock, Users, Flame, AlertCircle, BookMarked, Check } from "lucide-react";
import type { Recipe, OutputLanguage } from "@/lib/types";
import { LABELS } from "@/lib/pdf-template";

type Status = "idle" | "loading" | "done" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const LANGUAGE_OPTIONS: { value: OutputLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ko", label: "한국어" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<OutputLanguage>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    setRecipe(null);
    setSaveStatus("idle");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, language }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Something went wrong.");
      setRecipe(data.recipe);
      setStatus("done");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function handleDownload() {
    if (!recipe) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      if (!res.ok) throw new Error("PDF generation failed.");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${recipe.recipe_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveToLibrary() {
    if (!recipe) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/library/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed.");
      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-charcoal">
      <header className="px-6 pt-6 max-w-3xl mx-auto flex justify-end">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-pencil hover:text-mustard transition-colors"
        >
          <BookMarked size={13} /> My Cookbook
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 pt-14 pb-14 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-mustard mb-5"
        >
          <ChefHat size={14} /> Card No. 001 &mdash; Recipe Box
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-4xl sm:text-5xl leading-[1.05] text-paper"
        >
          Paste a Reel.
          <br />
          <span className="text-mustard">Print the recipe.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 text-pencil font-mono text-sm max-w-md mx-auto"
        >
          Drop an Instagram Reel or TikTok cooking video link. We pull the caption,
          transcript, and thumbnail, then typeset it as a single printable index card.
        </motion.p>

        <motion.form
          onSubmit={handleExtract}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex items-stretch gap-0 max-w-lg mx-auto border border-basil/60 bg-charcoal focus-within:border-mustard transition-colors"
        >
          <div className="flex items-center pl-3 text-pencil">
            <Link2 size={16} />
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            required
            className="flex-1 bg-transparent px-3 py-3 text-sm font-mono text-paper placeholder:text-pencil/70 outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-5 font-mono text-xs uppercase tracking-widest bg-mustard text-ink hover:bg-tomato hover:text-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "loading" ? <Loader2 className="animate-spin" size={16} /> : "Extract"}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[11px]"
        >
          <span className="text-pencil uppercase tracking-widest mr-1">Card in:</span>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLanguage(opt.value)}
              aria-pressed={language === opt.value}
              className={`px-3 py-1 border transition-colors ${
                language === opt.value
                  ? "bg-mustard text-ink border-mustard"
                  : "border-basil/50 text-pencil hover:border-mustard hover:text-paper"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence>
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 inline-flex items-center gap-2 text-tomato text-xs font-mono max-w-md mx-auto"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Recipe card result */}
      <AnimatePresence>
        {recipe && (() => {
          const labels = LABELS[recipe.language ?? "en"];
          return (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 pb-24 max-w-3xl mx-auto"
          >
            <div
              className={`relative bg-paper-grain text-ink border border-ink/80 p-8 sm:p-10 ${
                recipe.language === "ko" ? "font-korean" : ""
              }`}
            >
              <div className="absolute inset-3 border border-mustard pointer-events-none" />

              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-tomato mb-2">
                {recipe.category || labels.recipeFallback}
                <span className="text-basil"> &middot; {recipe.cuisine_region} &middot; {recipe.cuisine_country} &middot; {recipe.diet_type}</span>
              </div>
              <h2 className="font-display text-3xl leading-tight max-w-md">{recipe.recipe_title}</h2>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-ink/70 border-y border-dashed border-pencil py-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} /> {labels.prep} {recipe.prep_time} &middot; {labels.cook} {recipe.cook_time}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={12} /> {recipe.servings}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Flame size={12} /> {recipe.calories}
                </span>
              </div>

              <div className="mt-6 grid sm:grid-cols-[2.1in_1fr] gap-8">
                <div>
                  {recipe.thumbnail_base64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.thumbnail_base64}
                      alt={recipe.recipe_title}
                      className="w-full aspect-square object-cover border border-ink"
                    />
                  )}
                  <p className="mt-2 font-mono text-[10px] text-pencil break-words">
                    {recipe.source_author}
                  </p>

                  <h3 className="mt-5 font-mono text-xs uppercase tracking-widest text-basil border-b border-basil pb-1 mb-2">
                    {labels.ingredients}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="pl-3 relative before:content-['–'] before:absolute before:left-0 before:text-mustard">
                        {ing.amount_and_name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-basil border-b border-basil pb-1 mb-2">
                    {labels.method}
                  </h3>
                  <ol className="space-y-3 text-sm">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="font-mono font-bold text-tomato shrink-0 w-5">{i + 1}</span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                  {recipe.notes && (
                    <p className="mt-5 pt-3 border-t border-dashed border-pencil text-xs italic text-ink/70">
                      {recipe.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest bg-basil text-paper px-6 py-3 hover:bg-mustard hover:text-ink transition-colors disabled:opacity-60"
              >
                {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                Download PDF card
              </button>

              <button
                onClick={handleSaveToLibrary}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest border border-mustard text-mustard px-6 py-3 hover:bg-mustard hover:text-ink transition-colors disabled:opacity-70"
              >
                {saveStatus === "saving" && <Loader2 className="animate-spin" size={14} />}
                {saveStatus === "saved" && <Check size={14} />}
                {(saveStatus === "idle" || saveStatus === "error") && <BookMarked size={14} />}
                {saveStatus === "saved" ? "Saved to Cookbook" : "Save to Cookbook"}
              </button>
            </div>
            {saveStatus === "error" && (
              <p className="mt-2 text-center text-tomato text-xs font-mono">
                Couldn't save — check the server logs.
              </p>
            )}
          </motion.section>
          );
        })()}
      </AnimatePresence>
    </main>
  );
}
