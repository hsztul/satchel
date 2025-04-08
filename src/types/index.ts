export type EntryType = 'article' | 'company' | 'note';
export type ProcessingState = 'idle' | 'started' | 'processing' | 'completed' | 'failed';

export interface Entry {
  id: string;
  userId: string;
  type: EntryType;
  url?: string;
  processingState: ProcessingState;
  processingProgress?: number;
  createdAt: string;
  updatedAt: string;
  metadata: EntryMetadata;
}

export interface EntryMetadata {
  // Common fields
  title?: string;
  summary?: string;
  keyPoints?: string[];
  
  // Article-specific fields
  author?: string;
  publishedDate?: string;
  content?: string;
  
  // Company-specific fields
  name?: string;
  description?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  keyProducts?: string[];
  competitors?: string[];
  marketPosition?: string;
  marketStrategy?: string;
  coreTechnology?: string;
  competitiveEdge?: string;
  fundingHistory?: string;
  leadership?: string;
  revenueRange?: string;
  employeeCount?: string;
  sources?: string[];
  companyName?: string;
  companyUrl?: string;
  competitiveLandscape?: string;
  
  // Note-specific fields
  text?: string;
}

export interface Comment {
  id: string;
  userId: string;
  entryId: string;
  text: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  entryId: string;
  agentName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
