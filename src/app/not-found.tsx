import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-slate-600 mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button className="w-full md:w-auto">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
