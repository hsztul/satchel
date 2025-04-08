# Satchel Database Setup

This directory contains the database schema for the Satchel application.

## Setting up Supabase

1. Create a new project in [Supabase](https://app.supabase.io/)
2. Once your project is created, go to the SQL Editor
3. Copy the contents of `schema.sql` and execute it in the SQL Editor
4. This will create the necessary tables and indexes for the application

## Environment Variables

After setting up your Supabase project, you need to add the following environment variables to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings under "API".

## Database Schema

### Tables

1. **entries** - Stores all user entries (articles, companies, notes)
   - `id` - UUID primary key
   - `user_id` - User ID from Clerk authentication
   - `type` - Type of entry (article, company, note)
   - `url` - URL for article and company entries
   - `processing_state` - Current processing state (started, inProcess, completed, failed)
   - `processing_progress` - Processing progress percentage (0-100)
   - `metadata` - JSON object with entry-specific metadata
   - `created_at` - Creation timestamp
   - `updated_at` - Last update timestamp

2. **comments** - Stores comments on entries
   - `id` - UUID primary key
   - `entry_id` - Foreign key to entries table
   - `user_id` - User ID from Clerk authentication
   - `text` - Comment text
   - `created_at` - Creation timestamp
   - `updated_at` - Last update timestamp

### Indexes

- `idx_entries_user_id` - Index on user_id for faster queries
- `idx_entries_type` - Index on type for filtering by entry type
- `idx_comments_entry_id` - Index on entry_id for faster comment retrieval

### Triggers

- `set_entries_updated_at` - Updates the updated_at timestamp when an entry is modified
- `set_comments_updated_at` - Updates the updated_at timestamp when a comment is modified
