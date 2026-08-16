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
          DEFAULT: "#282539",
          50: "#f4f3f7",
        },
        oatmeal: "#EBE9E4",
        coral: "#EFC8C8",
        sea: "#8ED3CC",
        umber: "#786767",
        chartreuse: "#EEEFC8",
      },
      fontFamily: {
        // Editorial serif look via system fonts — no network fetch needed
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
