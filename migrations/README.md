# Database Migrations

This directory contains SQL migrations for the Satchel application's Supabase database.

## How to Apply Migrations

To apply these migrations to your Supabase project:

1. Log in to your Supabase dashboard
2. Navigate to your project
3. Go to the SQL Editor
4. Create a new query
5. Copy and paste the content of the migration file (e.g., `01_create_comments_table.sql`)
6. Run the query

Alternatively, you can use the Supabase CLI to apply migrations:

```bash
supabase db push
```

## Migration Files

- `01_create_comments_table.sql`: Creates the comments table and sets up the necessary RLS policies
