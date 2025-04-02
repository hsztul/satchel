"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Globe, Building, FileText } from "lucide-react";

export default function Home() {
  const { isSignedIn, user } = useUser();

  return (
    <div className="container max-w-6xl pb-16">
      <div className="py-10">
        {!isSignedIn ? (
          // Content for non-authenticated users
          <>
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">Collect. Organize. Explore.</h1>
              <p className="mx-auto max-w-3xl text-lg text-muted-foreground sm:text-xl">
                A collaborative platform for startup co-founders to gather insights, manage company data, and take notes.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <SignInButton>
                  <Button size="lg">Get Started</Button>
                </SignInButton>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>

            <div className="mt-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Article Clipping
                    </CardTitle>
                    <CardDescription>
                      Save interesting articles and insights that might be useful later
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Clip articles from around the web, add summaries, and categorize them for easy reference.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <SignInButton>
                      <Button variant="ghost" className="gap-1">
                        Try It <ArrowRight className="h-4 w-4" />
                      </Button>
                    </SignInButton>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Company Tracking
                    </CardTitle>
                    <CardDescription>
                      Keep track of companies you're interested in or competing with
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Store company profiles, funding details, and your own notes about businesses in your ecosystem.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <SignInButton>
                      <Button variant="ghost" className="gap-1">
                        Try It <ArrowRight className="h-4 w-4" />
                      </Button>
                    </SignInButton>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Quick Notes
                    </CardTitle>
                    <CardDescription>
                      Jot down ideas, thoughts, and any other information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Create and organize notes for meetings, ideas, to-dos, or anything else you need to remember.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <SignInButton>
                      <Button variant="ghost" className="gap-1">
                        Try It <ArrowRight className="h-4 w-4" />
                      </Button>
                    </SignInButton>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </>
        ) : (
          // Content for authenticated users
          <>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || "there"}!</h1>
              <p className="text-lg text-muted-foreground">
                What would you like to add to your Satchel today?
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/entries/new?type=article" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Article
                    </CardTitle>
                    <CardDescription>
                      Save an article or insight from the web
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Capture articles, blog posts, and other online content with your own notes and summaries.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="gap-1">
                      Add Article <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>

              <Link href="/entries/new?type=company" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Company
                    </CardTitle>
                    <CardDescription>
                      Track a new company or startup
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Save details about businesses you're interested in, including funding, location, and more.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="gap-1">
                      Add Company <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>

              <Link href="/entries/new?type=note" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Note
                    </CardTitle>
                    <CardDescription>
                      Create a quick note or idea
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Jot down ideas, meeting notes, or anything else you want to remember for later.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="gap-1">
                      Add Note <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </div>

            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recent Entries</h2>
                <Button variant="outline" asChild>
                  <Link href="/entries">View All</Link>
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">You don't have any entries yet.</p>
                    <Link href="/entries/new">
                      <Button className="mt-4">Create Your First Entry</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
