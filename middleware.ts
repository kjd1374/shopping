import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 보호된 라우트
  const protectedPaths = ['/request', '/mypage', '/partner']
  const adminPaths = ['/admin']
  const partnerPaths = ['/partner']

  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  const isAdminPath = adminPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // 로그인 페이지는 로그인된 사용자가 접근하면 메인으로 리다이렉트
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 1. 로그인 체크 (일반 보호 라우트 + 관리자 라우트)
  if ((isProtectedPath || isAdminPath) && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 2. 관리자/파트너 권한 체크
  const isPartnerPath = partnerPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if ((isAdminPath || isPartnerPath) && user) {
    // 프로필에서 권한 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // 권한 확인
    if (!profile) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 관리자 페이지는 admin만
    if (isAdminPath && profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 파트너 페이지는 admin 또는 partner만
    if (isPartnerPath && profile.role !== 'admin' && profile.role !== 'partner') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

