import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        sm: {
          css: {
            fontSize: '14px',
            lineHeight: '1.6',
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            h1: {
              fontSize: '1.25em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            h2: {
              fontSize: '1.125em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            h3: {
              fontSize: '1.1em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            code: {
              fontSize: '0.875em',
              backgroundColor: '#f3f4f6',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
            },
            pre: {
              fontSize: '0.875em',
              backgroundColor: '#f3f4f6',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            ul: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            ol: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            blockquote: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
              paddingLeft: '1em',
              borderLeftWidth: '4px',
              borderLeftColor: '#d1d5db',
              fontStyle: 'italic',
            }
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
