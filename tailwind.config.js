/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add any custom theme extensions here
    },
  },
  plugins: [],
  // In Tailwind CSS v3.0+, the line-clamp is available as a first-party plugin
  // It's enabled by default in the 'corePlugins' section
}
