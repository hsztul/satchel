"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Entry } from "@/types";
import Link from "next/link";
import { ProcessingStatus } from "./ProcessingStatus";
import { format } from "timeago.js";

interface EntryCardProps {
  entry: Entry;
}

export function EntryCard({ entry }: EntryCardProps) {
  // Format date as relative time
  const getRelativeTime = () => {
    try {
      if (!entry.createdAt) return "Added recently";
      const date = typeof entry.createdAt === 'string' 
        ? new Date(entry.createdAt) 
        : new Date(Number(entry.createdAt));
      
      if (date instanceof Date && !isNaN(date.getTime())) {
        return `Added ${format(date)}`;
      }
      return "Added recently";
    } catch (error) {
      console.error("Error formatting date:", error, entry.createdAt);
      return "Added recently";
    }
  };

  // Render company card
  if (entry.type === 'company') {
    return (
      <Link href={`/entries/${entry.id}`}>
        <Card className="h-full cursor-pointer hover:shadow-md transition-shadow border-slate-200 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{entry.metadata.name || "Unnamed Company"}</CardTitle>
                <CardDescription>
                  {entry.metadata.industry || "Industry not specified"}
                </CardDescription>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 capitalize">
                {entry.type}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[4rem]">
              {entry.metadata.description ? (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">{entry.metadata.description}</p>
              ) : (
                <p className="text-sm text-slate-500 italic mb-4">No description available</p>
              )}
              {entry.metadata.headquarters && (
                <div className="text-xs text-slate-500">
                  📍 {entry.metadata.headquarters}
                </div>
              )}
              {entry.metadata.employeeCount && (
                <div className="text-xs text-slate-500">
                  👥 {entry.metadata.employeeCount} employees
                </div>
              )}
            </div>
            <div className="mt-2">
              <ProcessingStatus 
                state={entry.processingState} 
                progress={entry.processingProgress || 0} 
              />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Render note card
  if (entry.type === 'note') {
    return (
      <Link href={`/entries/${entry.id}`}>
        <Card className="h-full cursor-pointer hover:shadow-md transition-shadow border-slate-200 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{entry.metadata.title || "Untitled Note"}</CardTitle>
                <CardDescription>
                  {getRelativeTime()}
                </CardDescription>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 capitalize">
                {entry.type}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[4rem]">
              {entry.metadata.text ? (
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 whitespace-pre-line">{entry.metadata.text}</p>
              ) : (
                <p className="text-sm text-slate-500 italic mb-4">Empty note</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Render article card (default)
  return (
    <Link href={`/entries/${entry.id}`}>
      <Card className="h-full cursor-pointer hover:shadow-md transition-shadow border-slate-200 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{entry.metadata.title || "Untitled Article"}</CardTitle>
              <CardDescription>
                {getRelativeTime()}
              </CardDescription>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 capitalize">
              {entry.type}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[4rem]">
            {entry.metadata.summary ? (
              <p className="text-sm text-slate-600 mb-4 line-clamp-3">{entry.metadata.summary}</p>
            ) : entry.processingState === "completed" ? (
              <p className="text-sm text-slate-500 italic mb-4">No summary available</p>
            ) : (
              <p className="text-sm text-slate-500 italic mb-4">Processing content...</p>
            )}
          </div>
          <div className="mt-2">
            <ProcessingStatus 
              state={entry.processingState} 
              progress={entry.processingProgress || 0} 
            />
            {entry.processingState === 'processing' && entry.processingProgress !== undefined && entry.processingProgress < 100 && (
              <div className="text-xs text-blue-500 mt-1 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-ping"></div>
                <span>Processing {entry.processingProgress}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
