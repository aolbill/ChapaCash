import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          wine: "#821d30",
          sand: "#c3b79d",
          paper: "#f5f4f2",
        },
        ink: {
          950: "#f5f4f2",
          900: "#ffffff",
          800: "#ebe6dc",
          700: "#c3b79d",
        },
        mist: {
          100: "#821d30",
          300: "#821d30",
          400: "#9a5a66",
          500: "#a89880",
        },
        signal: {
          teal: "#821d30",
          amber: "#c3b79d",
          rose: "#821d30",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
