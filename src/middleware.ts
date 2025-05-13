import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decrypt, updateSessionCookie } from '@/lib/auth'; 
import type { SessionPayload } from '@/types';

const PROTECTED_ROUTES = ['/profile'];
const AUTH_ROUTES = ['/login', '/signup'];
const PUBLIC_ROUTES = ['/']; // Add any other public routes here

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  let currentUser: SessionPayload | null = null;

  if (sessionCookie) {
    currentUser = await decrypt(sessionCookie);
  }

  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !currentUser) {
    // User is not authenticated and trying to access a protected route
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect_to', pathname); // Optional: redirect back after login
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && currentUser) {
    // User is authenticated and trying to access login/signup page
    return NextResponse.redirect(new URL('/profile', request.url));
  }
  
  // Attempt to refresh session for authenticated users on any route
  // to keep the session alive during activity.
  // This needs to be handled carefully to avoid redirect loops or performance issues.
  // Only update if there's a current user and it's not an API route to avoid issues.
  if (currentUser && !pathname.startsWith('/api')) {
     const response = await updateSessionCookie(request);
     if (response) return response; // If session was updated, return the response with new cookie
  }


  return NextResponse.next();
}

export const config = {
  // Match all routes except for API routes, static files, and image optimization files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
