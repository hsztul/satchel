# Satchel: AI Agent Build Plan (v1.2)

**Objective:** Guide an AI development agent (e.g., in Cursor) to build the "Satchel" web application as per PRD Version 1.1.

## General Instructions for the AI Agent

- Refer to **PRD Version 1.1** for detailed specifications.
- Generate code in **Next.js (React)** for frontend and API routes.
- Use **Tailwind CSS** for styling ("simple, old-school Twitter vibe").
- Use **JavaScript** or **TypeScript** as preferred/configured.
- Implement Supabase interactions using the `@supabase/supabase-js` client library.
- Integrate external APIs (Firecrawl, OpenAI, Perplexity) via their client libraries or direct HTTP requests. Store API keys securely as environment variables.
- Structure code logically (separate components, services/utils for API calls).
- Implement basic error handling for API calls and UI interactions.

## Phase 1: Project Setup & Core Backend Foundation

### Initialize Next.js Project
- **Action:** Create a new Next.js project named `satchel`. ✅
- Install Tailwind CSS and configure it. ✅
- Install Supabase client library (`@supabase/supabase-js`). ✅
- Install Vercel AI SDK (`ai`). ✅
- Install any necessary HTTP client libraries (e.g., `axios` or use `fetch`).

### Supabase Project Setup (Credentials)
- **Manual Step:** Create a new project on Supabase, enable the `pgvector` extension:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- **Action (AI):** Obtain Supabase Project URL and Anon Key. Store these securely as environment variables (e.g., `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). 

### Define Database Schema via Integration
- **Action:** Use server integration to define and apply the database schema for the `entries` and `entry_chunks` tables in Supabase. 
- **Reference:** PRD Section 4 ("Data Models"). Ensure all columns, types, constraints, and basic indexes match the PRD.
- **Verification:** Confirm tables are created successfully in Supabase after the integration runs.

### Create Supabase Client Utility
- **Action:** Create a utility file (e.g., `lib/supabaseClient.js` or `lib/supabase.js`) to initialize and export the Supabase client instance using the environment variables. 

## Phase 2: Entry Ingestion – Initial Steps & API Route

### Implement `POST /api/ingest-entry` API Route (Initial Structure & Scraping)

- **Action:** Create the Next.js API route file (e.g., `pages/api/ingest-entry.js`).
- Implement basic request handling (`POST` method).
- Validate incoming request body (see PRD Section 5.1.3).
- [x] Perform initial database insert into `entries` table with `status: 'pending'`, `source_url`, and `entry_type` (PRD Section 5.1.4, Step 2).
- [x] Immediately return the `entryId` and `status: 'pending'` response to the client (PRD Section 5.1.3).
- [x] Asynchronous processing continues:
  - [x] Update `entries.status` to `'scraping_website'`.
  - [x] **Single Scrape Call:**
    - [x] **Articles:** Call `firecrawl_scrape(url=source_url, formats=['markdown'])`. Request markdown content and metadata in one call.
    - [ ] **Companies:** _(Deferred)_ Call `firecrawl_crawl(url=source_url, maxDepth=3, scrapeOptions={'formats': ['markdown', 'metadata']})`. Request markdown and metadata. (Handle async nature as noted in PRD.)
      - **Note:** Company crawling is deferred for future implementation. Revisit this step later.
  - [x] **Extract Title & Store Content:**
    - [x] From the Firecrawl response, extract the page title (from metadata or inferred).
    - [x] Store the extracted title in `entries.title`.
    - [x] Store the cleaned markdown/text content in `entries.cleaned_content`.
    - [x] Store any relevant extracted metadata (author, pub date) in `entries.metadata`.
  - [x] Update `entries.status` to `'processing_scraped_content'`.
  - _(Stop Here for this Phase):_ The API route's asynchronous work pauses here. Subsequent processing (LLM calls, embedding) will be triggered later in the flow (conceptually, though implemented within this same async continuation).
- **Reference:** PRD Sections 5.1.3, 5.1.4 (Steps 1–6 combined & optimized).

## Phase 3: Frontend – Main Page Layout & Entry Input

- [x] Create Basic App Layout Component

- **Action:** Implement a global layout component (e.g., create `components/Layout.js` and use it in page files).
- Include a header with the app name "Satchel" (see PRD Section 3).
- Set up basic page structure and Tailwind CSS base styles for the "old-school Twitter vibe."

- [x] Implement Entry Input Form Component

- **Action:** Create a React component for the entry input form.
- Include fields for "Entry Type" (Dropdown/Radio: Article, Company) and "URL" (see PRD Section 5.1.2).
- On submit, call the `POST /api/ingest-entry` API.
- Provide UI feedback (loading state, success/error messages). Display `'pending'` status from the API response.

- [x] Implement Entry List Component

- **Action:** Create a React component to display a list of entries (from Supabase, ordered by `created_at desc`).
- Show entry title, entry type, status, and created date.
- Make each entry item clickable, linking to `/entry/[id]`.
- Place this component below the entry input form on the main page.
- **Reference:** PRD Section 5.4.2.
Fetch data from /api/entries. Use state management for filters, sorting, search term, and page number.
Display each entry (Title, Type, summary preview, status, date).
Implement UI controls (dropdowns, input field, buttons) for filtering, sorting, searching that trigger API re-fetches.
Implement pagination controls.
Style according to the "old-school Twitter vibe."
Make each entry item clickable, linking to /entry/[id].
Place this component below the entry input form on the main page.
Reference: PRD Section 5.4.2.

## Phase 5: Content Processing – Articles (Backend Logic Continuation)

### Article Summarization Logic (within `/api/ingest-entry` async flow)
- **Trigger:** Runs after scraping is complete (`status: 'processing_scraped_content'`) for `entryType: 'article'`.
- **Action:**
  - Integrate OpenAI API calls.
  - Construct prompt (see PRD Section 8.1).
  - Pass `cleaned_content` and `title`.
  - Parse response, update `entries.summary` and `entries.llm_analysis`.
  - _(Proceed to Phase 7: Data Finalization)_
- **Reference:** PRD Section 5.2.

## Phase 6: Content Processing – Companies (Deep Dive, Backend Logic Continuation)

### Initial Company Site Summary (within `/api/ingest-entry` async flow)
- **Trigger:** Runs after scraping (`status: 'processing_scraped_content'`) for `entryType: 'company'`.
- **Action:**
  - Use LLM (e.g., GPT-3.5-turbo). Construct prompt (see PRD Section 8.2).
  - Pass `cleaned_content`, `title`.
  - Store result in `entries.llm_analysis.firecrawl_site_summary`. Update entry.
- **Reference:** PRD Section 5.3.2, Step 2.

### Integrate Perplexity API for Deep Research (within `/api/ingest-entry`)
- **Trigger:** Runs after initial site summary for companies.
- **Action:**
  - Update `entries.status` to `'researching_external'`.
  - Make multiple `search_via_perplexity` calls (see PRD Section 5.3.2, Step 4).
  - Store raw responses in `entries.llm_analysis.perplexity_research.full_perplexity_responses`.
  - Optionally parse structured data. Update entry.
- **Reference:** PRD Section 5.3.2, Step 4.

### Final MBA-Level Report Synthesis (within `/api/ingest-entry`)
- **Trigger:** Runs after Perplexity research.
- **Action:**
  - Update `entries.status` to `'synthesizing_analysis'`.
  - Gather all context. Use powerful LLM (e.g., GPT-4) with prompt from PRD Section 8.3.
  - Store result in `entries.summary`.
  - Update structured fields in `entries.llm_analysis.perplexity_research`. Update entry.
  - _(Proceed to Phase 7: Data Finalization)_
- **Reference:** PRD Section 5.3.2, Step 6–8.

## Phase 7: Data Finalization (Embedding, Backend Logic Continuation) ✅

### Text Chunking and Embedding Logic (within `/api/ingest-entry` async flow)
- **Trigger:** Runs after all LLM processing (summarization for articles, or report synthesis for companies) is complete for an entry, just before marking it `'complete'`.
- **Action:**
  - Select content (`cleaned_content`, potentially `summary`).
  - Implement text chunking.
  - For each chunk, call OpenAI embedding API.
  - Insert records into `entry_chunks` table.
  - Finally, update `entries.status` to `'complete'`.
  - This concludes the asynchronous work initiated by `/api/ingest-entry`.
- **Reference:** PRD Section 5.5.

## Phase 8: Frontend – Entry Detail View

### Implement `GET /api/entries/{entryId}` API Route
- **Action:** Create dynamic API route (`pages/api/entries/[entryId].js`). Fetch single entry by ID from Supabase. Return relevant fields (see PRD Section 5.6.3).
- **Reference:** PRD Section 5.6.

### Create Entry Detail Page (`pages/entry/[id].js`)
- **Action:** Create dynamic Next.js page. Fetch data via API route or `getServerSideProps`. Display Title, Summary, Analysis, Content, References as per PRD Section 5.6.2.
- **Reference:** PRD Section 5.6.

## Phase 9: Chat Functionality (RAG)

### Set up Vercel AI SDK Chat API Route
- **Action:** Create API route (`pages/api/chat.js`) using Vercel AI SDK handler (`experimental_generateText` or similar).

### Implement RAG Logic in Chat API Route
- **Action:** Inside the handler:
  - Embed latest user query.
  - Perform semantic search on `entry_chunks` table via Supabase/pgvector.
  - Prepare context from retrieved chunks.
  - Construct prompt (System message PRD 8.4 + Context + Query).
  - Call LLM via Vercel AI SDK.
  - Stream response back to the client.
- **Reference:** PRD Section 5.7.

### Implement Chat UI Component
- **Action:** Create a React component using Vercel AI SDK hooks (`useChat`). Display conversation history, input field. Style appropriately. Place this component where desired (e.g., on the main page or a dedicated `/chat` page).
- **Reference:** PRD Section 5.7.2, Vercel AI SDK documentation.