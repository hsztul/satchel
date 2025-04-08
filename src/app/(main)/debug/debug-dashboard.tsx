"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { queueApi } from "@/lib/supabase/queue";
import { Entry, QueueItem } from "@/types";
import { AlertCircle, CheckCircle, Loader2, Play, RefreshCw } from "lucide-react";

export default function DebugDashboard() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<string | null>(null);

  // Fetch queue items and entries
  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch entries
      const entriesResponse = await fetch('/api/entries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!entriesResponse.ok) {
        throw new Error(`Error fetching entries: ${entriesResponse.statusText}`);
      }
      
      const entriesData = await entriesResponse.json();
      setEntries(entriesData.entries || []);
      
      // Fetch queue items
      const queueItemsResponse = await fetchQueueItems();
      setQueueItems(queueItemsResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchQueueItems = async () => {
    try {
      // Use the new getAllQueueItems method from the queueApi
      return await queueApi.getAllQueueItems();
    } catch (error) {
      console.error('Error fetching queue items:', error);
      return [];
    }
  };

  // Process an entry manually
  const processEntry = async (entryId: string) => {
    try {
      setProcessingResult(`Processing entry ${entryId}...`);
      
      const response = await fetch('/api/queue/debug-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setProcessingResult(`Error: ${response.statusText} - ${errorText}`);
        return;
      }
      
      const result = await response.json();
      setProcessingResult(`Success: ${JSON.stringify(result)}`);
      
      // Refresh data after processing
      setTimeout(() => fetchData(), 2000); // Wait a bit for queue processing to start
    } catch (error) {
      setProcessingResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'processing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Debug Dashboard</h1>
      
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
          onClick={fetchData}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
      
      {/* Entries Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Entries ({entries.length})</h2>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            No entries found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className={selectedEntry === entry.id ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex flex-col">
                    <div className="truncate">{entry.metadata?.title || entry.url || "Untitled"}</div>
                    <div className={`text-sm font-normal ${getStatusColor(entry.processingState)}`}>
                      {getStatusIcon(entry.processingState)} {entry.processingState}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm text-gray-500 mb-2">ID: {entry.id}</div>
                  <div className="text-sm text-gray-500 mb-2">Type: {entry.type}</div>
                  {entry.url && (
                    <div className="text-sm text-gray-500 mb-2 truncate">URL: {entry.url}</div>
                  )}
                  <div className="text-sm text-gray-500">
                    Progress: {entry.processingProgress || 0}%
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => {
                      setSelectedEntry(entry.id);
                      processEntry(entry.id);
                    }}
                  >
                    <Play className="h-4 w-4" />
                    Process
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Queue Items Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Queue Items ({queueItems.length})</h2>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : queueItems.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            No queue items found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">ID</th>
                  <th className="py-2 px-4 text-left">Entry ID</th>
                  <th className="py-2 px-4 text-left">Agent</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Attempts</th>
                  <th className="py-2 px-4 text-left">Created</th>
                  <th className="py-2 px-4 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => (
                  <tr key={item.id || 'unknown'} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm">{item.id ? `${item.id.substring(0, 8)}...` : 'N/A'}</td>
                    <td className="py-2 px-4 text-sm">{item.entryId ? `${item.entryId.substring(0, 8)}...` : 'N/A'}</td>
                    <td className="py-2 px-4 text-sm">{item.agentName || 'N/A'}</td>
                    <td className="py-2 px-4 text-sm">
                      <span className={`flex items-center gap-1 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)} {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-sm">{item.attempts}</td>
                    <td className="py-2 px-4 text-sm">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-4 text-sm">{new Date(item.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Processing Result Section */}
      {processingResult && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">Processing Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {processingResult}
          </pre>
        </div>
      )}
    </div>
  );
}
