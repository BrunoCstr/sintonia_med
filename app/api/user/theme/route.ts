import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * GET /api/user/theme
 * Busca a preferência de tema do usuário
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    const userDoc = await db.collection('users').doc(authUser.uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ theme: 'light' })
    }

    const userData = userDoc.data()
    return NextResponse.json({ theme: userData?.theme || 'light' })
  } catch (error: any) {
    console.error('Erro ao buscar tema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar tema' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/theme
 * Atualiza a preferência de tema do usuário
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { theme } = body

    if (!theme || (theme !== 'light' && theme !== 'dark')) {
      return NextResponse.json(
        { error: 'Tema inválido. Deve ser "light" ou "dark"' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    await db.collection('users').doc(authUser.uid).update({
      theme,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true, theme })
  } catch (error: any) {
    console.error('Erro ao atualizar tema:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar tema' },
      { status: 500 }
    )
  }
}


