import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { QueueDashboard } from "@/components/QueueDashboard";

export const metadata = {
  title: "Processing Queue - Satchel",
  description: "Manage and monitor the background processing queue for Satchel entries",
};

export default async function QueuePage() {
  // Check if user is authenticated
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Processing Queue</h1>
      <Suspense fallback={<QueueDashboardSkeleton />}>
        <QueueDashboard />
      </Suspense>
    </div>
  );
}

function QueueDashboardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="h-8 w-48 bg-slate-200 rounded mb-4 animate-pulse"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
            <div className="h-4 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
