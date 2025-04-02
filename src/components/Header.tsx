import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Satchel</span>
        </Link>

        <div className="flex items-center space-x-4">
          <nav className="hidden md:flex">
            <ul className="flex space-x-4">
              <li>
                <Button variant="ghost" asChild>
                  <Link href="/entries">Entries</Link>
                </Button>
              </li>
              <li>
                <Button variant="ghost" asChild>
                  <Link href="/explore">Explore</Link>
                </Button>
              </li>
            </ul>
          </nav>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
