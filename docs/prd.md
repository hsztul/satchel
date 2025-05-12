# Product Requirements Document: Satchel

**Version:** 1.0
**Date:** Sat May 10 2025
**Author:** Gemini Assistant (for Henry)

## 1. Introduction

### 1.1. Project Name
Satchel

### 1.2. Purpose
To create a web application named "Satchel" that allows users to parse, understand, and synthesize information from web articles and conduct deep research on companies. The platform will facilitate idea generation and brainstorming for new startup ventures by providing rich, processed data and an interactive chat interface.

### 1.3. Goals
*   Enable users to easily save and process web articles and company information from URLs.
*   Provide comprehensive AI-generated summaries and analyses for all saved entries.
*   Offer MBA-level deep research reports for companies, including market and competitive analysis.
*   Allow users to "chat" with their saved data to explore ideas and gain insights.
*   Provide a filterable and sortable feed of all processed entries, leading to detailed views.
*   Build an MVP that is functional and demonstrates core value, with a focus on robust backend processing and a simple, clear UI.

### 1.4. Target Users (MVP)
Henry and his co-founder Irving.

## 2. Core System Overview

### 2.1. Key Capabilities
*   Ingestion of "Entries" (Articles or Companies) via URL.
*   Automated content scraping and extraction.
*   AI-powered summarization, analysis, and data enrichment.
*   Deep company and industry research using external APIs (Perplexity) and LLMs.
*   Vector-based semantic search for Retrieval Augmented Generation (RAG).
*   Interactive chat interface for querying and brainstorming with ingested data.
*   Organized list view (feed) for managing and accessing entries.
*   Detailed view for each entry, presenting all its content and sources.

### 2.2. Technology Stack (MVP)
*   **Frontend:** Next.js (with React, Tailwind CSS recommended for the simple UI)
*   **Backend:** Next.js API Routes (Serverless Functions on Vercel)
*   **AI Integration:** Vercel AI SDK, OpenAI API (for embeddings), Perplexity API (for research), Anthropic API (for chat and summarization).
*   **Database:** Supabase (PostgreSQL for relational data, pgvector extension for vector embeddings).
*   **Web Scraping/Crawling:** Firecrawl API.
*   **Authentication:** None for MVP (shared access).

## 3. User Interface (UI) & User Experience (UX) Guidelines

*   **Overall Vibe:** Simple, clean, "old-school Twitter" feel. Focus on content and usability.
*   **Layout:**
    *   **Header:** App name "Satchel" prominently displayed in center.
    *   **Main Page:**
        *   Entry input section near the top.
        *   Feed of entries with filtering/sorting options directly below the input section.
*   **Navigation:** Clicking an entry in the feed will navigate to its dedicated "Entry Detail View Page".

## 4. Data Models (Supabase/Postgres)

### 4.1. `entries` Table
*   `id` (UUID, primary key, default: `uuid_generate_v4()`)
*   `entry_type` (TEXT NOT NULL, 'article' or 'company')
*   `source_url` (TEXT NOT NULL, should be unique for a given type if desired, or unique overall)
*   `title` (TEXT, For articles: extracted from page. For companies: extracted from page title during initial scrape, or derived from URL; serves as the company name for processing.)
*   `cleaned_content` (TEXT, main textual content extracted from `source_url`)
*   `summary` (TEXT, comprehensive AI-generated summary or synthesized company report)
*   `metadata` (JSONB, stores extracted metadata like author, publication date. For companies, this can store initially identified industry if possible, or user-provided tags later.)
    *   Example for article: `{ "author": "...", "publication_date": "...", "publication_name": "..." }`
    *   Example for company: `{ "extracted_industry_guess": "...", "derived_from_url": true }`
*   `llm_analysis` (JSONB, stores detailed structured outputs from LLMs)
    *   Example for article: `{ "key_takeaways": ["...", "..."], "main_arguments": ["...", "..."], "extracted_concepts": ["...", "..."] }`
    *   Example for company: `{ "firecrawl_site_summary": "...", "perplexity_research": { "funding_info": "...", "competitor_analysis": [{ "name": "...", "details": "..."}], "swot_analysis": "...", "key_differentiators": ["...", "..."], "technologies_patents": "...", "market_industry_analysis": "..." }, "full_perplexity_responses": [{ "query": "...", "response": "..." }] }`
*   `status` (TEXT NOT NULL, e.g., 'pending', 'extracting_title', 'scraping_website', 'processing_scraped_content', 'researching_external', 'synthesizing_analysis', 'complete', 'failed')
*   `created_at` (TIMESTAMPTZ, default: `now()`)
*   `updated_at` (TIMESTAMPTZ, default: `now()`)
*   *Indexes: on `status`, `entry_type`, `created_at`. Consider a GIN index on `metadata` and `llm_analysis` if querying into JSONB becomes frequent. Consider Full-Text Search index on `title` and `summary`.*

### 4.2. `entry_chunks` Table (for RAG)
*   `id` (UUID, primary key, default: `uuid_generate_v4()`)
*   `entry_id` (UUID NOT NULL, foreign key referencing `entries.id` ON DELETE CASCADE)
*   `chunk_text` (TEXT NOT NULL)
*   `embedding` (VECTOR(<embedding_dimension>) NOT NULL, e.g., VECTOR(1536) for OpenAI `text-embedding-ada-002`)
*   `chunk_order` (INTEGER)
*   *Indexes: on `entry_id`. `pgvector` will create an HNSW or IVFFlat index on `embedding` for efficient similarity search.*

## 5. Detailed Feature Specifications & Implementation Plan

### 5.1. Feature: Entry Ingestion & Initial Processing

*   **5.1.1. Description:** Allows users to submit a URL for articles or companies. The system will perform initial validation and start the asynchronous data ingestion pipeline. For companies, it will attempt to extract a name from the URL/page.
*   **5.1.2. UI/UX:**
    *   A form with fields for:
        *   Entry Type (Dropdown/Radio: Article, Company)
        *   URL (Input field, required)
    *   A "Submit" button.
    *   Located near the top of the main page.
    *   Upon submission, UI provides immediate feedback and adds the entry to the feed with a 'pending' status.
*   **5.1.3. API Endpoint:** `POST /api/ingest-entry`
    *   **Request Body:**
        ```json
        {
          "entryType": "article" | "company",
          "url": "string"
        }
        ```
    *   **Success Response (202 Accepted):**
        ```json
        {
          "entryId": "uuid",
          "status": "pending",
          "message": "Entry ingestion started."
        }```
*   **5.1.4. Backend Logic Steps (executed asynchronously after immediate response):**
    1.  **Validation:** Ensure URL is valid.
    2.  **Initial Database Insert:** Create a new record in `entries` table with `source_url`, `entry_type`, and `status: 'pending'`.
    3.  **Title Extraction (especially for Companies):**
        *   Update `entries.status` -> `'extracting_title'`.
        *   Perform a quick scrape of `source_url` (e.g., using Firecrawl `scrape` for just the main HTML, or a lightweight fetch for the `<title>` tag).
        *   Extract the page title. For companies, this title becomes the initial `entries.title`. If no title, derive a temporary one from the URL.
    4.  **Update Status:** `entries.status` -> `'scraping_website'`.
    5.  **Website Content Acquisition (Firecrawl):**
        *   If `entryType` is 'article': Call `firecrawl_scrape(url=source_url, formats=['markdown'])`.
        *   If `entryType` is 'company': Call `firecrawl_crawl(url=source_url, maxDepth=3, scrapeOptions={'formats': ['markdown']})`. (Address Firecrawl async job handling as discussed previously - client polling or function waiting if possible for MVP).
    6.  **Store Scraped Content:** Once Firecrawl data is retrieved, store the cleaned markdown/text content in `entries.cleaned_content`.
    7.  **Update Status:** `entries.status` -> `'processing_scraped_content'`.
    8.  **Trigger Content Processing:** Proceed to Feature 5.2 (Article Processing) or 5.3 (Company Research) based on `entryType`.
    9.  **Error Handling:** Wrap external calls. Update `entries.status` to `'failed'` with an error message on failure.
*   **5.1.5. Acceptance Criteria:**
    *   User can submit an article URL and a new entry is created.
    *   User can submit a company URL and a new entry is created; `entries.title` is populated with an extracted/derived name.
    *   `cleaned_content` is populated.

### 5.2. Feature: Article Processing & Comprehensive Summarization

*   **5.2.1. Description:** For 'article' entries, generates a comprehensive summary and extracts key information using LLMs.
*   **5.2.2. Backend Logic Steps (follows 'scraping_website' for articles):**
    1.  Ensure `entries.cleaned_content` is populated and `entries.title` is set.
    2.  **Comprehensive Summarization & Analysis (LLM Call):**
        *   Prompt an LLM (e.g., GPT-4).
        *   **Prompt Guideline (see Section 8.1):** "Generate a comprehensive summary of this article titled '{{entries.title}}'..."
        *   Feed `entries.cleaned_content` to the LLM.
    3.  **Store Results:**
        *   Store narrative summary in `entries.summary`.
        *   Store structured outputs (takeaways, concepts) in `entries.llm_analysis`.
    4.  **Proceed to Chunking & Embedding (Feature 5.5).**
*   **5.2.3. Acceptance Criteria:**
    *   For 'article' entries, `entries.summary` and `entries.llm_analysis` are populated.

### 5.3. Feature: Company Deep Research & Synthesis

*   **5.3.1. Description:** For 'company' entries, after initial website scraping and title extraction, performs deep research using Perplexity API and synthesizes findings into an MBA-level report.
*   **5.3.2. Backend Logic Steps (follows 'scraping_website' for companies):**
    1.  Ensure `entries.cleaned_content` and `entries.title` (extracted company name) are populated.
    2.  **Initial Site Summary (LLM Call):**
        *   Prompt an LLM (e.g., GPT-3.5-turbo).
        *   **Prompt Guideline (see Section 8.2):** "Based on the crawled website content for the company '{{entries.title}}', provide a concise summary..."
        *   Store in `entries.llm_analysis.firecrawl_site_summary`.
    3.  **Update Status:** `entries.status` -> `'researching_external'`.
    4.  **Deep Research using Perplexity API:**
        *   Use `entries.title` (as company name) and `entries.source_url` for context.
        *   Execute targeted `search_via_perplexity` calls (see PRD v1.0 for examples, adapt queries to use `entries.title`).
        *   Store raw Perplexity responses and queries in `entries.llm_analysis.perplexity_research.full_perplexity_responses`.
        *   Optionally parse snippets into `entries.llm_analysis.perplexity_research`.
    5.  **Update Status:** `entries.status` -> `'synthesizing_analysis'`.
    6.  **Final MBA-Level Report Synthesis (LLM Call):**
        *   Gather `firecrawl_site_summary` and Perplexity research.
        *   Prompt a powerful LLM (e.g., GPT-4).
        *   **Prompt Guideline (see Section 8.3):** "You are an MBA-level business analyst. Synthesize... for the company '{{entries.title}}'..."
        *   Store synthesized report in `entries.summary`.
    7.  Further populate structured fields in `entries.llm_analysis.perplexity_research`.
    8.  **Proceed to Chunking & Embedding (Feature 5.5).**
*   **5.3.3. Acceptance Criteria:**
    *   For 'company' entries, `entries.summary` contains a detailed report.
    *   `entries.llm_analysis` contains site summary and Perplexity research data.

### 5.4. Feature: Entry Feed (List View)

*   **5.4.1. Description:** Displays a list of entries below the input area, allowing filtering, sorting, and search. Clicking an entry navigates to its Detail View.
*   **5.4.2. UI/UX:**
    *   List/grid view: Title, Entry Type, summary preview, status, creation date.
    *   **Filtering:** Dropdowns for "Entry Type", "Status".
    *   **Sorting:** Dropdowns for "Sort By" (Date Created, Title), "Sort Order".
    *   **Search:** Text input for title search.
    *   **Pagination:** Numbered pages or "Load More".
    *   Conforms to "old-school Twitter vibe"; simple and clear.
*   **5.4.3. API Endpoint:** `GET /api/entries`
    *   **Query Parameters:** `entryType`, `status`, `sortBy`, `sortOrder`, `searchTerm`, `page`, `pageSize`.
    *   **Success Response (200 OK):**
        ```json
        {
          "data": [
            {
              "id": "uuid",
              "entryType": "article",
              "title": "Sample Article Title",
              // ... other fields for list view
            }
          ],
          "pagination": { /* ... */ }
        }
        ```
*   **5.4.4. Backend Logic (Supabase/Postgres):** Dynamic SQL query construction, filtering, sorting, pagination.
*   **5.4.5. Acceptance Criteria:**
    *   Feed displays entries correctly.
    *   Filtering, sorting, searching, and pagination work as expected.
    *   Clicking an entry navigates to `/entry/{id}`.

### 5.5. Feature: Data Storage (Chunks & Embeddings for RAG)

*   **5.5.1. Description:** After main content processing, `cleaned_content` (and potentially key summary parts) are chunked and embedded for semantic search.
*   **5.5.2. Backend Logic Steps (occurs before status is 'complete'):**
    1.  Select content (primarily `entries.cleaned_content`).
    2.  Chunk text.
    3.  Generate embeddings (e.g., OpenAI `text-embedding-ada-002`).
    4.  Store in `entry_chunks` table.
    5.  Update Status: `entries.status` -> `'complete'`.
*   **5.5.3. Acceptance Criteria:**
    *   `entry_chunks` table populated with text chunks and embeddings.
    *   `entries.status` is `'complete'` after successful processing.

### 5.6. Feature: Entry Detail View Page

*   **5.6.1. Description:** A dedicated page to display all information for a single entry.
*   **5.6.2. UI/UX:**
    *   Accessed by navigating from an entry in the feed (e.g., `/entry/{entryId}`).
    *   Page Title: Entry Title (`entries.title`).
    *   **Content Display Order:**
        1.  **Summary Information:** `entries.summary` displayed prominently.
        2.  **Key Analysis (if available):** Structured data from `entries.llm_analysis` (e.g., key takeaways for articles, specific research points for companies like funding, competitors).
        3.  **Original Source Content:** `entries.cleaned_content` displayed below the summaries/analysis, perhaps in a scrollable section or behind a "View Full Content" toggle.
        4.  **References/Metadata:**
            *   Source URL (`entries.source_url`) clearly visible and clickable.
            *   Creation Date (`entries.created_at`).
            *   Last Updated Date (`entries.updated_at`).
            *   For company entries, list the queries used for Perplexity research (from `entries.llm_analysis.perplexity_research.full_perplexity_responses.query`).
*   **5.6.3. API Endpoint:** `GET /api/entries/{entryId}`
    *   **Success Response (200 OK):**
        ```json
        {
          "id": "uuid",
          "entryType": "...",
          "title": "...",
          "source_url": "...",
          "cleaned_content": "...",
          "summary": "...",
          "metadata": { /* ... */ },
          "llm_analysis": { /* ... */ },
          "status": "...",
          "createdAt": "...",
          "updatedAt": "..."
          // Potentially entry_chunks if needed directly on this page, though less likely
        }
        ```
*   **5.6.4. Backend Logic (Supabase/Postgres):** Fetch a single entry by ID.
*   **5.6.5. Acceptance Criteria:**
    *   Page displays all relevant information for an entry.
    *   Content is ordered as specified (summary first, then analysis, then original content).
    *   Source URL and other metadata are visible.
    *   For companies, Perplexity queries used are listed.

### 5.7. Feature: Chat with Entries (RAG)

*   **5.7.1. Description:** Interactive chat interface allowing users to query and brainstorm, with AI using ingested entries as context.
*   **5.7.2. UI/UX:**
    *   Standard chat interface (Vercel AI SDK components).
    *   Could be a global component or a dedicated chat page.
*   **5.7.3. API Endpoint:** `POST /api/chat` (Vercel AI SDK).
*   **5.7.4. Backend Logic (Vercel AI SDK handler):**
    1.  Embed user query.
    2.  Semantic search on `entry_chunks`.
    3.  Prepare context from retrieved chunks.
    4.  LLM Prompting (System Message + Context + User Query - see Section 8.4).
    5.  Stream response.
*   **5.7.5. Acceptance Criteria:**
    *   AI responses are relevant and grounded in ingested entry content.
    *   AI maintains helpful "startup co-founder" persona.

## 6. Non-Functional Requirements (MVP)

*   **No Authentication:** Shared access.
*   **Usability:** Core workflows must be intuitive. Simple, clean UI.
*   **Error Handling:** Basic error handling, log errors, update entry status to 'failed'.
*   **Performance:** Ingestion may take time; UI should reflect processing. Chat and feed reasonably responsive.
*   **Scalability:** Foundational scalability via Vercel/Supabase.

## 7. Out of Scope for MVP / Future Enhancements

*   User authentication, multi-tenancy.
*   More entry types (PDFs, manual notes).
*   Advanced UI: infinite scroll, real-time updates, rich text editing for notes.
*   Editing or deleting entries.
*   Manual editing of `entries.title` or other metadata post-ingestion.
*   Direct webhooks from Firecrawl.

## 8. LLM Prompts (Illustrative Guidelines - iterate for best results)

*   **8.1. Article Comprehensive Summary & Analysis:**
    ```
    System: You are an expert academic researcher and analyst.
    User: Analyze the following article content, titled "{{entries.title}}". Provide a comprehensive summary that covers its core thesis, main arguments, supporting evidence, and conclusions.
    Then, list up to 7 distinct key takeaways as a bulleted list.
    Finally, identify and list the primary concepts or topics discussed in the article.
    Format your response clearly with headings for "Comprehensive Summary", "Key Takeaways", and "Primary Concepts".

    Article Content:
    """
    {{entries.cleaned_content}}
    """
    ```

*   **8.2. Company Initial Site Summary (from Firecrawl content):**
    ```
    System: You are a concise business analyst.
    User: Based on the following crawled website content for the company "{{entries.title}}" (URL: {{entries.source_url}}), provide a brief summary of its primary business focus, main products or services offered, and its stated mission or value proposition. Aim for 2-3 paragraphs.

    Website Content:
    """
    {{entries.cleaned_content}}
    """
    ```

*   **8.3. Company MBA-Level Report Synthesis:**
    ```
    System: You are an MBA-level business analyst and strategic consultant. Your task is to synthesize all provided information into a comprehensive research report.
    User: Create a comprehensive research report for the company "{{entries.title}}" (website: {{entries.source_url}}).
    The report should be well-structured and cover the following sections in detail:
    1.  **Company Overview:** (Based on their website: mission, products/services, target audience)
    2.  **Funding History & Investors:** (Based on external research)
    3.  **Competitive Landscape:** (Identify key competitors, their strengths/weaknesses, and {{entries.title}}'s position relative to them)
    4.  **Key Differentiators & Competitive Advantages:** (What makes {{entries.title}} unique?)
    5.  **Technology & Intellectual Property (if available):** (Notable technologies, patents)
    6.  **Market & Industry Analysis:** (Overall analysis of the relevant industry: size, growth trends, key segments, future outlook, and how {{entries.title}} fits in. If an industry was initially guessed for this company, it was: {{entries.metadata.extracted_industry_guess}})
    7.  **SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats):** (Synthesize this based on all information)
    8.  **Recent News & Developments (if significant):**

    Use the information provided below. Be thorough, analytical, and present findings as if for strategic decision-making.

    Information Sources:
    - Website Summary: """{{entries.llm_analysis.firecrawl_site_summary}}"""
    - External Research Data (Funding, Competitors, Market, News, etc.):
      {{#each entries.llm_analysis.perplexity_research.full_perplexity_responses}}
      Query Used: {{this.query}}
      Response: """{{this.response}}"""
      ---
      {{/each}}
      {{#if entries.llm_analysis.perplexity_research.funding_info}}Funding Info (structured): {{entries.llm_analysis.perplexity_research.funding_info}}{{/if}}
      {{#if entries.llm_analysis.perplexity_research.competitor_analysis}}Competitor Info (structured): {{entries.llm_analysis.perplexity_research.competitor_analysis}}{{/if}}
      {{#if entries.llm_analysis.perplexity_research.market_industry_analysis}}Market Info (structured): {{entries.llm_analysis.perplexity_research.market_industry_analysis}}{{/if}}

    Synthesize this into a coherent and insightful report.
    ```
    *(Note: The `{{...}}` syntax is illustrative. Adapt to your specific LLM client library. The `extracted_industry_guess` is speculative, as deriving industry from URL/content is hard; it might be better to allow users to tag industries later or for Perplexity to infer from broader queries.)*

*   **8.4. Chat Agent Persona (System Prompt for RAG):**
    ```
    You are "Synapse," an AI co-founder and research assistant for the "Satchel" platform. You are knowledgeable, insightful, and slightly informal but always professional. You have access to a collection of processed articles and company research. When answering questions, ground your responses in the provided context. If the context doesn't contain the answer, say so. Be proactive in suggesting connections or implications for startup ideas if appropriate. Your goal is to help your human co-founders think creatively and strategically using the information within Satchel.
    ```
