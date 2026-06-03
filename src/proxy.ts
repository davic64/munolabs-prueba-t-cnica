import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/pending/:path*', '/api/chat', '/api/intents/:path*'],
};
