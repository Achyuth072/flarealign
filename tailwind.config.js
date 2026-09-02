import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cf: {
          orange: "#F6821F",
          "orange-hover": "#E57213",
          "orange-light": "#FAAD3F",
          "orange-subtle": "rgba(246, 130, 31, 0.15)",
          canvas: "#0C0D0E",
          surface: "#121316",
          "surface-low": "#18191E",
          "surface-card": "#1E2026",
          "surface-high": "#272932",
          "surface-highest": "#323542",
          border: "#2F333E",
          "border-subtle": "#22242C",
          "border-highlight": "#4B5563",
          emerald: "#34D399",
          amber: "#FBBF24",
          sky: "#38BDF8",
          violet: "#A78BFA",
          rose: "#F87171",
          text: "#F8FAFC",
          secondary: "#CBD5E1",
          muted: "#94A3B8",
          dimmed: "#64748B",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [
    daisyui,
  ],
  daisyui: {
    themes: [
      {
        cloudflare: {
          "primary": "#F6821F",
          "primary-content": "#0C0D0E",
          "secondary": "#282A34",
          "secondary-content": "#F8FAFC",
          "accent": "#F6821F",
          "neutral": "#1E2026",
          "neutral-content": "#F8FAFC",
          "base-100": "#141518",
          "base-200": "#0E0F12",
          "base-300": "#282A34",
          "base-content": "#F8FAFC",
          "info": "#94A3B8",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
        },
      },
      "dark",
    ],
    defaultTheme: "cloudflare",
    logs: false,
  },
}


