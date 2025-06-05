import type { Config } from "tailwindcss";

const config: Config = {
  content: [
       "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        // Sophisticated navy palette (replaces sky colors)
        lamaSky: "#0F1C3F",       // Deep navy - primary color
        lamaSkyLight: "#F0F5F9",   // Airy blue-white - backgrounds
        
        // Elegant jewel tones (replaces purples)
        lamaPurple: "#2A2550",    // Royal amethyst - accents
        lamaPurpleLight: "#F4F2F8",// Soft lavender mist - subtle backgrounds
        
        // Luxe metallic accents (replaces yellows)
        lamaYellow: "#D4AF37",     // Warm antique gold - highlights
        lamaYellowLight: "#FCF8F0", // Creamy champagne - warm neutral
      }
    },
  },
  plugins: [],
};
export default config;