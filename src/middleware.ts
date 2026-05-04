import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Todas as rotas da aplicação (exceto login, public, api internas) são protegidas
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')

  // Proteger rotas
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirecionar usuários logados da página de login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/crm'
    return NextResponse.redirect(url)
  }

  // Rate limiting simples para a rota de login (5 tentativas por IP a cada 15 min)
  if (pathname === '/login' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `login_attempt_${ip}`
    const attempts = parseInt(request.cookies.get(rateLimitKey)?.value || '0', 10)

    if (attempts >= 5) {
      return new NextResponse(
        JSON.stringify({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    supabaseResponse.cookies.set(rateLimitKey, String(attempts + 1), {
      maxAge: 900,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|public/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
