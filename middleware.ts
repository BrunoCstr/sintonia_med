import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas (não requerem autenticação)
const publicRoutes = ['/', '/auth', '/plans']

/**
 * Verifica se uma rota começa com algum dos prefixos fornecidos
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rotas de API, assets e arquivos estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }

  // Rotas públicas - permitir acesso sem autenticação
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next()
  }

  // Para todas as outras rotas, verificar se há token no cookie
  // A validação completa do token será feita nas páginas via AuthContext
  // e nas API routes usando verifyFirebaseToken
  const cookieToken = request.cookies.get('firebase-token')
  
  // Se não houver token, redirecionar para login
  if (!cookieToken || !cookieToken.value) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verificar se há 2FA pendente
  // Se o usuário tem 2FA ativado mas ainda não inseriu o código, 
  // não deve ter acesso ao sistema
  const pending2FA = request.cookies.get('2fa-pending')
  if (pending2FA && pending2FA.value === 'true') {
    // Redirecionar para login para completar o 2FA
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('pending2fa', 'true')
    return NextResponse.redirect(loginUrl)
  }

  // Token presente - permitir acesso
  // A validação completa do token, verificação de email e permissões
  // será feita nas páginas via AuthContext e nas API routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - arquivos estáticos (imagens, fonts, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|css|js|woff|woff2|ttf|eot)).*)',
  ],
}
