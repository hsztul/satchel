# Technical Specification Document

## 1. Technology Stack

### Frontend

- **Framework**: Latest version of Next.js
- **UI Libraries**: ShadCN, Tailwind CSS
- **Authentication**: Clerk (Google Auth integration)
- **AI SDK**: Vercel AI SDK for LLM integration

### Backend

- **Language**: Node.js
- **Framework**: Latest version of Next.js

### Databases

- **Primary Storage**: Supabase (PostgreSQL)
- **Vector Store**: Supabase (for similarity search and embeddings)

### Third-party Services

- **Authentication**: Clerk (Google Auth integration)
- **LLM Services**: OpenAI/Anthropic via Vercel AI SDK (https://sdk.vercel.ai/docs/ai-sdk-core)
- **Web Scraping**: [Firecrawl.dev](http://Firecrawl.dev) ([https://docs.firecrawl.dev/api-reference/endpoint/scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape))

---

## 2. System Architecture

### High-level Design

- **Frontend**: Next.js application (latest version)
- **Backend**: RESTful API managing CRUD operations and AI interactions.
- **Database**: PostgreSQL for structured data and Supabase for vector-based search and retrieval.
- **AI Agents**: Agents for specific tasks like article summarization, company background research, and chat interactions. 
- **Queue**: Queue for processing background tasks that include summarization and background research.

### Components and Interactions

- **User Interface**: Minimalistic UI with ShadCN and Tailwind CSS.
- **AI Agent Services**: Handles tasks like summarization, research, and chat analysis.
- **Vector Store Management**: Stores and retrieves vector embeddings for articles, companies, and thoughts.

---

## 3. API Design

### Endpoints

- **POST /entries**: Add a new entry (article, company, or note)
  - **Request**:
    ```json
    {
      "type": "string", // "article", "company", or "note"
      "url": "string",  // optional for notes
      "processingState": "string", // "started", "completed", "inProcess"
      "metadata": {
        // Type-specific fields:
        // For articles: title, summary, keyPoints, author, etc.
        // For companies: name, summary, keyPoints, competitiveLandscape, etc.
        // For notes: text, summary, etc.
      }
    }
    ```
  - **Response**:
    ```json
    {
      "entryId": "string",
      "type": "string",
      "url": "string",
      "processingState": "string", // "started", "completed", "inProcess"
      "metadata": {
        // All entry metadata including AI-generated content
      }
    }
    ```

- **GET /entries**: Get all entries or filter by type
  - **Request Parameters** (optional):
    ```
    type: "article" | "company" | "note"
    ```
  - **Response**:
    ```json
    {
      "entries": [{
        "entryId": "string",
        "type": "string",
        "url": "string",
        "processingState": "string", // "started", "completed", "inProcess"
        "metadata": { /* Entry metadata */ }
      }]
    }
    ```

- **POST /entries/:entryId/comments**: Add comments to an entry
  - **Request**:
    ```json
    {
      "text": "string"
    }
    ```
  - **Response**:
    ```json
    {
      "commentId": "string",
      "text": "string"
    }
    ```

- **GET /explore**: Chat with stored data
  - **Request**:
    ```json
    {
      "query": "string"
    }
    ```
  - **Response**:
    ```json
    {
      "response": "string",
      "newIdeas": ["string"]
    }
    ```

- **GET /summary**: Get overall summary
  - **Response**:
    ```json
    {
      "summary": "string"
    }
    ```

---

## 4. Data Models

### Database Schema

#### Entries

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| userId | UUID | Owner of the entry |
| type | String | "article", "company", or "note" |
| url | String | Optional, for articles & companies |
| processingState | String | "started", "completed", "inProcess" |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| metadata | JSON | Type-specific data and AI-generated content |

#### Comments

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| userId | UUID | User who created the comment |
| entryId | UUID | Related entry |
| text | Text | Content of the comment |
| createdAt | DateTime | Creation timestamp |


---

## 5. Authentication & Authorization

- **Authentication Provider**: Clerk with Google Auth
- **Data Privacy**: Each user has access to all data

---

## 6. Integration Points

- **Vercel AI SDK**: For leveraging various LLMs, facilitating tasks such as summarization and conversation.
- **Supabase**: For storing and retrieving vector embeddings.
- **Firecrawl.dev**: For extracting data from company websites and getting article content.
- **OpenAI/Anthropic**: For AI-driven services like summarization and chat.

---

## 7. Performance Considerations

- **Expected Load**: Low to moderate, dependent on user engagement.
- **Optimization Approaches**:
  - Efficient vector search using Supabase.
  - Caching frequently accessed data.
  - Asynchronous processing for web scraping and summarization tasks.

---

## 8. Security Considerations

- **Data Encryption**: Encrypt sensitive data in transit and at rest.
- **Access Control**: Implement role-based access control using Clerk.
- **API Security**: Use rate limiting and input validation to protect endpoints.

---

## 9. Deployment Strategy

- **Hosting**: Vercel for hosting
- **CI/CD Approach**:
  - Use GitHub Actions for continuous integration.
  - Automated testing pipeline for all code changes.
  - Deployments triggered post successful testing, with rollback capabilities.


---

This technical specification aims to provide a comprehensive guide to building the app as described, ensuring a seamless and efficient implementation of the required features and functionalities.