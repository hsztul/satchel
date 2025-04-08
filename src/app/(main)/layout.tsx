import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/use-toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      
      <Toaster />
    </div>
  );
}
