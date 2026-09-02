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
          "orange-subtle": "rgba(246, 130, 31, 0.12)",
          canvas: "#0C0D0E",
          surface: "#121316",
          "surface-low": "#18191E",
          "surface-card": "#1E2026",
          "surface-high": "#272932",
          "surface-highest": "#323542",
          border: "#282A34",
          "border-subtle": "#1E2029",
          "border-highlight": "#3E4252",
          emerald: "#10B981",
          amber: "#F59E0B",
          sky: "#0284C7",
          violet: "#8B5CF6",
          rose: "#EF4444",
          text: "#F3F4F6",
          muted: "#9CA3AF",
          dimmed: "#6B7280",
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
          "primary-content": "#FFFFFF",
          "secondary": "#282A34",
          "secondary-content": "#F3F4F6",
          "accent": "#F6821F",
          "neutral": "#1E2026",
          "neutral-content": "#F3F4F6",
          "base-100": "#141518",
          "base-200": "#0E0F12",
          "base-300": "#22242B",
          "base-content": "#F3F4F6",
          "info": "#9CA3AF",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
      },
      "dark",
    ],
    defaultTheme: "cloudflare",
    logs: false,
  },
}


