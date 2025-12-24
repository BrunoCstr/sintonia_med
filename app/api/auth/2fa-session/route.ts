import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/2fa-session
 * Verifica se um UID específico já passou pelo 2FA nesta sessão do navegador
 * 
 * Query params:
 * - uid: string (UID do usuário a verificar)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json(
      { error: 'uid é obrigatório' },
      { status: 400 }
    )
  }

  // Buscar cookie de sessão com UIDs verificados
  const sessionCookie = request.cookies.get('2fa-session-verified')
  
  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ verified: false })
  }

  try {
    // O cookie contém uma lista de UIDs separados por vírgula
    const verifiedUids = sessionCookie.value.split(',')
    const isVerified = verifiedUids.includes(uid)
    
    return NextResponse.json({ verified: isVerified })
  } catch (error) {
    console.error('Erro ao verificar sessão 2FA:', error)
    return NextResponse.json({ verified: false })
  }
}

/**
 * POST /api/auth/2fa-session
 * Adiciona um UID à lista de UIDs verificados na sessão
 * 
 * Body:
 * - uid: string (UID do usuário que passou pelo 2FA)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json(
        { error: 'uid é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar cookie existente
    const sessionCookie = request.cookies.get('2fa-session-verified')
    let verifiedUids: string[] = []

    if (sessionCookie && sessionCookie.value) {
      verifiedUids = sessionCookie.value.split(',').filter(Boolean)
    }

    // Adicionar UID se não existir
    if (!verifiedUids.includes(uid)) {
      verifiedUids.push(uid)
    }

    // Limitar a 10 UIDs para evitar cookie muito grande
    // Remove os mais antigos se necessário
    if (verifiedUids.length > 10) {
      verifiedUids = verifiedUids.slice(-10)
    }

    const response = NextResponse.json({ success: true })

    // Cookie de SESSÃO (sem maxAge = expira quando navegador fecha)
    response.cookies.set('2fa-session-verified', verifiedUids.join(','), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Sem maxAge ou expires = cookie de sessão
      // Será removido quando o navegador for fechado
    })

    return response
  } catch (error: any) {
    console.error('Erro ao salvar sessão 2FA:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar sessão 2FA' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/2fa-session
 * Remove um UID específico ou limpa todo o cookie de sessão 2FA
 * 
 * Query params:
 * - uid: string (opcional - se não fornecido, limpa todo o cookie)
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')

  const response = NextResponse.json({ success: true })

  if (uid) {
    // Remover apenas um UID específico
    const sessionCookie = request.cookies.get('2fa-session-verified')
    
    if (sessionCookie && sessionCookie.value) {
      const verifiedUids = sessionCookie.value.split(',').filter(id => id !== uid)
      
      if (verifiedUids.length > 0) {
        response.cookies.set('2fa-session-verified', verifiedUids.join(','), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      } else {
        // Se não sobrou nenhum UID, remover o cookie
        response.cookies.set('2fa-session-verified', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
      }
    }
  } else {
    // Limpar todo o cookie
    response.cookies.set('2fa-session-verified', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }

  return response
}

