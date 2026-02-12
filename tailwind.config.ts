import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          bg: "#FAF8F5",
          surface: "#F0EDE8",
          "surface-hover": "#E8E4DB",
          text: "#2C2C2C",
          "text-muted": "#6B6B6B",
          accent: "#B8860B",
          "accent-hover": "#9A7209",
          border: "#E0DCD4",
          success: "#6B8E4E",
          error: "#C44040",
          info: "#5B7FA5",
        },
        study: {
          bg: "#1C1B1A",
          surface: "#262523",
          "surface-hover": "#302E2C",
          text: "#E8E4DB",
          "text-muted": "#8B8780",
          accent: "#D4A843",
          "accent-hover": "#E0B84E",
          border: "#3A3836",
          success: "#7FA05E",
          error: "#E06060",
          info: "#6B8FB5",
        },
      },
      fontFamily: {
        literata: ["var(--font-literata)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
