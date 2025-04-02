# Satchel

Satchel is a collaborative platform designed to help users, particularly startup co-founders, collect, organize, and explore articles, companies, and ideas to generate insights and connections using Large Language Models (LLMs).

## Features

- Centralized hub for storing and organizing articles, companies, and thoughts
- AI-driven connections and insights between stored content
- Interactive chat interface for exploring stored data
- Authentication using Clerk with Google Auth

## Tech Stack

- **Frontend**: Next.js with Tailwind CSS and ShadCN UI
- **Authentication**: Clerk with Google Auth
- **Database**: PostgreSQL via Neon.tech
- **Vector Store**: Pinecone for similarity search and embeddings
- **AI/LLM**: OpenAI via LangChain integration

## Development Progress

### Sprint 1: Foundation & Project Setup (Current)

- [x] Project repository setup with Next.js
- [x] Initial UI components using ShadCN and Tailwind CSS
- [x] Authentication setup with Clerk
- [x] Database schema definition
- [x] Vector store integration for entries

### Future Sprints

- [ ] Core UI development and data visualization
- [ ] AI Agent implementation
- [ ] Exploration features and chat interface
- [ ] Testing and deployment

## Getting Started

### Prerequisites

- Node.js 18+ 
- NPM 9+
- Clerk account (for authentication)
- Neon.tech account (for PostgreSQL database)
- Pinecone account (for vector embeddings)
- OpenAI API key

### Environment Setup

Create a `.env.local` file with the following variables:

```
# Database
DATABASE_URL=your_neon_db_connection_string

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX=satchel-entries
```

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
satchel/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and libraries
│   │   ├── db/           # Database connection and schema
│   │   └── vectorstore/  # Vector store integration
│   └── middleware.ts     # Authentication middleware
└── docs/                 # Project documentation
    ├── prd.md            # Product Requirements Document
    ├── tech-spec.md      # Technical Specification
    └── mvp-plan.md       # MVP Development Plan
```

## Contributing

1. Follow the sprint plan in `docs/mvp-plan.md`
2. Ensure code follows project conventions and coding standards
3. Test your changes before submitting
