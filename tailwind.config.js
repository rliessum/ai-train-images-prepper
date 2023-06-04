const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ["./src/**/*.{html,js}", "./src/**/*.{html,js}"],
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/container-queries"),
  ],
};
