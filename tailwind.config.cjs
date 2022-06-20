module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        cookieThing: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(200%)' },
        },
      },
      animation: {
        wiggle: 'wiggle 1s ease-in-out infinite',
        spinFast: 'spin .5s linear infinite',
        cookie: 'cookieThing .5s cubic-bezier(.5,-1,1,1) 1 normal forwards',
      },
    },
  },
  plugins: [],
}
// npx tailwindcss -i ./tailwind_config.css -o ./public/tailwind.css --watch
// npx tailwindcss -c tailwind.config.cjs  -i ./tailwind_config.css -o ./public/tailwind.css -w
