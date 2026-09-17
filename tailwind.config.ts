import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          wine: "#e11d2a",
          wineDark: "#b91420",
          sand: "#2a2c34",
          paper: "#0d0d0f",
          cream: "#16171b",
          surface: "#1d1e24",
          ink: "#f2f3f7",
          muted: "#8b8e99",
          success: "#2fbf4e",
          successDark: "#249b3e",
          danger: "#ff6b76",
          warning: "#c9962f",
        },
        ink: {
          950: "#0d0d0f",
          900: "#16171b",
          800: "#1d1e24",
          700: "#2a2c34",
        },
        mist: {
          100: "#f2f3f7",
          300: "#8b8e99",
          400: "#8b8e99",
          500: "#8b8e99",
        },
        signal: {
          teal: "#2fbf4e",
          amber: "#c9962f",
          rose: "#e11d2a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 10px 40px rgba(0, 0, 0, 0.35)",
        lift: "0 16px 40px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
