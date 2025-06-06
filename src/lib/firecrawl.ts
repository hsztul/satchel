// src/lib/firecrawl.ts
// Unified Firecrawl interface for Satchel backend
import Firecrawl from '@mendable/firecrawl-js';

export type FirecrawlResult = {
  title: string;
  cleaned_content: string;
  metadata: Record<string, unknown> | Record<string, unknown>[] | null;
  error?: string;
};

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY is not set in environment variables');
}

const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

export async function runFirecrawl({ entryType, url }: { entryType: 'article' | 'company'; url: string }): Promise<FirecrawlResult> {
  console.log(`[Firecrawl] Starting ingestion for`, { entryType, url });
  try {
    if (entryType === 'article') {
      console.log(`[Firecrawl] Calling scrapeUrl for`, url);
      const start = Date.now();
      const data = await firecrawl.scrapeUrl(url, { formats: ['markdown'] });
      console.log(`[Firecrawl] scrapeUrl response (${Date.now() - start}ms):`, data);
      if ('success' in data && data.success) {
        // Success: return the parsed content
        return {
          title: data.metadata?.title || url,
          cleaned_content: data.markdown || '',
          metadata: data.metadata || null,
        };
      } else {
        // Failure: log and return error
        console.error(`[Firecrawl] scrapeUrl error:`, data.error, '\nFull response:', data);
        if ('status' in data) console.error(`[Firecrawl] scrapeUrl status:`, data.status);
        if ('message' in data) console.error(`[Firecrawl] scrapeUrl message:`, data.message);
        return { title: url, cleaned_content: '', metadata: null, error: (typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string' && (data as { error: string }).error) || (typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string' && (data as { message: string }).message) || JSON.stringify(data) };
      }
    } else {
      // company: synchronous crawl (no polling, no crawl ID)
      console.log(`[Firecrawl] Calling crawlUrl for`, url);
      const crawlStart = Date.now();
      const response = await firecrawl.crawlUrl(url, { limit: 10, scrapeOptions: { formats: ['markdown'] } });
      console.log(`[Firecrawl] crawlUrl response (${Date.now() - crawlStart}ms):`, response);
      // Log structure and preview for debugging
      console.log('[Firecrawl] crawlUrl typeof:', typeof response);
      if (response && typeof response === 'object') {
        console.log('[Firecrawl] crawlUrl keys:', Object.keys(response));
      }
      const preview = JSON.stringify(response, null, 2).slice(0, 200);
      console.log('[Firecrawl] crawlUrl preview:', preview + (preview.length === 200 ? '... [truncated]' : ''));
      if (!response || typeof response !== 'object' || response.success !== true || response.status !== 'completed') {
        console.error(`[Firecrawl] crawlUrl failed or incomplete. Full response:`, response);
        return { title: url, cleaned_content: '', metadata: null, error: (typeof response === 'object' && response !== null && 'error' in response && typeof (response as { error?: unknown }).error === 'string' && (response as { error: string }).error) || (typeof response === 'object' && response !== null && 'message' in response && typeof (response as { message?: unknown }).message === 'string' && (response as { message: string }).message) || JSON.stringify(response) };
      }
      if (!Array.isArray(response.data) || response.data.length === 0) {
        console.error(`[Firecrawl] crawlUrl returned no data.`);
        return { title: url, cleaned_content: '', metadata: null, error: 'No crawl data returned' };
      }
      // Concatenate markdown from all data items
      return {
        title: Array.isArray(response.data) && response.data[0]?.metadata && typeof response.data[0].metadata === 'object' && 'title' in response.data[0].metadata ? (response.data[0].metadata as { title?: string }).title || url : url,
        cleaned_content: Array.isArray(response.data) ? response.data.map((d: { markdown?: string }) => d.markdown || '').join('\n\n') : '',
        metadata: Array.isArray(response.data) ? response.data.map((d: { metadata?: Record<string, unknown> }) => d.metadata).filter((m): m is Record<string, unknown> => m !== null && m !== undefined) : null,
      };
    }
  } catch (err: unknown) {
    console.error(`[Firecrawl] Exception during ingestion:`, err);
    let errorMsg = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      errorMsg = (err as { message: string }).message;
    } else {
      errorMsg = String(err);
    }
    return { title: url, cleaned_content: '', metadata: null, error: errorMsg };
  }
}
