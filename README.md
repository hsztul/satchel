# Satchel - Your Knowledge Hub

Satchel is a collaborative platform designed to help users collect, organize, and explore articles, companies, and ideas to generate insights and connections using Large Language Models (LLMs).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Overview

Satchel allows users to:
- Store and organize articles, companies, and notes
- Generate AI-powered summaries and key points
- Explore connections between stored data through a chat interface
- Receive insights and new ideas based on collected knowledge

## Technology Stack

- **Frontend**: Next.js with App Router
- **UI**: Tailwind CSS with ShadCN components
- **Authentication**: Clerk with Google Auth
- **Database**: Supabase (PostgreSQL)
- **Vector Store**: Supabase for similarity search
- **AI Integration**: Vercel AI SDK

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

- `src/app/(auth)/*` - Authentication pages (sign-in, sign-up)
- `src/app/(main)/*` - Main application pages (dashboard, entry creation/viewing)
- `src/lib/*` - Utility functions and API clients
- `src/components/*` - Reusable UI components

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
