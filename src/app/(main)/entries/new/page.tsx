"use client";

import EntryForm, { EntryType } from "@/components/EntryForm";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function NewEntryPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") as EntryType | null;
  
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Entry</h1>
        <p className="text-muted-foreground">Add an article, company, or note to your collection</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>New Entry</CardTitle>
          <CardDescription>
            Fill out the form below to create a new entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntryForm initialType={type} />
        </CardContent>
      </Card>
    </div>
  );
}
