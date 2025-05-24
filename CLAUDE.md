# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production  
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Architecture Overview

### AI Processing Pipeline
Satchel processes three entry types through distinct pipelines:

**Articles**: Firecrawl scraping → GPT-4o summarization → chunking/embedding
**Companies**: Exa API analysis → Perplexity research → GPT-4o summarization → embedding  
**Notes**: Direct content processing → auto-title generation → embedding

Status progression: `pending` → `scraping_website` → `processing_scraped_content` → `researching_external` (companies only) → `processing_summarized` → `complete`

### Database Schema (Supabase + pgvector)
- `entries`: Main content with JSONB `metadata` and `llm_analysis` fields
- `entry_chunks`: Vector embeddings for RAG (VECTOR type)  
- `chat_histories`/`chat_messages`: Chat persistence
- Key fields: `entry_type`, `status`, `industries[]`, `reference_entry_ids[]`

### API Structure
- `/api/ingest-entry/`: Entry processing pipeline trigger
- `/api/entries/[id]/reprocess/`: Re-run AI analysis
- `/api/chat/`: Vercel AI SDK with Perplexity tool calling
- `/api/chat/histories/`: Session management
- `/api/industries/`: Industry aggregation

### AI Integrations
- **OpenAI**: GPT-4o (summarization), text-embedding-ada-002 (vectors)
- **Perplexity**: "sonar-pro" model via `@ai-sdk/perplexity` for web research
- **Exa**: Company website analysis and structured data
- **Firecrawl**: Article content scraping

### Component Patterns
- **EntryFeed**: 4-second polling for processing status, industry filtering
- **ChatUI**: Citation parsing `[n]` references, tool calling integration, save-to-notes
- **Entry Views**: Type-specific rendering (Article/Company/Note)
- **Real-time**: Toast notifications, status tracking with UI polling

### Key Processing Files
- `src/lib/processArticleEntry.ts`: Article processing pipeline
- `src/lib/processCompanyEntry.ts`: Company research pipeline  
- `src/lib/aiAgent.ts`: Core AI utilities and embedding functions
- `src/lib/perplexityAgent.ts`: Web search integration
- `src/lib/exaAgent.ts`: Company analysis utilities

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
PERPLEXITY_API_KEY
EXA_API_KEY
FIRECRAWL_API_KEY
```

### Development Notes
- All heavy AI processing is asynchronous after immediate API response
- Use structured output with Zod schemas for AI responses
- RAG system searches chunked content with citation support
- Status updates require UI polling pattern (not real-time WebSocket)
- Chat tool calling enables web search augmentation of internal knowledge