import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Recipe box" token system — dark charcoal ground, typed index-card hero,
        // mustard + kitchen-green accents. Deliberately not the cream/terracotta default.
        ink: "#1C1A17",
        paper: "#F6F1E4",
        card: "#EFE6D0",
        charcoal: "#211F1C",
        mustard: "#D9A02A",
        basil: "#42633F",
        tomato: "#B8452E",
        pencil: "#8A8272",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        hand: ["Georgia", "serif"],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: "4px 4px",
      },
    },
  },
  plugins: [],
};
export default config;
