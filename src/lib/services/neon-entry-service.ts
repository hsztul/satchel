import { sql, query, withTransaction } from '../neon';
import { v4 as uuidv4 } from 'uuid';

// Types for entries
export type EntryType = 'ARTICLE' | 'COMPANY' | 'NOTE';

// Base entry type
export interface Entry {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string | null;
  type: EntryType;
  userId: string;
  embedding: string | null;
}

// Type definitions for related entities
export interface Article {
  id: string;
  entryId: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  content?: string;
  summary?: string;
  keyPoints?: string;
  imageUrl?: string;
}

export interface Company {
  id: string;
  entryId: string;
  website?: string;
  industry?: string;
  founded?: number;
  location?: string;
  employeeCount?: number;
  funding?: number;
  fundingRound?: string;
  companyStage?: string;
  keyPeople?: string;
  competitors?: string;
  productOffering?: string;
}

export interface Note {
  id: string;
  entryId: string;
  content: string;
  category?: string;
  insights?: string;
}

export interface Tag {
  id: string;
  name: string;
}

// Combined entry with relations
export interface EntryWithRelations extends Entry {
  article?: Article | null;
  company?: Company | null;
  note?: Note | null;
  tags: Tag[];
}

// Input types for creating entries
export interface CreateArticleInput {
  title: string;
  description?: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  content?: string;
  imageUrl?: string;
  tags?: string[];
  userId: string;
}

export interface CreateCompanyInput {
  title: string;
  description?: string;
  website?: string;
  industry?: string;
  founded?: number;
  location?: string;
  employeeCount?: number;
  funding?: number;
  fundingRound?: string;
  companyStage?: string;
  keyPeople?: string[];
  competitors?: string[];
  productOffering?: string;
  tags?: string[];
  userId: string;
}

export interface CreateNoteInput {
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  userId: string;
}

export interface UpdateEntryInput {
  title?: string;
  description?: string;
  tags?: string[];
}

export class NeonEntryService {
  // Get entries, optionally filtered by type
  async getEntries(userId: string, type?: EntryType): Promise<EntryWithRelations[]> {
    try {
      let entriesQuery = `
        SELECT 
          e.id, 
          e.created_at as "createdAt", 
          e.updated_at as "updatedAt", 
          e.title, 
          e.description, 
          e.type, 
          e.user_id as "userId", 
          e.embedding
        FROM 
          entry e
        WHERE 
          e.user_id = $1
      `;
      
      const queryParams: any[] = [userId];
      
      if (type) {
        entriesQuery += ` AND e.type = $2`;
        queryParams.push(type);
      }
      
      entriesQuery += ` ORDER BY e.created_at DESC`;
      
      // Execute the query
      const entries = await query(entriesQuery, queryParams);
      
      // If no entries found, return empty array
      if (!entries || entries.length === 0) {
        return [];
      }
      
      // Fetch related data for all entries in batch
      const entryIds = entries.map((entry: any) => entry.id);
      
      // Fetch all articles
      const articles = await query(
        `SELECT * FROM article WHERE entry_id = ANY($1)`,
        [entryIds]
      );
      
      // Fetch all companies
      const companies = await query(
        `SELECT * FROM company WHERE entry_id = ANY($1)`,
        [entryIds]
      );
      
      // Fetch all notes
      const notes = await query(
        `SELECT * FROM note WHERE entry_id = ANY($1)`,
        [entryIds]
      );
      
      // Fetch all tags
      const entryTags = await query(
        `SELECT et.entry_id, t.id, t.name 
         FROM entry_tag et
         JOIN tag t ON et.tag_id = t.id
         WHERE et.entry_id = ANY($1)`,
        [entryIds]
      );
      
      // Map articles, companies, and notes to their entry IDs
      const articleMap = articles.reduce((map: Record<string, any>, article: any) => {
        map[article.entry_id] = {
          id: article.id,
          entryId: article.entry_id,
          url: article.url,
          author: article.author,
          publishedAt: article.published_at,
          content: article.content,
          summary: article.summary,
          keyPoints: article.key_points,
          imageUrl: article.image_url
        };
        return map;
      }, {});
      
      const companyMap = companies.reduce((map: Record<string, any>, company: any) => {
        map[company.entry_id] = {
          id: company.id,
          entryId: company.entry_id,
          website: company.website,
          industry: company.industry,
          founded: company.founded,
          location: company.location,
          employeeCount: company.employee_count,
          funding: company.funding,
          fundingRound: company.funding_round,
          companyStage: company.company_stage,
          keyPeople: company.key_people,
          competitors: company.competitors,
          productOffering: company.product_offering
        };
        return map;
      }, {});
      
      const noteMap = notes.reduce((map: Record<string, any>, note: any) => {
        map[note.entry_id] = {
          id: note.id,
          entryId: note.entry_id,
          content: note.content,
          category: note.category,
          insights: note.insights
        };
        return map;
      }, {});
      
      // Group tags by entry ID
      const tagsMap: Record<string, Tag[]> = {};
      entryTags.forEach((tag: any) => {
        if (!tagsMap[tag.entry_id]) {
          tagsMap[tag.entry_id] = [];
        }
        tagsMap[tag.entry_id].push({
          id: tag.id,
          name: tag.name
        });
      });
      
      // Combine everything into entries with relations
      const entriesWithRelations = entries.map((entry: any) => {
        return {
          id: entry.id,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          title: entry.title,
          description: entry.description,
          type: entry.type,
          userId: entry.userId,
          embedding: entry.embedding,
          article: articleMap[entry.id] || null,
          company: companyMap[entry.id] || null,
          note: noteMap[entry.id] || null,
          tags: tagsMap[entry.id] || []
        };
      });
      
      return entriesWithRelations;
    } catch (error) {
      console.error('Error in getEntries:', error);
      throw error;
    }
  }
  
  // Get a single entry by ID
  async getEntry(id: string, userId: string): Promise<EntryWithRelations | null> {
    try {
      // Get the entry
      const entryResult = await query(
        `SELECT 
          e.id, 
          e.created_at as "createdAt", 
          e.updated_at as "updatedAt", 
          e.title, 
          e.description, 
          e.type, 
          e.user_id as "userId", 
          e.embedding
        FROM 
          entry e
        WHERE 
          e.id = $1 AND e.user_id = $2`,
        [id, userId]
      );
      
      if (!entryResult || entryResult.length === 0) {
        return null;
      }
      
      const entry = entryResult[0];
      
      // Get related data based on type
      let article = null;
      let company = null;
      let note = null;
      
      // Get article if applicable
      if (entry.type === 'ARTICLE') {
        const articleResult = await query(
          `SELECT * FROM article WHERE entry_id = $1`,
          [id]
        );
        if (articleResult && articleResult.length > 0) {
          const a = articleResult[0];
          article = {
            id: a.id,
            entryId: a.entry_id,
            url: a.url,
            author: a.author,
            publishedAt: a.published_at,
            content: a.content,
            summary: a.summary,
            keyPoints: a.key_points,
            imageUrl: a.image_url
          };
        }
      }
      
      // Get company if applicable
      if (entry.type === 'COMPANY') {
        const companyResult = await query(
          `SELECT * FROM company WHERE entry_id = $1`,
          [id]
        );
        if (companyResult && companyResult.length > 0) {
          const c = companyResult[0];
          company = {
            id: c.id,
            entryId: c.entry_id,
            website: c.website,
            industry: c.industry,
            founded: c.founded,
            location: c.location,
            employeeCount: c.employee_count,
            funding: c.funding,
            fundingRound: c.funding_round,
            companyStage: c.company_stage,
            keyPeople: c.key_people,
            competitors: c.competitors,
            productOffering: c.product_offering
          };
        }
      }
      
      // Get note if applicable
      if (entry.type === 'NOTE') {
        const noteResult = await query(
          `SELECT * FROM note WHERE entry_id = $1`,
          [id]
        );
        if (noteResult && noteResult.length > 0) {
          const n = noteResult[0];
          note = {
            id: n.id,
            entryId: n.entry_id,
            content: n.content,
            category: n.category,
            insights: n.insights
          };
        }
      }
      
      // Get tags
      const tagsResult = await query(
        `SELECT t.id, t.name 
         FROM entry_tag et
         JOIN tag t ON et.tag_id = t.id
         WHERE et.entry_id = $1`,
        [id]
      );
      
      const tags = tagsResult.map((t: any) => ({
        id: t.id,
        name: t.name
      }));
      
      // Combine everything
      return {
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        title: entry.title,
        description: entry.description,
        type: entry.type,
        userId: entry.userId,
        embedding: entry.embedding,
        article,
        company,
        note,
        tags
      };
    } catch (error) {
      console.error('Error in getEntry:', error);
      throw error;
    }
  }
  
  // Helper method to get or create tags
  async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }
    
    const tags: Tag[] = [];
    
    // Process each tag name
    for (const name of tagNames) {
      // Check if tag already exists
      const existingTag = await query(
        `SELECT id, name FROM tag WHERE name = $1`,
        [name]
      );
      
      if (existingTag && existingTag.length > 0) {
        tags.push({
          id: existingTag[0].id,
          name: existingTag[0].name
        });
      } else {
        // Create new tag
        const tagId = uuidv4();
        await query(
          `INSERT INTO tag (id, name) VALUES ($1, $2)`,
          [tagId, name]
        );
        
        tags.push({
          id: tagId,
          name
        });
      }
    }
    
    return tags;
  }
  
  // Create an article entry
  async createArticle(data: CreateArticleInput): Promise<EntryWithRelations> {
    try {
      // Generate IDs
      const entryId = uuidv4();
      const articleId = uuidv4();
      
      // Use withTransaction for transaction safety
      return await withTransaction(async (client) => {
        // Insert entry
        await client.query(
          `INSERT INTO entry (
            id, title, description, type, user_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [entryId, data.title, data.description || null, 'ARTICLE', data.userId]
        );
        
        // Insert article
        await client.query(
          `INSERT INTO article (
            id, entry_id, url, author, published_at, content, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            articleId, 
            entryId, 
            data.url, 
            data.author || null,
            data.publishedAt || null,
            data.content || null,
            data.imageUrl || null
          ]
        );
        
        // Get or create tags
        const tags = await this.getOrCreateTags(data.tags || []);
        
        // Link tags to entry
        for (const tag of tags) {
          await client.query(
            `INSERT INTO entry_tag (entry_id, tag_id) VALUES ($1, $2)`,
            [entryId, tag.id]
          );
        }
        
        // Return the created entry with relations
        return {
          id: entryId,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: data.title,
          description: data.description || null,
          type: 'ARTICLE',
          userId: data.userId,
          embedding: null,
          article: {
            id: articleId,
            entryId,
            url: data.url,
            author: data.author,
            publishedAt: data.publishedAt,
            content: data.content,
            imageUrl: data.imageUrl
          },
          company: null,
          note: null,
          tags
        };
      });
    } catch (error) {
      console.error('Error in createArticle:', error);
      throw error;
    }
  }
  
  // Create a company entry
  async createCompany(data: CreateCompanyInput): Promise<EntryWithRelations> {
    try {
      // Generate IDs
      const entryId = uuidv4();
      const companyId = uuidv4();
      
      // Use withTransaction for transaction safety
      return await withTransaction(async (client) => {
        // Insert entry
        await client.query(
          `INSERT INTO entry (
            id, title, description, type, user_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [entryId, data.title, data.description || null, 'COMPANY', data.userId]
        );
        
        // Insert company
        await client.query(
          `INSERT INTO company (
            id, entry_id, website, industry, founded, location, employee_count,
            funding, funding_round, company_stage, key_people, competitors, product_offering
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            companyId, 
            entryId, 
            data.website || null,
            data.industry || null,
            data.founded || null,
            data.location || null,
            data.employeeCount || null,
            data.funding || null,
            data.fundingRound || null,
            data.companyStage || null,
            data.keyPeople ? JSON.stringify(data.keyPeople) : null,
            data.competitors ? JSON.stringify(data.competitors) : null,
            data.productOffering || null
          ]
        );
        
        // Get or create tags
        const tags = await this.getOrCreateTags(data.tags || []);
        
        // Link tags to entry
        for (const tag of tags) {
          await client.query(
            `INSERT INTO entry_tag (entry_id, tag_id) VALUES ($1, $2)`,
            [entryId, tag.id]
          );
        }
        
        // Return the created entry with relations
        return {
          id: entryId,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: data.title,
          description: data.description || null,
          type: 'COMPANY',
          userId: data.userId,
          embedding: null,
          article: null,
          company: {
            id: companyId,
            entryId,
            website: data.website,
            industry: data.industry,
            founded: data.founded,
            location: data.location,
            employeeCount: data.employeeCount,
            funding: data.funding,
            fundingRound: data.fundingRound,
            companyStage: data.companyStage,
            keyPeople: data.keyPeople ? JSON.stringify(data.keyPeople) : undefined,
            competitors: data.competitors ? JSON.stringify(data.competitors) : undefined,
            productOffering: data.productOffering
          },
          note: null,
          tags
        };
      });
    } catch (error) {
      console.error('Error in createCompany:', error);
      throw error;
    }
  }
  
  // Create a note entry
  async createNote(data: CreateNoteInput): Promise<EntryWithRelations> {
    try {
      // Generate IDs
      const entryId = uuidv4();
      const noteId = uuidv4();
      
      // Use withTransaction for transaction safety
      return await withTransaction(async (client) => {
        // Insert entry
        await client.query(
          `INSERT INTO entry (
            id, title, description, type, user_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [entryId, data.title, data.description || null, 'NOTE', data.userId]
        );
        
        // Insert note
        await client.query(
          `INSERT INTO note (id, entry_id, content, category) VALUES ($1, $2, $3, $4)`,
          [noteId, entryId, data.content, data.category || null]
        );
        
        // Get or create tags
        const tags = await this.getOrCreateTags(data.tags || []);
        
        // Link tags to entry
        for (const tag of tags) {
          await client.query(
            `INSERT INTO entry_tag (entry_id, tag_id) VALUES ($1, $2)`,
            [entryId, tag.id]
          );
        }
        
        // Return the created entry with relations
        return {
          id: entryId,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: data.title,
          description: data.description || null,
          type: 'NOTE',
          userId: data.userId,
          embedding: null,
          article: null,
          company: null,
          note: {
            id: noteId,
            entryId,
            content: data.content,
            category: data.category
          },
          tags
        };
      });
    } catch (error) {
      console.error('Error in createNote:', error);
      throw error;
    }
  }
  
  // Delete an entry
  async deleteEntry(id: string, userId: string): Promise<boolean> {
    try {
      // Verify entry ownership
      const entryResult = await query(
        `SELECT id FROM entry WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      if (!entryResult || entryResult.length === 0) {
        return false;
      }
      
      // Delete the entry (cascades to related tables)
      await query(`DELETE FROM entry WHERE id = $1`, [id]);
      
      return true;
    } catch (error) {
      console.error('Error in deleteEntry:', error);
      throw error;
    }
  }
}
