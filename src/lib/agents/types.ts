import { Entry, EntryType } from "@/types";

export interface AgentResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

export interface AgentContext {
  entry: Entry;
  userId: string;
}

export interface Agent {
  process: (context: AgentContext) => Promise<AgentResult>;
}

export interface EntryAgentResult extends AgentResult {
  entryType?: EntryType;
  nextAgent?: string;
}

export interface ArticleContentAgentResult extends AgentResult {
  content?: string;
  nextAgent?: string;
}

export interface ArticleSummaryAgentResult extends AgentResult {
  title?: string;
  summary?: string;
  keyPoints?: string[];
  author?: string;
  publishedDate?: string;
}

export interface CompanyContentAgentResult extends AgentResult {
  content?: string;
  nextAgent?: string;
}

export interface CompanySummaryAgentResult extends AgentResult {
  companyName?: string;
  industry?: string;
  summary?: string;
  competitiveLandscape?: string;
}
