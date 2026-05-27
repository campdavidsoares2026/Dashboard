import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "podemos-primary": "#E74C3C",      // Red
        "podemos-secondary": "#34495E",    // Dark blue-gray
        "podemos-accent": "#F39C12",       // Orange
        "podemos-light": "#ECF0F1",        // Light gray
        "podemos-dark": "#2C3E50",         // Very dark blue
      },
      spacing: {
        "gutter": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
