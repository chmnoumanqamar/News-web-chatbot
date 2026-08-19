/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          DEFAULT: "#0B0F17", // Midnight Obsidian
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#0b0f17",
        },
        oatmeal: "#F8FAFC", // Clean luminous canvas in light mode
        coral: "#F43F5E",   // Vibrant Rose / Crimson
        sea: "#0EA5E9",     // Electric Sky / Cyan
        umber: "#64748B",   // Refined Slate Gray
        chartreuse: "#F59E0B", // Golden Amber
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      fontFamily: {
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.4, transform: "scale(0.85)" },
        },
      },
      animation: {
        ticker: "ticker 32s linear infinite",
        shimmer: "shimmer 1.6s infinite linear",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

