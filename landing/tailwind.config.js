/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['EB Garamond', 'serif'],
      },
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
      },
    },
  },
  plugins: [],
}