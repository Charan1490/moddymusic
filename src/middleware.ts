import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decrypt, updateSessionCookie } from '@/lib/auth'; 
import type { SessionPayload } from '@/types';

// Define routes
const HOME_PAGE = '/';
const PROFILE_PAGE = '/profile';
const LOGIN_PAGE = '/login';
const SIGNUP_PAGE = '/signup';

const PROTECTED_PAGES = [HOME_PAGE, PROFILE_PAGE];
const AUTH_PAGES = [LOGIN_PAGE, SIGNUP_PAGE];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  let currentUser: SessionPayload | null = null;

  if (sessionCookie) {
    currentUser = await decrypt(sessionCookie);
  }

  const { pathname } = request.nextUrl;

  const requestedPageIsProtected = PROTECTED_PAGES.includes(pathname);
  const requestedPageIsAuth = AUTH_PAGES.includes(pathname);

  // Handle unauthenticated users trying to access protected pages
  if (requestedPageIsProtected && !currentUser) {
    const loginUrl = new URL(LOGIN_PAGE, request.url);
    // Preserve the intended destination for redirection after login, unless it's the home page.
    if (pathname !== HOME_PAGE) {
      loginUrl.searchParams.set('redirect_to', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Handle authenticated users trying to access auth pages (login/signup)
  if (requestedPageIsAuth && currentUser) {
    // Redirect to the page they were trying to access before login, or to home page
    const redirectTo = request.nextUrl.searchParams.get('redirect_to');
    // Ensure redirectTo is a protected page to avoid open redirect vulnerabilities if it's user-supplied.
    // However, here redirectTo is typically set by our own middleware.
    if (redirectTo && PROTECTED_PAGES.includes(redirectTo)) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.redirect(new URL(HOME_PAGE, request.url));
  }

  // Refresh session for authenticated users on non-API routes
  if (currentUser && !pathname.startsWith('/api')) {
     const response = await updateSessionCookie(request);
     // If updateSessionCookie returns a response (e.g., with a new cookie), use it.
     // Otherwise, continue with NextResponse.next().
     if (response) return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except for API routes, static files, and image optimization files
  // This ensures middleware runs for all relevant page navigations.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
