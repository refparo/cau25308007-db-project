/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        blur: {
          '0%': { "backdrop-filter": "blur(0)" },
          '100%': { "backdrop-filter": "blur(8px)" }
        }
      },
      animation: {
        blur: "blur 150ms cubic-bezier(0.4, 0, 0.2, 1)"
      },
    },
  },
  plugins: [],
}
