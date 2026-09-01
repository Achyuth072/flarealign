/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        cf: {
          orange: "#F6821F",
          "orange-hover": "#E57213",
          dark: "#1E1E1E",
          card: "#252526",
          border: "#333333",
          accent: "#FAAD3F"
        }
      }
    },
  },
  plugins: [],
}

