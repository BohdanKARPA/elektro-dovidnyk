import { NextResponse, type NextRequest } from 'next/server'

/** Send visitors without a language prefix to /uk or /en based on Accept-Language. */
export function proxy(req: NextRequest) {
  const accept = req.headers.get('accept-language') ?? ''
  const lang = /^\s*uk|,\s*uk/i.test(accept) || !/^\s*en/i.test(accept) ? 'uk' : 'en'
  const url = req.nextUrl.clone()
  url.pathname = `/${lang}${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Everything except language-prefixed pages, the admin, API routes and static files.
  matcher: ['/((?!uk|en|studio|api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)'],
}
