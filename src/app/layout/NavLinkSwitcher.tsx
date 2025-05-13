"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavLinkSwitcher() {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/chat");
  return (
    <Link
      href={isChat ? "/" : "/chat"}
      className="text-sm font-medium text-blue-600 hover:underline px-3 py-1 rounded transition-colors border border-blue-100 hover:bg-blue-50"
    >
      {isChat ? "Dashboard" : "Chat"}
    </Link>
  );
}
