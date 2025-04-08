# Satchel Queue Processing System

This document describes the queue-based background processing system for Satchel entries.

## Overview

The queue system allows Satchel to process entries asynchronously in the background, providing a better user experience by not blocking the UI during potentially lengthy operations like content extraction and summarization.

## Components

### 1. Queue API (`/src/lib/supabase/queue.ts`)

Provides methods for interacting with the processing queue table in Supabase:

- `addToQueue`: Add an item to the processing queue
- `getQueueItemsForEntry`: Get all queue items for a specific entry
- `getNextPendingItem`: Get the next pending queue item for processing
- `updateQueueItemStatus`: Update a queue item's status

### 2. Queue Processor (`/src/lib/agents/queue-processor-v2.ts`)

Handles the processing of entries through the agent system:

- `processEntry`: Adds an entry to the queue and starts background processing
- `processNextQueueItem`: Processes the next item in the queue
- `handleAgentResult`: Handles the result of an agent's processing

### 3. API Routes

- `/api/queue/worker`: API route for manually triggering queue processing
- `/api/cron/process-queue`: Cron job endpoint for scheduled queue processing

### 4. UI Components

- `EntryProcessingStatus`: Shows the processing status of an entry with real-time updates
- `QueueDashboard`: Admin dashboard for monitoring and managing the queue

## Database Schema

The queue system uses a `processing_queue` table in Supabase with the following structure:

```sql
CREATE TABLE IF NOT EXISTS satchel.processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES satchel.entries(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## Processing Flow

1. When a new entry is created, it's added to the queue with the initial `entry-agent`
2. The queue processor picks up the pending item and processes it through the appropriate agent
3. Based on the agent result, the entry is either marked as completed or queued for the next agent
4. The process continues until all required agents have processed the entry

## Agent System

The queue processor works with the agent system to process entries. Each agent is responsible for a specific task:

- `EntryAgent`: Determines the entry type and routes to appropriate agents
- `ArticleContentAgent`: Extracts content from article URLs
- `ArticleSummaryAgent`: Generates summaries and key points for articles
- `CompanyContentAgent`: Extracts information about companies
- `CompanySummaryAgent`: Generates summaries and key information about companies

## Monitoring and Management

The queue system can be monitored and managed through:

1. The Queue Dashboard at `/queue`
2. Real-time status updates on entry pages
3. Logs in the server console

## Manual Processing

For testing and development, you can manually process the queue using:

```bash
npx tsx scripts/process-queue.ts
```

## Scheduled Processing

In production, the queue is processed by a scheduled job that calls the `/api/cron/process-queue` endpoint at regular intervals.
