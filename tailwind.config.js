/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // סורק את כל הדפים
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // סורק את הקומפוננטות (סרגל צד, כפתורים וכו')
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}