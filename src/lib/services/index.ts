import { NeonEntryService } from './neon-entry-service';
import { ConnectionService } from './connection-service';

// Export service instances for use throughout the application
export const entryService = new NeonEntryService();
export const connectionService = new ConnectionService();

// Export types
export type {
  EntryWithRelations,
  CreateArticleInput,
  CreateCompanyInput,
  CreateNoteInput,
} from './neon-entry-service';
