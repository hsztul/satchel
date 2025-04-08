import { createClient } from '@supabase/supabase-js';
import { Entry, EntryType, ProcessingState, Comment } from '@/types';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set correctly');
  throw new Error('Supabase environment variables are missing');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey.substring(0, 5) + '...');

// Create Supabase client with proper configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  // Use default public schema
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Entries API
export const entriesApi = {
  // Get all entries for the current user
  async getEntries(type?: EntryType) {
    const query = supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching entries:', error);
      throw error;
    }

    // Map each database entry to the Entry type
    return data.map(dbEntry => this.mapDbEntryToEntry(dbEntry));
  },

  // Helper function to map database fields to Entry type
  mapDbEntryToEntry(dbEntry: any): Entry {
    if (!dbEntry) return null as unknown as Entry;
    
    return {
      id: dbEntry.id,
      userId: dbEntry.user_id,
      type: dbEntry.type,
      url: dbEntry.url,
      processingState: dbEntry.processing_state,
      processingProgress: dbEntry.processing_progress,
      createdAt: dbEntry.created_at,
      updatedAt: dbEntry.updated_at,
      metadata: dbEntry.metadata || {}
    };
  },

  // Get a single entry by ID
  async getEntry(id: string) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching entry ${id}:`, error);
      throw error;
    }
    
    const mappedEntry = this.mapDbEntryToEntry(data);
    
    return mappedEntry;
  },

  // Create a new entry
  async createEntry(
    userId: string,
    type: EntryType,
    url?: string,
    metadata: Record<string, any> = {}
  ) {
    console.log('Creating entry in Supabase with:', { userId, type, url });
    
    try {
      // Format the data according to the database schema
      const entryData = {
        user_id: userId,
        type,
        url: url || null,
        processing_state: 'started',
        processing_progress: 0,
        metadata: metadata || {}
      };
      
      console.log('Formatted entry data:', entryData);
      
      // Use table name without schema prefix
      console.log('Attempting to insert into entries table...');
      const { data, error } = await supabase
        .from('entries')
        .insert(entryData)
        .select()
        .single();

      if (error) {
        // Log the full error object for debugging
        console.error('Supabase error creating entry:', error);
        
        // Log available properties safely
        const errorDetails = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        };
        console.error('Error details:', errorDetails);
        
        // Try to extract any useful information from the error
        const errorMessage = error.message || 
                            (error.details ? String(error.details) : 'Unknown error');
        throw new Error(`Supabase error: ${errorMessage}`);
      }

      if (!data) {
        console.error('No data returned from Supabase insert');
        throw new Error('No data returned from database insert');
      }
      
      console.log('Successfully created entry in Supabase:', data);
      return data as Entry;
    } catch (err) {
      console.error('Exception in createEntry:', err);
      throw err;
    }
  },

  // Update an entry
  async updateEntry(id: string, updates: Partial<Entry>): Promise<Entry> {
    // Convert camelCase to snake_case for database fields
    const dbUpdates: any = {};
    if (updates.processingState !== undefined) dbUpdates.processing_state = updates.processingState;
    if (updates.processingProgress !== undefined) dbUpdates.processing_progress = updates.processingProgress;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
    
    const { data, error } = await supabase
      .from('entries')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating entry ${id}:`, error);
      throw error;
    }

    return this.mapDbEntryToEntry(data);
  },
  
  /**
   * Update the processing state of an entry
   */
  async updateProcessingState(
    id: string, 
    state: ProcessingState, 
    progress: number = 0,
    metadata: Record<string, any> = {}
  ): Promise<Entry> {
    // Format the updates based on the database schema
    const updates: any = {
      processing_state: state,
      processing_progress: progress,
    };
    
    // If metadata is provided, merge it with the existing metadata
    if (Object.keys(metadata).length > 0) {
      const entry = await this.getEntry(id);
      updates.metadata = {
        ...entry.metadata,
        ...metadata
      };
    }
    
    const { data, error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating entry processing state ${id}:`, error);
      throw error;
    }

    return this.mapDbEntryToEntry(data);
  },

  // Delete an entry
  async deleteEntry(id: string) {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting entry ${id}:`, error);
      throw error;
    }

    return true;
  },


};

// Comments API
export const commentsApi = {
  // Helper function to map database fields to Comment type
  mapDbCommentToComment(dbComment: any): Comment {
    if (!dbComment) return null as unknown as Comment;
    
    return {
      id: dbComment.id,
      userId: dbComment.user_id,
      entryId: dbComment.entry_id,
      text: dbComment.text,
      createdAt: dbComment.created_at
    };
  },
  // Get comments for an entry
  async getComments(entryId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`Error fetching comments for entry ${entryId}:`, error);
      throw error;
    }

    // Map each database comment to the Comment type
    return data.map(dbComment => this.mapDbCommentToComment(dbComment));
  },

  // Add a comment to an entry
  async addComment(userId: string, entryId: string, text: string) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        entry_id: entryId,
        text,
      })
      .select()
      .single();

    if (error) {
      console.error(`Error adding comment to entry ${entryId}:`, error);
      throw error;
    }

    // Map the database comment to the Comment type
    return this.mapDbCommentToComment(data);
  },

  // Update a comment
  async updateComment(id: string, text: string) {
    console.log(`Updating comment ${id}`);
    
    const { data, error } = await supabase
      .from('comments')
      .update({ text })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating comment ${id}:`, error);
      throw error;
    }

    console.log(`Successfully updated comment ${id}`);
    return this.mapDbCommentToComment(data);
  },
  
  // Delete a comment
  async deleteComment(id: string) {
    console.log(`Deleting comment ${id}`);
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting comment ${id}:`, error);
      throw error;
    }

    console.log(`Successfully deleted comment ${id}`);
    return true;
  },
};
