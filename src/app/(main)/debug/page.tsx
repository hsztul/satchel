import DebugDashboard from './debug-dashboard';

// Set server-side options for the page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DebugPage() {
  // Return the client component
  return <DebugDashboard />;
}
