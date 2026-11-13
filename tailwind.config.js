/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      // Theme palette — see docs/DESIGN_SYSTEM.md. New colors must be registered here first.
      colors: {
        brand: {
          pink: "#e04090",
          "pink-hover": "#ff5aa5",
          "pink-active": "#c02f76",
          blue: "#4f8fff",
          "blue-hover": "#6ba8ff",
          "blue-active": "#3d7ae0",
          purple: "#b464ff",
          orange: "#ff8c3c",
          sky: "#5b9cff",
          red: "#e53935",
        },
        neon: {
          pink: "#ff2d95",
          green: "#00ff9d",
          gold: "#ffb700",
        },
        surface: {
          base: "#08080c",
          elevated: "#0a0a0f",
          card: "#121216",
          "card-hover": "#16161a",
          modal: "#111118",
        },
        ink: {
          primary: "#ffffff",
          secondary: "#b0b0b8",
          muted: "#86868b",
        },
        semantic: {
          success: "#34d399",
          error: "#f87171",
          warning: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};
