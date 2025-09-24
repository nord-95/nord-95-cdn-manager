import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Temporarily disabled middleware to resolve runtime errors
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Disable middleware temporarily
    '/((?!.*).*)',
  ],
};
