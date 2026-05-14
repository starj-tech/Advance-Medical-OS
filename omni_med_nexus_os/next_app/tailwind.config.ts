import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          mintStart: "#E0F7FA",
          mintEnd: "#80DEEA",
          blueStart: "#0F172A",
          purpleEnd: "#311B92",
          alertRed: "#FF5252",
          alertYellow: "#FFD740",
          alertGreen: "#69F0AE",
        }
      },
      backgroundImage: {
        'desktop-gradient': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'mobile-gradient': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
};
export default config;
