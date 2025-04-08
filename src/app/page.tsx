import Link from "next/link";
import { Button } from "@/components/ui/button";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  // Check if user is authenticated and redirect to /entries if they are
  const user = await currentUser();
  
  if (user) {
    redirect("/entries");
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">Satchel</div>
          <div className="flex items-center gap-4">
            <Link 
              href="/sign-in" 
              className="px-4 py-2 rounded-md hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/sign-up" 
              className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Your Knowledge Hub</h1>
          <p className="text-xl text-slate-600 max-w-2xl mb-12">
            Store, organize, and explore articles, companies, and ideas with the power of AI.  
            Discover new connections and insights from your collected knowledge.  
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/sign-up" 
              className="bg-slate-900 text-white px-6 py-3 rounded-md hover:bg-slate-800 transition-colors text-lg font-medium"
            >
              Get Started
            </Link>
            <Link 
              href="/sign-in" 
              className="border border-slate-300 px-6 py-3 rounded-md hover:bg-slate-50 transition-colors text-lg font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
        
        <div className="bg-slate-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">AI-Powered Summaries</h3>
                <p className="text-slate-600">Automatically generate summaries and key points for articles and companies.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Organized Knowledge</h3>
                <p className="text-slate-600">Keep your research organized with a clean, minimalist interface.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Interactive Exploration</h3>
                <p className="text-slate-600">Chat with your stored data to discover new connections and insights.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Satchel
        </div>
      </footer>
    </div>
  );
}
