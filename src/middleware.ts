import { clerkMiddleware } from '@clerk/nextjs/server';

// Import middleware and use with default configuration
export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next|favicon.ico).*)', '/'],
};
