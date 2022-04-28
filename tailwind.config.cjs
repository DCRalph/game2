module.exports = {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
// npx tailwindcss -i ./tailwind_config.css -o ./public/tailwind.css --watch
// npx tailwindcss -c tailwind.config.cjs  -i ./tailwind_config.css -o ./public/tailwind.css -w
