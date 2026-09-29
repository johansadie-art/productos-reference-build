import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        panel: "#12121a",
        border: "#22222e",
        accent: "#7c5cff",
      },
    },
  },
  plugins: [],
};

export default config;
