"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

export function Header() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            Satchel
          </Link>
          
          <nav className="hidden md:flex gap-6">
            <Link 
              href="/entries" 
              className={`text-sm ${pathname.startsWith('/entries') && !pathname.startsWith('/entries/new') ? 'text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Entries
            </Link>
            <Link 
              href="/queue" 
              className={`text-sm ${pathname.startsWith('/queue') ? 'text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Queue
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {isSignedIn && (
            <div className="flex gap-2 mr-2">
              <Link href="/entries/new?type=article">
                <Button variant="outline" size="sm" className="border-slate-200 hover:border-slate-900 hover:bg-slate-50">
                  New Article
                </Button>
              </Link>
              <Link href="/entries/new?type=company">
                <Button variant="outline" size="sm" className="border-slate-200 hover:border-slate-900 hover:bg-slate-50">
                  New Company
                </Button>
              </Link>
              <Link href="/entries/new?type=note">
                <Button variant="outline" size="sm" className="border-slate-200 hover:border-slate-900 hover:bg-slate-50">
                  New Note
                </Button>
              </Link>
            </div>
          )}
          
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="container mx-auto px-4 py-2 flex justify-between">
          <Link 
            href="/entries" 
            className={`text-xs flex flex-col items-center ${pathname.startsWith('/entries') ? 'text-slate-900' : 'text-slate-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mb-1">
              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
            </svg>
            Entries
          </Link>
          
          <div className="flex flex-col items-center">
            <div className="flex gap-1 mb-1">
              <Link href="/entries/new?type=article">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs">A</div>
              </Link>
              <Link href="/entries/new?type=company">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs">C</div>
              </Link>
              <Link href="/entries/new?type=note">
                <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs">N</div>
              </Link>
            </div>
            <span className="text-xs">New</span>
          </div>
          
          <Link 
            href="/queue" 
            className={`text-xs flex flex-col items-center ${pathname.startsWith('/queue') ? 'text-slate-900' : 'text-slate-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mb-1">
              <path d="M2 4.5A2.5 2.5 0 014.5 2h11a2.5 2.5 0 010 5h-11A2.5 2.5 0 012 4.5zM2.75 9.083a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 12.663a.75.75 0 000 1.5h14.5a.75.75 0 000-1.5H2.75zM2.75 16.25a.75.75 0 000 1.5h14.5a.75.75 0 100-1.5H2.75z" />
            </svg>
            Queue
          </Link>
          
          <Link 
            href="/settings" 
            className={`text-xs flex flex-col items-center ${pathname.startsWith('/settings') ? 'text-slate-900' : 'text-slate-600'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mb-1">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
