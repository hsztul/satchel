import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Satchel",
  description: "Satchel: Your research and reading dashboard.",
};

import NavLinkSwitcher from "@/app/layout/NavLinkSwitcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="w-full border-b px-6 py-3 bg-white">
  <div className="max-w-2xl mx-auto flex items-center justify-between">
    <Link href="/" className="font-bold text-xl tracking-tight text-blue-700 hover:text-blue-900 transition-colors">
      Satchel
    </Link>
    <NavLinkSwitcher />
  </div>
</header>
        <Toaster />
        {children}
      </body>
    </html>
  );
}
