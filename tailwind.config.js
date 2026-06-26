/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sandstone: {
          bg: "#F4EEE3",
          card: "#FFFFFF",
          ink: "#241D17",
          muted: "#7A6E60",
          hair: "#E5DBCB",
          terra: "#C0633F",
          "terra-hover": "#A8512F",
          sage: "#5E7A57",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
