import { pgTable, uuid, varchar, timestamp, json, text } from 'drizzle-orm/pg-core';

// Define the entries table
export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'article', 'company', or 'note'
  url: varchar('url', { length: 2048 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: json('metadata').notNull(), // Stores all type-specific data and AI-generated content
});

// Define the comments table
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// This table will store vector embeddings for search when we need them
export const vectorEmbeddings = pgTable('vector_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  embedding: json('embedding').notNull(), // Will store vector embeddings as JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
