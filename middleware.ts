import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas (não requerem autenticação)
const publicRoutes = ['/', '/auth', '/plans']

// Rotas que requerem autenticação mas são acessíveis a todos os usuários autenticados
const defaultRoutes = [
  '/dashboard',
  '/generator',
  '/quiz',
  '/results',
  '/history',
  '/profile',
  '/settings',
  '/generate',
]

// Rotas admin - admin_master e admin_questoes podem acessar
const adminQuestionRoutes = [
  '/admin',
  '/admin/questions',
]

// Rotas admin - apenas admin_master pode acessar
const adminMasterRoutes = [
  '/admin/users',
  '/admin/reports',
]

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
  const cookieToken = request.cookies.get('firebase-token')
  
  // Se não houver token, redirecionar para login
  if (!cookieToken || !cookieToken.value) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token presente - permitir acesso
  // A validação de role e permissões será feita nas páginas via RoleGuard
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
