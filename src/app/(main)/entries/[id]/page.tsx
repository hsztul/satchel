"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Globe, FileText, User, Clock, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// This is a placeholder for now - we'll implement real data fetching later
const mockEntries = [
  {
    id: "1",
    type: "article",
    metadata: {
      title: "The Future of AI in Startups",
      summary: "An overview of how AI is transforming the startup ecosystem.",
      url: "https://example.com/ai-startups",
      author: "John Doe",
      publishedDate: "2023-06-15",
      content: `
        <p>The integration of artificial intelligence (AI) into startup operations has become increasingly prevalent in recent years. Startups are leveraging AI technologies to optimize processes, enhance decision-making, and create innovative products and services.</p>
        
        <h2>AI Applications in Startups</h2>
        <p>AI is being applied across various domains within startups, including:</p>
        <ul>
          <li>Customer service automation through chatbots</li>
          <li>Predictive analytics for market trends</li>
          <li>Product personalization</li>
          <li>Process optimization</li>
        </ul>
        
        <h2>Benefits of AI Integration</h2>
        <p>Startups that successfully integrate AI technologies often experience:</p>
        <ul>
          <li>Reduced operational costs</li>
          <li>Enhanced customer experiences</li>
          <li>Data-driven decision making</li>
          <li>Competitive advantage in the market</li>
        </ul>
        
        <h2>Challenges and Considerations</h2>
        <p>Despite the benefits, startups face challenges when implementing AI solutions:</p>
        <ul>
          <li>Initial implementation costs</li>
          <li>Technical expertise requirements</li>
          <li>Data privacy concerns</li>
          <li>Ethical considerations</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>As AI continues to evolve, its role in shaping the future of startups will become increasingly significant. Startups that effectively harness the power of AI will likely experience enhanced growth opportunities and long-term success.</p>
      `,
      tags: ["AI", "Startups", "Technology", "Innovation"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  },
  {
    id: "2",
    type: "company",
    metadata: {
      title: "TechCorp Inc.",
      summary: "An innovative technology company focusing on AI solutions.",
      website: "https://techcorp-example.com",
      industry: "Technology",
      founded: "2018",
      location: "San Francisco, CA",
      size: "50-100 employees",
      funding: "$10M Series A",
      description: `
        TechCorp Inc. is a leading technology company specializing in artificial intelligence solutions for enterprise clients. Founded in 2018 by a team of AI researchers from top universities, the company has quickly established itself as an innovator in the field.
        
        Their flagship product, AIAssist, provides businesses with intelligent automation tools that streamline operations and enhance productivity. The company's mission is to democratize access to AI technologies, making them accessible and beneficial for organizations of all sizes.
        
        TechCorp has received significant recognition in the industry, including being named one of the "Top 10 AI Startups to Watch" by Tech Magazine in 2022. With a recent Series A funding round of $10M, the company is poised for rapid expansion into international markets.
      `,
      tags: ["AI", "Enterprise", "SaaS", "Technology"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  },
  {
    id: "3",
    type: "note",
    metadata: {
      title: "Startup Idea: AI-powered Recipe Generator",
      text: `
        # AI Recipe Generator App

        ## Core Concept
        An app that generates personalized recipes based on:
        - Available ingredients in the user's pantry
        - Dietary restrictions and preferences
        - Time constraints
        - Cooking skill level

        ## Key Features
        - Ingredient scanning via camera
        - Personalized recipe recommendations
        - Step-by-step cooking instructions with images
        - Nutritional information
        - Meal planning calendar
        - Shopping list generation

        ## Business Model
        - Freemium model with basic features available for free
        - Premium subscription ($4.99/month) for advanced features
        - Potential partnership with grocery delivery services
        - Affiliate marketing with kitchen appliance brands

        ## Technical Requirements
        - Machine learning model for recipe generation
        - Computer vision for ingredient recognition
        - User profile database
        - Recipe database
        - Mobile app (iOS and Android)

        ## Next Steps
        - Validate concept with potential users
        - Develop prototype for initial testing
        - Seek seed funding
        - Build MVP
      `,
      tags: ["AI", "Food Tech", "Startup Idea", "Mobile App"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  },
  {
    id: "4",
    type: "article",
    metadata: {
      title: "The Rise of No-Code Development",
      summary: "How no-code platforms are democratizing software development.",
      url: "https://example.com/no-code-development",
      author: "Jane Smith",
      publishedDate: "2023-05-10",
      content: `
        <p>No-code development platforms are transforming the software industry by enabling individuals without traditional programming skills to create applications through intuitive visual interfaces.</p>
        
        <h2>The No-Code Revolution</h2>
        <p>The no-code movement represents a significant shift in how software is created and maintained. These platforms provide:</p>
        <ul>
          <li>Visual development environments</li>
          <li>Drag-and-drop interfaces</li>
          <li>Pre-built templates and components</li>
          <li>Integration capabilities with other systems</li>
        </ul>
        
        <h2>Benefits for Startups</h2>
        <p>No-code platforms offer several advantages for startups:</p>
        <ul>
          <li>Reduced development time and costs</li>
          <li>Lower barrier to entry for non-technical founders</li>
          <li>Faster iteration and prototyping</li>
          <li>Ability to validate ideas before significant investment</li>
        </ul>
        
        <h2>Limitations and Considerations</h2>
        <p>Despite their benefits, no-code platforms have limitations:</p>
        <ul>
          <li>Customization constraints</li>
          <li>Potential scalability issues</li>
          <li>Vendor lock-in concerns</li>
          <li>Performance limitations for complex applications</li>
        </ul>
        
        <h2>The Future of Development</h2>
        <p>As these platforms evolve, we can expect to see a hybrid approach where professional developers leverage no-code tools to accelerate development while focusing their expertise on more complex aspects of software engineering.</p>
      `,
      tags: ["No-Code", "Software Development", "Technology", "Startups"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  },
  {
    id: "5",
    type: "company",
    metadata: {
      title: "BuildBlocks",
      summary: "A no-code platform for building web applications without coding.",
      website: "https://buildblocks-example.com",
      industry: "Technology",
      founded: "2019",
      location: "New York, NY",
      size: "20-50 employees",
      funding: "$5M Seed",
      description: `
        BuildBlocks is revolutionizing the way businesses create web applications through its innovative no-code platform. Founded in 2019 by former software engineers, the company aims to democratize software development by making it accessible to everyone.
        
        The BuildBlocks platform enables users to create complex web applications through an intuitive drag-and-drop interface. Users can select from a library of pre-built components, customize them to their needs, and connect them to various data sources and APIs without writing a single line of code.
        
        The company has gained traction among small businesses and entrepreneurial teams who need to quickly develop and deploy web applications without the cost of hiring dedicated development teams. With a recent seed funding round of $5M, BuildBlocks is expanding its component library and enhancing its integration capabilities.
      `,
      tags: ["No-Code", "Web Development", "SaaS", "Startups"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  },
  {
    id: "6",
    type: "note",
    metadata: {
      title: "Idea: Subscription Management App",
      text: `
        # Subscription Management App Idea

        ## Problem
        Most people have multiple subscriptions (streaming services, software, etc.) but lose track of:
        - How much they're spending in total
        - When renewals occur
        - Which subscriptions they barely use
        - Free trials that convert to paid plans

        ## Solution
        Create a comprehensive subscription tracking app that:

        ## Key Features
        - Automatically detects subscriptions by scanning emails or bank statements
        - Provides visualization of monthly/annual subscription costs
        - Sends alerts before renewal dates
        - Offers usage analysis (integrating with apps when possible)
        - Suggests subscriptions to cancel based on usage and cost
        - Helps with the cancellation process

        ## Business Model
        - Free tier with basic tracking
        - Premium tier ($3.99/month) with advanced features
        - Enterprise version for businesses

        ## Market Research
        - Average American spends $237 monthly on subscriptions
        - 84% of people underestimate what they spend on subscriptions
        - Subscription economy growing at 17% annually

        ## Next Steps
        - Create mockups of the user interface
        - Research APIs for automatic subscription detection
        - Validate concept with potential users
      `,
      tags: ["Startup Idea", "Finance", "Consumer App", "Subscription Economy"]
    },
    createdAt: new Date().toISOString(),
    userId: "user123",
  }
];

export default function EntryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    const foundEntry = mockEntries.find(entry => entry.id === id);
    
    // Wait a moment to simulate network request
    setTimeout(() => {
      setEntry(foundEntry || null);
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/entries" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to entries
          </Link>
        </Button>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">Entry Not Found</h1>
            <p className="text-gray-500 mt-2">The entry you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to render appropriate content based on entry type
  const renderEntryContent = () => {
    switch (entry.type) {
      case 'article':
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{entry.metadata.author || 'Unknown Author'}</span>
              </div>
              {entry.metadata.publishedDate && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{entry.metadata.publishedDate}</span>
                </div>
              )}
              {entry.metadata.url && (
                <a 
                  href={entry.metadata.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Original Article</span>
                </a>
              )}
            </div>
            
            <div className="prose prose-blue max-w-none"
                 dangerouslySetInnerHTML={{ __html: entry.metadata.content }} />
                 
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.metadata.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'company':
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center text-sm">
              {entry.metadata.website && (
                <a 
                  href={entry.metadata.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
              
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">{entry.metadata.industry || 'Industry not specified'}</span>
              </div>
              
              {entry.metadata.founded && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">Founded: {entry.metadata.founded}</span>
                </div>
              )}
              
              {entry.metadata.location && (
                <div className="flex items-center gap-1 text-gray-500">
                  <span>{entry.metadata.location}</span>
                </div>
              )}
              
              {entry.metadata.size && (
                <div className="flex items-center gap-1 text-gray-500">
                  <User className="h-4 w-4" />
                  <span>{entry.metadata.size}</span>
                </div>
              )}
              
              {entry.metadata.funding && (
                <Badge variant="outline" className="text-gray-700">
                  {entry.metadata.funding}
                </Badge>
              )}
            </div>
            
            <div className="prose prose-blue max-w-none">
              <p className="whitespace-pre-line">{entry.metadata.description}</p>
            </div>
            
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.metadata.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'note':
        return (
          <div className="space-y-6">
            <div className="prose prose-blue max-w-none">
              <div className="whitespace-pre-line">{entry.metadata.text}</div>
            </div>
            
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.metadata.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="py-8 text-center">
            <p className="text-gray-500">Content not available for this entry type.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/entries" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to entries
          </Link>
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Share</Button>
          <Button variant="outline" size="sm">Edit</Button>
        </div>
      </div>
      
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Badge 
            className="capitalize"
            variant="outline"
          >
            {entry.type}
          </Badge>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(entry.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        <h1 className="text-3xl font-bold">{entry.metadata.title}</h1>
        
        {entry.metadata.summary && (
          <p className="mt-2 text-gray-600">{entry.metadata.summary}</p>
        )}
      </div>
      
      <Separator />
      
      <Tabs defaultValue="content" className="mt-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="py-4">
          {renderEntryContent()}
        </TabsContent>
        
        <TabsContent value="insights" className="py-4">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium mb-4">AI Insights</h2>
            <p className="text-gray-600">AI-generated insights about this entry will appear here.</p>
            <p className="text-gray-600 mt-2">This feature is coming soon!</p>
          </div>
        </TabsContent>
        
        <TabsContent value="comments" className="py-4">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium mb-4">Comments</h2>
            <p className="text-gray-600">No comments yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
