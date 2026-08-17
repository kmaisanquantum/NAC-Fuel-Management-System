/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#070B14",
          900: "#0B1220",
          800: "#121A2B",
          700: "#1A2438",
          600: "#223049",
          500: "#334261",
        },
        ink: {
          100: "#E8EDF5",
          300: "#B6C0D3",
          500: "#8A97AC",
        },
        amber: {
          400: "#F5A623",
          500: "#E0921A",
        },
        signal: {
          green: "#2DD4A7",
          yellow: "#F5A623",
          red: "#EF4B4B",
          grey: "#5B6B85",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        data: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
