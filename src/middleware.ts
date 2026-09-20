import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two jobs.
 *
 * 1. /admin is behind Basic auth. The health page shows ingestion internals
 *    and the report queue; neither is public.
 * 2. Every non-production response carries X-Robots-Tag: noindex, nofollow,
 *    belt-and-braces with the header in next.config.ts and the disallow in
 *    robots.ts. An indexed staging copy of a listings site splits authority
 *    and puts stale prices in front of live ones.
 */
export function middleware(request: NextRequest) {
  const isProduction = process.env.VERCEL_ENV === 'production';

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const expectedUser = process.env.ADMIN_USER;
    const expectedPass = process.env.ADMIN_PASSWORD;

    // With no credentials configured, /admin is closed rather than open.
    if (expectedUser === undefined || expectedPass === undefined) {
      return new NextResponse('Admin is not configured on this deployment.', { status: 503 });
    }

    const header = request.headers.get('authorization');
    if (header === null || !header.startsWith('Basic ')) {
      return unauthorized();
    }
    let decoded = '';
    try {
      decoded = atob(header.slice('Basic '.length));
    } catch {
      return unauthorized();
    }
    const sep = decoded.indexOf(':');
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user !== expectedUser || pass !== expectedPass) {
      return unauthorized();
    }
  }

  const res = NextResponse.next();
  if (!isProduction) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HomeGuy admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
};
