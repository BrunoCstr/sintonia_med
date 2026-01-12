import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/auth/create-profile
 * Cria o perfil do usuário no Firestore após o registro
 * Usa Admin SDK para evitar problemas de permissão
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação - tentar cookie primeiro, depois header
    let token = request.cookies.get('firebase-token')?.value
    
    // Se não tiver no cookie, tentar no header (útil logo após registro)
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, period, institution } = body

    // Validação de campos obrigatórios
    if (!name || !email || !period || !institution) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios faltando',
          required: ['name', 'email', 'period', 'institution'],
        },
        { status: 400 }
      )
    }

    // Verificar se o email do body corresponde ao email do usuário autenticado
    if (authUser.email && authUser.email !== email.trim()) {
      return NextResponse.json(
        { error: 'Você só pode criar seu próprio perfil' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar se o perfil já existe
    const userRef = db.collection('users').doc(authUser.uid)
    const userDoc = await userRef.get()
    
    if (userDoc.exists) {
      // Se já existe, atualizar os campos fornecidos (especialmente período e instituição)
      const existingData = userDoc.data()!
      await userRef.update({
        name: name.trim() || existingData.name,
        email: email.trim() || existingData.email,
        // Sempre atualizar período e instituição se fornecidos
        period: period.trim() || existingData.period || '',
        institution: institution.trim() || existingData.institution || '',
        role: existingData.role || 'aluno',
        plan: existingData.plan || null,
        planExpiresAt: existingData.planExpiresAt || null,
        createdAt: existingData.createdAt || new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Criar novo perfil usando Admin SDK (bypassa regras do Firestore)
      await userRef.set({
        name: name.trim(),
        email: email.trim(),
        period: period.trim(),
        institution: institution.trim(),
        role: 'aluno',
        plan: null,
        planExpiresAt: null,
        createdAt: new Date(),
      })
    }

    // Definir custom claim de role se ainda não tiver
    try {
      const userRecord = await app.auth().getUser(authUser.uid)
      if (!userRecord.customClaims?.role) {
        await app.auth().setCustomUserClaims(authUser.uid, { role: 'aluno' })
      }
    } catch (error) {
      console.error('Erro ao definir custom claim:', error)
      // Não bloquear se houver erro ao definir custom claim
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil criado com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao criar perfil:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar perfil' },
      { status: 500 }
    )
  }
}
