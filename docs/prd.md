# Satchel: Product Requirements Document (PRD)

## 1. Overview

The proposed app, Satchel, is a collaborative platform designed to help users, particularly startup co-founders, collect, organize, and explore articles, companies, and ideas to generate insights and connections using Large Language Models (LLMs). It addresses the challenge of storing and connecting diverse pieces of information and fosters an environment where "no idea is too crazy" and users are encouraged to "think bigger."

---

## 2. Product Vision & Objectives

### Vision

To create a seamless and intuitive platform that empowers users to explore and develop startup ideas by leveraging AI-driven insights and connections between diverse resources.

### Objectives

- Provide a centralized hub for storing and organizing articles, companies, and thoughts.
- Utilize AI agents to autonomously generate summaries, key points, and connections between stored items.
- Offer an interactive chat interface to engage with stored content and generate new insights.
- Maintain a minimalistic and user-friendly design to enhance user experience.

---

## 3. Users/Personas

### Primary Users

- **Startup Co-founders**: Individuals actively exploring startup ideas, needing a private and persistent space to store, share, and connect various resources.

### Secondary Users

- **Entrepreneurs**: Individuals seeking to develop new business ideas through research and exploration.

---

## 4. Key Features and Requirements

- **Data Storage and Organization**
  - Persistent storage of articles, companies, and thoughts with user accounts (using Clerk for authentication with Google Auth).

- **AI Agents**
  - Article and Company Summary Agents: Generate summaries and key points for new entries.
  - Exploration Agent: Monitors chat interactions to identify and save new insights.
  -Queue for processing background tasks that include summarization, exploration, and background research.

- **Interactive Chat Interface**
  - Engage with stored content using a chat interface, supported by a vector store for data management.

- **Summary Generation**
  - Provide a one-page summary of ideas and thoughts linked to global themes.

- **User Interface**
  - Minimalistic design using ShadCN and Tailwind, with easy navigation and content addition features.

---

## 5. User Stories/Use Cases

- *As a co-founder, I want to add an article, so that the app can generate a summary and key points for future reference.*
- *As a user, I want to add a company, so that the app can automatically gather and summarize relevant information.*
- *As a user, I want to scroll through a dashboard of articles, companies and thoughts*
- *As a user, I want to search for articles, companies or thoughts*
- *As a user, I want to edit my thoughts, article and company summaries*
- *As a user, I want to explore my stored ideas and resources through a chat interface, so that I can discover new connections and insights.*
- *As a user, I want to receive regular summaries of my stored content, so that I can understand how my ideas align with broader themes.*

---

## User Flow

### 1. Authentication
- Users sign in with Google account via Clerk
- Simple login/logout functionality
- No user profile management in v1

### 2. Dashboard
Main features:
- List of all user's entries
- "Create New" button
- Basic sorting by date
- Display status of processing for each entry (started, processing, complete)
- Visual indication of processing stages

### 3. Entry Creation
- Select entry type (article, company, note)
- Fill in required field (URL for articles and companies, note text for notes)
- Submit entry
- Display processing status and progress with a progress bar at the bottom of the page
- After entry is created, it gets added to a supabase queue to be processed by background tasks to get article content, generate summaries and key points
- Once processing is complete, the entry is marked as completed and the metadata is updated
- The entry is then available for viewing

#### Entry Background Processing
- The background processing is handled by a queue in Supabase
- The queue is processed by a background job called 'entry-agent'
- "entry-agent" is a Vercel AI SDK agent that handles says if the entry is an article or company, and will pass it onto the next appropriate agent
- "article-content-agent" is a Vercel AI SDK agent that handles article processing using the Firecrawl.dev API to get article content. This agent will pass the article content to the next agent, 'article-summary-agent', which will generate summaries and key points using OpenAI via Vercel AI SDK. This all gets saved to the entry's metadata
- "company-sumary-agent" is a Vercel AI SDK agent that handles company processing using the Perplexity API to get company information. This all gets saved to the entry's metadata
- The background job updates the entry's processing state 
- Once processing is complete, the entry is marked as completed

### 4. View Entry Details
- View entry details and metadata and AI-generated content
- View and add comments
- Edit entry content
- Delete entry

### 5. Explore
- Chat with stored data
- Generate new ideas based on stored data and user prompts

### 6. Logout
- Simple logout functionality

---

## 6. Out of Scope Items

- Real-time collaboration features for multiple users beyond the primary co-founders.
- Integration with third-party APIs for additional content sources beyond articles and company websites.

---

## 7. Assumptions and Constraints

### Assumptions

- Users are familiar with basic AI functionalities and are comfortable interacting with a chat interface.
- Users have access to necessary authentication methods (Google Auth).

### Constraints

- Limited by the capabilities and availability of LLMs and AI agents.
- Dependence on selected platforms for authentication and storage (Clerk and neon.tech).

---

## 8. Open Questions

- What specific vector store should be used for managing article, company, and thought data?
- How frequently should the overall summary be generated and updated?
- What are the privacy and data security measures required for user content?

---

## 9. TODOs

- Research and select a suitable vector store for data management.
- Finalize the integration process for Clerk and neon.tech.
- Develop a detailed UX/UI design plan using ShadCN and Tailwind.
- Establish a testing plan to ensure the effectiveness of AI agents.
- Address open questions related to privacy, security, and frequency of summary updates.

---

Please provide additional information or feedback on any sections marked as needing more details.