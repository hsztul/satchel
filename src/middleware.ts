import { clerkMiddleware } from '@clerk/nextjs/server';

// This middleware protects all routes including API routes
export default clerkMiddleware();
 
// Configure matcher to properly exclude static files and Next.js internals
// This pattern will run middleware on all routes except:
// - Files with extensions (static files)
// - Next.js internals (_next)
// - Favicon.ico
export const config = {
  matcher: [
    '/((?!.*\..*|_next|favicon.ico).*)',
    '/api/(.*)',
    '/queue',
  ],
};
