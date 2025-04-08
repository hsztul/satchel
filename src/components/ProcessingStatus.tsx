"use client";

import { Progress } from "@/components/ui/progress";
import { ProcessingState } from "@/types";

interface ProcessingStatusProps {
  state: ProcessingState;
  progress?: number;
  className?: string;
}

export function ProcessingStatus({ state, progress = 0, className = "" }: ProcessingStatusProps) {
  // If progress is 100%, treat as completed regardless of state
  const effectiveState = progress >= 100 ? "completed" : state;
  
  // Determine the status display based on the processing state
  const getStatusDisplay = () => {
    switch (effectiveState) {
      case "completed":
        return (
          <span className="text-green-600 text-sm flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            Processed
          </span>
        );
      case "failed":
        return (
          <span className="text-red-600 text-sm flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        );
      case "idle":
        return (
          <span className="text-slate-500 text-sm flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            Waiting
          </span>
        );
      case "started":
      case "processing":
      default:
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className={state === "started" ? "text-blue-600" : "text-amber-600"}>
                {state === "started" ? "Queued" : "Processing"}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        );
    }
  };

  return (
    <div className={`${className}`}>
      {getStatusDisplay()}
    </div>
  );
}
