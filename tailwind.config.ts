import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          wine: "#821d30",
          wineDark: "#5c1422",
          sand: "#c3b79d",
          paper: "#f5f4f2",
          cream: "#fffdfb",
          muted: "#8a7468",
          success: "#1f6b4a",
          danger: "#b42318",
          warning: "#9a6b2f",
        },
        ink: {
          950: "#f5f4f2",
          900: "#fffdfb",
          800: "#efe8dc",
          700: "#c3b79d",
        },
        mist: {
          100: "#821d30",
          300: "#5c1422",
          400: "#8a7468",
          500: "#8a7468",
        },
        signal: {
          teal: "#1f6b4a",
          amber: "#9a6b2f",
          rose: "#b42318",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 10px 40px rgba(92, 20, 34, 0.08)",
        lift: "0 16px 40px rgba(92, 20, 34, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
