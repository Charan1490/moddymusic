'use server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { SessionPayload } from '@/types';

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error('JWT_SECRET is not set in environment variables. Please add it to your .env file.');
}
const key = new TextEncoder().encode(secretKey);
const SESSION_DURATION_HOURS = 1; // Session duration in hours

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    // console.error('Failed to verify session:', error); // Avoid logging sensitive info in prod
    return null;
  }
}

export async function createSession(userId: string, email: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const sessionPayload: SessionPayload = { userId, email, expiresAt };
  const session = await encrypt(sessionPayload);

  cookies().set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  return decrypt(sessionCookie);
}

export async function deleteSession(): Promise<void> {
  cookies().set('session', '', { expires: new Date(0), path: '/' });
}

// For middleware usage if session needs to be updated/refreshed
export async function updateSessionCookie(request: NextRequest): Promise<NextResponse | null> {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) return null;

  const decryptedSession = await decrypt(sessionCookie);
  if (!decryptedSession?.userId || !decryptedSession?.email) { // Ensure essential fields are present
     // Invalid session, clear it
    const response = NextResponse.next();
    response.cookies.set('session', '', { expires: new Date(0), path: '/' });
    return response;
  }

  // Refresh the session so it doesn't expire during active use
  const expires = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const response = NextResponse.next({ request }); // Pass request to ensure headers are preserved for chaining
  
  const newSessionToken = await encrypt({ 
    userId: decryptedSession.userId, 
    email: decryptedSession.email, 
    expiresAt: expires 
  });

  response.cookies.set({
    name: 'session',
    value: newSessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
